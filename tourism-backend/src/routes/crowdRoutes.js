const express = require("express");
const { body } = require("express-validator");
const validate = require("../middleware/validate");
const { protect, restrictTo } = require("../middleware/auth");
const ctrl = require("../controllers/crowdController");

const router = express.Router();

router.get("/:slug/estimate", ctrl.getEstimate);
router.post("/:slug/report", protect, [body("level").notEmpty()], validate, ctrl.submitReport);
router.post(
  "/:slug/ticket-count",
  protect,
  restrictTo("admin", "data_curator"),
  [body("ticketCount").isInt({ min: 0 })],
  validate,
  ctrl.submitTicketCount
);

module.exports = router;
