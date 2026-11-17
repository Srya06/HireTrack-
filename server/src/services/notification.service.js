import { Notification } from '../models/notification.model.js';
import { ApiError } from '../utils/ApiError.js';

export const createNotification = async ({ userId, type, title, message, link = null }) => {
  if (!userId || !type || !title || !message) {
    return null;
  }

  try {
    const notification = await Notification.create({
      userId,
      type,
      title: title.trim(),
      message: message.trim(),
      link: link ? link.trim() : null
    });
    return notification.toJSON();
  } catch (err) {
    console.error('[NotificationService] Failed to create notification:', err.message);
    return null;
  }
};

export const getNotifications = async (userId, { page = 1, limit = 20, unreadOnly = false } = {}) => {
  const pageNum = Math.max(1, parseInt(page, 10) || 1);
  const limitNum = Math.min(100, Math.max(1, parseInt(limit, 10) || 20));
  const skip = (pageNum - 1) * limitNum;

  const filter = { userId };
  if (unreadOnly) {
    filter.readAt = null;
  }

  const [total, unreadCount, notifications] = await Promise.all([
    Notification.countDocuments(filter),
    Notification.countDocuments({ userId, readAt: null }),
    Notification.find(filter)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limitNum)
  ]);

  const totalPages = Math.ceil(total / limitNum) || 1;

  return {
    notifications: notifications.map((n) => n.toJSON()),
    unreadCount,
    pagination: {
      page: pageNum,
      limit: limitNum,
      total,
      totalPages,
      hasNextPage: pageNum < totalPages,
      hasPrevPage: pageNum > 1
    }
  };
};

export const markAsRead = async (notificationId, userId) => {
  const notification = await Notification.findById(notificationId);
  if (!notification) {
    throw ApiError.notFound('Notification not found');
  }

  // Strict ownership check
  if (notification.userId.toString() !== userId.toString()) {
    throw ApiError.forbidden("Access denied: You cannot modify another user's notification");
  }

  if (!notification.readAt) {
    notification.readAt = new Date();
    await notification.save();
  }

  return notification.toJSON();
};

export const markAllAsRead = async (userId) => {
  const result = await Notification.updateMany(
    { userId, readAt: null },
    { $set: { readAt: new Date() } }
  );

  return {
    modifiedCount: result.modifiedCount || 0
  };
};

