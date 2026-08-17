const express = require("express");
const { protect } = require("../middleware/auth");
const ctrl = require("../controllers/healthController");

const router = express.Router();

// All health-profile routes require auth — this is sensitive, strictly opt-in personal data.
router.use(protect);

router.get("/", ctrl.getHealthProfile);
router.put("/", ctrl.setHealthProfile);
router.delete("/", ctrl.clearHealthProfile);
router.get("/recommendation-flags", ctrl.getRecommendationFlags);

module.exports = router;
