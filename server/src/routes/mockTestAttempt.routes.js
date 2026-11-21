import { Router } from 'express';
import { protect } from '../middleware/auth.middleware.js';
import { attachOrganization } from '../middleware/org.middleware.js';
import { validate } from '../middleware/validate.middleware.js';
import { validateObjectId } from '../validators/common.validator.js';
import * as mockTestAttemptController from '../controllers/mockTestAttempt.controller.js';

const router = Router();

// Student attempt routes require authentication and organization context
router.use(protect, attachOrganization);

router.get(
  '/:id',
  validate(validateObjectId('id')),
  mockTestAttemptController.getAttemptForStudent
);

router.put(
  '/:id/answers/:questionId',
  validate(validateObjectId('id')),
  validate(validateObjectId('questionId')),
  mockTestAttemptController.saveAnswer
);

router.post(
  '/:id/submit',
  validate(validateObjectId('id')),
  mockTestAttemptController.submitAttempt
);

router.get(
  '/:id/result',
  validate(validateObjectId('id')),
  mockTestAttemptController.getAttemptResult
);

export default router;

