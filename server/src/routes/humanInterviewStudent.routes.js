import { Router } from 'express';
import { protect } from '../middleware/auth.middleware.js';
import { attachOrganization } from '../middleware/org.middleware.js';
import { validate } from '../middleware/validate.middleware.js';
import { validateObjectId } from '../validators/common.validator.js';
import * as humanInterviewController from '../controllers/humanInterview.controller.js';

const router = Router();

// Student human interview routes require authentication and organization context
router.use(protect, attachOrganization);

// Slots & bookings
router.get('/slots', humanInterviewController.getAvailableSlots);
router.post('/bookings', humanInterviewController.bookSlot);
router.get('/bookings/me', humanInterviewController.getStudentHistory);
router.post('/bookings/:id/cancel', validate(validateObjectId('id')), humanInterviewController.cancelBooking);

// Released feedback
router.get('/bookings/:id/feedback', validate(validateObjectId('id')), humanInterviewController.getStudentFeedback);

export default router;

