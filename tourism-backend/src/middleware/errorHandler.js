/**
 * errorHandler.js — Centralized Error Handling & Exception Transformation Middleware
 *
 * Catches unhandled application errors, transforms Mongoose schema/validation/cast
 * exceptions into clean HTTP status codes, and formats uniform JSON error envelopes.
 */

const { ApiError } = require("../utils/apiError");

/**
 * Catches unmatched routes and forwards a 404 ApiError to the global handler.
 */
const notFound = (req, res, next) => {
  next(new ApiError(404, `Route not found: ${req.method} ${req.originalUrl}`));
};

/**
 * Global Exception Handler: Formats errors into standard JSON responses.
 * Translates Mongoose validation, duplicate key (11000), and CastError exceptions.
 */
const errorHandler = (err, req, res, next) => {
  let statusCode = err.statusCode || 500;
  let message = err.message || "Internal Server Error";
  let details = err.details || null;

  // Handle Mongoose Schema Validation Errors
  if (err.name === "ValidationError") {
    statusCode = 400;
    message = Object.values(err.errors)
      .map((e) => e.message)
      .join(", ");
  }
  // Handle Unique Constraint Violations (e.g. duplicate email)
  if (err.code === 11000) {
    statusCode = 409;
    const field = Object.keys(err.keyValue || {})[0];
    message = `Duplicate value for field: ${field}`;
  }
  // Handle Invalid MongoDB ObjectId Casting
  if (err.name === "CastError") {
    statusCode = 400;
    message = `Invalid ${err.path}: ${err.value}`;
  }

  if (process.env.NODE_ENV !== "production") {
    console.error(err);
  }

  res.status(statusCode).json({
    success: false,
    message,
    ...(details ? { details } : {}),
  });
};

module.exports = { notFound, errorHandler, ApiError };
