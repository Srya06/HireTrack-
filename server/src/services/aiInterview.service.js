import {
  InterviewTrack,
  AiMockInterviewSession,
  AiInterviewTurn,
  StudentProfile,
  User
} from '../models/index.js';
import { ApiError } from '../utils/ApiError.js';
import { findByIdInOrg, scopeOrg, paginateInOrg } from '../utils/orgScope.js';
import { recordAuditEvent } from './audit.service.js';
import {
  INTERVIEW_TRACK_TYPES,
  INTERVIEW_TRACK_STATUSES,
  AI_INTERVIEW_SESSION_STATUSES,
  AI_INTERVIEW_SPEAKERS,
  ERROR_CODES
} from '../utils/constants.js';
import { getAiProvider } from './ai/aiProviderFactory.js';
import { validateAiEvaluation } from './ai/aiEvaluationValidator.js';

const DEFAULT_DAILY_SESSION_LIMIT = 5;
const MIN_TURN_INTERVAL_MS = process.env.NODE_ENV === 'test' ? 0 : 1000; // Debouncing

// ==========================================
// 1. Staff Track Management
// ==========================================

export const createTrack = async (organizationId, userId, data) => {
  const {
    title,
    roleCategory,
    description = '',
    interviewType = INTERVIEW_TRACK_TYPES.AI,
    questionConfig = {},
    rubricConfig = []
  } = data;

  if (!title || !roleCategory) {
    throw ApiError.badRequest(
      'Track title and roleCategory are required',
      [],
      ERROR_CODES.VALIDATION_ERROR
    );
  }

  const track = new InterviewTrack({
    organizationId,
    title: title.trim(),
    roleCategory: roleCategory.trim(),
    description: description.trim(),
    interviewType,
    questionConfig: {
      maxQuestions: questionConfig.maxQuestions || 5,
      maxFollowUps: questionConfig.maxFollowUps !== undefined ? questionConfig.maxFollowUps : 1,
      maxTurnChars: questionConfig.maxTurnChars || 1000
    },
    rubricConfig: rubricConfig.length > 0 ? rubricConfig : undefined,
    createdBy: userId,
    status: INTERVIEW_TRACK_STATUSES.ACTIVE
  });

  await track.save();

  await recordAuditEvent({
    organizationId,
    actorId: userId,
    action: 'INTERVIEW_TRACK_CREATED',
    entityType: 'InterviewTrack',
    entityId: track._id,
    metadata: { title: track.title, roleCategory: track.roleCategory },
    allowedMetadataKeys: ['title', 'roleCategory']
  });

  return track;
};

export const listTracks = async (organizationId, { interviewType, status, q, page = 1, limit = 20 } = {}) => {
  const filter = {};
  if (interviewType) filter.interviewType = interviewType;
  if (status) filter.status = status;
  if (q) filter.title = { $regex: q.trim(), $options: 'i' };

  return paginateInOrg(InterviewTrack, filter, organizationId, {
    page: Number(page) || 1,
    limit: Number(limit) || 20,
    sort: { createdAt: -1 }
  });
};

export const getTrackById = async (organizationId, trackId) => {
  const track = await findByIdInOrg(InterviewTrack, trackId, organizationId);
  if (!track) {
    throw ApiError.notFound('Interview track not found', [], ERROR_CODES.NOT_FOUND);
  }
  return track;
};

export const updateTrack = async (organizationId, trackId, updateData) => {
  const track = await findByIdInOrg(InterviewTrack, trackId, organizationId);
  if (!track) {
    throw ApiError.notFound('Interview track not found', [], ERROR_CODES.NOT_FOUND);
  }

  const allowedFields = ['title', 'roleCategory', 'description', 'questionConfig', 'rubricConfig', 'status'];
  allowedFields.forEach((field) => {
    if (updateData[field] !== undefined) {
      track[field] = updateData[field];
    }
  });

  await track.save();
  return track;
};

