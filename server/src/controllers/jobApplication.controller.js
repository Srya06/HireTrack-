import { asyncHandler } from '../utils/asyncHandler.js';
import { sendSuccess } from '../utils/response.js';
import * as jobApplicationService from '../services/jobApplication.service.js';

// --- Student Endpoints ---

export const recordStatus = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { status, notes } = req.body;
  const result = await jobApplicationService.recordApplicationStatus(
    req.organizationId,
    req.user,
    id,
    { status, notes }
  );

  return sendSuccess(res, {
    statusCode: 200,
    message: 'Application status recorded successfully',
    data: result
  });
});

export const recordLinkClick = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const result = await jobApplicationService.recordApplicationLinkClick(
    req.organizationId,
    req.user,
    id
  );

  return sendSuccess(res, {
    statusCode: 200,
    message: 'Application link click recorded',
    data: result
  });
});

export const getMyApplications = asyncHandler(async (req, res) => {
  const { page, limit, status } = req.query;
  const result = await jobApplicationService.getStudentJobApplications(
    req.organizationId,
    req.user._id,
    { page, limit, status }
  );

  return sendSuccess(res, {
    statusCode: 200,
    message: 'Student job applications retrieved successfully',
    data: result.applications,
    pagination: result.pagination
  });
});

// --- Staff Endpoints ---

export const getAdminReport = asyncHandler(async (req, res) => {
  const { page, limit, status, verificationStatus, opportunityId, q } = req.query;
  const result = await jobApplicationService.getAdminApplicationsReport(
    req.organizationId,
    { page, limit, status, verificationStatus, opportunityId, q }
  );

  return sendSuccess(res, {
    statusCode: 200,
    message: 'Applications report retrieved successfully',
    data: result.applications,
    pagination: result.pagination,
    metadata: { summary: result.summary }
  });
});

export const verifyStaff = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { verificationStatus, reason } = req.body;
  const result = await jobApplicationService.verifyApplicationStaff(
    req.organizationId,
    req.user,
    id,
    { verificationStatus, reason }
  );

  return sendSuccess(res, {
    statusCode: 200,
    message: 'Application verification status updated successfully',
    data: result
  });
});
