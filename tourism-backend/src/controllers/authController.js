/**
 * authController.js — User Identity, Registration, & Profile Preferences Controller
 *
 * Implements JWT authentication, password verification, user profile updates,
 * and cross-device saved destination sync.
 */

const jwt = require("jsonwebtoken");
const User = require("../models/User");
const { ApiError, asyncHandler } = require("../utils/apiError");

/**
 * Generates a signed JSON Web Token for the user id.
 *
 * @param {string} id - MongoDB ObjectId
 * @returns {string} Signed JWT token
 */
const signToken = (id) =>
  jwt.sign({ id }, process.env.JWT_SECRET, { expiresIn: process.env.JWT_EXPIRES_IN || "7d" });

/**
 * Strips sensitive fields (like password hash and raw encrypted tokens) from user object.
 *
 * @param {Object} user - User document
 * @returns {Object} Safe public user profile
 */
const sanitizeUser = (user) => ({
  id: user._id,
  name: user.name,
  email: user.email,
  preferredLanguage: user.preferredLanguage,
  preferences: user.preferences,
  role: user.role,
  healthDataOptedIn: !!user.healthProfile?.optedIn,
});

/**
 * Registers a new tourist account.
 * POST /api/auth/register
 */
exports.register = asyncHandler(async (req, res) => {
  const { name, email, password, preferredLanguage } = req.body;

  const existing = await User.findOne({ email });
  if (existing) throw new ApiError(409, "An account with this email already exists");

  const user = await User.create({ name, email, password, preferredLanguage });
  const token = signToken(user._id);

  res.status(201).json({ success: true, token, user: sanitizeUser(user) });
});

/**
 * Authenticates user credentials and issues a JWT session token.
 * POST /api/auth/login
 */
exports.login = asyncHandler(async (req, res) => {
  const { email, password } = req.body;
  const user = await User.findOne({ email }).select("+password");
  if (!user || !(await user.comparePassword(password))) {
    throw new ApiError(401, "Invalid email or password");
  }
  const token = signToken(user._id);
  res.json({ success: true, token, user: sanitizeUser(user) });
});

/**
 * Returns the currently authenticated user's profile.
 * GET /api/auth/me
 */
exports.getMe = asyncHandler(async (req, res) => {
  res.json({ success: true, user: sanitizeUser(req.user) });
});

/**
 * Updates profile metadata, display language, and travel interest tags.
 * PATCH /api/auth/me
 */
exports.updateMe = asyncHandler(async (req, res) => {
  const { name, preferredLanguage, preferences } = req.body;
  if (name !== undefined) req.user.name = name;
  if (preferredLanguage !== undefined) req.user.preferredLanguage = preferredLanguage;
  if (preferences !== undefined) req.user.preferences = { ...req.user.preferences, ...preferences };
  await req.user.save();
  res.json({ success: true, user: sanitizeUser(req.user) });
});

// ── Saved Destinations (Cross-Device Sync) ──────────────────────────
const Monument = require("../models/Monument");

exports.getSavedDestinations = asyncHandler(async (req, res) => {
  const user = await User.findById(req.user._id).populate({
    path: "savedDestinations",
    select: "name slug state district category images shortDescription entryFee timings location accessibility isUnderexplored",
  });
  const list = user.savedDestinations || [];
  res.json({ success: true, count: list.length, data: list });
});

exports.addSavedDestination = asyncHandler(async (req, res) => {
  const { slug } = req.params;
  const monument = await Monument.findOne({ slug });
  if (!monument) throw new ApiError(404, "Monument not found");

  if (!req.user.savedDestinations) req.user.savedDestinations = [];

  const alreadySaved = req.user.savedDestinations.some(
    (id) => id.toString() === monument._id.toString()
  );

  if (!alreadySaved) {
    req.user.savedDestinations.push(monument._id);
    await req.user.save();
  }

  res.json({ success: true, message: "Added to your saved destinations", slug: monument.slug });
});

exports.removeSavedDestination = asyncHandler(async (req, res) => {
  const { slug } = req.params;
  const monument = await Monument.findOne({ slug });
  if (!monument) throw new ApiError(404, "Monument not found");

  if (req.user.savedDestinations) {
    req.user.savedDestinations = req.user.savedDestinations.filter(
      (id) => id.toString() !== monument._id.toString()
    );
    await req.user.save();
  }

  res.json({ success: true, message: "Removed from your saved destinations", slug: monument.slug });
});