export const archiveTrack = async (organizationId, trackId) => {
  const track = await findByIdInOrg(InterviewTrack, trackId, organizationId);
  if (!track) {
    throw ApiError.notFound('Interview track not found', [], ERROR_CODES.NOT_FOUND);
  }

  track.status = INTERVIEW_TRACK_STATUSES.ARCHIVED;
  await track.save();
  return { message: 'Track archived successfully' };
};

// ==========================================
// 2. Student Track Discovery
// ==========================================

export const listActiveAiTracks = async (organizationId, { q, page = 1, limit = 20 } = {}) => {
  const filter = {
    status: INTERVIEW_TRACK_STATUSES.ACTIVE,
    interviewType: INTERVIEW_TRACK_TYPES.AI
  };

  if (q) filter.title = { $regex: q.trim(), $options: 'i' };

  return paginateInOrg(InterviewTrack, filter, organizationId, {
    page: Number(page) || 1,
    limit: Number(limit) || 20,
    sort: { createdAt: -1 }
  });
};

// ==========================================
// 3. AI Interview Session Lifecycle
// ==========================================

export const startSession = async (organizationId, studentUser, trackId) => {
  const track = await findByIdInOrg(InterviewTrack, trackId, organizationId);
  if (!track || track.status !== INTERVIEW_TRACK_STATUSES.ACTIVE || track.interviewType !== INTERVIEW_TRACK_TYPES.AI) {
    throw ApiError.notFound('Active AI interview track not found', [], ERROR_CODES.NOT_FOUND);
  }

  // Daily usage limit guardrail
  const todayStart = new Date();
  todayStart.setHours(0, 0, 0, 0);

  const dailyCount = await AiMockInterviewSession.countDocuments(
    scopeOrg(organizationId, {
      studentId: studentUser._id,
      startedAt: { $gte: todayStart }
    })
  );

  const dailyLimit = Number(process.env.AI_INTERVIEW_DAILY_LIMIT) || DEFAULT_DAILY_SESSION_LIMIT;
  if (dailyCount >= dailyLimit) {
    throw ApiError.badRequest(
      `Daily practice limit reached. You can complete up to ${dailyLimit} AI interview sessions per day.`,
      [{ field: 'dailyLimit', message: 'Daily quota exceeded' }],
      ERROR_CODES.VALIDATION_ERROR
    );
  }

  // Find profile if exists
  const profile = await StudentProfile.findOne(scopeOrg(organizationId, { userId: studentUser._id }));

  const provider = getAiProvider();

  // Create session
  const session = new AiMockInterviewSession({
    organizationId,
    studentId: studentUser._id,
    studentProfileId: profile?._id || null,
    trackId: track._id,
    status: AI_INTERVIEW_SESSION_STATUSES.IN_PROGRESS,
    provider: provider.providerName,
    model: provider.modelName,
    promptVersion: provider.promptVersion,
    startedAt: new Date(),
    currentQuestionIndex: 1,
    currentFollowUpCount: 0
  });

  await session.save();

  // Generate Turn 1 (Initial AI greeting & Question 1)
  const initialAiTurn = await provider.generateTurn({
    track,
    turns: [],
    questionNumber: 1,
    isFollowUp: false
  });

  const turnRecord = new AiInterviewTurn({
    organizationId,
    sessionId: session._id,
    turnNumber: 1,
    speaker: AI_INTERVIEW_SPEAKERS.AI,
    content: initialAiTurn.replyText,
    questionNumber: 1,
    isFollowUp: false,
    tokenUsage: initialAiTurn.usage || { inputTokens: 0, outputTokens: 0 }
  });

  await turnRecord.save();

  await recordAuditEvent({
    organizationId,
    actorId: studentUser._id,
    action: 'AI_INTERVIEW_SESSION_STARTED',
    entityType: 'AiMockInterviewSession',
    entityId: session._id,
    metadata: { trackId: track._id, title: track.title },
    allowedMetadataKeys: ['trackId', 'title']
  });

  return {
    session: {
      _id: session._id,
      trackId: session.trackId,
      status: session.status,
      startedAt: session.startedAt,
      currentQuestionIndex: session.currentQuestionIndex,
      currentFollowUpCount: session.currentFollowUpCount,
      provider: session.provider,
      model: session.model,
      promptVersion: session.promptVersion
    },
    initialTurn: {
      turnNumber: turnRecord.turnNumber,
      speaker: turnRecord.speaker,
      content: turnRecord.content,
      questionNumber: turnRecord.questionNumber,
      isFollowUp: turnRecord.isFollowUp,
      createdAt: turnRecord.createdAt
    }
  };
};

