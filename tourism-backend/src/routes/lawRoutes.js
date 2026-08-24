/**
 * lawRoutes.js — Travel Regulations & Cultural Guidelines REST Router
 *
 * Exposes endpoints for legal rules, cultural etiquette, and regional dining recommendations.
 */

const express = require("express");
const ctrl = require("../controllers/lawController");

const router = express.Router();

// GET /api/laws — Retrieves national guidelines or state-specific regulatory summaries
router.get("/", ctrl.getLaws);

module.exports = router;
