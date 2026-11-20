import { Router } from 'express';
import * as opportunityController from '../controllers/opportunity.controller.js';
import * as eligibilityController from '../controllers/eligibility.controller.js';
import { protect } from '../middleware/auth.middleware.js';
import { attachOrganization, authorizeMemberships } from '../middleware/org.middleware.js';
import { validate } from '../middleware/validate.middleware.js';
import { validateObjectId } from '../validators/common.validator.js';
import {
  createOpportunityValidator,
  updateOpportunityValidator
} from '../validators/opportunity.validator.js';
import { MEMBERSHIP_ROLES } from '../utils/constants.js';

const router = Router();

const STAFF_ROLES = [
  MEMBERSHIP_ROLES.ORG_ADMIN,
  MEMBERSHIP_ROLES.PLACEMENT_COORDINATOR
];

// All staff opportunity routes require authentication, org context, and staff membership
router.use(protect, attachOrganization, authorizeMemberships(...STAFF_ROLES));

router.get('/', opportunityController.listAdmin);

router.post('/', validate(createOpportunityValidator), opportunityController.createAdmin);

router.get('/:id', validate(validateObjectId('id')), opportunityController.getByIdAdmin);

router.patch(
  '/:id',
  validate(validateObjectId('id')),
  validate(updateOpportunityValidator),
  opportunityController.updateAdmin
);

router.post(
  '/:id/publish',
  validate(validateObjectId('id')),
  opportunityController.publishAdmin
);

router.post(
  '/:id/close',
  validate(validateObjectId('id')),
  opportunityController.closeAdmin
);

router.post(
  '/:id/archive',
  validate(validateObjectId('id')),
  opportunityController.archiveAdmin
);

// Staff cohort view of eligibility for an opportunity
router.get(
  '/:id/eligibility-results',
  validate(validateObjectId('id')),
  eligibilityController.getEligibilityCohortAdmin
);

// Staff eligibility override
router.post(
  '/eligibility/:evaluationId/override',
  validate(validateObjectId('evaluationId')),
  eligibilityController.overrideEligibilityAdmin
);

export default router;

