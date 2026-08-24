/**
 * festivalService.js — Cultural Festival Footfall Impact Calculation Service
 *
 * Evaluates active cultural events, multi-day celebrations, and upcoming tourist surges
 * based on verified annual festival schedules.
 */

const Festival = require("../models/Festival");

/**
 * Returns festivals actively occurring on a specific date (defaults to current day),
 * filtered by regional relevance (state match or nationwide 'ALL' tag).
 *
 * @param {Object} params - Query parameters
 * @param {Date} [params.date=new Date()] - Target date
 * @param {string} [params.state] - State name
 * @returns {Promise<Array>} List of active festival documents
 */
async function getActiveFestivals({ date = new Date(), state } = {}) {
  const query = {
    date: { $lte: date },
    $or: [{ endDate: { $gte: date } }, { endDate: null, date: date } , { endDate: { $exists: false } }],
  };

  // Mongo can't cleanly express "date OR endDate covers today" in one $or above when endDate is absent,
  // so do a light post-filter instead of a fragile query.
  const candidates = await Festival.find({}).lean();
  const target = new Date(date.toDateString());

  const active = candidates.filter((f) => {
    const start = new Date(new Date(f.date).toDateString());
    const end = f.endDate ? new Date(new Date(f.endDate).toDateString()) : start;
    return target >= start && target <= end;
  });

  if (!state) return active;
  return active.filter((f) => f.states.includes("ALL") || f.states.some((s) => s.toLowerCase() === state.toLowerCase()));
}

/**
 * Returns festivals starting within the next `days` (default 14) — useful for "plan your visit" nudges
 * and for the crowd-estimate service to anticipate upcoming surges, not just react to today.
 */
async function getUpcomingFestivals({ days = 14, state } = {}) {
  const now = new Date();
  const until = new Date(now.getTime() + days * 24 * 60 * 60 * 1000);
  const query = { date: { $gte: now, $lte: until } };
  const results = await Festival.find(query).sort({ date: 1 }).lean();
  if (!state) return results;
  return results.filter((f) => f.states.includes("ALL") || f.states.some((s) => s.toLowerCase() === state.toLowerCase()));
}

/**
 * Highest touristImpact among festivals active right now for a state — feeds directly into
 * crowdService's rules-based baseline instead of a hardcoded month list.
 */
async function getFestivalImpactScore({ date = new Date(), state } = {}) {
  const impactRank = { low: 1, medium: 2, high: 3, very_high: 4 };
  const active = await getActiveFestivals({ date, state });
  if (active.length === 0) return 0;
  return Math.max(...active.map((f) => impactRank[f.touristImpact] || 0));
}

module.exports = { getActiveFestivals, getUpcomingFestivals, getFestivalImpactScore };
