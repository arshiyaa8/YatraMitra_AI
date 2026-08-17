const jwt = require("jsonwebtoken");
const User = require("../models/User");
const { ApiError, asyncHandler } = require("../utils/apiError");

const signToken = (id) =>
  jwt.sign({ id }, process.env.JWT_SECRET, { expiresIn: process.env.JWT_EXPIRES_IN || "7d" });

const sanitizeUser = (user) => ({
  id: user._id,
  name: user.name,
  email: user.email,
  preferredLanguage: user.preferredLanguage,
  preferences: user.preferences,
  role: user.role,
  healthDataOptedIn: !!user.healthProfile?.optedIn,
});

exports.register = asyncHandler(async (req, res) => {
  const { name, email, password, preferredLanguage } = req.body;

  const existing = await User.findOne({ email });
  if (existing) throw new ApiError(409, "An account with this email already exists");

  const user = await User.create({ name, email, password, preferredLanguage });
  const token = signToken(user._id);

  res.status(201).json({ success: true, token, user: sanitizeUser(user) });
});

exports.login = asyncHandler(async (req, res) => {
  const { email, password } = req.body;
  const user = await User.findOne({ email }).select("+password");
  if (!user || !(await user.comparePassword(password))) {
    throw new ApiError(401, "Invalid email or password");
  }
  const token = signToken(user._id);
  res.json({ success: true, token, user: sanitizeUser(user) });
});

exports.getMe = asyncHandler(async (req, res) => {
  res.json({ success: true, user: sanitizeUser(req.user) });
});

exports.updateMe = asyncHandler(async (req, res) => {
  const { name, preferredLanguage, preferences } = req.body;
  if (name !== undefined) req.user.name = name;
  if (preferredLanguage !== undefined) req.user.preferredLanguage = preferredLanguage;
  if (preferences !== undefined) req.user.preferences = { ...req.user.preferences, ...preferences };
  await req.user.save();
  res.json({ success: true, user: sanitizeUser(req.user) });
});
