const express = require("express");
const { body } = require("express-validator");
const validate = require("../middleware/validate");
const { protect, optionalAuth, restrictTo } = require("../middleware/auth");
const ctrl = require("../controllers/monumentController");

const router = express.Router();

router.get("/", optionalAuth, ctrl.listMonuments);
router.get("/nearby", optionalAuth, ctrl.getNearby);
router.post("/offline-package", ctrl.getOfflinePackage);
router.get("/:slug", optionalAuth, ctrl.getMonument);

router.post(
  "/",
  protect,
  restrictTo("admin", "data_curator"),
  [
    body("name").notEmpty(),
    body("slug").notEmpty(),
    body("state").notEmpty(),
    body("shortDescription").notEmpty(),
    body("location.coordinates").isArray({ min: 2, max: 2 }),
  ],
  validate,
  ctrl.createMonument
);

router.patch("/:slug", protect, restrictTo("admin", "data_curator"), ctrl.updateMonument);
router.delete("/:slug", protect, restrictTo("admin"), ctrl.deleteMonument);

// Digital heritage preservation — any logged-in user can contribute; data_curators moderate downstream
router.post(
  "/:slug/heritage-archive",
  protect,
  [body("title").notEmpty(), body("language").notEmpty()],
  validate,
  ctrl.addHeritageArchiveEntry
);

module.exports = router;
