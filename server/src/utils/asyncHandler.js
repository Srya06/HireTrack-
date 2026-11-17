/**
 * Wraps an async route handler or middleware to catch any errors and forward them to Express next().
 * @param {Function} fn
 * @returns {import('express').RequestHandler}
 */
export const asyncHandler = (fn) => (req, res, next) => {
  Promise.resolve(fn(req, res, next)).catch(next);
};

