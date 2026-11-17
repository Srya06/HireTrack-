import { Job } from '../models/job.model.js';
import { Application } from '../models/application.model.js';
import { ApiError } from '../utils/ApiError.js';
import { checkEligibility } from './eligibility.service.js';
import {
  ROLES,
  RECRUITER_APPROVAL_STATUSES,
  USER_STATUSES,
  JOB_STATUSES
} from '../utils/constants.js';

export const createJob = async (user, profile, data) => {
  // Domain Rule: Only admin-approved recruiters can create jobs
  if (user.role === ROLES.RECRUITER) {
    if (
      profile?.approvalStatus !== RECRUITER_APPROVAL_STATUSES.APPROVED ||
      user.accountStatus !== USER_STATUSES.ACTIVE
    ) {
      throw ApiError.forbidden(
        'Access denied: Only administrator-approved recruiters can create jobs. Your account approval is pending.'
      );
    }
  }

  const companyName = data.companyName ? data.companyName.trim() : profile?.companyName || 'HireTrack Partner';

  const job = await Job.create({
    recruiterId: user._id,
    title: data.title.trim(),
    companyName,
    description: data.description.trim(),
    location: data.location.trim(),
    employmentType: data.employmentType,
    ctc: data.ctc ? data.ctc.trim() : '',
    minCgpa: data.minCgpa !== undefined && data.minCgpa !== null ? Number(data.minCgpa) : null,
    eligibleBranches: Array.isArray(data.eligibleBranches) ? data.eligibleBranches : [],
    eligibleGraduationYears: Array.isArray(data.eligibleGraduationYears) ? data.eligibleGraduationYears : [],
    requiredSkills: Array.isArray(data.requiredSkills) ? data.requiredSkills : [],
    applicationDeadline: new Date(data.applicationDeadline),
    status: data.status || JOB_STATUSES.DRAFT
  });

  return job.toJSON();
};

