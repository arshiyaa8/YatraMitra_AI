/**
 * crowdRoutes.js — Footfall & Crowd Dynamics REST Router
 *
 * Exposes endpoints for algorithmic crowd estimates, user-submitted observation
 * reports, and turnstile ticket barrier metrics.
 */

const express = require("express");
const { body } = require("express-validator");
const validate = require("../middleware/validate");
const { protect, restrictTo } = require("../middleware/auth");
const ctrl = require("../controllers/crowdController");

const router = express.Router();

// GET /api/crowd/:slug/estimate — Retrieves ML-modeled footfall density estimate
router.get("/:slug/estimate", ctrl.getEstimate);

// POST /api/crowd/:slug/report — Submits a live visitor crowd observation
router.post("/:slug/report", protect, [body("level").notEmpty()], validate, ctrl.submitReport);

// POST /api/crowd/:slug/ticket-count — Ingests automated barrier ticketing counts (Admin/Curator)
router.post(
  "/:slug/ticket-count",
  protect,
  restrictTo("admin", "data_curator"),
  [body("ticketCount").isInt({ min: 0 })],
  validate,
  ctrl.submitTicketCount
);

module.exports = router;
