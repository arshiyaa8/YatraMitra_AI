/**
 * routeRoutes.js — Multi-Stop Itinerary Route Optimization Router
 *
 * Exposes endpoints for solving the Traveling Salesperson Problem (TSP)
 * across selected monument waypoints.
 */

const express = require("express");
const { body } = require("express-validator");
const validate = require("../middleware/validate");
const ctrl = require("../controllers/routeController");

const router = express.Router();

// POST /api/routes/optimize — Optimizes waypoint sequence minimizing travel distance
router.post(
  "/optimize",
  [body("waypoints").isArray({ min: 1 }).withMessage("waypoints must be a non-empty array of monument slugs or names")],
  validate,
  ctrl.optimizeRoute
);

// POST /api/routes/plan — Compatibility alias for itinerary optimization
router.post(
  "/plan",
  [body("waypoints").isArray({ min: 1 }).withMessage("waypoints must be a non-empty array of monument slugs or names")],
  validate,
  ctrl.optimizeRoute
);

module.exports = router;
