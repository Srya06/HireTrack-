import { Router } from 'express';
import * as opportunityController from '../controllers/opportunity.controller.js';
import { protect } from '../middleware/auth.middleware.js';
import { attachOrganization } from '../middleware/org.middleware.js';
import { validate } from '../middleware/validate.middleware.js';
import { validateObjectId } from '../validators/common.validator.js';

const router = Router();

// Student-accessible opportunity endpoints (published/closed/expired; DRAFT and ARCHIVED hidden)
router.get('/', protect, attachOrganization, opportunityController.listStudent);

router.get(
  '/:id',
  protect,
  attachOrganization,
  validate(validateObjectId('id')),
  opportunityController.getByIdStudent
);

export default router;
