import { Application } from '../models/application.model.js';
import { Job } from '../models/job.model.js';
import { StudentProfile } from '../models/studentProfile.model.js';
import { ApiError } from '../utils/ApiError.js';
import { checkEligibility } from './eligibility.service.js';
import { validateStatusTransition, isTerminalStatus } from './statusTransition.service.js';
import { isStudentProfileComplete } from '../utils/profileCompleteness.js';
import { ROLES, JOB_STATUSES, APPLICATION_STATUSES } from '../utils/constants.js';

export const applyToJob = async (jobId, studentUser, studentProfile, { coverLetter } = {}) => {
  // 1. Check profile completeness & resume presence
  if (!studentProfile || !isStudentProfileComplete(studentProfile)) {
    throw ApiError.badRequest(
      'Incomplete student profile. Please ensure all academic details and a resume are completed before applying.'
    );
  }

  if (!studentProfile.resume || !studentProfile.resume.url) {
    throw ApiError.badRequest('A resume is required to submit a job application.');
  }

  // 2. Load Job and check discoverability
  const job = await Job.findById(jobId);
  if (!job) {
    throw ApiError.notFound('Job posting not found');
  }

  if (job.status !== JOB_STATUSES.PUBLISHED || new Date(job.applicationDeadline) <= new Date()) {
    throw ApiError.badRequest('This job posting is closed or its application deadline has passed.');
  }

  // 3. Eligibility check
  const eligibility = checkEligibility(studentProfile, job);
  if (!eligibility.isEligible) {
    throw ApiError.badRequest(
      `You are not eligible for this job: ${eligibility.reasons.join('; ')}`,
      eligibility.reasons.map((r) => ({ message: r }))
    );
  }

  // 4. Duplicate check (prevent duplicate application or reapply after withdrawal)
  const existingApp = await Application.findOne({ jobId: job._id, studentId: studentUser._id });
  if (existingApp) {
    throw ApiError.conflict(
      existingApp.status === APPLICATION_STATUSES.WITHDRAWN
        ? 'You have already withdrawn from this job. Reapplication is not permitted.'
        : 'You have already applied for this job. Duplicate applications are not permitted.'
    );
  }

  // 5. Create application with resume snapshot and first history entry
  try {
    const application = await Application.create({
      jobId: job._id,
      studentId: studentUser._id,
      resumeSnapshot: {
        url: studentProfile.resume.url,
        publicId: studentProfile.resume.publicId,
        fileName: studentProfile.resume.fileName,
        mimeType: studentProfile.resume.mimeType,
        size: studentProfile.resume.size,
        uploadedAt: studentProfile.resume.uploadedAt || new Date()
      },
      coverLetter: coverLetter ? coverLetter.trim() : '',
      status: APPLICATION_STATUSES.APPLIED,
      statusHistory: [
        {
          status: APPLICATION_STATUSES.APPLIED,
          changedBy: studentUser._id,
          note: 'Application submitted',
          changedAt: new Date()
        }
      ],
      appliedAt: new Date()
    });

    return application.toJSON();
  } catch (err) {
    // Map database duplicate key error to 409
    if (err.code === 11000) {
      throw ApiError.conflict('You have already applied for this job. Duplicate applications are not permitted.');
    }
    throw err;
  }
};

