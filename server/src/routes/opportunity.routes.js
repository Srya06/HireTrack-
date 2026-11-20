import { Router } from 'express';
import * as opportunityController from '../controllers/opportunity.controller.js';
import * as eligibilityController from '../controllers/eligibility.controller.js';
import { protect } from '../middleware/auth.middleware.js';
import { attachOrganization } from '../middleware/org.middleware.js';
import { validate } from '../middleware/validate.middleware.js';
import { validateObjectId } from '../validators/common.validator.js';

const router = Router();

// Student-accessible opportunity endpoints (published/closed/expired; DRAFT and ARCHIVED hidden)
router.get('/', protect, attachOrganization, opportunityController.listStudent);

// Student eligibility history across opportunities
router.get('/me/eligibility', protect, attachOrganization, eligibilityController.getMyEligibilityHistory);

router.get(
  '/:id',
  protect,
  attachOrganization,
  validate(validateObjectId('id')),
  opportunityController.getByIdStudent
);

// Student eligibility evaluation for specific opportunity
router.get(
  '/:id/eligibility',
  protect,
  attachOrganization,
  validate(validateObjectId('id')),
  eligibilityController.getEligibilityForOpportunity
);

router.post(
  '/:id/eligibility/evaluate',
  protect,
  attachOrganization,
  validate(validateObjectId('id')),
  eligibilityController.evaluateEligibilityForOpportunity
);

export default router;

