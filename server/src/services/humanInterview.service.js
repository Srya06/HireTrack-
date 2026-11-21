import mongoose from 'mongoose';
import {
  InterviewerProfile,
  HumanMockInterviewSlot,
  HumanMockInterviewBooking,
  HumanInterviewEvaluation,
  StudentProfile,
  User,
  OrganizationMembership,
  AiMockInterviewSession
} from '../models/index.js';
import { getMockInterviewPolicy } from './institutePolicy.service.js';
import { getSignedDownloadUrl } from '../utils/signedUrl.js';
import { createNotification } from './notification.service.js';
import { logAdminAction } from '../utils/auditLogger.js';
import { ApiError } from '../utils/ApiError.js';
import {
  HUMAN_INTERVIEW_SLOT_STATUSES,
  HUMAN_INTERVIEW_BOOKING_STATUSES,
  HUMAN_INTERVIEW_EVALUATION_STATUSES,
  ERROR_CODES,
  MEMBERSHIP_ROLES
} from '../utils/constants.js';

// ==========================================
// 1. Interviewer Profile Management
// ==========================================

export const getOrCreateInterviewerProfile = async (organizationId, userId) => {
  let profile = await InterviewerProfile.findOne({ organizationId, userId });
  if (!profile) {
    profile = await InterviewerProfile.create({
      organizationId,
      userId,
      expertise: [],
      bio: '',
      availability: { weeklyHours: 5, preferredTimezone: 'UTC', notes: '' },
      isActive: true
    });
  }
  return profile;
};

export const updateInterviewerProfile = async (organizationId, userId, updates = {}) => {
  const profile = await getOrCreateInterviewerProfile(organizationId, userId);

  if (updates.expertise !== undefined) {
    if (!Array.isArray(updates.expertise)) {
      throw ApiError.badRequest('Expertise must be an array of strings', [], ERROR_CODES.VALIDATION_ERROR);
    }
    profile.expertise = updates.expertise.map((s) => String(s).trim()).filter(Boolean);
  }

  if (updates.bio !== undefined) {
    profile.bio = String(updates.bio).trim().slice(0, 1000);
  }

  if (updates.availability !== undefined && typeof updates.availability === 'object') {
    profile.availability = {
      ...profile.availability,
      ...updates.availability
    };
  }

  if (updates.isActive !== undefined) {
    profile.isActive = Boolean(updates.isActive);
  }

  await profile.save();
  return profile.toJSON();
};

export const listInterviewerProfiles = async (organizationId, { page = 1, limit = 20, activeOnly = true } = {}) => {
  const query = { organizationId };
  if (activeOnly) {
    query.isActive = true;
  }

  const pageNum = Math.max(1, parseInt(page, 10) || 1);
  const limitNum = Math.min(100, Math.max(1, parseInt(limit, 10) || 20));
  const skip = (pageNum - 1) * limitNum;

  const [total, items] = await Promise.all([
    InterviewerProfile.countDocuments(query),
    InterviewerProfile.find(query)
      .populate('userId', 'name email role')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limitNum)
  ]);

  return {
    items: items.map((doc) => doc.toJSON()),
    pagination: {
      page: pageNum,
      limit: limitNum,
      total,
      totalPages: Math.ceil(total / limitNum)
    }
  };
};

// ==========================================
// 2. Slot Management (Interviewer & Admin)
// ==========================================

export const createInterviewerSlots = async (organizationId, userId, slotsArray) => {
  if (!Array.isArray(slotsArray) || slotsArray.length === 0) {
    throw ApiError.badRequest('At least one interview slot is required', [], ERROR_CODES.VALIDATION_ERROR);
  }

  const profile = await getOrCreateInterviewerProfile(organizationId, userId);
  const now = new Date();
  const createdSlots = [];

  for (const slotData of slotsArray) {
    const startsAt = new Date(slotData.startsAt);
    const endsAt = new Date(slotData.endsAt);

    if (isNaN(startsAt.getTime()) || isNaN(endsAt.getTime())) {
      throw ApiError.badRequest('Invalid startsAt or endsAt date format', [], ERROR_CODES.VALIDATION_ERROR);
    }

    if (startsAt <= now) {
      throw ApiError.badRequest('Slot startsAt must be in the future', [], ERROR_CODES.VALIDATION_ERROR);
    }

    if (endsAt <= startsAt) {
      throw ApiError.badRequest('Slot endsAt must be strictly after startsAt', [], ERROR_CODES.VALIDATION_ERROR);
    }

    // Check for existing slot for this interviewer at the exact same start time
    const existing = await HumanMockInterviewSlot.findOne({
      interviewerProfileId: profile._id,
      startsAt
    });

    if (existing) {
      throw ApiError.conflict(
        `A slot starting at ${startsAt.toISOString()} already exists for this interviewer.`,
        [],
        ERROR_CODES.CONFLICT
      );
    }

    const slot = await HumanMockInterviewSlot.create({
      organizationId,
      interviewerProfileId: profile._id,
      startsAt,
      endsAt,
      status: HUMAN_INTERVIEW_SLOT_STATUSES.AVAILABLE,
      meetingUrl: slotData.meetingUrl ? String(slotData.meetingUrl).trim() : ''
    });

    createdSlots.push(slot.toJSON());
  }

  return createdSlots;
};

