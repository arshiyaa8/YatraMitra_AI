/**
 * festivalRoutes.js — Cultural Festival & Event Schedule Router
 *
 * Exposes endpoints for active ongoing celebrations and upcoming festival calendars.
 */

const express = require("express");
const ctrl = require("../controllers/festivalController");

const router = express.Router();

// GET /api/festivals/active — Retrieves festivals occurring today / right now
router.get("/active", ctrl.getActive);

// GET /api/festivals/upcoming — Retrieves scheduled festivals over the next N days
router.get("/upcoming", ctrl.getUpcoming);

module.exports = router;
