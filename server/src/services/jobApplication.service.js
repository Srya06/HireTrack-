import { JobApplication } from '../models/jobApplication.model.js';
import { JobOpportunity } from '../models/jobOpportunity.model.js';
import { StudentProfile } from '../models/studentProfile.model.js';
import { ApiError } from '../utils/ApiError.js';
import { findByIdInOrg, paginateInOrg, scopeOrg } from '../utils/orgScope.js';
import { recordAuditEvent } from './audit.service.js';
import {
  JOB_APPLICATION_STATUSES,
  JOB_APPLICATION_VERIFICATION,
  ERROR_CODES
} from '../utils/constants.js';

/**
 * Student: Upsert own application status for a job opportunity.
 * Enforces unique (studentProfileId, jobOpportunityId) - one current record with history appended.
 */
export const recordApplicationStatus = async (
  organizationId,
  studentUser,
  opportunityId,
  { status = JOB_APPLICATION_STATUSES.APPLIED, notes = '' } = {}
) => {
  const opportunity = await findByIdInOrg(JobOpportunity, opportunityId, organizationId);
  if (!opportunity) {
    throw ApiError.notFound('Opportunity not found', [], ERROR_CODES.NOT_FOUND);
  }

  // Validate status
  if (!Object.values(JOB_APPLICATION_STATUSES).includes(status)) {
    throw ApiError.badRequest(
      `Invalid application status: ${status}`,
      [{ field: 'status', message: `Must be one of: ${Object.values(JOB_APPLICATION_STATUSES).join(', ')}` }],
      ERROR_CODES.VALIDATION_ERROR
    );
  }

  // Validate notes length
  const trimmedNotes = String(notes || '').trim();
  if (trimmedNotes.length > 500) {
    throw ApiError.badRequest(
      'Application notes cannot exceed 500 characters',
      [{ field: 'notes', message: 'Notes length limit is 500 characters' }],
      ERROR_CODES.VALIDATION_ERROR
    );
  }

  // Fetch or ensure student profile
  let studentProfile = await StudentProfile.findOne(
    scopeOrg(organizationId, { userId: studentUser._id })
  );

  if (!studentProfile) {
    studentProfile = await StudentProfile.create({
      userId: studentUser._id,
      organizationId,
      studentCode: studentUser.studentId || `STU-${Date.now()}`,
      fullName: studentUser.name || 'Candidate'
    });
  }

  // Check for existing application
  let application = await JobApplication.findOne(
    scopeOrg(organizationId, {
      studentProfileId: studentProfile._id,
      jobOpportunityId: opportunity._id
    })
  );

  const now = new Date();

  if (application) {
    // Append new status transition to history if status or notes changed
    if (application.status !== status || application.notes !== trimmedNotes) {
      application.statusHistory.push({
        status,
        changedAt: now,
        notes: trimmedNotes,
        changedBy: studentUser._id
      });
    }

    application.status = status;
    application.notes = trimmedNotes;
    if (status === JOB_APPLICATION_STATUSES.APPLIED && !application.applicationDate) {
      application.applicationDate = now;
    }

    await application.save();
  } else {
    // Create initial application record
    application = new JobApplication({
      organizationId,
      studentProfileId: studentProfile._id,
      studentId: studentUser._id,
      jobOpportunityId: opportunity._id,
      status,
      applicationDate: status === JOB_APPLICATION_STATUSES.APPLIED ? now : null,
      notes: trimmedNotes,
      verificationStatus: JOB_APPLICATION_VERIFICATION.UNVERIFIED,
      statusHistory: [
        {
          status,
          changedAt: now,
          notes: trimmedNotes,
          changedBy: studentUser._id
        }
      ]
    });

    await application.save();
  }

  await recordAuditEvent({
    organizationId,
    actorId: studentUser._id,
    action: 'JOB_APPLICATION_STATUS_UPDATED',
    entityType: 'JobApplication',
    entityId: application._id,
    metadata: {
      opportunityId: opportunity._id,
      jobTitle: opportunity.jobTitle,
      companyName: opportunity.companyName,
      status: application.status
    },
    allowedMetadataKeys: ['opportunityId', 'jobTitle', 'companyName', 'status']
  });

  const populated = await JobApplication.findById(application._id)
    .populate('jobOpportunityId', 'companyName jobTitle location workMode compensationText deadline status applicationUrl')
    .populate('studentProfileId', 'studentCode fullName branch graduationYear cgpa');

  return populated.toJSON();
};

/**
 * Student: Track link click on external application link (no gating).
 */
export const recordApplicationLinkClick = async (organizationId, studentUser, opportunityId) => {
  const opportunity = await findByIdInOrg(JobOpportunity, opportunityId, organizationId);
  if (!opportunity) {
    throw ApiError.notFound('Opportunity not found', [], ERROR_CODES.NOT_FOUND);
  }

  let studentProfile = await StudentProfile.findOne(
    scopeOrg(organizationId, { userId: studentUser._id })
  );

  if (!studentProfile) {
    studentProfile = await StudentProfile.create({
      userId: studentUser._id,
      organizationId,
      studentCode: studentUser.studentId || `STU-${Date.now()}`,
      fullName: studentUser.name || 'Candidate'
    });
  }

  const now = new Date();

  const application = await JobApplication.findOneAndUpdate(
    scopeOrg(organizationId, {
      studentProfileId: studentProfile._id,
      jobOpportunityId: opportunity._id
    }),
    {
      $inc: { clickCount: 1 },
      $set: { lastClickedAt: now },
      $setOnInsert: {
        organizationId,
        studentProfileId: studentProfile._id,
        studentId: studentUser._id,
        jobOpportunityId: opportunity._id,
        status: JOB_APPLICATION_STATUSES.INTERESTED,
        verificationStatus: JOB_APPLICATION_VERIFICATION.UNVERIFIED,
        notes: 'Opened employer application portal',
        statusHistory: [
          {
            status: JOB_APPLICATION_STATUSES.INTERESTED,
            changedAt: now,
            notes: 'Opened employer application portal',
            changedBy: studentUser._id
          }
        ]
      }
    },
    { upsert: true, new: true }
  );

  return {
    clickCount: application.clickCount,
    lastClickedAt: application.lastClickedAt,
    opportunityUrl: opportunity.applicationUrl
  };
};