export const getInterviewerSlots = async (
  organizationId,
  userId,
  { status, from, to, page = 1, limit = 50 } = {}
) => {
  const profile = await getOrCreateInterviewerProfile(organizationId, userId);
  const query = {
    organizationId,
    interviewerProfileId: profile._id
  };

  if (status) {
    query.status = status;
  }

  if (from || to) {
    query.startsAt = {};
    if (from) query.startsAt.$gte = new Date(from);
    if (to) query.startsAt.$lte = new Date(to);
  }

  const pageNum = Math.max(1, parseInt(page, 10) || 1);
  const limitNum = Math.min(100, Math.max(1, parseInt(limit, 10) || 50));
  const skip = (pageNum - 1) * limitNum;

  const [total, items] = await Promise.all([
    HumanMockInterviewSlot.countDocuments(query),
    HumanMockInterviewSlot.find(query)
      .sort({ startsAt: 1 })
      .skip(skip)
      .limit(limitNum)
  ]);

  return {
    items: items.map((doc) => doc.toJSON()),
    pagination: {
      page: pageNum,
      limit: limitNum,
      total,
      totalPages: Math.ceil(total / limitNum)
    }
  };
};

export const deleteInterviewerSlot = async (organizationId, userId, slotId) => {
  const profile = await getOrCreateInterviewerProfile(organizationId, userId);
  const slot = await HumanMockInterviewSlot.findOne({
    _id: slotId,
    organizationId,
    interviewerProfileId: profile._id
  });

  if (!slot) {
    throw ApiError.notFound('Interview slot not found or not owned by you', [], ERROR_CODES.NOT_FOUND);
  }

  if (slot.status === HUMAN_INTERVIEW_SLOT_STATUSES.BOOKED) {
    throw ApiError.badRequest(
      'Cannot delete a booked interview slot. Please cancel the booking first.',
      [],
      ERROR_CODES.VALIDATION_ERROR
    );
  }

  await HumanMockInterviewSlot.deleteOne({ _id: slot._id });
  return { success: true, slotId };
};

export const toggleSlotBlock = async (organizationId, userId, slotId, blocked = true) => {
  const profile = await getOrCreateInterviewerProfile(organizationId, userId);
  const slot = await HumanMockInterviewSlot.findOne({
    _id: slotId,
    organizationId,
    interviewerProfileId: profile._id
  });

  if (!slot) {
    throw ApiError.notFound('Interview slot not found', [], ERROR_CODES.NOT_FOUND);
  }

  if (slot.status === HUMAN_INTERVIEW_SLOT_STATUSES.BOOKED) {
    throw ApiError.badRequest('Cannot block/unblock an already booked slot', [], ERROR_CODES.VALIDATION_ERROR);
  }

  slot.status = blocked
    ? HUMAN_INTERVIEW_SLOT_STATUSES.BLOCKED
    : HUMAN_INTERVIEW_SLOT_STATUSES.AVAILABLE;

  await slot.save();
  return slot.toJSON();
};

