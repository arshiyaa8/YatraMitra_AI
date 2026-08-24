/**
 * monumentRoutes.js — Indian Heritage Site & Monument REST Router
 *
 * Exposes endpoints for monument search, radius geospatial lookups, offline packages,
 * detail views with localization, fact-grounded Q&A, and administrative CRUD.
 */

const express = require("express");
const { body } = require("express-validator");
const validate = require("../middleware/validate");
const { protect, optionalAuth, restrictTo } = require("../middleware/auth");
const ctrl = require("../controllers/monumentController");

const router = express.Router();

// GET /api/monuments — Paginated list of monuments with state, category, and gem filters
router.get("/", optionalAuth, ctrl.listMonuments);

// GET /api/monuments/nearby — Geospatial radius query using lat/lng coordinates
router.get("/nearby", optionalAuth, ctrl.getNearby);

// POST /api/monuments/offline-package — Bundles monument metadata for offline device caching
router.post("/offline-package", ctrl.getOfflinePackage);

// GET /api/monuments/:slug — Single monument record with optional ?lang=... localization
router.get("/:slug", optionalAuth, ctrl.getMonument);

// POST /api/monuments/:slug/ask — Fact-grounded interactive Q&A assistant for this monument
router.post(
  "/:slug/ask",
  optionalAuth,
  [body("question").notEmpty().withMessage("Question is required")],
  validate,
  ctrl.askMonumentQuestion
);

// POST /api/monuments — Creates a new monument catalog entry (Admin/Curator)
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

// PATCH /api/monuments/:slug — Updates monument metadata (Admin/Curator)
router.patch("/:slug", protect, restrictTo("admin", "data_curator"), ctrl.updateMonument);

// DELETE /api/monuments/:slug — Removes monument catalog record (Admin only)
router.delete("/:slug", protect, restrictTo("admin"), ctrl.deleteMonument);

// POST /api/monuments/:slug/heritage-archive — Adds community or guide oral history narration
router.post(
  "/:slug/heritage-archive",
  protect,
  [body("title").notEmpty(), body("language").notEmpty()],
  validate,
  ctrl.addHeritageArchiveEntry
);

module.exports = router;
