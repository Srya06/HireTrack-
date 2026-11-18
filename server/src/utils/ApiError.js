import { ERROR_CODES } from './constants.js';

const DEFAULT_CODE_BY_STATUS = {
  400: ERROR_CODES.VALIDATION_ERROR,
  401: ERROR_CODES.UNAUTHORIZED,
  403: ERROR_CODES.FORBIDDEN,
  404: ERROR_CODES.NOT_FOUND,
  409: ERROR_CODES.CONFLICT,
  422: ERROR_CODES.UNPROCESSABLE_ENTITY,
  429: ERROR_CODES.RATE_LIMITED,
  500: ERROR_CODES.INTERNAL_ERROR
};

export class ApiError extends Error {
  /**
   * @param {number} statusCode
   * @param {string} message
   * @param {Array<{field?: string, message: string}>} [errors=[]]
   * @param {boolean} [isOperational=true]
   * @param {string} [stack='']
   * @param {string} [code]
   */
  constructor(statusCode, message, errors = [], isOperational = true, stack = '', code = '') {
    super(message);
    this.statusCode = statusCode;
    this.code = code || DEFAULT_CODE_BY_STATUS[statusCode] || ERROR_CODES.INTERNAL_ERROR;
    this.errors = Array.isArray(errors) ? errors : [{ message: String(errors) }];
    this.isOperational = isOperational;
    this.success = false;

    if (stack) {
      this.stack = stack;
    } else {
      Error.captureStackTrace(this, this.constructor);
    }
  }

  static badRequest(message = 'Bad Request', errors = [], code = ERROR_CODES.VALIDATION_ERROR) {
    return new ApiError(400, message, errors, true, '', code);
  }

  static unauthorized(message = 'Unauthorized', errors = [], code = ERROR_CODES.UNAUTHORIZED) {
    return new ApiError(401, message, errors, true, '', code);
  }

  static forbidden(message = 'Forbidden', errors = [], code = ERROR_CODES.FORBIDDEN) {
    return new ApiError(403, message, errors, true, '', code);
  }

  static notFound(message = 'Resource not found', errors = [], code = ERROR_CODES.NOT_FOUND) {
    return new ApiError(404, message, errors, true, '', code);
  }

  static conflict(message = 'Resource already exists or conflicts', errors = [], code = ERROR_CODES.CONFLICT) {
    return new ApiError(409, message, errors, true, '', code);
  }

  static unprocessable(message = 'Unprocessable Entity', errors = [], code = ERROR_CODES.UNPROCESSABLE_ENTITY) {
    return new ApiError(422, message, errors, true, '', code);
  }

  static tooManyRequests(
    message = 'Too many requests, please try again later',
    errors = [],
    code = ERROR_CODES.RATE_LIMITED
  ) {
    return new ApiError(429, message, errors, true, '', code);
  }

  static internal(message = 'Internal server error', errors = [], code = ERROR_CODES.INTERNAL_ERROR) {
    return new ApiError(500, message, errors, false, '', code);
  }
}