export const getAvailableSlotsForStudents = async (
  organizationId,
  { from, to, expertise, limit = 20, page = 1 } = {}
) => {
  const now = new Date();
  const query = {
    organizationId,
    status: HUMAN_INTERVIEW_SLOT_STATUSES.AVAILABLE,
    startsAt: { $gt: from ? new Date(from) : now }
  };

  if (to) {
    query.startsAt.$lte = new Date(to);
  }

  const pageNum = Math.max(1, parseInt(page, 10) || 1);
  const limitNum = Math.min(100, Math.max(1, parseInt(limit, 10) || 20));
  const skip = (pageNum - 1) * limitNum;

  const slots = await HumanMockInterviewSlot.find(query)
    .populate({
      path: 'interviewerProfileId',
      populate: { path: 'userId', select: 'name email' }
    })
    .sort({ startsAt: 1 });

  // Filter by expertise if requested
  let filtered = slots;
  if (expertise) {
    const term = String(expertise).toLowerCase();
    filtered = slots.filter((s) => {
      const expList = s.interviewerProfileId?.expertise || [];
      return expList.some((e) => e.toLowerCase().includes(term));
    });
  }

  const total = filtered.length;
  const paginated = filtered.slice(skip, skip + limitNum);

  const formatted = paginated.map((slot) => {
    const interviewer = slot.interviewerProfileId;
    return {
      _id: slot._id,
      id: slot._id,
      startsAt: slot.startsAt,
      endsAt: slot.endsAt,
      status: slot.status,
      meetingUrl: slot.meetingUrl,
      interviewer: {
        id: interviewer?._id,
        name: interviewer?.userId?.name || 'Assigned Interviewer',
        expertise: interviewer?.expertise || [],
        bio: interviewer?.bio || ''
      }
    };
  });

  return {
    items: formatted,
    pagination: {
      page: pageNum,
      limit: limitNum,
      total,
      totalPages: Math.ceil(total / limitNum)
    }
  };
};

// ==========================================
// 3. Concurrency-Safe Booking Logic
// ==========================================

export const bookSlot = async (organizationId, studentUser, slotId, { notes = '', trackId = null } = {}) => {
  // 1. Policy verification: check AI Mock Pass requirement if configured
  const policy = await getMockInterviewPolicy(organizationId);

  if (policy.requireAiPassForHumanMock) {
    const aiSessionsQuery = {
      organizationId,
      studentId: studentUser._id,
      status: 'COMPLETED'
    };

    if (policy.trackIds && policy.trackIds.length > 0) {
      aiSessionsQuery.trackId = { $in: policy.trackIds };
    }

    const completedSessions = await AiMockInterviewSession.find(aiSessionsQuery);
    const hasQualifyingPass = completedSessions.some((session) => {
      const overallScore = session.evaluation?.overallScore ?? 0;
      return overallScore >= (policy.minOverallScore || 0);
    });

    if (!hasQualifyingPass) {
      throw ApiError.badRequest(
        `Institute policy requirement: You must complete an AI Mock Interview with a minimum score of ${policy.minOverallScore}% before scheduling a human mock interview.`,
        [],
        ERROR_CODES.VALIDATION_ERROR
      );
    }
  }

  // 2. Load student profile
  const studentProfile = await StudentProfile.findOne({
    organizationId,
    userId: studentUser._id
  });

  if (!studentProfile) {
    throw ApiError.notFound('Student profile not found. Please complete your profile first.', [], ERROR_CODES.NOT_FOUND);
  }

  // 3. Check for existing active booking on this slot for this student
  const existingActive = await HumanMockInterviewBooking.findOne({
    slotId,
    studentUserId: studentUser._id,
    status: {
      $in: [
        HUMAN_INTERVIEW_BOOKING_STATUSES.REQUESTED,
        HUMAN_INTERVIEW_BOOKING_STATUSES.SCHEDULED
      ]
    }
  });

  if (existingActive) {
    throw ApiError.conflict('You already have an active booking for this interview slot.', [], ERROR_CODES.CONFLICT);
  }

  // 4. Concurrency-safe atomic slot claim:
  // findOneAndUpdate with status: AVAILABLE -> BOOKED.
  // Exactly one concurrent caller will succeed; all others match 0 documents.
  const claimedSlot = await HumanMockInterviewSlot.findOneAndUpdate(
    {
      _id: slotId,
      organizationId,
      status: HUMAN_INTERVIEW_SLOT_STATUSES.AVAILABLE,
      startsAt: { $gt: new Date() }
    },
    {
      $set: { status: HUMAN_INTERVIEW_SLOT_STATUSES.BOOKED }
    },
    { new: true }
  );

  if (!claimedSlot) {
    throw ApiError.conflict(
      'This interview slot is no longer available or has already been booked.',
      [],
      ERROR_CODES.CONFLICT
    );
  }

  // 5. Create booking record with automatic slot rollback on failure
  let booking;
  try {
    booking = await HumanMockInterviewBooking.create({
      organizationId,
      slotId: claimedSlot._id,
      studentProfileId: studentProfile._id,
      studentUserId: studentUser._id,
      trackId: trackId || null,
      status: HUMAN_INTERVIEW_BOOKING_STATUSES.SCHEDULED,
      meetingUrl: claimedSlot.meetingUrl || '',
      notes: notes ? String(notes).trim().slice(0, 1000) : '',
      bookedAt: new Date()
    });
  } catch (createErr) {
    // Roll back the slot so it doesn't stay trapped in BOOKED
    await HumanMockInterviewSlot.updateOne(
      { _id: claimedSlot._id },
      { $set: { status: HUMAN_INTERVIEW_SLOT_STATUSES.AVAILABLE } }
    );

    if (createErr.code === 11000) {
      throw ApiError.conflict('This slot already has an active booking.', [], ERROR_CODES.CONFLICT);
    }
    throw createErr;
  }

  // 6. Notify student & interviewer
  try {
    const interviewerProfile = await InterviewerProfile.findById(claimedSlot.interviewerProfileId);
    if (interviewerProfile) {
      await createNotification({
        userId: interviewerProfile.userId,
        type: 'interview_scheduled',
        title: 'New Mock Interview Booking',
        message: `A student has booked your mock interview slot for ${claimedSlot.startsAt.toLocaleString()}.`,
        link: `/interviewer/workspace`
      });
    }

    await createNotification({
      userId: studentUser._id,
      type: 'interview_scheduled',
      title: 'Human Mock Interview Scheduled',
      message: `Your human mock interview is scheduled for ${claimedSlot.startsAt.toLocaleString()}.`,
      link: `/student/mock-interviews`
    });
  } catch (notifyErr) {
    console.warn('[HumanInterviewService] Notification failed:', notifyErr.message);
  }

  return booking.toJSON();
};

