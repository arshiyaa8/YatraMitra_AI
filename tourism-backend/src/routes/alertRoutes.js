/**
 * alertRoutes.js — Safety Advisories & Disaster Warnings REST Router
 *
 * Exposes endpoints for querying active SACHET alerts and triggering manual sync.
 */

const express = require("express");
const { protect, restrictTo } = require("../middleware/auth");
const ctrl = require("../controllers/alertController");

const router = express.Router();

// GET /api/alerts — Retrieves active disaster & weather alerts (filterable by area and type)
router.get("/", ctrl.getAlerts);

// POST /api/alerts/refresh — Triggers on-demand CAP alert sync from NDMA SACHET (Admin only)
router.post("/refresh", protect, restrictTo("admin"), ctrl.refreshAlerts);

module.exports = router;
