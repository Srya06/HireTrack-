import { asyncHandler } from '../utils/asyncHandler.js';
import { sendSuccess } from '../utils/response.js';
import * as interviewService from '../services/interview.service.js';

export const scheduleInterview = asyncHandler(async (req, res) => {
  const result = await interviewService.scheduleInterview(req.params.id, req.user, req.body);
  return sendSuccess(res, {
    statusCode: 201,
    message: 'Interview scheduled successfully',
    data: result
  });
});

export const getApplicationInterviews = asyncHandler(async (req, res) => {
  const result = await interviewService.getApplicationInterviews(req.params.id, req.user);
  return sendSuccess(res, {
    statusCode: 200,
    message: 'Application interviews retrieved successfully',
    data: result
  });
});

export const updateInterview = asyncHandler(async (req, res) => {
  const result = await interviewService.updateInterview(req.params.id, req.user, req.body);
  return sendSuccess(res, {
    statusCode: 200,
    message: 'Interview updated successfully',
    data: result
  });
});

export const cancelInterview = asyncHandler(async (req, res) => {
  const result = await interviewService.cancelInterview(req.params.id, req.user);
  return sendSuccess(res, {
    statusCode: 200,
    message: 'Interview cancelled successfully',
    data: result
  });
});