export const getSessionDetails = async (organizationId, studentUserId, sessionId, isStaff = false) => {
  const session = await findByIdInOrg(AiMockInterviewSession, sessionId, organizationId, {
    populate: { path: 'trackId', select: 'title roleCategory questionConfig rubricConfig' }
  });

  if (!session) {
    throw ApiError.notFound('Interview session not found', [], ERROR_CODES.NOT_FOUND);
  }

  // Authorization check
  if (!isStaff && session.studentId.toString() !== studentUserId.toString()) {
    throw ApiError.notFound('Interview session not found', [], ERROR_CODES.NOT_FOUND);
  }

  return session;
};

// ==========================================
// 4. Interactive Turns (Student Reply & AI Next Turn)
// ==========================================

export const submitTurn = async (organizationId, studentUserId, sessionId, { content } = {}) => {
  const session = await findByIdInOrg(AiMockInterviewSession, sessionId, organizationId, {
    populate: { path: 'trackId' }
  });

  if (!session || session.studentId.toString() !== studentUserId.toString()) {
    throw ApiError.notFound('Interview session not found', [], ERROR_CODES.NOT_FOUND);
  }

  if (session.status !== AI_INTERVIEW_SESSION_STATUSES.IN_PROGRESS) {
    throw ApiError.badRequest('Interview session is no longer in progress', [], ERROR_CODES.VALIDATION_ERROR);
  }

  const track = session.trackId;
  const maxTurnChars = track.questionConfig?.maxTurnChars || 1000;

  if (!content || typeof content !== 'string' || !content.trim()) {
    throw ApiError.badRequest('Response content cannot be empty', [], ERROR_CODES.VALIDATION_ERROR);
  }

  if (content.length > maxTurnChars) {
    throw ApiError.badRequest(
      `Response exceeds character limit (${content.length}/${maxTurnChars})`,
      [{ field: 'content', message: `Max length is ${maxTurnChars} characters` }],
      ERROR_CODES.VALIDATION_ERROR
    );
  }

  // Check existing turns
  const existingTurns = await AiInterviewTurn.find({ sessionId: session._id }).sort({ turnNumber: 1 });

  // Rate limiting / debouncing check
  const lastTurn = existingTurns[existingTurns.length - 1];
  if (lastTurn && Date.now() - new Date(lastTurn.createdAt).getTime() < MIN_TURN_INTERVAL_MS) {
    throw ApiError.badRequest('Please wait a moment before sending another response', [], ERROR_CODES.VALIDATION_ERROR);
  }

  // 1. Record student turn
  const studentTurnNumber = existingTurns.length + 1;
  const studentTurn = new AiInterviewTurn({
    organizationId,
    sessionId: session._id,
    turnNumber: studentTurnNumber,
    speaker: AI_INTERVIEW_SPEAKERS.STUDENT,
    content: content.trim(),
    questionNumber: session.currentQuestionIndex,
    isFollowUp: session.currentFollowUpCount > 0
  });

  await studentTurn.save();

  // 2. Determine state for next AI turn
  const maxQuestions = track.questionConfig?.maxQuestions || 5;
  const maxFollowUps = track.questionConfig?.maxFollowUps !== undefined ? track.questionConfig.maxFollowUps : 1;

  let nextIsFollowUp = false;
  let nextQuestionNumber = session.currentQuestionIndex;

  if (session.currentFollowUpCount < maxFollowUps) {
    // Ask follow-up
    nextIsFollowUp = true;
    session.currentFollowUpCount += 1;
  } else {
    // Move to next primary question
    nextIsFollowUp = false;
    session.currentFollowUpCount = 0;
    session.currentQuestionIndex += 1;
    nextQuestionNumber = session.currentQuestionIndex;
  }

  await session.save();

  const allTurnsForPrompt = [...existingTurns, studentTurn];

  // 3. Generate AI response
  const provider = getAiProvider();
  let aiResponse;
  try {
    aiResponse = await provider.generateTurn({
      track,
      turns: allTurnsForPrompt,
      latestStudentAnswer: content.trim(),
      questionNumber: nextQuestionNumber,
      isFollowUp: nextIsFollowUp
    });
  } catch (err) {
    session.status = AI_INTERVIEW_SESSION_STATUSES.INTERRUPTED;
    session.errorDetails = err.message || 'AI generation failed';
    await session.save();
    throw ApiError.internal('AI provider error during interview turn. Transcript preserved.', [], ERROR_CODES.INTERNAL_ERROR);
  }

  const aiTurn = new AiInterviewTurn({
    organizationId,
    sessionId: session._id,
    turnNumber: studentTurnNumber + 1,
    speaker: AI_INTERVIEW_SPEAKERS.AI,
    content: aiResponse.replyText,
    questionNumber: nextQuestionNumber,
    isFollowUp: nextIsFollowUp,
    tokenUsage: aiResponse.usage || { inputTokens: 0, outputTokens: 0 }
  });

  await aiTurn.save();

  // 4. Auto-evaluate if concluded
  const isConcluding = aiResponse.isConcluding || nextQuestionNumber > maxQuestions;
  if (isConcluding) {
    await evaluateSession(organizationId, studentUserId, session._id);
  }

  return {
    studentTurn,
    aiTurn,
    isConcluding,
    currentQuestionIndex: session.currentQuestionIndex,
    maxQuestions
  };
};

