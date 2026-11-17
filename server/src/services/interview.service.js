import { Interview } from '../models/interview.model.js';
import { Application } from '../models/application.model.js';
import { ApiError } from '../utils/ApiError.js';
import { validateStatusTransition } from './statusTransition.service.js';
import { createNotification } from './notification.service.js';
import { ROLES, APPLICATION_STATUSES, INTERVIEW_STATUSES } from '../utils/constants.js';

export const scheduleInterview = async (
  applicationId,
  user,
  { scheduledAt, mode, locationOrLink, notes }
) => {
  const application = await Application.findById(applicationId).populate('jobId');
  if (!application) {
    throw ApiError.notFound('Application not found');
  }

  // Owning recruiter only
  if (user.role === ROLES.RECRUITER && application.jobId.recruiterId.toString() !== user._id.toString()) {
    throw ApiError.forbidden("Access denied: You cannot schedule interviews for another recruiter's applicant");
  }

  // If application is not already in interview_scheduled, advance status through transition service
  if (application.status !== APPLICATION_STATUSES.INTERVIEW_SCHEDULED) {
    const transition = validateStatusTransition(
      application.status,
      APPLICATION_STATUSES.INTERVIEW_SCHEDULED
    );
    if (!transition.isValid) {
      throw ApiError.badRequest(
        `Cannot schedule interview: Candidate status must be transitioned first (${transition.reason})`
      );
    }

    application.status = APPLICATION_STATUSES.INTERVIEW_SCHEDULED;
    application.statusHistory.push({
      status: APPLICATION_STATUSES.INTERVIEW_SCHEDULED,
      changedBy: user._id,
      note: `Interview scheduled for ${new Date(scheduledAt).toISOString()}`,
      changedAt: new Date()
    });

    await application.save();
  }

  const interview = await Interview.create({
    applicationId: application._id,
    scheduledBy: user._id,
    scheduledAt: new Date(scheduledAt),
    mode,
    locationOrLink: locationOrLink ? locationOrLink.trim() : '',
    notes: notes ? notes.trim() : '',
    status: INTERVIEW_STATUSES.SCHEDULED
  });

  // Notify candidate of interview
  try {
    const jobTitle = application.jobId?.title || 'Job';
    const dateFormatted = new Date(scheduledAt).toLocaleString('en-US', {
      dateStyle: 'medium',
      timeStyle: 'short'
    });
    await createNotification({
      userId: application.studentId,
      type: 'interview_scheduled',
      title: 'Interview Scheduled',
      message: `An interview for "${jobTitle}" has been scheduled for ${dateFormatted} (${mode}).`,
      link: `/student/applications/${application._id}`
    });
  } catch (err) {
    console.error('[InterviewService] Failed to send interview notification:', err.message);
  }

  return {
    interview: interview.toJSON(),
    application: application.toJSON()
  };
};

export const getApplicationInterviews = async (applicationId, user) => {
  const application = await Application.findById(applicationId).populate('jobId');
  if (!application) {
    throw ApiError.notFound('Application not found');
  }

  const isStudent =
    user.role === ROLES.STUDENT && application.studentId.toString() === user._id.toString();
  const isRecruiterOwner =
    user.role === ROLES.RECRUITER &&
    application.jobId?.recruiterId?.toString() === user._id.toString();
  const isAdmin = user.role === ROLES.ADMIN;

  if (!isStudent && !isRecruiterOwner && !isAdmin) {
    throw ApiError.forbidden('Access denied: You do not have permission to view these interviews');
  }

  const interviews = await Interview.find({ applicationId: application._id }).sort({ scheduledAt: 1 });
  return interviews.map((i) => i.toJSON());
};

export const updateInterview = async (interviewId, user, updateData) => {
  const interview = await Interview.findById(interviewId).populate({
    path: 'applicationId',
    populate: { path: 'jobId' }
  });

  if (!interview) {
    throw ApiError.notFound('Interview not found');
  }

  const recruiterId = interview.applicationId?.jobId?.recruiterId?.toString();
  if (user.role === ROLES.RECRUITER && recruiterId !== user._id.toString()) {
    throw ApiError.forbidden("Access denied: You cannot modify another recruiter's interview");
  }

  if (updateData.scheduledAt) {
    interview.scheduledAt = new Date(updateData.scheduledAt);
    interview.status = INTERVIEW_STATUSES.RESCHEDULED;
  }

  if (updateData.mode) interview.mode = updateData.mode;
  if (updateData.locationOrLink !== undefined) interview.locationOrLink = updateData.locationOrLink.trim();
  if (updateData.notes !== undefined) interview.notes = updateData.notes.trim();
  if (updateData.status) interview.status = updateData.status;

  await interview.save();
  return interview.toJSON();
};

export const cancelInterview = async (interviewId, user) => {
  const interview = await Interview.findById(interviewId).populate({
    path: 'applicationId',
    populate: { path: 'jobId' }
  });

  if (!interview) {
    throw ApiError.notFound('Interview not found');
  }

  const recruiterId = interview.applicationId?.jobId?.recruiterId?.toString();
  if (user.role === ROLES.RECRUITER && recruiterId !== user._id.toString()) {
    throw ApiError.forbidden("Access denied: You cannot cancel another recruiter's interview");
  }

  interview.status = INTERVIEW_STATUSES.CANCELLED;
  await interview.save();
  return interview.toJSON();
};

