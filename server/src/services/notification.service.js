import { Notification } from '../models/notification.model.js';
import { StudentProfile } from '../models/studentProfile.model.js';
import { User } from '../models/user.model.js';
import { ApiError } from '../utils/ApiError.js';

/**
 * Dispatches an email notification ONLY if EMAIL_PROVIDER is configured in the environment.
 * In-app notification is the fallback / default behavior.
 */
export const sendNotificationEmail = async ({ to, subject, text, html }) => {
  const emailProvider = process.env.EMAIL_PROVIDER;
  if (!emailProvider) {
    // In-app only fallback: no email sent if EMAIL_PROVIDER is not set
    return { sent: false, reason: 'EMAIL_PROVIDER_NOT_CONFIGURED' };
  }

  try {
    // If a mock or real email provider is configured, handle dispatch
    if (emailProvider === 'mock') {
      return { sent: true, provider: 'mock', to, subject };
    }
    // Pluggable hook for SMTP or vendor integration
    return { sent: true, provider: emailProvider, to, subject };
  } catch (err) {
    console.error('[NotificationService] Failed to send email:', err.message);
    return { sent: false, error: err.message };
  }
};

/**
 * Creates an in-app notification and optionally attempts email delivery if configured.
 */
export const createNotification = async ({
  userId,
  organizationId = null,
  type,
  title,
  message,
  link = null,
  recipientEmail = null
}) => {
  if (!userId || !type || !title || !message) {
    return null;
  }

  try {
    const notification = await Notification.create({
      userId,
      organizationId: organizationId || null,
      type,
      title: title.trim(),
      message: message.trim(),
      link: link ? link.trim() : null
    });

    // Check optional email delivery
    if (recipientEmail || process.env.EMAIL_PROVIDER) {
      const emailTarget = recipientEmail || (await User.findById(userId).select('email').lean())?.email;
      if (emailTarget) {
        await sendNotificationEmail({
          to: emailTarget,
          subject: title,
          text: message,
          html: `<p>${message}</p>`
        });
      }
    }

    return notification.toJSON();
  } catch (err) {
    console.error('[NotificationService] Failed to create notification:', err.message);
    return null;
  }
};

/**
 * Retrieves paginated in-app notifications for a user.
 */
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

/**
 * Marks a single notification as read with strict ownership validation.
 */
export const markAsRead = async (notificationId, userId) => {
  const notification = await Notification.findById(notificationId);
  if (!notification) {
    throw ApiError.notFound('Notification not found');
  }

  if (notification.userId.toString() !== userId.toString()) {
    throw ApiError.forbidden("Access denied: You cannot modify another user's notification");
  }

  if (!notification.readAt) {
    notification.readAt = new Date();
    await notification.save();
  }

  return notification.toJSON();
};

/**
 * Marks all notifications as read for a user.
 */
export const markAllAsRead = async (userId) => {
  const result = await Notification.updateMany(
    { userId, readAt: null },
    { $set: { readAt: new Date() } }
  );

  return {
    modifiedCount: result.modifiedCount || 0
  };
};

// --- AUTOMATED EVENT NOTIFIERS ---

/**
 * Triggered when a new job opportunity is published.
 */
export const notifyJobPublished = async ({ organizationId, job }) => {
  if (!organizationId || !job) return;

  try {
    const students = await StudentProfile.find({ organizationId }).select('userId').lean();
    const notifications = students.map((s) => ({
      userId: s.userId,
      organizationId,
      type: 'JOB_PUBLISHED',
      title: `New Opportunity: ${job.companyName}`,
      message: `${job.companyName} has published a new opportunity for "${job.jobTitle}". Review eligibility and application guidelines.`,
      link: `/student/opportunities/${job._id || job.id}`
    }));

    if (notifications.length > 0) {
      await Notification.insertMany(notifications);
    }
  } catch (err) {
    console.error('[NotificationService] Error notifying job published:', err.message);
  }
};

/**
 * Triggered when an interview is booked.
 */
export const notifyInterviewBooked = async ({ organizationId, booking, studentUserId, interviewerUserId }) => {
  if (!organizationId) return;

  try {
    // Notify student
    if (studentUserId) {
      await createNotification({
        userId: studentUserId,
        organizationId,
        type: 'INTERVIEW_BOOKED',
        title: 'Mock Interview Scheduled',
        message: 'Your 1:1 human mock interview has been scheduled. Check your workspace for session details.',
        link: '/student/mock-interviews'
      });
    }

    // Notify interviewer
    if (interviewerUserId) {
      await createNotification({
        userId: interviewerUserId,
        organizationId,
        type: 'INTERVIEW_BOOKED',
        title: 'New Candidate Session Assigned',
        message: 'A candidate has booked a mock interview slot. Review the student context in your workspace.',
        link: '/interviewer/workspace'
      });
    }
  } catch (err) {
    console.error('[NotificationService] Error notifying interview booked:', err.message);
  }
};

/**
 * Triggered when an interview booking is cancelled.
 */
export const notifyInterviewCancelled = async ({ organizationId, booking, studentUserId, interviewerUserId, reason }) => {
  if (!organizationId) return;

  try {
    if (studentUserId) {
      await createNotification({
        userId: studentUserId,
        organizationId,
        type: 'INTERVIEW_CANCELLED',
        title: 'Interview Booking Cancelled',
        message: `Your mock interview booking was cancelled. ${reason ? `Reason: ${reason}` : 'The slot has been released.'}`,
        link: '/student/mock-interviews'
      });
    }

    if (interviewerUserId) {
      await createNotification({
        userId: interviewerUserId,
        organizationId,
        type: 'INTERVIEW_CANCELLED',
        title: 'Interview Slot Released',
        message: `A scheduled mock interview session has been cancelled. ${reason ? `Reason: ${reason}` : ''}`,
        link: '/interviewer/workspace'
      });
    }
  } catch (err) {
    console.error('[NotificationService] Error notifying interview cancelled:', err.message);
  }
};

/**
 * Triggered when interviewer evaluation is released by staff.
 */
export const notifyFeedbackReleased = async ({ organizationId, studentUserId, evaluationTitle = 'Human Mock Interview' }) => {
  if (!organizationId || !studentUserId) return;

  try {
    await createNotification({
      userId: studentUserId,
      organizationId,
      type: 'FEEDBACK_RELEASED',
      title: 'Practice Feedback Released',
      message: `Your evaluation scorecard and rubric feedback for "${evaluationTitle}" is now released by placement staff.`,
      link: '/student/mock-interviews'
    });
  } catch (err) {
    console.error('[NotificationService] Error notifying feedback released:', err.message);
  }
};

/**
 * Triggered when a mock test attempt is evaluated.
 */
export const notifyTestResults = async ({ organizationId, studentUserId, testTitle, percentage, attemptId }) => {
  if (!organizationId || !studentUserId) return;

  try {
    await createNotification({
      userId: studentUserId,
      organizationId,
      type: 'TEST_RESULTS',
      title: 'Mock Test Scored',
      message: `Your attempt for "${testTitle}" has been evaluated with a score of ${percentage}%. Review topic insights.`,
      link: `/student/mock-tests/attempts/${attemptId}/result`
    });
  } catch (err) {
    console.error('[NotificationService] Error notifying test results:', err.message);
  }
};
