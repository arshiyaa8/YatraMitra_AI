/**
 * apiError.js — Custom Operational Error Class & Async Route Handler Wrapper
 *
 * Encapsulates HTTP status codes and detailed validation contexts, providing
 * an async execution boundary that forwards rejections directly to Express error middleware.
 */

/**
 * Custom Error type carrying HTTP status codes and optional structured details.
 */
class ApiError extends Error {
  constructor(statusCode, message, details = null) {
    super(message);
    this.statusCode = statusCode;
    this.details = details;
    Error.captureStackTrace(this, this.constructor);
  }
}

/**
 * Higher-order function that catches rejected promises in async Express handlers
 * and forwards them to `next(err)` to prevent unhandled promise rejections.
 *
 * @param {Function} fn - Async route handler function
 * @returns {Function} Express middleware wrapper
 */
const asyncHandler = (fn) => (req, res, next) => Promise.resolve(fn(req, res, next)).catch(next);

module.exports = { ApiError, asyncHandler };