// ==========================================
// 5. Completion & Evaluation
// ==========================================

export const evaluateSession = async (organizationId, studentUserId, sessionId) => {
  const session = await findByIdInOrg(AiMockInterviewSession, sessionId, organizationId, {
    populate: { path: 'trackId' }
  });

  if (!session || session.studentId.toString() !== studentUserId.toString()) {
    throw ApiError.notFound('Interview session not found', [], ERROR_CODES.NOT_FOUND);
  }

  // Idempotency: if already completed and evaluated, return existing evaluation
  if (session.status === AI_INTERVIEW_SESSION_STATUSES.COMPLETED && session.evaluation) {
    return session.evaluation;
  }

  const track = session.trackId;
  const turns = await AiInterviewTurn.find({ sessionId: session._id }).sort({ turnNumber: 1 });

  const provider = getAiProvider();

  let rawEvaluation;
  try {
    rawEvaluation = await provider.evaluate({
      track,
      turns
    });
  } catch (err) {
    session.status = AI_INTERVIEW_SESSION_STATUSES.FAILED;
    session.errorDetails = err.message || 'Evaluation generation failed';
    await session.save();
    throw ApiError.internal('Failed to evaluate interview. Transcript preserved for retry.', [], ERROR_CODES.INTERNAL_ERROR);
  }

  // Validate evaluation against schema
  let validatedEvaluation;
  try {
    validatedEvaluation = validateAiEvaluation(rawEvaluation, track.rubricConfig);
  } catch (err) {
    session.status = AI_INTERVIEW_SESSION_STATUSES.FAILED;
    session.errorDetails = err.message;
    await session.save();
    throw err;
  }

  // Save successful evaluation
  session.status = AI_INTERVIEW_SESSION_STATUSES.COMPLETED;
  session.completedAt = new Date();
  session.feedbackReleasedAt = new Date();
  session.evaluation = validatedEvaluation;
  session.errorDetails = null;

  await session.save();

  await recordAuditEvent({
    organizationId,
    actorId: studentUserId,
    action: 'AI_INTERVIEW_COMPLETED',
    entityType: 'AiMockInterviewSession',
    entityId: session._id,
    metadata: {
      trackId: track._id,
      score: validatedEvaluation.overallScore,
      percentage: validatedEvaluation.percentage,
      passed: validatedEvaluation.passed
    },
    allowedMetadataKeys: ['trackId', 'score', 'percentage', 'passed']
  });

  return validatedEvaluation;
};

