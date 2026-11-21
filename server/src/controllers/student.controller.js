import { asyncHandler } from '../utils/asyncHandler.js';
import { sendSuccess } from '../utils/response.js';
import * as studentService from '../services/student.service.js';

export const getMe = asyncHandler(async (req, res) => {
  const result = await studentService.getStudentProfile(req.user._id);
  return sendSuccess(res, {
    statusCode: 200,
    message: 'Student profile retrieved successfully',
    data: result
  });
});

export const updateMe = asyncHandler(async (req, res) => {
  const result = await studentService.updateStudentProfile(req.user._id, req.body);
  return sendSuccess(res, {
    statusCode: 200,
    message: 'Student profile updated successfully',
    data: result
  });
});

export const uploadResume = asyncHandler(async (req, res) => {
  const result = await studentService.uploadResume(req.user._id, req.file);
  return sendSuccess(res, {
    statusCode: 200,
    message: 'Resume uploaded successfully',
    data: result
  });
});

export const updateById = asyncHandler(async (req, res) => {
  const result = await studentService.updateStudentProfileById(req.user, req.params.id, req.body);
  return sendSuccess(res, {
    statusCode: 200,
    message: 'Student profile updated successfully',
    data: result
  });
});

export const getMeProfileV3 = asyncHandler(async (req, res) => {
  const result = await studentService.getStudentProfileV3(req.user._id);
  return sendSuccess(res, {
    statusCode: 200,
    message: 'Student profile retrieved successfully',
    data: result
  });
});

export const updateMeProfileV3 = asyncHandler(async (req, res) => {
  const result = await studentService.updateStudentProfileV3(req.user._id, req.body);
  return sendSuccess(res, {
    statusCode: 200,
    message: 'Student profile updated successfully',
    data: result
  });
});

export const exportMyData = asyncHandler(async (req, res) => {
  const result = await studentService.exportStudentData(req.user._id);
  return sendSuccess(res, {
    statusCode: 200,
    message: 'Student data exported successfully',
    data: result
  });
});

