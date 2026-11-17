import { asyncHandler } from '../utils/asyncHandler.js';
import { sendSuccess } from '../utils/response.js';
import * as adminService from '../services/admin.service.js';

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

