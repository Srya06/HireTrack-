import { validationResult } from 'express-validator';
import { ApiError } from '../utils/ApiError.js';

export const validate = (validations) => {
  return async (req, res, next) => {
    // Run each validation
    for (const validation of validations) {
      const result = await validation.run(req);
      if (result.errors.length) break;
    }

    const errors = validationResult(req);
    if (errors.isEmpty()) {
      return next();
    }

    const formattedErrors = errors.array().map((err) => ({
      field: err.path || err.param,
      message: err.msg
    }));

    return next(new ApiError(400, 'Validation failed', formattedErrors));
  };
};
