import { asyncHandler } from '../utils/asyncHandler.js';
import { sendSuccess } from '../utils/response.js';
import * as jobService from '../services/job.service.js';

export const createJob = asyncHandler(async (req, res) => {
  const result = await jobService.createJob(req.user, req.profile, req.body);
  return sendSuccess(res, {
    statusCode: 201,
    message: 'Job posting created successfully',
    data: result
  });
});

export const getMyJobs = asyncHandler(async (req, res) => {
  const { page, limit, status } = req.query;
  const result = await jobService.getRecruiterJobs(req.user._id, { page, limit, status });
  return sendSuccess(res, {
    statusCode: 200,
    message: 'Recruiter jobs retrieved successfully',
    data: result.jobs,
    pagination: result.pagination
  });
});

export const getJobById = asyncHandler(async (req, res) => {
  const result = await jobService.getJobById(req.params.jobId, req.user);
  return sendSuccess(res, {
    statusCode: 200,
    message: 'Job details retrieved successfully',
    data: result
  });
});

export const updateJob = asyncHandler(async (req, res) => {
  const result = await jobService.updateJob(req.params.jobId, req.user, req.body);
  return sendSuccess(res, {
    statusCode: 200,
    message: 'Job posting updated successfully',
    data: result
  });
});

export const publishJob = asyncHandler(async (req, res) => {
  const result = await jobService.publishJob(req.params.jobId, req.user, req.profile);
  return sendSuccess(res, {
    statusCode: 200,
    message: 'Job posting published successfully',
    data: result
  });
});

export const closeJob = asyncHandler(async (req, res) => {
  const result = await jobService.closeJob(req.params.jobId, req.user);
  return sendSuccess(res, {
    statusCode: 200,
    message: 'Job posting closed successfully',
    data: result
  });
});
