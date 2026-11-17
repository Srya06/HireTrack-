import { Router } from 'express';
import * as notificationController from '../controllers/notification.controller.js';
import { protect } from '../middleware/auth.middleware.js';
import { validate } from '../middleware/validate.middleware.js';
import { validateObjectId } from '../validators/common.validator.js';

const router = Router();

// All notification routes require authentication
router.use(protect);

// GET /notifications (paginated, unreadCount, owner only)
router.get('/', notificationController.getNotifications);

// PATCH /notifications/read-all (mark all own notifications as read - MUST be before /:id)
router.patch('/read-all', notificationController.markAllAsRead);

// PATCH /notifications/:id/read (mark single notification as read - owner only)
router.patch('/:id/read', validate(validateObjectId('id')), notificationController.markAsRead);

export default router;

