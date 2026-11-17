import { asyncHandler } from '../utils/asyncHandler.js';
import { sendSuccess } from '../utils/response.js';
import * as adminService from '../services/admin.service.js';

export const getOverview = asyncHandler(async (req, res) => {
  const result = await adminService.getOverviewMetrics();
  return sendSuccess(res, {
    statusCode: 200,
    message: 'Placement administration overview metrics retrieved',
    data: result
  });
});

export const getPendingRecruiters = asyncHandler(async (req, res) => {
  const { page, limit } = req.query;
  const result = await adminService.getPendingRecruiters({ page, limit });
  return sendSuccess(res, {
    statusCode: 200,
    message: 'Pending recruiters retrieved successfully',
    data: result.recruiters,
    pagination: result.pagination
  });
});

export const updateRecruiterApproval = asyncHandler(async (req, res) => {
  const { recruiterId } = req.params;
  const { approvalStatus } = req.body;
  const result = await adminService.updateRecruiterApproval(recruiterId, { approvalStatus }, req.user);
  return sendSuccess(res, {
    statusCode: 200,
    message: `Recruiter successfully ${approvalStatus}`,
    data: result
  });
});

export const getUsers = asyncHandler(async (req, res) => {
  const { page, limit, role, status, q } = req.query;
  const result = await adminService.getUsers({ page, limit, role, status, q });
  return sendSuccess(res, {
    statusCode: 200,
    message: 'Users retrieved successfully',
    data: result.users,
    pagination: result.pagination
  });
});

export const updateUserStatus = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { accountStatus } = req.body;
  const result = await adminService.updateUserStatus(id, { accountStatus }, req.user);
  return sendSuccess(res, {
    statusCode: 200,
    message: `User account status updated to ${accountStatus}`,
    data: result
  });
});

export const getAllJobs = asyncHandler(async (req, res) => {
  const { page, limit, status, q } = req.query;
  const result = await adminService.getAllJobs({ page, limit, status, q });
  return sendSuccess(res, {
    statusCode: 200,
    message: 'Jobs retrieved successfully',
    data: result.jobs,
    pagination: result.pagination
  });
});

export const updateJobStatus = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { status } = req.body;
  const result = await adminService.updateJobStatus(id, { status }, req.user);
  return sendSuccess(res, {
    statusCode: 200,
    message: `Job status updated to ${status}`,
    data: result
  });
});
