/**
 * weatherRoutes.js — Real-Time Climate & Best-Time-To-Visit REST Router
 *
 * Exposes endpoints for real-time IMD / Open-Meteo weather conditions
 * and multi-month seasonal visit recommendations.
 */

const express = require("express");
const ctrl = require("../controllers/weatherController");

const router = express.Router();

// GET /api/weather — Retrieves current weather conditions and temperature for GPS coordinates
router.get("/", ctrl.getWeather);

// POST /api/weather/best-time — Evaluates whether current date/climate matches optimal visit months
router.post("/best-time", ctrl.getBestTimeAdvice);

module.exports = router;
