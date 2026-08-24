/**
 * validate.js — Request Payload Validation Interceptor
 *
 * Evaluates express-validator check rules on incoming request bodies/params.
 * Throws a structured 400 ApiError if any validation constraints fail.
 */

const { validationResult } = require("express-validator");
const { ApiError } = require("../utils/apiError");

/**
 * Validates request schema and raises an ApiError with field-level diagnostics on failure.
 */
const validate = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    throw new ApiError(400, "Validation failed", errors.array().map((e) => ({ field: e.path, message: e.msg })));
  }
  next();
};

module.exports = validate;