export const retryEvaluation = async (organizationId, studentUserId, sessionId) => {
  const session = await findByIdInOrg(AiMockInterviewSession, sessionId, organizationId);
  if (!session || session.studentId.toString() !== studentUserId.toString()) {
    throw ApiError.notFound('Interview session not found', [], ERROR_CODES.NOT_FOUND);
  }

  // Reset status to allow re-evaluation
  session.status = AI_INTERVIEW_SESSION_STATUSES.IN_PROGRESS;
  await session.save();

  return evaluateSession(organizationId, studentUserId, sessionId);
};

// ==========================================
// 6. Transcript, Feedback & History
// ==========================================

export const getSessionTranscript = async (organizationId, studentUserId, sessionId, isStaff = false) => {
  const session = await findByIdInOrg(AiMockInterviewSession, sessionId, organizationId, {
    populate: { path: 'trackId', select: 'title roleCategory questionConfig' }
  });

  if (!session) {
    throw ApiError.notFound('Interview session not found', [], ERROR_CODES.NOT_FOUND);
  }

  if (!isStaff && session.studentId.toString() !== studentUserId.toString()) {
    throw ApiError.notFound('Interview session not found', [], ERROR_CODES.NOT_FOUND);
  }

  const turns = await AiInterviewTurn.find({ sessionId: session._id }).sort({ turnNumber: 1 });

  return {
    session: {
      _id: session._id,
      track: session.trackId,
      status: session.status,
      startedAt: session.startedAt,
      completedAt: session.completedAt,
      currentQuestionIndex: session.currentQuestionIndex,
      currentFollowUpCount: session.currentFollowUpCount
    },
    turns: turns.map((t) => ({
      turnNumber: t.turnNumber,
      speaker: t.speaker,
      content: t.content,
      questionNumber: t.questionNumber,
      isFollowUp: t.isFollowUp,
      createdAt: t.createdAt
    }))
  };
};

export const getSessionFeedback = async (organizationId, studentUserId, sessionId, isStaff = false) => {
  const session = await findByIdInOrg(AiMockInterviewSession, sessionId, organizationId, {
    populate: { path: 'trackId', select: 'title roleCategory rubricConfig' }
  });

  if (!session) {
    throw ApiError.notFound('Interview session not found', [], ERROR_CODES.NOT_FOUND);
  }

  if (!isStaff && session.studentId.toString() !== studentUserId.toString()) {
    throw ApiError.notFound('Interview session not found', [], ERROR_CODES.NOT_FOUND);
  }

  if (session.status === AI_INTERVIEW_SESSION_STATUSES.IN_PROGRESS) {
    throw ApiError.badRequest('Feedback is available once the interview is completed', [], ERROR_CODES.VALIDATION_ERROR);
  }

  return {
    sessionId: session._id,
    track: session.trackId,
    status: session.status,
    completedAt: session.completedAt,
    evaluation: session.evaluation,
    errorDetails: session.errorDetails
  };
};

export const getStudentHistory = async (organizationId, studentUserId, { page = 1, limit = 20 } = {}) => {
  return paginateInOrg(
    AiMockInterviewSession,
    { studentId: studentUserId },
    organizationId,
    {
      page: Number(page) || 1,
      limit: Number(limit) || 20,
      sort: { startedAt: -1 },
      populate: { path: 'trackId', select: 'title roleCategory interviewType' }
    }
  );
};
