import { asyncHandler } from '../utils/asyncHandler.js';
import { sendSuccess } from '../utils/response.js';
import * as humanInterviewService from '../services/humanInterview.service.js';
import * as institutePolicyService from '../services/institutePolicy.service.js';

// ==========================================
// Interviewer Controllers
// ==========================================

export const getInterviewerProfile = asyncHandler(async (req, res) => {
  const profile = await humanInterviewService.getOrCreateInterviewerProfile(
    req.organizationId,
    req.user._id
  );
  return sendSuccess(res, {
    statusCode: 200,
    message: 'Interviewer profile retrieved',
    data: profile
  });
});

export const updateInterviewerProfile = asyncHandler(async (req, res) => {
  const profile = await humanInterviewService.updateInterviewerProfile(
    req.organizationId,
    req.user._id,
    req.body
  );
  return sendSuccess(res, {
    statusCode: 200,
    message: 'Interviewer profile updated successfully',
    data: profile
  });
});

export const createSlots = asyncHandler(async (req, res) => {
  const slots = await humanInterviewService.createInterviewerSlots(
    req.organizationId,
    req.user._id,
    req.body.slots || [req.body]
  );
  return sendSuccess(res, {
    statusCode: 201,
    message: 'Interview slots created successfully',
    data: slots
  });
});

export const getInterviewerSlots = asyncHandler(async (req, res) => {
  const result = await humanInterviewService.getInterviewerSlots(
    req.organizationId,
    req.user._id,
    req.query
  );
  return sendSuccess(res, {
    statusCode: 200,
    message: 'Interviewer slots retrieved successfully',
    data: result
  });
});

export const deleteInterviewerSlot = asyncHandler(async (req, res) => {
  const result = await humanInterviewService.deleteInterviewerSlot(
    req.organizationId,
    req.user._id,
    req.params.id
  );
  return sendSuccess(res, {
    statusCode: 200,
    message: 'Slot deleted successfully',
    data: result
  });
});

export const toggleSlotBlock = asyncHandler(async (req, res) => {
  const slot = await humanInterviewService.toggleSlotBlock(
    req.organizationId,
    req.user._id,
    req.params.id,
    req.body.blocked
  );
  return sendSuccess(res, {
    statusCode: 200,
    message: 'Slot block status updated',
    data: slot
  });
});

export const getInterviewerAssignedSessions = asyncHandler(async (req, res) => {
  const result = await humanInterviewService.getInterviewerAssignedBookings(
    req.organizationId,
    req.user._id,
    req.query
  );
  return sendSuccess(res, {
    statusCode: 200,
    message: 'Assigned interview sessions retrieved',
    data: result
  });
});

export const getStudentContext = asyncHandler(async (req, res) => {
  const result = await humanInterviewService.getStudentContextForInterviewer(
    req.organizationId,
    req.user._id,
    req.params.id
  );
  return sendSuccess(res, {
    statusCode: 200,
    message: 'Student context retrieved',
    data: result
  });
});

export const submitEvaluation = asyncHandler(async (req, res) => {
  const evaluation = await humanInterviewService.submitEvaluation(
    req.organizationId,
    req.user._id,
    req.params.id,
    req.body
  );
  return sendSuccess(res, {
    statusCode: 200,
    message: 'Interview evaluation recorded',
    data: evaluation
  });
});

export const getBookingEvaluation = asyncHandler(async (req, res) => {
  const evaluation = await humanInterviewService.getBookingEvaluation(
    req.organizationId,
    req.user._id,
    req.params.id
  );
  return sendSuccess(res, {
    statusCode: 200,
    message: 'Interview evaluation retrieved',
    data: evaluation
  });
});

// ==========================================
// Student Controllers
// ==========================================

export const getAvailableSlots = asyncHandler(async (req, res) => {
  const result = await humanInterviewService.getAvailableSlotsForStudents(
    req.organizationId,
    req.query
  );
  return sendSuccess(res, {
    statusCode: 200,
    message: 'Available interview slots retrieved',
    data: result
  });
});

export const bookSlot = asyncHandler(async (req, res) => {
  const booking = await humanInterviewService.bookSlot(
    req.organizationId,
    req.user,
    req.body.slotId,
    req.body
  );
  return sendSuccess(res, {
    statusCode: 201,
    message: 'Interview slot booked successfully',
    data: booking
  });
});

export const cancelBooking = asyncHandler(async (req, res) => {
  const booking = await humanInterviewService.cancelBooking(
    req.organizationId,
    req.user,
    req.params.id,
    req.body
  );
  return sendSuccess(res, {
    statusCode: 200,
    message: 'Interview booking cancelled successfully',
    data: booking
  });
});

export const getStudentFeedback = asyncHandler(async (req, res) => {
  const result = await humanInterviewService.getStudentBookingFeedback(
    req.organizationId,
    req.user,
    req.params.id
  );
  return sendSuccess(res, {
    statusCode: 200,
    message: 'Interview feedback retrieved successfully',
    data: result
  });
});

export const getStudentHistory = asyncHandler(async (req, res) => {
  const result = await humanInterviewService.getStudentHumanInterviewHistory(
    req.organizationId,
    req.user,
    req.query
  );
  return sendSuccess(res, {
    statusCode: 200,
    message: 'Student interview history retrieved',
    data: result
  });
});

// ==========================================
// Admin Controllers
// ==========================================

export const getMockInterviewPolicy = asyncHandler(async (req, res) => {
  const policy = await institutePolicyService.getMockInterviewPolicy(req.organizationId);
  return sendSuccess(res, {
    statusCode: 200,
    message: 'Mock interview policy retrieved',
    data: policy
  });
});

export const updateMockInterviewPolicy = asyncHandler(async (req, res) => {
  const updatedPolicy = await institutePolicyService.updateMockInterviewPolicy(
    req.organizationId,
    req.user._id,
    req.body
  );
  return sendSuccess(res, {
    statusCode: 200,
    message: 'Mock interview policy updated successfully',
    data: updatedPolicy
  });
});

export const releaseEvaluation = asyncHandler(async (req, res) => {
  const evaluation = await humanInterviewService.releaseEvaluation(
    req.organizationId,
    req.user._id,
    req.params.id
  );
  return sendSuccess(res, {
    statusCode: 200,
    message: 'Interview feedback released to student',
    data: evaluation
  });
});

export const listAllBookings = asyncHandler(async (req, res) => {
  const result = await humanInterviewService.listAllBookingsForAdmin(
    req.organizationId,
    req.query
  );
  return sendSuccess(res, {
    statusCode: 200,
    message: 'All interview bookings retrieved',
    data: result
  });
});

export const listInterviewers = asyncHandler(async (req, res) => {
  const result = await humanInterviewService.listInterviewerProfiles(
    req.organizationId,
    req.query
  );
  return sendSuccess(res, {
    statusCode: 200,
    message: 'Interviewers retrieved',
    data: result
  });
});

