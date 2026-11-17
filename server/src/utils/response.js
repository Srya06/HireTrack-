/**
 * Sends a standardized success JSON response.
 * @param {import('express').Response} res
 * @param {object} options
 * @param {number} [options.statusCode=200]
 * @param {string} [options.message='Success']
 * @param {any} [options.data={}]
 * @param {object} [options.pagination] - Pagination metadata: { page, limit, total, totalPages, hasNextPage, hasPrevPage }
 */
export const sendSuccess = (
  res,
  { statusCode = 200, message = 'Success', data = {}, pagination = undefined } = {}
) => {
  const payload = {
    success: true,
    message,
    data
  };

  if (pagination) {
    payload.pagination = pagination;
  }

  return res.status(statusCode).json(payload);
};

/**
 * Sends a standardized error JSON response.
 * @param {import('express').Response} res
 * @param {object} options
 * @param {number} [options.statusCode=500]
 * @param {string} [options.message='An error occurred']
 * @param {Array<{field?: string, message: string}>} [options.errors=[]]
 */
export const sendError = (
  res,
  { statusCode = 500, message = 'An error occurred', errors = [] } = {}
) => {
  const formattedErrors = Array.isArray(errors)
    ? errors.map((err) =>
        typeof err === 'string'
          ? { message: err }
          : { field: err.field || undefined, message: err.message || 'Validation error' }
      )
    : [{ message: String(errors) }];

  return res.status(statusCode).json({
    success: false,
    message,
    errors: formattedErrors
  });
};

