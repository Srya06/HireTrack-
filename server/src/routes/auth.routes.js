import { Router } from 'express';
import * as authController from '../controllers/auth.controller.js';
import { validate } from '../middleware/validate.middleware.js';
import { registerValidator, loginValidator, acceptInvitationValidator } from '../validators/auth.validator.js';
import { protect } from '../middleware/auth.middleware.js';
import { authRateLimiter } from '../middleware/rateLimit.middleware.js';

const router = Router();

// Public auth endpoints with rate limiting and strict schema validation
router.post('/register', authRateLimiter, validate(registerValidator), authController.register);
router.post('/login', authRateLimiter, validate(loginValidator), authController.login);
router.post(
  '/invitation/accept',
  authRateLimiter,
  validate(acceptInvitationValidator),
  authController.acceptInvitation
);
router.post(
  '/invitation/set-password',
  authRateLimiter,
  validate(acceptInvitationValidator),
  authController.acceptInvitation
);

// Authenticated session endpoints
router.get('/me', protect, authController.getMe);
router.post('/logout', protect, authController.logout);

export default router;

