const { validationResult } = require("express-validator");
const { ApiError } = require("../utils/apiError");

// Run after an array of express-validator checks; throws a formatted 400 if any failed.
const validate = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    throw new ApiError(400, "Validation failed", errors.array().map((e) => ({ field: e.path, message: e.msg })));
  }
  next();
};

module.exports = validate;
