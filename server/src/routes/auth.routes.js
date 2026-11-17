import { Router } from 'express';
import * as authController from '../controllers/auth.controller.js';
import { validate } from '../middleware/validate.middleware.js';
import { registerValidator, loginValidator } from '../validators/auth.validator.js';
import { protect } from '../middleware/auth.middleware.js';
import { authRateLimiter } from '../middleware/rateLimit.middleware.js';

const router = Router();

// Public auth endpoints with rate limiting and strict schema validation
router.post('/register', authRateLimiter, validate(registerValidator), authController.register);
router.post('/login', authRateLimiter, validate(loginValidator), authController.login);

// Authenticated session endpoints
router.get('/me', protect, authController.getMe);
router.post('/logout', protect, authController.logout);

export default router;

