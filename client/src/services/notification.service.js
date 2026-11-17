import api from './api.js';

/**
 * Fetch paginated notifications for current user with unreadCount
 * @param {object} params - { page, limit, unreadOnly }
 */
export const getNotifications = async (params = {}) => {
  const response = await api.get('/notifications', { params });
  return response;
};

/**
 * Mark a single notification as read (owner only)
 * @param {string} id
 */
export const markAsRead = async (id) => {
  const response = await api.patch(`/notifications/${id}/read`);
  return response;
};

/**
 * Mark all notifications as read for current user
 */
export const markAllAsRead = async () => {
  const response = await api.patch('/notifications/read-all');
  return response;
};

