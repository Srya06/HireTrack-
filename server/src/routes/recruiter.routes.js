import { Router } from 'express';
import * as recruiterController from '../controllers/recruiter.controller.js';
import { protect, authorizeRoles } from '../middleware/auth.middleware.js';
import { validate } from '../middleware/validate.middleware.js';
import { updateRecruiterProfileValidator } from '../validators/recruiter.validator.js';
import { ROLES } from '../utils/constants.js';

const router = Router();

router.get('/me', protect, authorizeRoles(ROLES.RECRUITER), recruiterController.getMe);
router.patch(
  '/me',
  protect,
  authorizeRoles(ROLES.RECRUITER),
  validate(updateRecruiterProfileValidator),
  recruiterController.updateMe
);

export default router;

