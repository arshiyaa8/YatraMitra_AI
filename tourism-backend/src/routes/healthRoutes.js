/**
 * healthRoutes.js — DPDP-Compliant Encrypted Health & Mobility Profile Router
 *
 * All endpoints require JWT authentication. Handles opt-in consent, encrypted
 * health updates, profile deletion, and non-sensitive recommendation flags.
 */

const express = require("express");
const { protect } = require("../middleware/auth");
const ctrl = require("../controllers/healthController");

const router = express.Router();

// Enforce authentication across all health profile endpoints
router.use(protect);

// GET /api/health-profile — Retrieves decrypted personal health disclosures
router.get("/", ctrl.getHealthProfile);

// PUT /api/health-profile — Encrypts and persists updated health and mobility needs
router.put("/", ctrl.setHealthProfile);

// DELETE /api/health-profile — Revokes consent and purges encrypted payload from database
router.delete("/", ctrl.clearHealthProfile);

// GET /api/health-profile/recommendation-flags — Generates boolean filtering flags without exposing medical text
router.get("/recommendation-flags", ctrl.getRecommendationFlags);

module.exports = router;
