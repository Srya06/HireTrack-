import { asyncHandler } from '../utils/asyncHandler.js';
import { sendSuccess } from '../utils/response.js';
import * as aiInterviewService from '../services/aiInterview.service.js';

// ==========================================
// 1. Staff Track Management
// ==========================================

export const createTrack = asyncHandler(async (req, res) => {
  const result = await aiInterviewService.createTrack(req.organizationId, req.user._id, req.body);
  return sendSuccess(res, {
    statusCode: 201,
    message: 'Interview track created successfully',
    data: result
  });
});

export const listTracks = asyncHandler(async (req, res) => {
  const result = await aiInterviewService.listTracks(req.organizationId, req.query);
  return sendSuccess(res, {
    statusCode: 200,
    message: 'Interview tracks retrieved successfully',
    data: result.items || [],
    pagination: result.pagination
  });
});

export const getTrackById = asyncHandler(async (req, res) => {
  const result = await aiInterviewService.getTrackById(req.organizationId, req.params.id);
  return sendSuccess(res, {
    statusCode: 200,
    message: 'Interview track retrieved successfully',
    data: result
  });
});

export const updateTrack = asyncHandler(async (req, res) => {
  const result = await aiInterviewService.updateTrack(req.organizationId, req.params.id, req.body);
  return sendSuccess(res, {
    statusCode: 200,
    message: 'Interview track updated successfully',
    data: result
  });
});

export const archiveTrack = asyncHandler(async (req, res) => {
  const result = await aiInterviewService.archiveTrack(req.organizationId, req.params.id);
  return sendSuccess(res, {
    statusCode: 200,
    message: 'Interview track archived successfully',
    data: result
  });
});

// ==========================================
// 2. Student Track Discovery
// ==========================================

export const listActiveAiTracks = asyncHandler(async (req, res) => {
  const result = await aiInterviewService.listActiveAiTracks(req.organizationId, req.query);
  return sendSuccess(res, {
    statusCode: 200,
    message: 'Active AI interview tracks retrieved successfully',
    data: result.items || [],
    pagination: result.pagination
  });
});

// ==========================================
// 3. AI Interview Session & Turns
// ==========================================

export const startSession = asyncHandler(async (req, res) => {
  const { trackId } = req.body;
  const result = await aiInterviewService.startSession(req.organizationId, req.user, trackId);
  return sendSuccess(res, {
    statusCode: 201,
    message: 'AI mock interview session started successfully',
    data: result
  });
});

export const getSessionDetails = asyncHandler(async (req, res) => {
  const isStaff = req.membershipRoles && req.membershipRoles.length > 0;
  const result = await aiInterviewService.getSessionDetails(
    req.organizationId,
    req.user._id,
    req.params.id,
    isStaff
  );
  return sendSuccess(res, {
    statusCode: 200,
    message: 'Interview session retrieved successfully',
    data: result
  });
});

export const submitTurn = asyncHandler(async (req, res) => {
  const result = await aiInterviewService.submitTurn(
    req.organizationId,
    req.user._id,
    req.params.id,
    req.body
  );
  return sendSuccess(res, {
    statusCode: 200,
    message: 'Turn submitted and AI response generated',
    data: result
  });
});

export const completeSession = asyncHandler(async (req, res) => {
  const result = await aiInterviewService.evaluateSession(
    req.organizationId,
    req.user._id,
    req.params.id
  );
  return sendSuccess(res, {
    statusCode: 200,
    message: 'Interview session completed and evaluated',
    data: result
  });
});

export const retryEvaluation = asyncHandler(async (req, res) => {
  const result = await aiInterviewService.retryEvaluation(
    req.organizationId,
    req.user._id,
    req.params.id
  );
  return sendSuccess(res, {
    statusCode: 200,
    message: 'Interview evaluation re-run successfully',
    data: result
  });
});

export const getSessionTranscript = asyncHandler(async (req, res) => {
  const isStaff = req.membershipRoles && req.membershipRoles.some((r) => ['ORG_ADMIN', 'PLACEMENT_COORDINATOR'].includes(r));
  const result = await aiInterviewService.getSessionTranscript(
    req.organizationId,
    req.user._id,
    req.params.id,
    isStaff
  );
  return sendSuccess(res, {
    statusCode: 200,
    message: 'Session transcript retrieved successfully',
    data: result
  });
});

export const getSessionFeedback = asyncHandler(async (req, res) => {
  const isStaff = req.membershipRoles && req.membershipRoles.some((r) => ['ORG_ADMIN', 'PLACEMENT_COORDINATOR'].includes(r));
  const result = await aiInterviewService.getSessionFeedback(
    req.organizationId,
    req.user._id,
    req.params.id,
    isStaff
  );
  return sendSuccess(res, {
    statusCode: 200,
    message: 'Session feedback retrieved successfully',
    data: result
  });
});

export const getStudentHistory = asyncHandler(async (req, res) => {
  const result = await aiInterviewService.getStudentHistory(
    req.organizationId,
    req.user._id,
    req.query
  );
  return sendSuccess(res, {
    statusCode: 200,
    message: 'Student AI interview history retrieved successfully',
    data: result.items || [],
    pagination: result.pagination
  });
});
