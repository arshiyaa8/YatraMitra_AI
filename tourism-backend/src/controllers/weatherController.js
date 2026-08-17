const weatherService = require("../services/weatherService");
const { ApiError, asyncHandler } = require("../utils/apiError");

exports.getWeather = asyncHandler(async (req, res) => {
  const { lat, lng } = req.query;
  if (!lat || !lng) throw new ApiError(400, "lat and lng query params are required");

  const bundle = await weatherService.getWeatherBundle({ lat: parseFloat(lat), lon: parseFloat(lng) });
  res.json({ success: true, data: bundle });
});

/**
 * "Best time to visit" helper: combines recent NASA POWER climate signal with a simple heuristic.
 * Full crowd+climate joint prediction is a roadmap item; this MVP version reasons over weather only,
 * per monument.timings.bestVisitMonths as the source of truth, cross-checked against live conditions.
 */
exports.getBestTimeAdvice = asyncHandler(async (req, res) => {
  const { lat, lng, bestVisitMonths = [] } = req.body;
  if (!lat || !lng) throw new ApiError(400, "lat and lng are required");

  const nasa = await weatherService.getNasaPowerForecast({ lat, lon: lng });
  const avgTemp =
    nasa.days.reduce((s, d) => s + (d.temperatureC || 0), 0) / (nasa.days.length || 1);
  const avgPrecip =
    nasa.days.reduce((s, d) => s + (d.precipitationMm || 0), 0) / (nasa.days.length || 1);

  const currentMonthName = new Date().toLocaleString("en-US", { month: "long" });
  const isSeasonallyGood = bestVisitMonths.length === 0 || bestVisitMonths.includes(currentMonthName);

  let advice = isSeasonallyGood ? "This is generally a good season to visit." : "This is off-season for this site — expect fewer crowds but check conditions.";
  if (avgPrecip > 10) advice += " Recent data shows notable rainfall — carry rain protection.";
  if (avgTemp > 38) advice += " Temperatures are running high — plan for early morning or evening visits.";

  res.json({
    success: true,
    currentMonth: currentMonthName,
    isSeasonallyRecommended: isSeasonallyGood,
    recentAvgTemperatureC: Math.round(avgTemp * 10) / 10,
    recentAvgPrecipitationMm: Math.round(avgPrecip * 10) / 10,
    advice,
  });
});
