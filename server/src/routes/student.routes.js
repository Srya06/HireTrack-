import { Router } from 'express';
import * as studentController from '../controllers/student.controller.js';
import { protect, authorizeRoles } from '../middleware/auth.middleware.js';
import { validate } from '../middleware/validate.middleware.js';
import { updateStudentProfileValidator } from '../validators/student.validator.js';
import { uploadResumeMiddleware } from '../middleware/upload.middleware.js';
import { ROLES } from '../utils/constants.js';

const router = Router();

// Student self routes
router.get('/me', protect, authorizeRoles(ROLES.STUDENT), studentController.getMe);
router.patch(
  '/me',
  protect,
  authorizeRoles(ROLES.STUDENT),
  validate(updateStudentProfileValidator),
  studentController.updateMe
);

// HireTrack v3 Student Self-Profile endpoints (GET & PATCH /students/me/profile)
router.get(
  '/me/profile',
  protect,
  authorizeRoles(ROLES.STUDENT),
  studentController.getMeProfileV3
);
router.patch(
  '/me/profile',
  protect,
  authorizeRoles(ROLES.STUDENT),
  studentController.updateMeProfileV3
);

router.post(
  '/me/resume',
  protect,
  authorizeRoles(ROLES.STUDENT),
  uploadResumeMiddleware,
  studentController.uploadResume
);

// Route with explicit ID param (verifies resource ownership and role permissions)
router.patch(
  '/:id',
  protect,
  validate(updateStudentProfileValidator),
  studentController.updateById
);

export default router;

