const express = require("express");
const { protect, restrictTo } = require("../middleware/auth");
const ctrl = require("../controllers/alertController");

const router = express.Router();

router.get("/", ctrl.getAlerts);
router.post("/refresh", protect, restrictTo("admin"), ctrl.refreshAlerts);

module.exports = router;
