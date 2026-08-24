/**
 * auth.js — JSON Web Token (JWT) Authentication & Role Authorization Middleware
 *
 * Provides route protection guards, optional visitor identity resolution,
 * and role-based access control (RBAC).
 */

const jwt = require("jsonwebtoken");
const User = require("../models/User");
const { ApiError, asyncHandler } = require("../utils/apiError");

/**
 * Strict Route Guard: Requires a valid Bearer token in the Authorization header.
 * Attaches the authenticated User document to `req.user`.
 */
const protect = asyncHandler(async (req, res, next) => {
  const header = req.headers.authorization;
  if (!header || !header.startsWith("Bearer ")) {
    throw new ApiError(401, "Not authorized — no token provided");
  }
  const token = header.split(" ")[1];
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const user = await User.findById(decoded.id);
    if (!user) throw new ApiError(401, "User no longer exists");
    req.user = user;
    next();
  } catch (err) {
    if (err instanceof ApiError) throw err;
    throw new ApiError(401, "Not authorized — invalid or expired token");
  }
});

/**
 * Permissive Route Guard: Identifies logged-in users when a token is present,
 * but allows anonymous guest visitors through without blocking.
 */
const optionalAuth = asyncHandler(async (req, res, next) => {
  const header = req.headers.authorization;
  if (header && header.startsWith("Bearer ")) {
    try {
      const decoded = jwt.verify(header.split(" ")[1], process.env.JWT_SECRET);
      req.user = await User.findById(decoded.id);
    } catch {
      // Allow unauthenticated fallback if token is expired or malformed
    }
  }
  next();
});

/**
 * Role-Based Access Control (RBAC) Guard: Restricts endpoint access to specific roles.
 *
 * @param  {...string} roles - Permitted user roles (e.g. 'admin', 'user')
 */
const restrictTo = (...roles) => (req, res, next) => {
  if (!req.user || !roles.includes(req.user.role)) {
    throw new ApiError(403, "You do not have permission to perform this action");
  }
  next();
};

module.exports = {
  protect,
  optionalAuth,
  restrictTo,
};
