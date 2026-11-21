import { Router } from 'express';
import { protect } from '../middleware/auth.middleware.js';
import { attachOrganization, authorizeMemberships } from '../middleware/org.middleware.js';
import { validate } from '../middleware/validate.middleware.js';
import { validateObjectId } from '../validators/common.validator.js';
import { MEMBERSHIP_ROLES } from '../utils/constants.js';
import * as humanInterviewController from '../controllers/humanInterview.controller.js';

const router = Router();

const STAFF_ROLES = [
  MEMBERSHIP_ROLES.ORG_ADMIN,
  MEMBERSHIP_ROLES.PLACEMENT_COORDINATOR
];

// Scope middleware specifically to human mock interview admin paths
router.use(
  ['/policies/mock-interviews', '/interviewers', '/human-interview-bookings', '/interview-feedback'],
  protect,
  attachOrganization,
  authorizeMemberships(...STAFF_ROLES)
);

// Policy management
router.get('/policies/mock-interviews', humanInterviewController.getMockInterviewPolicy);
router.patch('/policies/mock-interviews', humanInterviewController.updateMockInterviewPolicy);

// Interviewer & Booking management
router.get('/interviewers', humanInterviewController.listInterviewers);
router.get('/human-interview-bookings', humanInterviewController.listAllBookings);

// Evaluation Release (Audited)
router.post(
  '/interview-feedback/:id/release',
  validate(validateObjectId('id')),
  humanInterviewController.releaseEvaluation
);

export default router;

