/**
 * safeZoneRoutes.js — SafePath Safe Zone & Emergency Routing REST Router
 *
 * Exposes endpoints for:
 * - Evaluating location safety and isolation risk
 * - Discovering nearby 24/7 safe havens
 * - Turn-by-turn safe haven routing
 * - Offline catalog preloading
 */

const express = require("express");
const { optionalAuth } = require("../middleware/auth");
const ctrl = require("../controllers/safeZoneController");

const router = express.Router();

// POST /api/safe-zones/evaluate — Evaluates location safety and isolation score (optional auth for health profile)
router.post("/evaluate", optionalAuth, ctrl.evaluateSafety);

// GET /api/safe-zones/nearby — Finds nearby safe havens within radius
router.get("/nearby", ctrl.getNearby);

// POST /api/safe-zones/route — Generates safe turn-by-turn walking route to haven
router.post("/route", ctrl.getRoute);

// GET /api/safe-zones/all — Retrieves all safe zones for offline caching
router.get("/all", ctrl.getAllSafeZones);

module.exports = router;
