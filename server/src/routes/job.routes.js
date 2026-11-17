import { Router } from 'express';
import * as jobController from '../controllers/job.controller.js';
import * as applicationController from '../controllers/application.controller.js';
import { protect, authorizeRoles } from '../middleware/auth.middleware.js';
import { validate } from '../middleware/validate.middleware.js';
import { createJobValidator, updateJobValidator } from '../validators/job.validator.js';
import { applyJobValidator } from '../validators/application.validator.js';
import { validateObjectId } from '../validators/common.validator.js';
import { ROLES } from '../utils/constants.js';

const router = Router();

// Discover published jobs (authenticated)
router.get('/', protect, jobController.getPublishedJobs);

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

// Student apply to job
router.post(
  '/:jobId/applications',
  protect,
  authorizeRoles(ROLES.STUDENT),
  validate([...validateObjectId('jobId'), ...applyJobValidator]),
  applicationController.applyToJob
);

// Recruiter list applicants for job
router.get(
  '/:jobId/applications',
  protect,
  authorizeRoles(ROLES.RECRUITER, ROLES.ADMIN),
  validate(validateObjectId('jobId')),
  applicationController.getJobApplicants
);

export default router;
