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
  const monument = await Monument.findOne({ slug: req.params.slug }).select(
    "_id name slug state location popularity isUnderexplored category timings"
  );
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
 * Analyzes a live photo (or social media snapshot) to detect human crowd density via Computer Vision.
 * POST /api/crowd/:slug/analyze-photo
 */
exports.analyzePhoto = asyncHandler(async (req, res) => {
  const monument = await Monument.findOne({ slug: req.params.slug }).select("_id name");
  if (!monument) throw new ApiError(404, "Monument not found");

  const { imageBase64, image } = req.body;
  const payload = imageBase64 || image;
  if (!payload) throw new ApiError(400, "imageBase64 payload is required for crowd vision analysis");

  const result = await crowdService.analyzeCrowdPhoto({
    monumentId: monument._id,
    imageBase64: payload,
    monumentName: monument.name,
    userId: req.user?._id,
  });

  res.json({ success: true, monument: req.params.slug, ...result });
});

/**
 * Validates traveler GPS proximity and records verified live crowd telemetry.
 * POST /api/crowd/:slug/checkin
 */
exports.checkInGps = asyncHandler(async (req, res) => {
  const monument = await Monument.findOne({ slug: req.params.slug }).select("_id name location");
  if (!monument) throw new ApiError(404, "Monument not found");

  const { lat, lng } = req.body;
  if (lat === undefined || lng === undefined) {
    throw new ApiError(400, "lat and lng GPS coordinates are required");
  }

  const result = await crowdService.verifyGpsCheckIn({
    monument,
    userLat: parseFloat(lat),
    userLng: parseFloat(lng),
    userId: req.user?._id,
  });

  res.json({ success: true, monument: req.params.slug, ...result });
});

/**
 * Ingests automated barrier ticketing counts (Admin/Curator).
 * POST /api/crowd/:slug/ticket-count
 */
exports.submitTicketCount = asyncHandler(async (req, res) => {
  const monument = await Monument.findOne({ slug: req.params.slug }).select("_id");
  if (!monument) throw new ApiError(404, "Monument not found");
  const { ticketCount, capacityThresholds } = req.body;
  const report = await crowdService.submitTicketCount({ monumentId: monument._id, ticketCount, capacityThresholds });
  res.status(201).json({ success: true, data: report });
});


