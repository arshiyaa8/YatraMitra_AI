/**
 * festivalController.js — Cultural Festival & Event Schedule Controller
 *
 * Exposes active and upcoming cultural festival calendars across Indian states.
 */

const festivalService = require("../services/festivalService");
const { asyncHandler } = require("../utils/apiError");

/**
 * Retrieves festivals currently active today.
 * GET /api/festivals/active?state=...
 */
exports.getActive = asyncHandler(async (req, res) => {
  const { state } = req.query;
  const active = await festivalService.getActiveFestivals({ state });
  res.json({ success: true, count: active.length, data: active });
});

/**
 * Retrieves upcoming festivals over the specified lookahead window (days).
 * GET /api/festivals/upcoming?state=...&days=...
 */
exports.getUpcoming = asyncHandler(async (req, res) => {
  const { state, days } = req.query;
  const upcoming = await festivalService.getUpcomingFestivals({ state, days: days ? Number(days) : undefined });
  res.json({ success: true, count: upcoming.length, data: upcoming });
});
