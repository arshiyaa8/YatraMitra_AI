const axios = require("axios");
const CrowdReport = require("../models/CrowdReport");
const { CROWD_LEVELS } = require("../config/constants");
const festivalService = require("./festivalService");
const weatherService = require("./weatherService");

const ML_API_URL = (process.env.ML_API_URL || "http://127.0.0.1:5001").replace(/\/$/, "");
const ML_TIMEOUT_MS = Number(process.env.ML_API_TIMEOUT_MS) || 5000;

async function ruleBasedBaseline(date = new Date(), state = null) {
  const day = date.getDay();
  let score = 1;

  if (day === 0 || day === 6) score += 1;

  const festivalImpact = await festivalService.getFestivalImpactScore({ date, state });
  if (festivalImpact >= 3) score += 2;
  else if (festivalImpact >= 1) score += 1;

  score = Math.min(score, CROWD_LEVELS.length);
  return CROWD_LEVELS[score - 1];
}

const levelToScore = (level) => CROWD_LEVELS.indexOf(level) + 1 || 1;
const scoreToLevel = (score) =>
  CROWD_LEVELS[Math.min(Math.max(Math.round(score), 1), CROWD_LEVELS.length) - 1];

function extractWeatherInputs(bundle, now) {
  let temp = 25;
  let rainProb = 0;

  const forecasts = bundle?.openWeather?.forecast;
  if (Array.isArray(forecasts) && forecasts.length) {
    const current = forecasts.reduce((best, item) => {
      const distance = Math.abs(new Date(item.time).getTime() - now.getTime());
      return !best || distance < best.distance ? { item, distance } : best;
    }, null)?.item;

    if (current) {
      if (Number.isFinite(Number(current.temperatureC))) temp = Number(current.temperatureC);
      if (Number.isFinite(Number(current.rainProbability))) rainProb = Number(current.rainProbability);
      return { temp, rainProb, source: "OPENWEATHERMAP" };
    }
  }

  const todayKey = now.toISOString().slice(0, 10).replace(/-/g, "");
  const nasaDay = bundle?.nasa?.days?.find((d) => d.date === todayKey) || bundle?.nasa?.days?.at(-1);
  if (nasaDay) {
    if (Number.isFinite(Number(nasaDay.temperatureC))) temp = Number(nasaDay.temperatureC);
    // NASA POWER gives precipitation amount, not probability. Convert only as a
    // coarse model input; OpenWeather is preferred when configured.
    const precipitation = Number(nasaDay.precipitationMm);
    if (Number.isFinite(precipitation)) rainProb = precipitation >= 5 ? 0.7 : precipitation > 0 ? 0.3 : 0;
    return { temp, rainProb, source: "NASA_POWER" };
  }

  return { temp, rainProb, source: "default" };
}

async function getWeatherForMonument(monument) {
  const coordinates = monument?.location?.coordinates;
  if (!Array.isArray(coordinates) || coordinates.length < 2) {
    return { temp: 25, rainProb: 0, source: "default" };
  }

  const [lon, lat] = coordinates;
  try {
    const bundle = await weatherService.getWeatherBundle({ lat, lon });
    return extractWeatherInputs(bundle, new Date());
  } catch (error) {
    console.warn("Weather enrichment for crowd prediction failed:", error.message);
    return { temp: 25, rainProb: 0, source: "default" };
  }
}

async function predictWithPython({ monument, isHoliday, weather }) {
  const now = new Date();
  const response = await axios.post(
    `${ML_API_URL}/predict/crowd`,
    {
      monument: monument.name,
      date: now.toISOString().slice(0, 10),
      hour: now.getHours(),
      temp: weather.temp,
      rain_prob: weather.rainProb,
      is_holiday: isHoliday,
    },
    { timeout: ML_TIMEOUT_MS }
  );

  if (response.data?.status !== "success" || !response.data?.data) {
    throw new Error("ML API returned an invalid response");
  }

  return response.data.data;
}

async function estimateCrowd(monument, state = null) {
  const now = new Date();
  const sixHoursAgo = new Date(Date.now() - 6 * 60 * 60 * 1000);

  const recentReports = await CrowdReport.find({
    monument: monument._id,
    timestamp: { $gte: sixHoursAgo },
  }).sort({ timestamp: -1 });

  const festivalImpact = await festivalService.getFestivalImpactScore({ date: now, state });
  const isHoliday = festivalImpact >= 1;
  const weather = await getWeatherForMonument(monument);

  // ML-first path. The existing rules/reports path remains a safe fallback so
  // the Node API still works if the Python process is down.
  try {
    const prediction = await predictWithPython({ monument, isHoliday, weather });
    return {
      level: prediction.status.toLowerCase(),
      predictedCrowdLevel: prediction.predicted_crowd_level,
      confidence: recentReports.length >= 5 ? "high" : recentReports.length > 0 ? "medium" : "low",
      basis: "python_ml",
      sampleSize: recentReports.length,
      model: "CrowdPredictorEngine",
      weatherSource: weather.source,
      factors: prediction.factors,
    };
  } catch (error) {
    console.warn(`Python ML API unavailable at ${ML_API_URL}:`, error.message);
  }

  const baseline = await ruleBasedBaseline(now, state);
  const baselineScore = levelToScore(baseline);

  if (recentReports.length === 0) {
    return { level: baseline, confidence: "low", basis: "rules_based_fallback", sampleSize: 0 };
  }

  const avgReportedScore =
    recentReports.reduce((sum, r) => sum + levelToScore(r.level), 0) / recentReports.length;
  const reportWeight = Math.min(recentReports.length / 5, 0.8);
  const blendedScore = avgReportedScore * reportWeight + baselineScore * (1 - reportWeight);

  return {
    level: scoreToLevel(blendedScore),
    confidence: recentReports.length >= 5 ? "high" : "medium",
    basis: "blended_rules_and_reports_fallback",
    sampleSize: recentReports.length,
  };
}

async function submitUserReport({ monumentId, userId, level }) {
  if (!CROWD_LEVELS.includes(level)) throw new Error(`Invalid crowd level: ${level}`);
  return CrowdReport.create({ monument: monumentId, source: "user_report", reportedBy: userId, level });
}

async function submitTicketCount({ monumentId, ticketCount, capacityThresholds = { low: 50, moderate: 150, high: 300 } }) {
  let level = "very_high";
  if (ticketCount <= capacityThresholds.low) level = "low";
  else if (ticketCount <= capacityThresholds.moderate) level = "moderate";
  else if (ticketCount <= capacityThresholds.high) level = "high";

  return CrowdReport.create({ monument: monumentId, source: "eticket_count", level, ticketCount });
}

module.exports = { estimateCrowd, submitUserReport, submitTicketCount, ruleBasedBaseline };
