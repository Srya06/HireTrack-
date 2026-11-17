import { asyncHandler } from '../utils/asyncHandler.js';
import { sendSuccess } from '../utils/response.js';
import * as notificationService from '../services/notification.service.js';

export const getNotifications = asyncHandler(async (req, res) => {
  const { page, limit, unreadOnly } = req.query;
  const result = await notificationService.getNotifications(req.user._id, {
    page,
    limit,
    unreadOnly: unreadOnly === 'true' || unreadOnly === true
  });

  return sendSuccess(res, {
    statusCode: 200,
    message: 'Notifications retrieved successfully',
    data: {
      notifications: result.notifications,
      unreadCount: result.unreadCount
    },
    pagination: result.pagination
  });
});

export const markAsRead = asyncHandler(async (req, res) => {
  const result = await notificationService.markAsRead(req.params.id, req.user._id);
  return sendSuccess(res, {
    statusCode: 200,
    message: 'Notification marked as read',
    data: result
  });
});

export const markAllAsRead = asyncHandler(async (req, res) => {
  const result = await notificationService.markAllAsRead(req.user._id);
  return sendSuccess(res, {
    statusCode: 200,
    message: 'All notifications marked as read',
    data: result
  });
});

