import rateLimit from 'express-rate-limit';
import { env } from '../config/env.js';
import { ApiError } from '../utils/ApiError.js';

/**
 * Strict rate limiter for sensitive authentication endpoints (login, register)
 * 30 requests per 15 minutes per IP
 */
export const authRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: env.isTest ? 10000 : 30, // Limit each IP to 30 requests per 15 minutes (generous in tests)
  standardHeaders: true,
  legacyHeaders: false,
  handler: (req, res, next) => {
    next(ApiError.tooManyRequests('Too many login/registration attempts. Please try again after 15 minutes.'));
  }
});

/**
 * General rate limiter for all API endpoints to prevent DoS attacks
 * 300 requests per 15 minutes per IP
 */
export const apiRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: env.isTest ? 50000 : 300,
  standardHeaders: true,
  legacyHeaders: false,
  handler: (req, res, next) => {
    next(ApiError.tooManyRequests('Too many requests. Please slow down.'));
  }
});

