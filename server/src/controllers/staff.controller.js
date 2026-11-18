import { asyncHandler } from '../utils/asyncHandler.js';
import { sendSuccess } from '../utils/response.js';
import * as staffService from '../services/staff.service.js';

export const listStaff = asyncHandler(async (req, res) => {
  const { page, limit, role, status, q } = req.query;
  const result = await staffService.listStaffMemberships(req.organizationId, {
    page,
    limit,
    role,
    status,
    q
  });

  return sendSuccess(res, {
    statusCode: 200,
    message: 'Organization staff memberships retrieved successfully',
    data: result.staff,
    pagination: result.pagination
  });
});

export const grantStaff = asyncHandler(async (req, res) => {
  const { userId, email, role } = req.body;
  const result = await staffService.grantStaffRole(req.organizationId, req.user, {
    userId,
    email,
    role
  });

  return sendSuccess(res, {
    statusCode: 201,
    message: `Staff role '${role}' granted successfully`,
    data: result
  });
});

export const updateStaff = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { status } = req.body;
  const result = await staffService.updateStaffMembership(req.organizationId, req.user, id, {
    status
  });

  return sendSuccess(res, {
    statusCode: 200,
    message: `Staff membership status updated to '${status}'`,
    data: result
  });
});
