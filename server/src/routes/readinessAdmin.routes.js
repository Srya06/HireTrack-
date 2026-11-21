import { Router } from 'express';
import * as readinessController from '../controllers/readiness.controller.js';
import { protect } from '../middleware/auth.middleware.js';
import { attachOrganization, authorizeMemberships } from '../middleware/org.middleware.js';
import { validate } from '../middleware/validate.middleware.js';
import { validateObjectId } from '../validators/common.validator.js';
import { MEMBERSHIP_ROLES } from '../utils/constants.js';

const router = Router();

const STAFF_ROLES = [
  MEMBERSHIP_ROLES.ORG_ADMIN,
  MEMBERSHIP_ROLES.PLACEMENT_COORDINATOR
];

router.use(protect, attachOrganization, authorizeMemberships(...STAFF_ROLES));

// GET /admin/readiness/cohorts
router.get('/cohorts', readinessController.getCohortReadinessAdmin);

// GET /admin/readiness/students/:studentId
router.get(
  '/students/:studentId',
  validate(validateObjectId('studentId')),
  readinessController.getStudentReadinessAdmin
);

export default router;

