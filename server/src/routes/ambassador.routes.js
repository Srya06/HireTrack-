import { Router } from 'express';
import { protect } from '../middleware/auth.middleware.js';
import { attachOrganization, authorizeMemberships } from '../middleware/org.middleware.js';
import { referralCaptureRateLimiter } from '../middleware/rateLimit.middleware.js';
import { MEMBERSHIP_ROLES } from '../utils/constants.js';
import * as ambassadorController from '../controllers/ambassador.controller.js';

const router = Router();

// Public referral capture endpoint (strictly rate-limited)
router.post('/capture', referralCaptureRateLimiter, ambassadorController.capturePublicReferral);

// Authenticated student ambassador routes
router.use(protect, attachOrganization, authorizeMemberships(MEMBERSHIP_ROLES.STUDENT));

router.post('/apply', ambassadorController.applyForAmbassador);
router.get('/me', ambassadorController.getMyAmbassadorStatus);
router.get('/me/referrals', ambassadorController.getMyReferrals);
router.post('/me/certificate/request', ambassadorController.requestCertificateReview);

export default router;