// ==========================================
// 4. Cancellation Logic
// ==========================================

export const cancelBooking = async (organizationId, user, bookingId, { reason = '' } = {}) => {
  const booking = await HumanMockInterviewBooking.findOne({
    _id: bookingId,
    organizationId
  }).populate('slotId');

  if (!booking) {
    throw ApiError.notFound('Interview booking not found', [], ERROR_CODES.NOT_FOUND);
  }

  if (
    booking.status === HUMAN_INTERVIEW_BOOKING_STATUSES.CANCELLED ||
    booking.status === HUMAN_INTERVIEW_BOOKING_STATUSES.COMPLETED
  ) {
    throw ApiError.badRequest(
      `Cannot cancel a booking with status ${booking.status}`,
      [],
      ERROR_CODES.VALIDATION_ERROR
    );
  }

  // Auth check: Must be the student, the assigned interviewer, or org admin
  const isStudent = booking.studentUserId.toString() === user._id.toString();
  const slot = booking.slotId;
  const interviewerProfile = slot ? await InterviewerProfile.findById(slot.interviewerProfileId) : null;
  const isInterviewer = interviewerProfile && interviewerProfile.userId.toString() === user._id.toString();
  const isAdmin = user.role === 'admin' || user.role === MEMBERSHIP_ROLES.ORG_ADMIN;

  if (!isStudent && !isInterviewer && !isAdmin) {
    throw ApiError.forbidden('You do not have permission to cancel this interview booking', [], ERROR_CODES.FORBIDDEN);
  }

  // If student is cancelling, enforce the cancellation window policy (cancelBeforeHours)
  if (isStudent && !isAdmin && slot) {
    const policy = await getMockInterviewPolicy(organizationId);
    const cancelBeforeHours = policy.cancelBeforeHours || 0;
    const hoursRemaining = (new Date(slot.startsAt).getTime() - Date.now()) / (1000 * 60 * 60);

    if (hoursRemaining < cancelBeforeHours) {
      throw ApiError.badRequest(
        `Cancellation window closed: Bookings must be cancelled at least ${cancelBeforeHours} hours prior to start time.`,
        [],
        ERROR_CODES.VALIDATION_ERROR
      );
    }
  }

  // Update booking
  booking.status = HUMAN_INTERVIEW_BOOKING_STATUSES.CANCELLED;
  booking.cancelledAt = new Date();
  booking.cancelledBy = user._id;
  booking.cancellationReason = reason ? String(reason).trim().slice(0, 500) : 'Cancelled by user';
  await booking.save();

  // Free the slot back to AVAILABLE
  if (slot) {
    await HumanMockInterviewSlot.updateOne(
      { _id: slot._id },
      { $set: { status: HUMAN_INTERVIEW_SLOT_STATUSES.AVAILABLE } }
    );
  }

  // Notify the other party
  try {
    const targetUserId = isStudent ? interviewerProfile?.userId : booking.studentUserId;
    if (targetUserId) {
      await createNotification({
        userId: targetUserId,
        type: 'interview_cancelled',
        title: 'Mock Interview Cancelled',
        message: `The interview booking for ${slot?.startsAt ? new Date(slot.startsAt).toLocaleString() : 'session'} was cancelled.`,
        link: isStudent ? '/interviewer/workspace' : '/student/mock-interviews'
      });
    }
  } catch (err) {
    console.warn('[HumanInterviewService] Notification failed:', err.message);
  }

  return booking.toJSON();
};

