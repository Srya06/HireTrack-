import { Router } from 'express';
import { protect } from '../middleware/auth.middleware.js';
import { attachOrganization, authorizeMemberships } from '../middleware/org.middleware.js';
import { validate } from '../middleware/validate.middleware.js';
import { validateObjectId } from '../validators/common.validator.js';
import { MEMBERSHIP_ROLES } from '../utils/constants.js';
import * as humanInterviewController from '../controllers/humanInterview.controller.js';

const router = Router();

const INTERVIEWER_ROLES = [
  MEMBERSHIP_ROLES.INTERVIEWER,
  MEMBERSHIP_ROLES.ORG_ADMIN,
  MEMBERSHIP_ROLES.PLACEMENT_COORDINATOR
];

// All interviewer routes require authenticated organization membership
router.use(protect, attachOrganization, authorizeMemberships(...INTERVIEWER_ROLES));

// Profile management
router.get('/profile', humanInterviewController.getInterviewerProfile);
router.patch('/profile', humanInterviewController.updateInterviewerProfile);

// Slot management
router.get('/slots', humanInterviewController.getInterviewerSlots);
router.post('/slots', humanInterviewController.createSlots);
router.delete('/slots/:id', validate(validateObjectId('id')), humanInterviewController.deleteInterviewerSlot);
router.patch('/slots/:id/block', validate(validateObjectId('id')), humanInterviewController.toggleSlotBlock);

// Assigned sessions & evaluation
router.get('/sessions', humanInterviewController.getInterviewerAssignedSessions);
router.get('/sessions/:id/student-context', validate(validateObjectId('id')), humanInterviewController.getStudentContext);
router.post('/sessions/:id/evaluation', validate(validateObjectId('id')), humanInterviewController.submitEvaluation);
router.get('/sessions/:id/evaluation', validate(validateObjectId('id')), humanInterviewController.getBookingEvaluation);

export default router;

