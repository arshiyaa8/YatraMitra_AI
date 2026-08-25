/**
 * safeZoneController.js — SafePath Navigation & Emergency Safe Zone Controller
 *
 * Exposes endpoints for:
 * - Evaluating location isolation & deserted risk score (POST /api/safe-zones/evaluate)
 * - Discovering nearby 24/7 safe havens (GET /api/safe-zones/nearby)
 * - Turn-by-turn safe haven routing (POST /api/safe-zones/route)
 * - Full safe zone catalog for offline caching (GET /api/safe-zones/all)
 */

const safeZoneService = require("../services/safeZoneService");
const { ApiError, asyncHandler } = require("../utils/apiError");

/**
 * Evaluates current GPS location for isolation risk and identifies closest safe havens.
 * POST /api/safe-zones/evaluate
 */
exports.evaluateSafety = asyncHandler(async (req, res) => {
  const { lat, lng, time } = req.body;
  if (lat === undefined || lng === undefined) {
    throw new ApiError(400, "lat and lng GPS coordinates are required");
  }

  let healthConditions = [];
  if (req.user && typeof req.user.getHealthData === "function") {
    try {
      const healthData = req.user.getHealthData();
      healthConditions = healthData?.conditions || [];
    } catch (e) {}
  }

  const result = await safeZoneService.evaluateLocationSafety({
    lat: parseFloat(lat),
    lng: parseFloat(lng),
    time: time ? new Date(time) : new Date(),
    healthConditions,
  });

  res.json({ success: true, ...result });
});

/**
 * Returns nearby safe havens within specified radius.
 * GET /api/safe-zones/nearby?lat=...&lng=...&radiusKm=...&category=...
 */
exports.getNearby = asyncHandler(async (req, res) => {
  const { lat, lng, radiusKm, category } = req.query;
  if (!lat || !lng) {
    throw new ApiError(400, "lat and lng query parameters are required");
  }

  const zones = await safeZoneService.getNearbySafeZones({
    lat: parseFloat(lat),
    lng: parseFloat(lng),
    radiusKm: radiusKm ? parseFloat(radiusKm) : 15,
    category: category || null,
  });

  res.json({ success: true, count: zones.length, data: zones });
});

/**
 * Calculates turn-by-turn safe routing from user coordinates to a safe haven.
 * POST /api/safe-zones/route
 */
exports.getRoute = asyncHandler(async (req, res) => {
  const { startLat, startLng, destLat, destLng, safeZoneId } = req.body;
  if (startLat === undefined || startLng === undefined) {
    throw new ApiError(400, "startLat and startLng coordinates are required");
  }
  if (!safeZoneId && (destLat === undefined || destLng === undefined)) {
    throw new ApiError(400, "Either safeZoneId or destLat/destLng destination coordinates are required");
  }

  const route = await safeZoneService.getSafeRoute({
    startLat: parseFloat(startLat),
    startLng: parseFloat(startLng),
    destLat: destLat ? parseFloat(destLat) : null,
    destLng: destLng ? parseFloat(destLng) : null,
    safeZoneId,
  });

  res.json({ success: true, data: route });
});

/**
 * Retrieves all safe zones for offline caching in Service Worker / IndexedDB.
 * GET /api/safe-zones/all
 */
exports.getAllSafeZones = asyncHandler(async (req, res) => {
  const data = await safeZoneService.getAllSafeZones();
  res.json({ success: true, count: data.length, data });
});
