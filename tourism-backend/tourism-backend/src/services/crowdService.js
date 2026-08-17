const CrowdReport = require("../models/CrowdReport");
const { CROWD_LEVELS } = require("../config/constants");
const festivalService = require("./festivalService");

// Report §2 (Crowd prediction) + §3 problem 4 + §4.4: Google Popular Times is NOT a real public API
// and is dropped entirely. Instead: (a) a rules-based baseline from day-of-week/season/festival calendar,
// (b) ASI e-ticketing counts where available, (c) a lightweight crowdsourced "how busy is it" prompt.
// Full ML crowd prediction is explicitly deferred post-hackathon (report §6, roadmap step 5).
//
// The festival calendar is no longer a hardcoded month guess — it queries the real, curated dataset
// imported via src/importers/importFestivals.js (see festivalService.getFestivalImpactScore).

async function ruleBasedBaseline(date = new Date(), state = null) {
  const day = date.getDay(); // 0 Sun .. 6 Sat
  let score = 1; // 1..4 mapped to CROWD_LEVELS index

  if (day === 0 || day === 6) score += 1; // weekend bump

  const festivalImpact = await festivalService.getFestivalImpactScore({ date, state });
  // festivalImpact is 0 (no festival) to 4 (very_high) — fold it in without letting it alone maximize score
  if (festivalImpact >= 3) score += 2; // high/very_high impact festival active today
  else if (festivalImpact >= 1) score += 1; // low/medium impact festival active today

  score = Math.min(score, CROWD_LEVELS.length);
  return CROWD_LEVELS[score - 1];
}

const levelToScore = (level) => CROWD_LEVELS.indexOf(level) + 1 || 1;
const scoreToLevel = (score) => CROWD_LEVELS[Math.min(Math.max(Math.round(score), 1), CROWD_LEVELS.length) - 1];

/**
 * Combines rule-based baseline with recent crowdsourced + eticket reports (last 6h) into a single estimate.
 * Weighting favors real recent signals over the static baseline once enough reports exist.
 */
async function estimateCrowd(monumentId, state = null) {
  const sixHoursAgo = new Date(Date.now() - 6 * 60 * 60 * 1000);
  const recentReports = await CrowdReport.find({
    monument: monumentId,
    timestamp: { $gte: sixHoursAgo },
  }).sort({ timestamp: -1 });

  const baseline = await ruleBasedBaseline(new Date(), state);
  const baselineScore = levelToScore(baseline);

  if (recentReports.length === 0) {
    return { level: baseline, confidence: "low", basis: "rules_based_only", sampleSize: 0 };
  }

  const avgReportedScore =
    recentReports.reduce((sum, r) => sum + levelToScore(r.level), 0) / recentReports.length;

  // Weight: more reports → more trust in crowdsourced signal, less in static baseline.
  const reportWeight = Math.min(recentReports.length / 5, 0.8); // caps at 0.8
  const blendedScore = avgReportedScore * reportWeight + baselineScore * (1 - reportWeight);

  return {
    level: scoreToLevel(blendedScore),
    confidence: recentReports.length >= 5 ? "high" : "medium",
    basis: "blended_rules_and_reports",
    sampleSize: recentReports.length,
  };
}

async function submitUserReport({ monumentId, userId, level }) {
  if (!CROWD_LEVELS.includes(level)) throw new Error(`Invalid crowd level: ${level}`);
  return CrowdReport.create({ monument: monumentId, source: "user_report", reportedBy: userId, level });
}

/**
 * Ingests an e-ticket sales count and converts it into a crowd level via simple thresholds.
 * Thresholds should be tuned per-monument in production (capacity varies wildly by site).
 */
async function submitTicketCount({ monumentId, ticketCount, capacityThresholds = { low: 50, moderate: 150, high: 300 } }) {
  let level = "very_high";
  if (ticketCount <= capacityThresholds.low) level = "low";
  else if (ticketCount <= capacityThresholds.moderate) level = "moderate";
  else if (ticketCount <= capacityThresholds.high) level = "high";

  return CrowdReport.create({ monument: monumentId, source: "eticket_count", level, ticketCount });
}

module.exports = { estimateCrowd, submitUserReport, submitTicketCount, ruleBasedBaseline };
