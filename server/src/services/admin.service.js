import {
  RecruiterProfile,
  User,
  Job,
  Application,
  StudentProfile
} from '../models/index.js';
import { ApiError } from '../utils/ApiError.js';
import { logAdminAction } from '../utils/auditLogger.js';
import {
  ROLES,
  USER_STATUSES,
  RECRUITER_APPROVAL_STATUSES,
  JOB_STATUSES,
  APPLICATION_STATUSES
} from '../utils/constants.js';

export const getPendingRecruiters = async ({ page = 1, limit = 10 } = {}) => {
  const pageNum = Math.max(1, parseInt(page, 10) || 1);
  const limitNum = Math.min(100, Math.max(1, parseInt(limit, 10) || 10));
  const skip = (pageNum - 1) * limitNum;

  const filter = { approvalStatus: RECRUITER_APPROVAL_STATUSES.PENDING };

  const [total, profiles] = await Promise.all([
    RecruiterProfile.countDocuments(filter),
    RecruiterProfile.find(filter)
      .populate('userId', 'name email accountStatus lastLoginAt createdAt')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limitNum)
  ]);

  const totalPages = Math.ceil(total / limitNum) || 1;

  return {
    recruiters: profiles.map((p) => p.toJSON()),
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

export const updateRecruiterApproval = async (recruiterProfileId, { approvalStatus }, adminUser) => {
  if (![RECRUITER_APPROVAL_STATUSES.APPROVED, RECRUITER_APPROVAL_STATUSES.REJECTED].includes(approvalStatus)) {
    throw ApiError.badRequest("approvalStatus must be either 'approved' or 'rejected'");
  }

  const profile = await RecruiterProfile.findById(recruiterProfileId);
  if (!profile) {
    throw ApiError.notFound('Recruiter profile not found');
  }

  const user = await User.findById(profile.userId);
  if (!user) {
    throw ApiError.notFound('Associated recruiter user account not found');
  }

  const previousStatus = profile.approvalStatus;

  // Sync statuses
  if (approvalStatus === RECRUITER_APPROVAL_STATUSES.APPROVED) {
    profile.approvalStatus = RECRUITER_APPROVAL_STATUSES.APPROVED;
    user.accountStatus = USER_STATUSES.ACTIVE;
  } else {
    profile.approvalStatus = RECRUITER_APPROVAL_STATUSES.REJECTED;
    user.accountStatus = USER_STATUSES.REJECTED;
  }

  profile.reviewedBy = adminUser._id;
  profile.reviewedAt = new Date();

  await Promise.all([profile.save(), user.save()]);

  // Log admin audit action
  await logAdminAction({
    actorId: adminUser._id,
    action: 'APPROVE_RECRUITER',
    resourceType: 'RecruiterProfile',
    resourceId: profile._id,
    metadata: {
      previousStatus,
      newStatus: approvalStatus,
      companyName: profile.companyName,
      recruiterEmail: user.email
    }
  });

  return {
    recruiter: profile.toJSON(),
    user: user.toJSON()
  };
};

/**
 * Real DB counts and live aggregations for Admin Overview dashboard (never hardcoded)
 */
export const getOverviewMetrics = async () => {
  const [
    students,
    approvedRecruiters,
    pendingRecruiters,
    activeJobs,
    totalJobs,
    applications,
    selectedStudents,
    applicationStatusAggregation
  ] = await Promise.all([
    User.countDocuments({ role: ROLES.STUDENT }),
    RecruiterProfile.countDocuments({ approvalStatus: RECRUITER_APPROVAL_STATUSES.APPROVED }),
    RecruiterProfile.countDocuments({ approvalStatus: RECRUITER_APPROVAL_STATUSES.PENDING }),
    Job.countDocuments({
      status: JOB_STATUSES.PUBLISHED,
      applicationDeadline: { $gt: new Date() }
    }),
    Job.countDocuments({}),
    Application.countDocuments({}),
    Application.countDocuments({ status: APPLICATION_STATUSES.SELECTED }),
    Application.aggregate([
      {
        $group: {
          _id: '$status',
          count: { $sum: 1 }
        }
      }
    ])
  ]);

  const statusBreakdown = {};
  for (const status of Object.values(APPLICATION_STATUSES)) {
    statusBreakdown[status] = 0;
  }
  for (const item of applicationStatusAggregation) {
    statusBreakdown[item._id] = item.count;
  }

  return {
    students,
    approvedRecruiters,
    pendingRecruiters,
    activeJobs,
    totalJobs,
    applications,
    selectedStudents,
    statusBreakdown
  };
};

export const getUsers = async ({ page = 1, limit = 10, role, status, q } = {}) => {
  const pageNum = Math.max(1, parseInt(page, 10) || 1);
  const limitNum = Math.min(100, Math.max(1, parseInt(limit, 10) || 10));
  const skip = (pageNum - 1) * limitNum;

  const filter = {};
  if (role && Object.values(ROLES).includes(role)) {
    filter.role = role;
  }
  if (status && Object.values(USER_STATUSES).includes(status)) {
    filter.accountStatus = status;
  }
  if (q && String(q).trim()) {
    const searchRegex = new RegExp(String(q).trim(), 'i');
    filter.$or = [{ name: searchRegex }, { email: searchRegex }];
  }

  const [total, users] = await Promise.all([
    User.countDocuments(filter),
    User.find(filter)
      .select('-__v')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limitNum)
  ]);

  const totalPages = Math.ceil(total / limitNum) || 1;

  return {
    users: users.map((u) => u.toJSON()),
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

export const updateUserStatus = async (targetUserId, { accountStatus }, adminUser) => {
  if (![USER_STATUSES.ACTIVE, USER_STATUSES.SUSPENDED].includes(accountStatus)) {
    throw ApiError.badRequest("accountStatus must be either 'active' or 'suspended'");
  }

  // Admin cannot suspend themselves
  if (targetUserId.toString() === adminUser._id.toString()) {
    throw ApiError.badRequest('Administrators cannot modify their own account status');
  }

  const user = await User.findById(targetUserId);
  if (!user) {
    throw ApiError.notFound('User not found');
  }

  // Admin cannot suspend another admin
  if (user.role === ROLES.ADMIN) {
    throw ApiError.forbidden('Cannot modify account status of another administrator');
  }

  const previousStatus = user.accountStatus;
  user.accountStatus = accountStatus;
  await user.save();

  // Log audit action
  await logAdminAction({
    actorId: adminUser._id,
    action: 'UPDATE_USER_STATUS',
    resourceType: 'User',
    resourceId: user._id,
    metadata: {
      targetEmail: user.email,
      targetRole: user.role,
      previousStatus,
      newStatus: accountStatus
    }
  });

  return user.toJSON();
};

export const getAllJobs = async ({ page = 1, limit = 10, status, q } = {}) => {
  const pageNum = Math.max(1, parseInt(page, 10) || 1);
  const limitNum = Math.min(100, Math.max(1, parseInt(limit, 10) || 10));
  const skip = (pageNum - 1) * limitNum;

  const filter = {};
  if (status && Object.values(JOB_STATUSES).includes(status)) {
    filter.status = status;
  }
  if (q && String(q).trim()) {
    const searchRegex = new RegExp(String(q).trim(), 'i');
    filter.$or = [{ title: searchRegex }, { companyName: searchRegex }];
  }

  const [total, jobs] = await Promise.all([
    Job.countDocuments(filter),
    Job.find(filter)
      .populate('recruiterId', 'name email')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limitNum)
  ]);

  const totalPages = Math.ceil(total / limitNum) || 1;

  return {
    jobs: jobs.map((j) => j.toJSON()),
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

export const updateJobStatus = async (jobId, { status }, adminUser) => {
  if (![JOB_STATUSES.PUBLISHED, JOB_STATUSES.CLOSED, JOB_STATUSES.ARCHIVED].includes(status)) {
    throw ApiError.badRequest(
      "Job status must be one of 'published', 'closed', or 'archived'"
    );
  }

  const job = await Job.findById(jobId);
  if (!job) {
    throw ApiError.notFound('Job posting not found');
  }

  const previousStatus = job.status;
  job.status = status;
  await job.save();

  // Log audit action
  await logAdminAction({
    actorId: adminUser._id,
    action: 'UPDATE_JOB_STATUS',
    resourceType: 'Job',
    resourceId: job._id,
    metadata: {
      jobTitle: job.title,
      companyName: job.companyName,
      previousStatus,
      newStatus: status
    }
  });

  return job.toJSON();
};
