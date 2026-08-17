const sachetService = require("../services/sachetService");
const { asyncHandler } = require("../utils/apiError");

exports.getAlerts = asyncHandler(async (req, res) => {
  const { area, type } = req.query;
  const alerts = await sachetService.getActiveAlerts({ area, type });
  res.json({ success: true, count: alerts.length, data: alerts });
});

// Manual refresh trigger (admin/testing) — normally runs on the interval set up in server.js
exports.refreshAlerts = asyncHandler(async (req, res) => {
  const result = await sachetService.refreshAlerts();
  res.json({ success: true, ...result });
});
