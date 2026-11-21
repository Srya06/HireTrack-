import { Router } from 'express';
import * as adminController from '../controllers/admin.controller.js';
import * as jobApplicationController from '../controllers/jobApplication.controller.js';
import { protect, authorizeRoles } from '../middleware/auth.middleware.js';
import { attachOrganization, authorizeMemberships } from '../middleware/org.middleware.js';
import { uploadCsvMiddleware } from '../middleware/upload.middleware.js';
import { validate } from '../middleware/validate.middleware.js';
import { validateObjectId } from '../validators/common.validator.js';
import { ROLES, MEMBERSHIP_ROLES } from '../utils/constants.js';
import { sendSuccess } from '../utils/response.js';

const router = Router();

// RBAC ping
router.get('/ping', protect, authorizeRoles(ROLES.ADMIN), (req, res) => {
  return sendSuccess(res, {
    message: 'Admin access verified',
    data: { role: req.user.role, adminId: req.user._id }
  });
});

// Admin Overview & Metrics (persisted DB counts/aggregations)
router.get('/overview', protect, authorizeRoles(ROLES.ADMIN), adminController.getOverview);

// Recruiter approval endpoints
router.get(
  '/recruiters/pending',
  protect,
  authorizeRoles(ROLES.ADMIN),
  adminController.getPendingRecruiters
);

router.patch(
  '/recruiters/:recruiterId/approval',
  protect,
  authorizeRoles(ROLES.ADMIN),
  validate(validateObjectId('recruiterId')),
  adminController.updateRecruiterApproval
);

// User administration
router.get('/users', protect, authorizeRoles(ROLES.ADMIN), adminController.getUsers);

router.patch(
  '/users/:id/status',
  protect,
  authorizeRoles(ROLES.ADMIN),
  validate(validateObjectId('id')),
  adminController.updateUserStatus
);

// Job administration
router.get('/jobs', protect, authorizeRoles(ROLES.ADMIN), adminController.getAllJobs);

router.patch(
  '/jobs/:id/status',
  protect,
  authorizeRoles(ROLES.ADMIN),
  validate(validateObjectId('id')),
  adminController.updateJobStatus
);

// --- Chunk V2: Student Administration & CSV Import ---
router.get(
  '/students/import/template',
  protect,
  attachOrganization,
  authorizeMemberships(MEMBERSHIP_ROLES.ORG_ADMIN),
  adminController.getImportTemplate
);

router.post(
  '/students/import',
  protect,
  attachOrganization,
  authorizeMemberships(MEMBERSHIP_ROLES.ORG_ADMIN),
  uploadCsvMiddleware,
  adminController.importStudents
);

router.get(
  '/students',
  protect,
  attachOrganization,
  authorizeMemberships(MEMBERSHIP_ROLES.ORG_ADMIN, MEMBERSHIP_ROLES.PLACEMENT_COORDINATOR),
  adminController.listStudents
);

router.patch(
  '/students/:id',
  protect,
  attachOrganization,
  authorizeMemberships(MEMBERSHIP_ROLES.ORG_ADMIN, MEMBERSHIP_ROLES.PLACEMENT_COORDINATOR),
  validate(validateObjectId('id')),
  adminController.updateStudentByStaff
);

// --- Chunk V5: Student Application Tracking & Staff Reporting ---
router.get(
  '/applications',
  protect,
  attachOrganization,
  authorizeMemberships(MEMBERSHIP_ROLES.ORG_ADMIN, MEMBERSHIP_ROLES.PLACEMENT_COORDINATOR),
  jobApplicationController.getAdminReport
);

router.patch(
  '/applications/:id/verification',
  protect,
  attachOrganization,
  authorizeMemberships(MEMBERSHIP_ROLES.ORG_ADMIN, MEMBERSHIP_ROLES.PLACEMENT_COORDINATOR),
  validate(validateObjectId('id')),
  jobApplicationController.verifyStaff
);

export default router;
