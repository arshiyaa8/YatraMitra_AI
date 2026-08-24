const express = require("express");
const router = express.Router();

router.use("/auth", require("./authRoutes"));
router.use("/monuments", require("./monumentRoutes"));
router.use("/translate", require("./translateRoutes"));
router.use("/weather", require("./weatherRoutes"));
router.use("/alerts", require("./alertRoutes"));
router.use("/crowd", require("./crowdRoutes"));
router.use("/health-profile", require("./healthRoutes"));
router.use("/festivals", require("./festivalRoutes"));
router.use("/laws", require("./lawRoutes"));
router.use("/routes", require("./routeRoutes"));

router.get("/", (req, res) => {
  res.json({
    success: true,
    message: "AI-Powered Multilingual Tourism Assistant API",
    endpoints: [
      "/api/auth",
      "/api/monuments",
      "/api/translate",
      "/api/weather",
      "/api/alerts",
      "/api/crowd",
      "/api/health-profile",
      "/api/festivals",
      "/api/laws",
      "/api/routes",
    ],
  });
});

module.exports = router;
