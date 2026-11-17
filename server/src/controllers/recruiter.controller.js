import { asyncHandler } from '../utils/asyncHandler.js';
import { sendSuccess } from '../utils/response.js';
import * as recruiterService from '../services/recruiter.service.js';

export const getMe = asyncHandler(async (req, res) => {
  const result = await recruiterService.getRecruiterProfile(req.user._id);
  return sendSuccess(res, {
    statusCode: 200,
    message: 'Recruiter profile retrieved successfully',
    data: result
  });
});

export const updateMe = asyncHandler(async (req, res) => {
  const result = await recruiterService.updateRecruiterProfile(req.user._id, req.body);
  return sendSuccess(res, {
    statusCode: 200,
    message: 'Recruiter profile updated successfully',
    data: result
  });
});

