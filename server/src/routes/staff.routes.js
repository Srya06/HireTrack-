import { Router } from 'express';
import * as staffController from '../controllers/staff.controller.js';
import { protect } from '../middleware/auth.middleware.js';
import { attachOrganization, authorizeMemberships } from '../middleware/org.middleware.js';
import { validate } from '../middleware/validate.middleware.js';
import { validateObjectId } from '../validators/common.validator.js';
import {
  listStaffValidator,
  grantStaffRoleValidator,
  updateStaffMembershipValidator
} from '../validators/staff.validator.js';
import { MEMBERSHIP_ROLES } from '../utils/constants.js';

const router = Router();

// All staff-role management routes require authenticated ORG_ADMIN membership in caller's org
router.use(protect, attachOrganization, authorizeMemberships(MEMBERSHIP_ROLES.ORG_ADMIN));

router.get('/', validate(listStaffValidator), staffController.listStaff);
router.post('/', validate(grantStaffRoleValidator), staffController.grantStaff);
router.patch(
  '/:id',
  validate([...validateObjectId('id'), ...updateStaffMembershipValidator]),
  staffController.updateStaff
);

export default router;
