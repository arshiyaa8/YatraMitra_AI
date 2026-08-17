const express = require("express");
const ctrl = require("../controllers/weatherController");

const router = express.Router();

router.get("/", ctrl.getWeather);
router.post("/best-time", ctrl.getBestTimeAdvice);

module.exports = router;
