const festivalService = require("../services/festivalService");
const { asyncHandler } = require("../utils/apiError");

exports.getActive = asyncHandler(async (req, res) => {
  const { state } = req.query;
  const active = await festivalService.getActiveFestivals({ state });
  res.json({ success: true, count: active.length, data: active });
});

exports.getUpcoming = asyncHandler(async (req, res) => {
  const { state, days } = req.query;
  const upcoming = await festivalService.getUpcomingFestivals({ state, days: days ? Number(days) : undefined });
  res.json({ success: true, count: upcoming.length, data: upcoming });
});