export const getRecruiterJobs = async (recruiterId, { page = 1, limit = 10, status } = {}) => {
  const pageNum = Math.max(1, parseInt(page, 10) || 1);
  const limitNum = Math.min(100, Math.max(1, parseInt(limit, 10) || 10));
  const skip = (pageNum - 1) * limitNum;

  const filter = { recruiterId };
  if (status && Object.values(JOB_STATUSES).includes(status)) {
    filter.status = status;
  }

  const [total, jobs] = await Promise.all([
    Job.countDocuments(filter),
    Job.find(filter).sort({ createdAt: -1 }).skip(skip).limit(limitNum)
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

/**
 * Public/Student Job Discovery endpoint.
 * Server ALWAYS strictly enforces status=published AND applicationDeadline>now.
 */
export const getPublishedJobs = async ({
  q,
  branch,
  graduationYear,
  employmentType,
  page = 1,
  limit = 10
} = {}) => {
  const pageNum = Math.max(1, parseInt(page, 10) || 1);
  const limitNum = Math.min(100, Math.max(1, parseInt(limit, 10) || 10));
  const skip = (pageNum - 1) * limitNum;

  // Server-enforced baseline query: MUST be published and not expired
  const query = {
    status: JOB_STATUSES.PUBLISHED,
    applicationDeadline: { $gt: new Date() }
  };

  if (q && String(q).trim()) {
    const searchRegex = new RegExp(String(q).trim(), 'i');
    query.$or = [{ title: searchRegex }, { companyName: searchRegex }, { description: searchRegex }];
  }

  if (employmentType && String(employmentType).trim()) {
    query.employmentType = String(employmentType).trim();
  }

  if (branch && String(branch).trim()) {
    const branchUpper = String(branch).trim();
    query.$and = query.$and || [];
    query.$and.push({
      $or: [{ eligibleBranches: { $size: 0 } }, { eligibleBranches: branchUpper }]
    });
  }

  if (graduationYear && !isNaN(Number(graduationYear))) {
    const yearNum = Number(graduationYear);
    query.$and = query.$and || [];
    query.$and.push({
      $or: [{ eligibleGraduationYears: { $size: 0 } }, { eligibleGraduationYears: yearNum }]
    });
  }

  const [total, jobs] = await Promise.all([
    Job.countDocuments(query),
    Job.find(query)
      .select('-__v')
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

export const getJobById = async (jobId, currentUser = null, studentProfile = null) => {
  const job = await Job.findById(jobId);
  if (!job) {
    throw ApiError.notFound('Job posting not found');
  }

  const isOwner = currentUser && job.recruiterId.toString() === currentUser._id.toString();
  const isAdmin = currentUser && currentUser.role === ROLES.ADMIN;

  // If caller is student or unauthenticated, job must be published and not expired
  if (!isOwner && !isAdmin) {
    const isDiscoverable =
      job.status === JOB_STATUSES.PUBLISHED && new Date(job.applicationDeadline) > new Date();

    if (!isDiscoverable) {
      throw ApiError.notFound('Job posting not found or is no longer open');
    }
  }

  const jobJson = job.toJSON();

  // If student caller, attach eligibility summary and application status
  if (currentUser && currentUser.role === ROLES.STUDENT) {
    jobJson.eligibility = checkEligibility(studentProfile, jobJson);
    const existingApp = await Application.findOne({
      jobId: job._id,
      studentId: currentUser._id
    });
    jobJson.userApplication = {
      hasApplied: Boolean(existingApp),
      applicationId: existingApp?._id || null,
      status: existingApp?.status || null
    };
  }

  return jobJson;
};

export const updateJob = async (jobId, user, updateData) => {
  const job = await Job.findById(jobId);
  if (!job) {
    throw ApiError.notFound('Job posting not found');
  }

  // Ownership check
  if (user.role === ROLES.RECRUITER && job.recruiterId.toString() !== user._id.toString()) {
    throw ApiError.forbidden("Access denied: You cannot modify another recruiter's job");
  }

  const allowedFields = [
    'title',
    'description',
    'location',
    'employmentType',
    'ctc',
    'minCgpa',
    'eligibleBranches',
    'eligibleGraduationYears',
    'requiredSkills',
    'applicationDeadline'
  ];

  for (const field of allowedFields) {
    if (updateData[field] !== undefined) {
      if (field === 'minCgpa') {
        job.minCgpa = updateData.minCgpa !== null ? Number(updateData.minCgpa) : null;
      } else if (field === 'applicationDeadline') {
        job.applicationDeadline = new Date(updateData.applicationDeadline);
      } else if (typeof updateData[field] === 'string') {
        job[field] = updateData[field].trim();
      } else {
        job[field] = updateData[field];
      }
    }
  }

  await job.save();
  return job.toJSON();
};

export const publishJob = async (jobId, user, profile) => {
  const job = await Job.findById(jobId);
  if (!job) {
    throw ApiError.notFound('Job posting not found');
  }

  if (user.role === ROLES.RECRUITER) {
    if (
      profile?.approvalStatus !== RECRUITER_APPROVAL_STATUSES.APPROVED ||
      user.accountStatus !== USER_STATUSES.ACTIVE
    ) {
      throw ApiError.forbidden('Only approved recruiters can publish jobs');
    }
    if (job.recruiterId.toString() !== user._id.toString()) {
      throw ApiError.forbidden("Access denied: You cannot publish another recruiter's job");
    }
  }

  if (new Date(job.applicationDeadline) <= new Date()) {
    throw ApiError.badRequest('Cannot publish job with an expired application deadline');
  }

  job.status = JOB_STATUSES.PUBLISHED;
  await job.save();
  return job.toJSON();
};

export const closeJob = async (jobId, user) => {
  const job = await Job.findById(jobId);
  if (!job) {
    throw ApiError.notFound('Job posting not found');
  }

  if (user.role === ROLES.RECRUITER && job.recruiterId.toString() !== user._id.toString()) {
    throw ApiError.forbidden("Access denied: You cannot close another recruiter's job");
  }

  job.status = JOB_STATUSES.CLOSED;
  await job.save();
  return job.toJSON();
};
