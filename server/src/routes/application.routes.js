import { Router } from 'express';
import * as applicationController from '../controllers/application.controller.js';
import { protect, authorizeRoles } from '../middleware/auth.middleware.js';
import { validate } from '../middleware/validate.middleware.js';
import { validateObjectId } from '../validators/common.validator.js';
import { updateApplicationStatusValidator } from '../validators/application.validator.js';
import { ROLES } from '../utils/constants.js';

const router = Router();

// Student list own applications (MUST be before /:id)
router.get('/me', protect, authorizeRoles(ROLES.STUDENT), applicationController.getMyApplications);

// Application details (accessible by applicant student, job owner recruiter, admin)
router.get(
  '/:id',
  protect,
  validate(validateObjectId('id')),
  applicationController.getApplicationById
);

// Update status (recruiter/admin)
router.patch(
  '/:id/status',
  protect,
  authorizeRoles(ROLES.RECRUITER, ROLES.ADMIN),
  validate([...validateObjectId('id'), ...updateApplicationStatusValidator]),
  applicationController.updateStatus
);

// Withdraw application (student applicant)
router.patch(
  '/:id/withdraw',
  protect,
  authorizeRoles(ROLES.STUDENT),
  validate(validateObjectId('id')),
  applicationController.withdraw
);

export default router;
