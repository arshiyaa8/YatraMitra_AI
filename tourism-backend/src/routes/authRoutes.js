/**
 * authRoutes.js — User Identity, Authentication & Profile Preferences Router
 *
 * Handles account creation, login authentication, user profile management,
 * and saved destination bookmarking.
 */

const express = require("express");
const { body } = require("express-validator");
const validate = require("../middleware/validate");
const { protect } = require("../middleware/auth");
const ctrl = require("../controllers/authController");

const router = express.Router();

// POST /api/auth/register — Registers a new user account
router.post(
  "/register",
  [
    body("name").trim().notEmpty().withMessage("Name is required"),
    body("email").isEmail().withMessage("Valid email is required"),
    body("password").isLength({ min: 6 }).withMessage("Password must be at least 6 characters"),
  ],
  validate,
  ctrl.register
);

// POST /api/auth/login — Authenticates user credentials and issues a signed JWT
router.post(
  "/login",
  [body("email").isEmail(), body("password").notEmpty()],
  validate,
  ctrl.login
);

// GET /api/auth/me — Retrieves authenticated user profile
router.get("/me", protect, ctrl.getMe);

// PATCH /api/auth/me — Updates user preferences and display language
router.patch("/me", protect, ctrl.updateMe);

// Saved Destinations & Bookmarked Itineraries
router.get("/me/saved-destinations", protect, ctrl.getSavedDestinations);
router.post("/me/saved-destinations/:slug", protect, ctrl.addSavedDestination);
router.delete("/me/saved-destinations/:slug", protect, ctrl.removeSavedDestination);

module.exports = router;
