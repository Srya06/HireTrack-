import { Router } from 'express';
import { protect } from '../middleware/auth.middleware.js';
import { attachOrganization } from '../middleware/org.middleware.js';
import { validate } from '../middleware/validate.middleware.js';
import { validateObjectId } from '../validators/common.validator.js';
import * as aiInterviewController from '../controllers/aiInterview.controller.js';

const router = Router();

// Student routes require authentication and organization context
router.use(protect, attachOrganization);

// Tracks discovery
router.get('/tracks', aiInterviewController.listActiveAiTracks);
router.get('/tracks/:id', validate(validateObjectId('id')), aiInterviewController.getTrackById);

// History
router.get('/history', aiInterviewController.getStudentHistory);

// Sessions
router.post('/sessions', aiInterviewController.startSession);
router.get('/sessions/:id', validate(validateObjectId('id')), aiInterviewController.getSessionDetails);
router.get('/sessions/:id/turns', validate(validateObjectId('id')), aiInterviewController.getSessionTranscript);
router.post('/sessions/:id/turns', validate(validateObjectId('id')), aiInterviewController.submitTurn);
router.post('/sessions/:id/complete', validate(validateObjectId('id')), aiInterviewController.completeSession);
router.post('/sessions/:id/retry-evaluation', validate(validateObjectId('id')), aiInterviewController.retryEvaluation);
router.get('/sessions/:id/feedback', validate(validateObjectId('id')), aiInterviewController.getSessionFeedback);

export default router;