export const getStudentApplications = async (studentId, { page = 1, limit = 10 } = {}) => {
  const pageNum = Math.max(1, parseInt(page, 10) || 1);
  const limitNum = Math.min(100, Math.max(1, parseInt(limit, 10) || 10));
  const skip = (pageNum - 1) * limitNum;

  const [total, applications] = await Promise.all([
    Application.countDocuments({ studentId }),
    Application.find({ studentId })
      .populate('jobId', 'title companyName location employmentType ctc status applicationDeadline')
      .sort({ appliedAt: -1 })
      .skip(skip)
      .limit(limitNum)
  ]);

  const totalPages = Math.ceil(total / limitNum) || 1;

  // Sanitize statusHistory for students: hide recruiter internal notes
  const sanitizedApplications = applications.map((app) => {
    const appObj = app.toJSON();
    if (Array.isArray(appObj.statusHistory)) {
      appObj.statusHistory = appObj.statusHistory.map((h) => ({
        status: h.status,
        changedAt: h.changedAt
      }));
    }
    return appObj;
  });

  return {
    applications: sanitizedApplications,
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

export const getJobApplicants = async (jobId, recruiterUser, { page = 1, limit = 10, status } = {}) => {
  const job = await Job.findById(jobId);
  if (!job) {
    throw ApiError.notFound('Job posting not found');
  }

  // Ownership check: only owning recruiter or admin
  if (recruiterUser.role === ROLES.RECRUITER && job.recruiterId.toString() !== recruiterUser._id.toString()) {
    throw ApiError.forbidden("Access denied: You cannot view applicants for another recruiter's job");
  }

  const pageNum = Math.max(1, parseInt(page, 10) || 1);
  const limitNum = Math.min(100, Math.max(1, parseInt(limit, 10) || 10));
  const skip = (pageNum - 1) * limitNum;

  const filter = { jobId: job._id };
  if (status && Object.values(APPLICATION_STATUSES).includes(status)) {
    filter.status = status;
  }

  const [total, applications] = await Promise.all([
    Application.countDocuments(filter),
    Application.find(filter)
      .populate('studentId', 'name email')
      .sort({ appliedAt: -1 })
      .skip(skip)
      .limit(limitNum)
  ]);

  // Attach student profile info (CGPA, branch, etc.) for recruiters
  const studentUserIds = applications.map((a) => a.studentId?._id).filter(Boolean);
  const studentProfiles = await StudentProfile.find({ userId: { $in: studentUserIds } });
  const profileMap = new Map(studentProfiles.map((p) => [p.userId.toString(), p.toJSON()]));

  const enrichedApplications = applications.map((app) => {
    const appObj = app.toJSON();
    if (appObj.studentId && appObj.studentId.id) {
      appObj.studentProfile = profileMap.get(appObj.studentId.id.toString()) || null;
    }
    return appObj;
  });

  const totalPages = Math.ceil(total / limitNum) || 1;

  return {
    applicants: enrichedApplications,
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

export const getApplicationById = async (applicationId, currentUser) => {
  const application = await Application.findById(applicationId)
    .populate('jobId', 'title companyName location employmentType recruiterId')
    .populate('studentId', 'name email');

  if (!application) {
    throw ApiError.notFound('Application not found');
  }

  const isStudentOwner =
    currentUser.role === ROLES.STUDENT &&
    application.studentId._id.toString() === currentUser._id.toString();

  const isRecruiterOwner =
    currentUser.role === ROLES.RECRUITER &&
    application.jobId?.recruiterId?.toString() === currentUser._id.toString();

  const isAdmin = currentUser.role === ROLES.ADMIN;

  if (!isStudentOwner && !isRecruiterOwner && !isAdmin) {
    throw ApiError.forbidden('Access denied: You do not have permission to view this application');
  }

  const appObj = application.toJSON();

  // Hide recruiter notes from students
  if (currentUser.role === ROLES.STUDENT) {
    appObj.statusHistory = appObj.statusHistory.map((h) => ({
      status: h.status,
      changedAt: h.changedAt
    }));
  }

  return appObj;
};

export const updateApplicationStatus = async (applicationId, user, { status: newStatus, note }) => {
  const application = await Application.findById(applicationId).populate('jobId');
  if (!application) {
    throw ApiError.notFound('Application not found');
  }

  // Ownership check: must be owning recruiter or admin
  if (user.role === ROLES.RECRUITER && application.jobId.recruiterId.toString() !== user._id.toString()) {
    throw ApiError.forbidden("Access denied: You cannot update status for another recruiter's job applicants");
  }

  // State machine transition validation
  const transition = validateStatusTransition(application.status, newStatus);
  if (!transition.isValid) {
    throw ApiError.badRequest(transition.reason);
  }

  // Append history entry atomically
  application.status = newStatus;
  application.statusHistory.push({
    status: newStatus,
    changedBy: user._id,
    note: note ? note.trim() : `Status updated to ${newStatus}`,
    changedAt: new Date()
  });

  await application.save();
  return application.toJSON();
};

export const withdrawApplication = async (applicationId, studentUser) => {
  const application = await Application.findById(applicationId);
  if (!application) {
    throw ApiError.notFound('Application not found');
  }

  // Ownership check
  if (application.studentId.toString() !== studentUser._id.toString()) {
    throw ApiError.forbidden("Access denied: You cannot withdraw another student's application");
  }

  if (isTerminalStatus(application.status)) {
    throw ApiError.badRequest(
      `Cannot withdraw application because it is already in a terminal state (${application.status})`
    );
  }

  const transition = validateStatusTransition(application.status, APPLICATION_STATUSES.WITHDRAWN);
  if (!transition.isValid) {
    throw ApiError.badRequest(transition.reason);
  }

  application.status = APPLICATION_STATUSES.WITHDRAWN;
  application.statusHistory.push({
    status: APPLICATION_STATUSES.WITHDRAWN,
    changedBy: studentUser._id,
    note: 'Withdrawn by student',
    changedAt: new Date()
  });

  await application.save();
  return application.toJSON();
};
