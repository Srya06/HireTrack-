import { Router } from 'express';
import * as interviewController from '../controllers/interview.controller.js';
import { protect, authorizeRoles } from '../middleware/auth.middleware.js';
import { validate } from '../middleware/validate.middleware.js';
import { validateObjectId } from '../validators/common.validator.js';
import { updateInterviewValidator } from '../validators/interview.validator.js';
import { ROLES } from '../utils/constants.js';

const router = Router();

// Update interview (owning recruiter or admin)
router.patch(
  '/:id',
  protect,
  authorizeRoles(ROLES.RECRUITER, ROLES.ADMIN),
  validate([...validateObjectId('id'), ...updateInterviewValidator]),
  interviewController.updateInterview
);

// Cancel interview (owning recruiter or admin)
router.patch(
  '/:id/cancel',
  protect,
  authorizeRoles(ROLES.RECRUITER, ROLES.ADMIN),
  validate(validateObjectId('id')),
  interviewController.cancelInterview
);

export default router;