// ==========================================
// 5. Interviewer Workspace & Scoped Student Context
// ==========================================

export const getInterviewerAssignedBookings = async (
  organizationId,
  userId,
  { status, page = 1, limit = 50 } = {}
) => {
  const profile = await getOrCreateInterviewerProfile(organizationId, userId);

  // Find all slots belonging to this interviewer
  const slots = await HumanMockInterviewSlot.find({
    organizationId,
    interviewerProfileId: profile._id
  }).select('_id startsAt endsAt meetingUrl status');

  const slotIds = slots.map((s) => s._id);
  const query = {
    organizationId,
    slotId: { $in: slotIds }
  };

  if (status) {
    query.status = status;
  }

  const pageNum = Math.max(1, parseInt(page, 10) || 1);
  const limitNum = Math.min(100, Math.max(1, parseInt(limit, 10) || 50));
  const skip = (pageNum - 1) * limitNum;

  const [total, bookings] = await Promise.all([
    HumanMockInterviewBooking.countDocuments(query),
    HumanMockInterviewBooking.find(query)
      .populate('slotId')
      .populate('studentUserId', 'name email')
      .populate('studentProfileId', 'degree branch graduationYear skills')
      .sort({ bookedAt: -1 })
      .skip(skip)
      .limit(limitNum)
  ]);

  // Check evaluation status for each booking
  const bookingIds = bookings.map((b) => b._id);
  const evaluations = await HumanInterviewEvaluation.find({
    organizationId,
    bookingId: { $in: bookingIds }
  }).select('bookingId status overallScore');

  const evalMap = new Map();
  evaluations.forEach((ev) => evalMap.set(ev.bookingId.toString(), ev));

  const items = bookings.map((b) => {
    const bObj = b.toJSON();
    const ev = evalMap.get(b._id.toString());
    bObj.evaluationSummary = ev
      ? { status: ev.status, overallScore: ev.overallScore }
      : null;
    return bObj;
  });

  return {
    items,
    pagination: {
      page: pageNum,
      limit: limitNum,
      total,
      totalPages: Math.ceil(total / limitNum)
    }
  };
};

/**
 * Returns allowlisted Student Context DTO for an interviewer.
 * Strict zero-PII leakage: only returns name, degree, branch, graduationYear, skills.
 * Resume is returned via short-lived signed URL ONLY if policy allows.
 */
export const getStudentContextForInterviewer = async (organizationId, userId, bookingId) => {
  const profile = await getOrCreateInterviewerProfile(organizationId, userId);

  const booking = await HumanMockInterviewBooking.findOne({
    _id: bookingId,
    organizationId
  }).populate('slotId');

  if (!booking) {
    throw ApiError.notFound('Interview booking not found', [], ERROR_CODES.NOT_FOUND);
  }

  // Authorization: Interviewer must own the slot (or be admin)
  const slot = booking.slotId;
  if (!slot || slot.interviewerProfileId.toString() !== profile._id.toString()) {
    throw ApiError.forbidden(
      'Access denied: You can only view student context for your assigned sessions',
      [],
      ERROR_CODES.FORBIDDEN
    );
  }

  const [studentUser, studentProfile, policy] = await Promise.all([
    User.findById(booking.studentUserId).select('name email'),
    StudentProfile.findById(booking.studentProfileId).select('degree branch graduationYear skills bio fileAssetId'),
    getMockInterviewPolicy(organizationId)
  ]);

  if (!studentUser || !studentProfile) {
    throw ApiError.notFound('Student record not found', [], ERROR_CODES.NOT_FOUND);
  }

  // Resume delivery: only if policy.allowResumeView === true and student has a FileAsset
  let resumeUrl = null;
  if (policy.allowResumeView && studentProfile.fileAssetId) {
    resumeUrl = getSignedDownloadUrl(studentProfile.fileAssetId.toString(), 900); // 15 min short-lived
  }

  return {
    bookingId: booking._id,
    sessionDate: slot.startsAt,
    meetingUrl: booking.meetingUrl || slot.meetingUrl,
    studentContext: {
      name: studentUser.name,
      degree: studentProfile.degree || '',
      branch: studentProfile.branch || '',
      graduationYear: studentProfile.graduationYear || null,
      skills: studentProfile.skills || [],
      bio: studentProfile.bio || '',
      resumeUrl
    }
  };
};

