import { asyncHandler } from '../utils/asyncHandler.js';
import { sendSuccess } from '../utils/response.js';
import * as mockTestAttemptService from '../services/mockTestAttempt.service.js';

export const startOrResumeAttempt = asyncHandler(async (req, res) => {
  const result = await mockTestAttemptService.startOrResumeAttempt(
    req.organizationId,
    req.user,
    req.params.id
  );
  return sendSuccess(res, {
    statusCode: 200,
    message: 'Attempt initialized or resumed successfully',
    data: result
  });
});

export const getAttemptForStudent = asyncHandler(async (req, res) => {
  const result = await mockTestAttemptService.getAttemptForStudent(
    req.organizationId,
    req.user._id,
    req.params.id
  );
  return sendSuccess(res, {
    statusCode: 200,
    message: 'Attempt retrieved successfully',
    data: result
  });
});

export const saveAnswer = asyncHandler(async (req, res) => {
  const result = await mockTestAttemptService.saveAnswer(
    req.organizationId,
    req.user._id,
    req.params.id,
    req.params.questionId,
    req.body
  );
  return sendSuccess(res, {
    statusCode: 200,
    message: 'Answer saved successfully',
    data: result
  });
});

export const submitAttempt = asyncHandler(async (req, res) => {
  const idempotencyKey = req.headers['idempotency-key'] || req.body?.idempotencyKey;
  const result = await mockTestAttemptService.submitAttempt(
    req.organizationId,
    req.user._id,
    req.params.id,
    { idempotencyKey }
  );
  return sendSuccess(res, {
    statusCode: 200,
    message: 'Attempt submitted successfully',
    data: result
  });
});

export const getAttemptResult = asyncHandler(async (req, res) => {
  const result = await mockTestAttemptService.getAttemptResult(
    req.organizationId,
    req.user._id,
    req.params.id
  );
  return sendSuccess(res, {
    statusCode: 200,
    message: 'Attempt result retrieved successfully',
    data: result
  });
});

export const getStudentMockTestHistory = asyncHandler(async (req, res) => {
  const result = await mockTestAttemptService.getStudentMockTestHistory(
    req.organizationId,
    req.user._id,
    req.query
  );
  return sendSuccess(res, {
    statusCode: 200,
    message: 'Student mock test history retrieved successfully',
    data: result
  });
});

export const getAdminMockTestReport = asyncHandler(async (req, res) => {
  const result = await mockTestAttemptService.getAdminMockTestReport(
    req.organizationId,
    req.query
  );
  return sendSuccess(res, {
    statusCode: 200,
    message: 'Mock test report retrieved successfully',
    data: result
  });
});
