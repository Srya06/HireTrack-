import { Router } from 'express';
import * as reportsController from '../controllers/reports.controller.js';
import { protect } from '../middleware/auth.middleware.js';
import { attachOrganization, authorizeMemberships } from '../middleware/org.middleware.js';
import { MEMBERSHIP_ROLES } from '../utils/constants.js';

const router = Router();

const STAFF_ROLES = [
  MEMBERSHIP_ROLES.ORG_ADMIN,
  MEMBERSHIP_ROLES.PLACEMENT_COORDINATOR
];

router.use(protect, attachOrganization, authorizeMemberships(...STAFF_ROLES));

// GET /admin/reports/overview
router.get('/overview', reportsController.getOverviewReport);

// GET /admin/reports/jobs
router.get('/jobs', reportsController.getJobsReport);

// GET /admin/reports/mock-tests
router.get('/mock-tests', reportsController.getMockTestsReport);

// GET /admin/reports/mock-interviews
router.get('/mock-interviews', reportsController.getMockInterviewsReport);

export default router;