// ==========================================
// 6. Evaluation Lifecycle & Admin Release
// ==========================================

export const submitEvaluation = async (organizationId, userId, bookingId, evaluationData = {}) => {
  const profile = await getOrCreateInterviewerProfile(organizationId, userId);

  const booking = await HumanMockInterviewBooking.findOne({
    _id: bookingId,
    organizationId
  }).populate('slotId');

  if (!booking) {
    throw ApiError.notFound('Interview booking not found', [], ERROR_CODES.NOT_FOUND);
  }

  // Must be assigned interviewer
  const slot = booking.slotId;
  if (!slot || slot.interviewerProfileId.toString() !== profile._id.toString()) {
    throw ApiError.forbidden('Access denied: Only the assigned interviewer can evaluate this session');
  }

  if (booking.status === HUMAN_INTERVIEW_BOOKING_STATUSES.CANCELLED) {
    throw ApiError.badRequest('Cannot evaluate a cancelled interview booking');
  }

  // Find existing evaluation
  let evaluation = await HumanInterviewEvaluation.findOne({
    organizationId,
    bookingId: booking._id
  });

  if (evaluation && evaluation.status === HUMAN_INTERVIEW_EVALUATION_STATUSES.RELEASED) {
    throw ApiError.badRequest('This evaluation has already been released to the student and cannot be modified.');
  }

  // Validate rubric scores
  const rubricScores = Array.isArray(evaluationData.rubricScores)
    ? evaluationData.rubricScores.map((r) => ({
        dimension: String(r.dimension || 'General').trim(),
        score: Math.max(0, Number(r.score) || 0),
        maxScore: Math.max(1, Number(r.maxScore) || 10),
        feedback: r.feedback ? String(r.feedback).trim() : ''
      }))
    : [];

  // Calculate overall score if not explicitly set
  let overallScore = evaluationData.overallScore;
  if (overallScore === undefined && rubricScores.length > 0) {
    const totalEarned = rubricScores.reduce((sum, r) => sum + r.score, 0);
    const totalPossible = rubricScores.reduce((sum, r) => sum + r.maxScore, 0);
    overallScore = totalPossible > 0 ? Math.round((totalEarned / totalPossible) * 100) : 0;
  } else {
    overallScore = Math.min(100, Math.max(0, Number(overallScore) || 0));
  }

  const requestedStatus = evaluationData.status === HUMAN_INTERVIEW_EVALUATION_STATUSES.DRAFT
    ? HUMAN_INTERVIEW_EVALUATION_STATUSES.DRAFT
    : HUMAN_INTERVIEW_EVALUATION_STATUSES.SUBMITTED;

  const strengths = Array.isArray(evaluationData.strengths)
    ? evaluationData.strengths.map((s) => String(s).trim()).filter(Boolean)
    : [];

  const improvementAreas = Array.isArray(evaluationData.improvementAreas)
    ? evaluationData.improvementAreas.map((s) => String(s).trim()).filter(Boolean)
    : [];

  const overallFeedback = evaluationData.overallFeedback
    ? String(evaluationData.overallFeedback).trim().slice(0, 5000)
    : '';

  if (!evaluation) {
    evaluation = await HumanInterviewEvaluation.create({
      organizationId,
      bookingId: booking._id,
      interviewerProfileId: profile._id,
      evaluatedBy: userId,
      rubricScores,
      strengths,
      improvementAreas,
      overallFeedback,
      overallScore,
      status: requestedStatus,
      submittedAt: requestedStatus === HUMAN_INTERVIEW_EVALUATION_STATUSES.SUBMITTED ? new Date() : null
    });
  } else {
    evaluation.rubricScores = rubricScores;
    evaluation.strengths = strengths;
    evaluation.improvementAreas = improvementAreas;
    evaluation.overallFeedback = overallFeedback;
    evaluation.overallScore = overallScore;
    evaluation.status = requestedStatus;
    if (requestedStatus === HUMAN_INTERVIEW_EVALUATION_STATUSES.SUBMITTED && !evaluation.submittedAt) {
      evaluation.submittedAt = new Date();
    }
    await evaluation.save();
  }

  // If submitted, mark booking as COMPLETED
  if (requestedStatus === HUMAN_INTERVIEW_EVALUATION_STATUSES.SUBMITTED) {
    booking.status = HUMAN_INTERVIEW_BOOKING_STATUSES.COMPLETED;
    booking.completedAt = booking.completedAt || new Date();
    await booking.save();
  }

  return evaluation.toJSON();
};

