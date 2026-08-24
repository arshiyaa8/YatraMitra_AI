const express = require("express");
const { body } = require("express-validator");
const validate = require("../middleware/validate");
const ctrl = require("../controllers/routeController");

const router = express.Router();

router.post(
  "/optimize",
  [body("waypoints").isArray({ min: 1 }).withMessage("waypoints must be a non-empty array of monument slugs or names")],
  validate,
  ctrl.optimizeRoute
);

module.exports = router;
