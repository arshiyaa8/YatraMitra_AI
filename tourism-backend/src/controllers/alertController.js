/**
 * alertController.js — Safety Early Warnings & Disaster Alert Controller
 *
 * Handles client queries for active disaster advisories and exposes administrative
 * endpoints for triggering on-demand CAP feed refreshes.
 */

const sachetService = require("../services/sachetService");
const { asyncHandler } = require("../utils/apiError");

/**
 * Returns active disaster and meteorological warnings filtered by area or type.
 * GET /api/alerts?area=...&type=...
 */
exports.getAlerts = asyncHandler(async (req, res) => {
  const { area, type } = req.query;
  const alerts = await sachetService.getActiveAlerts({ area, type });
  res.json({ success: true, count: alerts.length, data: alerts });
});

/**
 * Manually triggers a synchronization pass against NDMA SACHET CAP feeds (Admin only).
 * POST /api/alerts/refresh
 */
exports.refreshAlerts = asyncHandler(async (req, res) => {
  const result = await sachetService.refreshAlerts();
  res.json({ success: true, ...result });
});