export const getBookingEvaluation = async (organizationId, userId, bookingId) => {
  const profile = await getOrCreateInterviewerProfile(organizationId, userId);
  const evaluation = await HumanInterviewEvaluation.findOne({
    organizationId,
    bookingId,
    interviewerProfileId: profile._id
  });

  if (!evaluation) {
    throw ApiError.notFound('Evaluation not found for this booking');
  }

  return evaluation.toJSON();
};

export const releaseEvaluation = async (organizationId, adminUserId, evaluationId) => {
  const evaluation = await HumanInterviewEvaluation.findOne({
    _id: evaluationId,
    organizationId
  }).populate({
    path: 'bookingId',
    select: 'studentUserId slotId'
  });

  if (!evaluation) {
    throw ApiError.notFound('Human interview evaluation not found', [], ERROR_CODES.NOT_FOUND);
  }

  if (evaluation.status === HUMAN_INTERVIEW_EVALUATION_STATUSES.RELEASED) {
    return evaluation.toJSON();
  }

  evaluation.status = HUMAN_INTERVIEW_EVALUATION_STATUSES.RELEASED;
  evaluation.releasedAt = new Date();
  evaluation.releasedBy = adminUserId;
  await evaluation.save();

  // Audit log release
  await logAdminAction({
    organizationId,
    actorId: adminUserId,
    action: 'INTERVIEW_FEEDBACK_RELEASE',
    resourceType: 'HumanInterviewEvaluation',
    resourceId: evaluation._id,
    metadata: {
      bookingId: evaluation.bookingId?._id,
      overallScore: evaluation.overallScore,
      releasedAt: evaluation.releasedAt
    }
  });

  // Notify student
  if (evaluation.bookingId?.studentUserId) {
    try {
      await createNotification({
        userId: evaluation.bookingId.studentUserId,
        type: 'interview_feedback_released',
        title: 'Mock Interview Feedback Released',
        message: 'Your live human mock interview evaluation has been reviewed and released by placement staff.',
        link: `/student/mock-interviews`
      });
    } catch (notifyErr) {
      console.warn('[HumanInterviewService] Notification failed:', notifyErr.message);
    }
  }

  return evaluation.toJSON();
};

/**
 * Returns released feedback to the student.
 * CRITICAL RULE: Students NEVER see unreleased feedback!
 * If evaluation does not exist or status !== RELEASED, returns 404.
 */
export const getStudentBookingFeedback = async (organizationId, studentUser, bookingId) => {
  const booking = await HumanMockInterviewBooking.findOne({
    _id: bookingId,
    organizationId,
    studentUserId: studentUser._id
  }).populate({
    path: 'slotId',
    populate: {
      path: 'interviewerProfileId',
      populate: { path: 'userId', select: 'name' }
    }
  });

  if (!booking) {
    throw ApiError.notFound('Booking record not found', [], ERROR_CODES.NOT_FOUND);
  }

  const evaluation = await HumanInterviewEvaluation.findOne({
    organizationId,
    bookingId: booking._id
  });

  if (!evaluation || evaluation.status !== HUMAN_INTERVIEW_EVALUATION_STATUSES.RELEASED) {
    throw ApiError.notFound('Interview feedback has not been released yet.');
  }

  return {
    booking: {
      id: booking._id,
      status: booking.status,
      bookedAt: booking.bookedAt,
      completedAt: booking.completedAt,
      sessionDate: booking.slotId?.startsAt,
      interviewerName: booking.slotId?.interviewerProfileId?.userId?.name || 'Assigned Interviewer'
    },
    evaluation: {
      id: evaluation._id,
      overallScore: evaluation.overallScore,
      rubricScores: evaluation.rubricScores,
      strengths: evaluation.strengths,
      improvementAreas: evaluation.improvementAreas,
      overallFeedback: evaluation.overallFeedback,
      disclaimer: evaluation.disclaimer,
      releasedAt: evaluation.releasedAt
    }
  };
};

