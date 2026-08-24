/**
 * crowdController.js — Crowd Level Estimation & User Reporting Controller
 *
 * Integrates Python ML inference models, real-time weather modifiers, active festival
 * footfall adjustments, and crowdsourced visitor reports.
 */

const crowdService = require("../services/crowdService");
const Monument = require("../models/Monument");
const { ApiError, asyncHandler } = require("../utils/apiError");

/**
 * Returns estimated crowd levels (low, moderate, high, very_high) alongside confidence metrics.
 * GET /api/crowd/:slug/estimate
 */
exports.getEstimate = asyncHandler(async (req, res) => {
  const monument = await Monument.findOne({ slug: req.params.slug }).select("_id name state location");
  if (!monument) throw new ApiError(404, "Monument not found");

  const estimate = await crowdService.estimateCrowd(monument, monument.state);
  res.json({ success: true, monument: req.params.slug, ...estimate });
});

/**
 * Submits a live crowd observation report from a verified user.
 * POST /api/crowd/:slug/report
 */
exports.submitReport = asyncHandler(async (req, res) => {
  const monument = await Monument.findOne({ slug: req.params.slug }).select("_id");
  if (!monument) throw new ApiError(404, "Monument not found");
  const { level } = req.body;
  const report = await crowdService.submitUserReport({ monumentId: monument._id, userId: req.user._id, level });
  res.status(201).json({ success: true, data: report });
});

/**
 * Ingests automated ticketing counts (e.g. ASI ticket barrier gate API).
 * POST /api/crowd/:slug/tickets
 */
exports.submitTicketCount = asyncHandler(async (req, res) => {
  const monument = await Monument.findOne({ slug: req.params.slug }).select("_id");
  if (!monument) throw new ApiError(404, "Monument not found");
  const { ticketCount, capacityThresholds } = req.body;
  const report = await crowdService.submitTicketCount({ monumentId: monument._id, ticketCount, capacityThresholds });
  res.status(201).json({ success: true, data: report });
});