/**
 * Student: Get list of own job applications with timeline history.
 */
export const getStudentJobApplications = async (
  organizationId,
  studentUserId,
  { page = 1, limit = 20, status } = {}
) => {
  const filter = { studentId: studentUserId };
  if (status) {
    filter.status = status;
  }

  const result = await paginateInOrg(
    JobApplication,
    filter,
    organizationId,
    {
      page,
      limit,
      sort: { updatedAt: -1 },
      populate: {
        path: 'jobOpportunityId',
        select: 'companyName jobTitle location workMode compensationText deadline status applicationUrl applicationInstructions'
      }
    }
  );

  return {
    applications: result.items || [],
    pagination: result.pagination
  };
};

/**
 * Staff: Aggregate report & student-level list of student-reported applications.
 */
export const getAdminApplicationsReport = async (
  organizationId,
  { page = 1, limit = 20, status, verificationStatus, opportunityId, q } = {}
) => {
  const filter = {};

  if (status) {
    filter.status = status;
  }
  if (verificationStatus) {
    filter.verificationStatus = verificationStatus;
  }
  if (opportunityId) {
    filter.jobOpportunityId = opportunityId;
  }

  // Aggregate counts for staff dashboard cards
  const [totalApplications, appliedCount, interestedCount, notProceedingCount, withdrawnCount, verifiedCount, unverifiedCount] =
    await Promise.all([
      JobApplication.countDocuments(scopeOrg(organizationId, filter)),
      JobApplication.countDocuments(scopeOrg(organizationId, { status: JOB_APPLICATION_STATUSES.APPLIED })),
      JobApplication.countDocuments(scopeOrg(organizationId, { status: JOB_APPLICATION_STATUSES.INTERESTED })),
      JobApplication.countDocuments(scopeOrg(organizationId, { status: JOB_APPLICATION_STATUSES.NOT_PROCEEDING })),
      JobApplication.countDocuments(scopeOrg(organizationId, { status: JOB_APPLICATION_STATUSES.WITHDRAWN })),
      JobApplication.countDocuments(scopeOrg(organizationId, { verificationStatus: JOB_APPLICATION_VERIFICATION.VERIFIED })),
      JobApplication.countDocuments(scopeOrg(organizationId, { verificationStatus: JOB_APPLICATION_VERIFICATION.UNVERIFIED }))
    ]);

  const summary = {
    totalApplications,
    appliedCount,
    interestedCount,
    notProceedingCount,
    withdrawnCount,
    verifiedCount,
    unverifiedCount
  };

  const result = await paginateInOrg(
    JobApplication,
    filter,
    organizationId,
    {
      page,
      limit,
      sort: { updatedAt: -1 },
      populate: [
        { path: 'studentId', select: 'name email role' },
        { path: 'studentProfileId', select: 'studentCode fullName branch graduationYear cgpa' },
        { path: 'jobOpportunityId', select: 'companyName jobTitle location workMode status' },
        { path: 'verifiedBy', select: 'name email' }
      ]
    }
  );

  return {
    summary,
    applications: result.items || [],
    pagination: result.pagination
  };
};

/**
 * Staff: Verify an application record (requires documented reason & audit log).
 */
export const verifyApplicationStaff = async (
  organizationId,
  actorUser,
  applicationId,
  { verificationStatus, reason }
) => {
  if (!reason || !String(reason).trim()) {
    throw ApiError.badRequest(
      'Verification reason is required',
      [{ field: 'reason', message: 'Audit explanation must be documented when verifying student applications' }],
      ERROR_CODES.VALIDATION_ERROR
    );
  }

  if (!verificationStatus || !Object.values(JOB_APPLICATION_VERIFICATION).includes(verificationStatus)) {
    throw ApiError.badRequest(
      `Invalid verification status: ${verificationStatus}`,
      [{ field: 'verificationStatus', message: `Must be one of: ${Object.values(JOB_APPLICATION_VERIFICATION).join(', ')}` }],
      ERROR_CODES.VALIDATION_ERROR
    );
  }

  const application = await findByIdInOrg(JobApplication, applicationId, organizationId);
  if (!application) {
    throw ApiError.notFound('Job application not found', [], ERROR_CODES.NOT_FOUND);
  }

  application.verificationStatus = verificationStatus;
  application.verificationReason = String(reason).trim();
  application.verifiedBy = actorUser._id;
  application.verifiedAt = new Date();

  await application.save();

  await recordAuditEvent({
    organizationId,
    actorId: actorUser._id,
    action: 'JOB_APPLICATION_VERIFIED',
    entityType: 'JobApplication',
    entityId: application._id,
    metadata: {
      studentId: application.studentId,
      opportunityId: application.jobOpportunityId,
      verificationStatus,
      reason: String(reason).trim()
    },
    allowedMetadataKeys: ['studentId', 'opportunityId', 'verificationStatus', 'reason']
  });

  const populated = await JobApplication.findById(application._id)
    .populate('studentId', 'name email')
    .populate('studentProfileId', 'studentCode fullName branch graduationYear cgpa')
    .populate('jobOpportunityId', 'companyName jobTitle')
    .populate('verifiedBy', 'name email');

  return populated.toJSON();
};