export const getStudentHumanInterviewHistory = async (organizationId, studentUser, { page = 1, limit = 20 } = {}) => {
  const query = {
    organizationId,
    studentUserId: studentUser._id
  };

  const pageNum = Math.max(1, parseInt(page, 10) || 1);
  const limitNum = Math.min(100, Math.max(1, parseInt(limit, 10) || 20));
  const skip = (pageNum - 1) * limitNum;

  const [total, bookings] = await Promise.all([
    HumanMockInterviewBooking.countDocuments(query),
    HumanMockInterviewBooking.find(query)
      .populate({
        path: 'slotId',
        populate: {
          path: 'interviewerProfileId',
          populate: { path: 'userId', select: 'name' }
        }
      })
      .sort({ bookedAt: -1 })
      .skip(skip)
      .limit(limitNum)
  ]);

  const bookingIds = bookings.map((b) => b._id);
  const releasedEvaluations = await HumanInterviewEvaluation.find({
    organizationId,
    bookingId: { $in: bookingIds },
    status: HUMAN_INTERVIEW_EVALUATION_STATUSES.RELEASED
  }).select('bookingId overallScore releasedAt');

  const releasedMap = new Map();
  releasedEvaluations.forEach((ev) => releasedMap.set(ev.bookingId.toString(), ev));

  const items = bookings.map((b) => {
    const bObj = b.toJSON();
    const releasedEval = releasedMap.get(b._id.toString());
    return {
      _id: bObj._id,
      id: bObj._id,
      status: bObj.status,
      meetingUrl: bObj.meetingUrl,
      notes: bObj.notes,
      bookedAt: bObj.bookedAt,
      completedAt: bObj.completedAt,
      cancelledAt: bObj.cancelledAt,
      cancellationReason: bObj.cancellationReason,
      slot: bObj.slotId
        ? {
            id: bObj.slotId._id,
            startsAt: bObj.slotId.startsAt,
            endsAt: bObj.slotId.endsAt,
            interviewerName: bObj.slotId.interviewerProfileId?.userId?.name || 'Interviewer'
          }
        : null,
      feedback: releasedEval
        ? {
            isReleased: true,
            overallScore: releasedEval.overallScore,
            releasedAt: releasedEval.releasedAt
          }
        : {
            isReleased: false
          }
    };
  });

  return {
    items,
    pagination: {
      page: pageNum,
      limit: limitNum,
      total,
      totalPages: Math.ceil(total / limitNum)
    }
  };
};

export const listAllBookingsForAdmin = async (organizationId, { status, page = 1, limit = 50 } = {}) => {
  const query = { organizationId };
  if (status) query.status = status;

  const pageNum = Math.max(1, parseInt(page, 10) || 1);
  const limitNum = Math.min(100, Math.max(1, parseInt(limit, 10) || 50));
  const skip = (pageNum - 1) * limitNum;

  const [total, items] = await Promise.all([
    HumanMockInterviewBooking.countDocuments(query),
    HumanMockInterviewBooking.find(query)
      .populate('slotId')
      .populate('studentUserId', 'name email')
      .populate('studentProfileId', 'degree branch graduationYear')
      .sort({ bookedAt: -1 })
      .skip(skip)
      .limit(limitNum)
  ]);

  const bookingIds = items.map((b) => b._id);
  const evaluations = await HumanInterviewEvaluation.find({
    organizationId,
    bookingId: { $in: bookingIds }
  });

  const evalMap = new Map();
  evaluations.forEach((e) => evalMap.set(e.bookingId.toString(), e));

  const enriched = items.map((b) => {
    const bObj = b.toJSON();
    const ev = evalMap.get(b._id.toString());
    bObj.evaluation = ev ? ev.toJSON() : null;
    return bObj;
  });

  return {
    items: enriched,
    pagination: {
      page: pageNum,
      limit: limitNum,
      total,
      totalPages: Math.ceil(total / limitNum)
    }
  };
};
