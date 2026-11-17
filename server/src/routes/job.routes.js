import { Router } from 'express';
import * as jobController from '../controllers/job.controller.js';
import { protect, authorizeRoles } from '../middleware/auth.middleware.js';
import { validate } from '../middleware/validate.middleware.js';
import { createJobValidator, updateJobValidator } from '../validators/job.validator.js';
import { validateObjectId } from '../validators/common.validator.js';
import { ROLES } from '../utils/constants.js';

const router = Router();

// Create new job (Approved Recruiter)
router.post(
  '/',
  protect,
  authorizeRoles(ROLES.RECRUITER),
  validate(createJobValidator),
  jobController.createJob
);

// List recruiter's own jobs (MUST be registered BEFORE /:jobId)
router.get(
  '/mine',
  protect,
  authorizeRoles(ROLES.RECRUITER),
  jobController.getMyJobs
);

// Job details
router.get(
  '/:jobId',
  protect,
  validate(validateObjectId('jobId')),
  jobController.getJobById
);

// Update job
router.patch(
  '/:jobId',
  protect,
  authorizeRoles(ROLES.RECRUITER, ROLES.ADMIN),
  validate([...validateObjectId('jobId'), ...updateJobValidator]),
  jobController.updateJob
);

// Publish job
router.patch(
  '/:jobId/publish',
  protect,
  authorizeRoles(ROLES.RECRUITER, ROLES.ADMIN),
  validate(validateObjectId('jobId')),
  jobController.publishJob
);

// Close job
router.patch(
  '/:jobId/close',
  protect,
  authorizeRoles(ROLES.RECRUITER, ROLES.ADMIN),
  validate(validateObjectId('jobId')),
  jobController.closeJob
);

export default router;
