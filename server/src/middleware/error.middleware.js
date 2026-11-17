import { ApiError } from '../utils/ApiError.js';
import { env } from '../config/env.js';

export const errorMiddleware = (err, req, res, next) => {
  let error = err;

  // If error is not an instance of ApiError, convert standard known errors
  if (!(error instanceof ApiError)) {
    let statusCode = error.statusCode || 500;
    let message = error.message || 'Internal server error';
    let errors = [];

    // JSON syntax error from express.json()
    if (err instanceof SyntaxError && err.status === 400 && 'body' in err) {
      statusCode = 400;
      message = 'Malformed JSON in request body';
    }
    // Mongoose CastError (e.g., invalid ObjectId)
    else if (err.name === 'CastError') {
      statusCode = 400;
      message = `Invalid ${err.path}: ${err.value}`;
      errors = [{ field: err.path, message: `Invalid identifier format: ${err.value}` }];
    }
    // Mongoose ValidationError
    else if (err.name === 'ValidationError') {
      statusCode = 400;
      message = 'Validation failed';
      errors = Object.values(err.errors || {}).map((item) => ({
        field: item.path,
        message: item.message
      }));
    }
    // MongoDB Duplicate Key Error (E11000)
    else if (err.code === 11000) {
      statusCode = 409;
      const duplicateField = Object.keys(err.keyValue || {})[0] || 'field';
      message = `Duplicate value for ${duplicateField}. An entity with that value already exists.`;
      errors = [{ field: duplicateField, message: `${duplicateField} must be unique` }];
    }
    // JWT Errors
    else if (err.name === 'JsonWebTokenError') {
      statusCode = 401;
      message = 'Invalid authentication token';
    } else if (err.name === 'TokenExpiredError') {
      statusCode = 401;
      message = 'Authentication token expired';
    }
    // Multer File Size or Format error
    else if (err.code === 'LIMIT_FILE_SIZE') {
      statusCode = 400;
      message = `File size exceeds allowed limit of ${env.MAX_RESUME_SIZE_MB}MB`;
    }

    error = new ApiError(statusCode, message, errors, false, err.stack);
  }

  const response = {
    success: false,
    message: error.message,
    errors: error.errors && error.errors.length > 0 ? error.errors : [{ message: error.message }]
  };

  // Only include stack in development mode and non-operational unexpected errors
  if (!env.isProduction && error.stack && error.statusCode === 500) {
    response.stack = error.stack;
  }

  return res.status(error.statusCode || 500).json(response);
};

