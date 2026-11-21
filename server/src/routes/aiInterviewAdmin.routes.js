import { Router } from 'express';
import { protect } from '../middleware/auth.middleware.js';
import { attachOrganization, authorizeMemberships } from '../middleware/org.middleware.js';
import { validate } from '../middleware/validate.middleware.js';
import { validateObjectId } from '../validators/common.validator.js';
import { MEMBERSHIP_ROLES } from '../utils/constants.js';
import * as aiInterviewController from '../controllers/aiInterview.controller.js';

const router = Router();

const STAFF_ROLES = [
  MEMBERSHIP_ROLES.ORG_ADMIN,
  MEMBERSHIP_ROLES.PLACEMENT_COORDINATOR
];

// Scope middleware specifically to the track & session endpoints
router.use(
  ['/interview-tracks', '/ai-interviews'],
  protect,
  attachOrganization,
  authorizeMemberships(...STAFF_ROLES)
);

// Tracks CRUD
router.get('/interview-tracks', aiInterviewController.listTracks);
router.post('/interview-tracks', aiInterviewController.createTrack);
router.get(
  '/interview-tracks/:id',
  validate(validateObjectId('id')),
  aiInterviewController.getTrackById
);
router.patch(
  '/interview-tracks/:id',
  validate(validateObjectId('id')),
  aiInterviewController.updateTrack
);
router.delete(
  '/interview-tracks/:id',
  validate(validateObjectId('id')),
  aiInterviewController.archiveTrack
);

// Session inspection
router.get(
  '/ai-interviews/sessions/:id/transcript',
  validate(validateObjectId('id')),
  aiInterviewController.getSessionTranscript
);
router.get(
  '/ai-interviews/sessions/:id/feedback',
  validate(validateObjectId('id')),
  aiInterviewController.getSessionFeedback
);

export default router;

