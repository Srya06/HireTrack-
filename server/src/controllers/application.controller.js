import { asyncHandler } from '../utils/asyncHandler.js';
import { sendSuccess } from '../utils/response.js';
import * as applicationService from '../services/application.service.js';

export const applyToJob = asyncHandler(async (req, res) => {
  const result = await applicationService.applyToJob(
    req.params.jobId,
    req.user,
    req.profile,
    req.body
  );
  return sendSuccess(res, {
    statusCode: 201,
    message: 'Application submitted successfully',
    data: result
  });
});

export const getMyApplications = asyncHandler(async (req, res) => {
  const { page, limit } = req.query;
  const result = await applicationService.getStudentApplications(req.user._id, { page, limit });
  return sendSuccess(res, {
    statusCode: 200,
    message: 'My applications retrieved successfully',
    data: result.applications,
    pagination: result.pagination
  });
});

export const getJobApplicants = asyncHandler(async (req, res) => {
  const { page, limit, status } = req.query;
  const result = await applicationService.getJobApplicants(req.params.jobId, req.user, {
    page,
    limit,
    status
  });
  return sendSuccess(res, {
    statusCode: 200,
    message: 'Job applicants retrieved successfully',
    data: result.applicants,
    pagination: result.pagination
  });
});

export const getApplicationById = asyncHandler(async (req, res) => {
  const result = await applicationService.getApplicationById(req.params.id, req.user);
  return sendSuccess(res, {
    statusCode: 200,
    message: 'Application details retrieved successfully',
    data: result
  });
});

export const updateStatus = asyncHandler(async (req, res) => {
  const result = await applicationService.updateApplicationStatus(
    req.params.id,
    req.user,
    req.body
  );
  return sendSuccess(res, {
    statusCode: 200,
    message: 'Application status updated successfully',
    data: result
  });
});

export const withdraw = asyncHandler(async (req, res) => {
  const result = await applicationService.withdrawApplication(req.params.id, req.user);
  return sendSuccess(res, {
    statusCode: 200,
    message: 'Application withdrawn successfully',
    data: result
  });
});
