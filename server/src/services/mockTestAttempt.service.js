import {
  MockTest,
  MockTestAttempt,
  MockTestAnswer,
  Question,
  StudentProfile
} from '../models/index.js';
import { ApiError } from '../utils/ApiError.js';
import { findByIdInOrg, scopeOrg, paginateInOrg } from '../utils/orgScope.js';
import { recordAuditEvent } from './audit.service.js';
import {
  MOCK_TEST_STATUSES,
  MOCK_TEST_ATTEMPT_STATUSES,
  MOCK_TEST_REVIEW_POLICIES,
  QUESTION_TYPES,
  QUESTION_SELECTION_MODES,
  ERROR_CODES
} from '../utils/constants.js';

// Helper for shuffling array
const shuffleArray = (array) => {
  const arr = [...array];
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
};

// ==========================================
// 1. Start or Resume Attempt
// ==========================================

export const startOrResumeAttempt = async (organizationId, studentUser, mockTestId) => {
  const mockTest = await findByIdInOrg(MockTest, mockTestId, organizationId);
  if (!mockTest || mockTest.status !== MOCK_TEST_STATUSES.PUBLISHED) {
    throw ApiError.notFound('Mock test not found or not published', [], ERROR_CODES.NOT_FOUND);
  }

  const now = new Date();

  // Check for active IN_PROGRESS attempt
  const activeAttempt = await MockTestAttempt.findOne(
    scopeOrg(organizationId, {
      mockTestId: mockTest._id,
      studentId: studentUser._id,
      status: MOCK_TEST_ATTEMPT_STATUSES.IN_PROGRESS
    })
  );

  if (activeAttempt) {
    // If deadline has not passed, resume existing attempt!
    if (now <= activeAttempt.deadlineAt) {
      return getAttemptForStudent(organizationId, studentUser._id, activeAttempt._id);
    } else {
      // Lazy timeout: close overdue attempt and evaluate it before proceeding
      await submitAttempt(organizationId, studentUser._id, activeAttempt._id);
    }
  }

  // Check attempt limit
  const pastAttemptsCount = await MockTestAttempt.countDocuments(
    scopeOrg(organizationId, {
      mockTestId: mockTest._id,
      studentId: studentUser._id,
      status: { $in: [MOCK_TEST_ATTEMPT_STATUSES.SUBMITTED, MOCK_TEST_ATTEMPT_STATUSES.TIMED_OUT, MOCK_TEST_ATTEMPT_STATUSES.EVALUATED] }
    })
  );

  const limit = mockTest.attemptLimit || 1;
  if (pastAttemptsCount >= limit) {
    throw ApiError.badRequest(
      `You have reached the maximum attempt limit (${limit}) for this mock test`,
      [{ field: 'attemptLimit', message: 'Maximum attempts reached' }],
      ERROR_CODES.VALIDATION_ERROR
    );
  }

  // Find student profile if available
  const profile = await StudentProfile.findOne(scopeOrg(organizationId, { userId: studentUser._id }));

  // Resolve questions for each section
  const allResolvedQuestionIds = [];
  const optionOrderMap = {};

  for (const section of mockTest.sections) {
    const config = section.questionSelectionConfig || {};
    let sectionQIds = [];

    if (config.mode === QUESTION_SELECTION_MODES.MANUAL && config.questionIds?.length) {
      sectionQIds = [...config.questionIds];
    } else if (config.mode === QUESTION_SELECTION_MODES.RANDOM_FROM_BANK && config.bankId) {
      const bankFilter = { bankId: config.bankId, status: 'ACTIVE' };
      if (config.topicTags?.length) {
        bankFilter.topicTags = { $in: config.topicTags };
      }
      const questions = await Question.find(scopeOrg(organizationId, bankFilter)).select('_id options');
      const sampled = shuffleArray(questions).slice(0, config.count || 5);
      sectionQIds = sampled.map((q) => q._id);
    }

    allResolvedQuestionIds.push(...sectionQIds);
  }

  if (allResolvedQuestionIds.length === 0) {
    throw ApiError.badRequest('Mock test contains no questions', [], ERROR_CODES.VALIDATION_ERROR);
  }

  // Stable randomized question order for this attempt
  const randomizedQuestionIds = shuffleArray(allResolvedQuestionIds);

  // Generate stable option order per question
  const questionDocs = await Question.find({ _id: { $in: randomizedQuestionIds } }).select('options');
  questionDocs.forEach((q) => {
    if (q.options && q.options.length > 0) {
      const shuffledOptions = shuffleArray(q.options.map((o) => o.optionId));
      optionOrderMap[q._id.toString()] = shuffledOptions;
    }
  });

  const durationMs = (mockTest.durationMinutes || 60) * 60 * 1000;
  const deadlineAt = new Date(Date.now() + durationMs);

  const newAttempt = new MockTestAttempt({
    organizationId,
    mockTestId: mockTest._id,
    studentId: studentUser._id,
    studentProfileId: profile?._id || null,
    testVersion: mockTest.version || 1,
    attemptNumber: pastAttemptsCount + 1,
    startedAt: now,
    deadlineAt,
    status: MOCK_TEST_ATTEMPT_STATUSES.IN_PROGRESS,
    questionOrder: randomizedQuestionIds,
    optionOrder: optionOrderMap,
    reviewPolicy: mockTest.reviewPolicy || MOCK_TEST_REVIEW_POLICIES.IMMEDIATE,
    scoringSnapshot: {
      defaultCorrectMarks: mockTest.scoringConfig?.defaultCorrectMarks || 1,
      enableNegativeMarking: Boolean(mockTest.scoringConfig?.enableNegativeMarking),
      defaultNegativeMarks: mockTest.scoringConfig?.defaultNegativeMarks || 0,
      passMarks: mockTest.scoringConfig?.passMarks || 0,
      sections: mockTest.sections.map((s) => ({
        sectionId: s.sectionId,
        name: s.name,
        marksPerQuestion: s.marksPerQuestion,
        negativeMarksPerQuestion: s.negativeMarksPerQuestion
      }))
    }
  });

  await newAttempt.save();

  await recordAuditEvent({
    organizationId,
    actorId: studentUser._id,
    action: 'MOCK_TEST_ATTEMPT_STARTED',
    entityType: 'MockTestAttempt',
    entityId: newAttempt._id,
    metadata: {
      mockTestId: mockTest._id,
      title: mockTest.title,
      attemptNumber: newAttempt.attemptNumber
    },
    allowedMetadataKeys: ['mockTestId', 'title', 'attemptNumber']
  });

  return getAttemptForStudent(organizationId, studentUser._id, newAttempt._id);
};

// ==========================================
// 2. Get Attempt Details (with Lazy Timeout)
// ==========================================

export const getAttemptForStudent = async (organizationId, studentUserId, attemptId) => {
  const attempt = await findByIdInOrg(MockTestAttempt, attemptId, organizationId, {
    populate: { path: 'mockTestId', select: 'title description instructions categoryId durationMinutes' }
  });

  if (!attempt || attempt.studentId.toString() !== studentUserId.toString()) {
    throw ApiError.notFound('Mock test attempt not found', [], ERROR_CODES.NOT_FOUND);
  }

  const now = new Date();

  // Lazy timeout check: if attempt is IN_PROGRESS and past deadline, automatically close & evaluate!
  if (attempt.status === MOCK_TEST_ATTEMPT_STATUSES.IN_PROGRESS && now > attempt.deadlineAt) {
    return submitAttempt(organizationId, studentUserId, attempt._id);
  }

  // Load saved answers
  const savedAnswers = await MockTestAnswer.find({ attemptId: attempt._id });
  const savedAnswersMap = {};
  savedAnswers.forEach((ans) => {
    savedAnswersMap[ans.questionId.toString()] = {
      selectedOptions: ans.selectedOptions || [],
      textAnswer: ans.textAnswer || '',
      savedAt: ans.savedAt
    };
  });

  // Load questions in stable order without secret answers/explanations
  const questionDocs = await Question.find({ _id: { $in: attempt.questionOrder } });
  const questionMap = new Map();
  questionDocs.forEach((q) => questionMap.set(q._id.toString(), q));

  const sanitizedQuestions = [];
  attempt.questionOrder.forEach((qId) => {
    const qDoc = questionMap.get(qId.toString());
    if (qDoc) {
      const sanitized = Question.sanitizeForStudent(qDoc);
      // Re-order options according to attempt's stable optionOrder if recorded
      const stableOptOrder = attempt.optionOrder?.get(qId.toString());
      if (stableOptOrder && Array.isArray(stableOptOrder)) {
        const optMap = new Map();
        sanitized.options.forEach((opt) => optMap.set(opt.optionId, opt));
        sanitized.options = stableOptOrder.map((optId) => optMap.get(optId)).filter(Boolean);
      }
      sanitizedQuestions.push(sanitized);
    }
  });

  const remainingSeconds = Math.max(
    0,
    Math.floor((attempt.deadlineAt.getTime() - now.getTime()) / 1000)
  );

  return {
    attempt: {
      _id: attempt._id,
      mockTestId: attempt.mockTestId,
      status: attempt.status,
      startedAt: attempt.startedAt,
      deadlineAt: attempt.deadlineAt,
      submittedAt: attempt.submittedAt,
      attemptNumber: attempt.attemptNumber,
      testVersion: attempt.testVersion,
      scoringSnapshot: attempt.scoringSnapshot,
      reviewPolicy: attempt.reviewPolicy,
      score: attempt.score,
      maxScore: attempt.maxScore,
      percentage: attempt.percentage,
      passed: attempt.passed,
      timeTakenSeconds: attempt.timeTakenSeconds,
      topicAnalytics: attempt.topicAnalytics
    },
    questions: sanitizedQuestions,
    savedAnswers: savedAnswersMap,
    remainingSeconds
  };
};

// ==========================================
// 3. Save Answer (Autosave with Deadline Check)
// ==========================================

export const saveAnswer = async (
  organizationId,
  studentUserId,
  attemptId,
  questionId,
  { selectedOptions = [], textAnswer = '' } = {}
) => {
  const attempt = await findByIdInOrg(MockTestAttempt, attemptId, organizationId);
  if (!attempt || attempt.studentId.toString() !== studentUserId.toString()) {
    throw ApiError.notFound('Mock test attempt not found', [], ERROR_CODES.NOT_FOUND);
  }

  // Reject if not IN_PROGRESS
  if (attempt.status !== MOCK_TEST_ATTEMPT_STATUSES.IN_PROGRESS) {
    throw ApiError.badRequest(
      'Cannot save answer: test is no longer in progress',
      [],
      ERROR_CODES.VALIDATION_ERROR
    );
  }

  // Reject if deadline passed
  const now = new Date();
  if (now > attempt.deadlineAt) {
    throw ApiError.badRequest(
      'Test deadline has passed. Answers can no longer be submitted.',
      [],
      ERROR_CODES.VALIDATION_ERROR
    );
  }

  // Verify question belongs to attempt
  const belongs = attempt.questionOrder.some((q) => q.toString() === questionId.toString());
  if (!belongs) {
    throw ApiError.badRequest('Question does not belong to this test attempt', [], ERROR_CODES.VALIDATION_ERROR);
  }

  const answer = await MockTestAnswer.findOneAndUpdate(
    { attemptId: attempt._id, questionId },
    {
      organizationId,
      studentId: studentUserId,
      selectedOptions: Array.isArray(selectedOptions) ? selectedOptions : [],
      textAnswer: typeof textAnswer === 'string' ? textAnswer.trim() : '',
      savedAt: now
    },
    { upsert: true, new: true, setDefaultsOnInsert: true }
  );

  return {
    questionId,
    savedAt: answer.savedAt,
    success: true
  };
};

// ==========================================
// 4. Submit & Server-Side Scoring
// ==========================================

export const submitAttempt = async (
  organizationId,
  studentUserId,
  attemptId,
  { idempotencyKey } = {}
) => {
  const attempt = await findByIdInOrg(MockTestAttempt, attemptId, organizationId);
  if (!attempt || attempt.studentId.toString() !== studentUserId.toString()) {
    throw ApiError.notFound('Mock test attempt not found', [], ERROR_CODES.NOT_FOUND);
  }

  // Idempotency: If already evaluated/submitted, return existing evaluated state immediately!
  if ([MOCK_TEST_ATTEMPT_STATUSES.SUBMITTED, MOCK_TEST_ATTEMPT_STATUSES.TIMED_OUT, MOCK_TEST_ATTEMPT_STATUSES.EVALUATED].includes(attempt.status)) {
    return getAttemptResult(organizationId, studentUserId, attempt._id);
  }

  const now = new Date();
  const isOverdue = now > attempt.deadlineAt;
  const initialSubmitStatus = isOverdue
    ? MOCK_TEST_ATTEMPT_STATUSES.TIMED_OUT
    : MOCK_TEST_ATTEMPT_STATUSES.SUBMITTED;

  // Atomic Conditional Update: Only transition if status is still IN_PROGRESS (prevents double submits / race conditions)
  const lockedAttempt = await MockTestAttempt.findOneAndUpdate(
    { _id: attempt._id, status: MOCK_TEST_ATTEMPT_STATUSES.IN_PROGRESS },
    {
      $set: {
        status: initialSubmitStatus,
        submittedAt: now,
        idempotencyKey: idempotencyKey || null
      }
    },
    { new: true }
  );

  if (!lockedAttempt) {
    // Another concurrent worker submitted this attempt in parallel
    return getAttemptResult(organizationId, studentUserId, attempt._id);
  }

  // Load questions WITH answerKey & explanation for scoring
  const questions = await Question.find({ _id: { $in: lockedAttempt.questionOrder } }).select(
    '+answerKey +explanation'
  );
  const questionMap = new Map();
  questions.forEach((q) => questionMap.set(q._id.toString(), q));

  // Load answers saved by student
  const savedAnswers = await MockTestAnswer.find({ attemptId: lockedAttempt._id });
  const answerMap = new Map();
  savedAnswers.forEach((ans) => {
    // If overdue, discard any answer saved strictly after the official deadline
    if (isOverdue && ans.savedAt > lockedAttempt.deadlineAt) {
      return;
    }
    answerMap.set(ans.questionId.toString(), ans);
  });

  const scoringConfig = lockedAttempt.scoringSnapshot || {};
  const defaultCorrect = scoringConfig.defaultCorrectMarks || 1;
  const defaultNegative = scoringConfig.enableNegativeMarking ? (scoringConfig.defaultNegativeMarks || 0) : 0;

  let totalScore = 0;
  let maxScore = 0;
  const topicStats = {}; // topicTag -> { total, correct, incorrect, unattempted, score, maxScore }

  for (const qId of lockedAttempt.questionOrder) {
    const question = questionMap.get(qId.toString());
    if (!question) continue;

    const studentAnswer = answerMap.get(qId.toString());
    const qMarks = defaultCorrect;
    const qNegative = defaultNegative;
    maxScore += qMarks;

    // Check correctness based on question type
    let isAttempted = false;
    let isCorrect = false;

    if (question.type === QUESTION_TYPES.SINGLE_CHOICE) {
      const selected = studentAnswer?.selectedOptions || [];
      if (selected.length > 0) {
        isAttempted = true;
        isCorrect = Array.isArray(question.answerKey)
          ? question.answerKey.includes(selected[0])
          : question.answerKey === selected[0];
      }
    } else if (question.type === QUESTION_TYPES.MULTI_SELECT) {
      const selected = studentAnswer?.selectedOptions || [];
      if (selected.length > 0) {
        isAttempted = true;
        // All-or-nothing by default: exact set match
        const correctSet = new Set(Array.isArray(question.answerKey) ? question.answerKey : [question.answerKey]);
        const studentSet = new Set(selected);
        isCorrect =
          correctSet.size === studentSet.size &&
          [...studentSet].every((val) => correctSet.has(val));
      }
    } else if (question.type === QUESTION_TYPES.SHORT_ANSWER) {
      const text = studentAnswer?.textAnswer || '';
      if (text.trim().length > 0) {
        isAttempted = true;
        const expected = String(question.answerKey || '').trim().toLowerCase();
        isCorrect = text.trim().toLowerCase() === expected;
      }
    }

    // Marks computation
    let awarded = 0;
    if (isAttempted) {
      if (isCorrect) {
        awarded = qMarks;
      } else {
        // Negative marking applied exactly once, only to answered-wrong
        awarded = -qNegative;
      }
    } else {
      awarded = 0;
    }

    totalScore += awarded;

    // Update answer record with score & correctness
    if (studentAnswer) {
      studentAnswer.isCorrect = isCorrect;
      studentAnswer.marksAwarded = awarded;
      await studentAnswer.save();
    }

    // Accumulate topic-wise analytics
    const tags = question.topicTags?.length ? question.topicTags : ['General'];
    tags.forEach((tag) => {
      if (!topicStats[tag]) {
        topicStats[tag] = {
          topicTag: tag,
          totalQuestions: 0,
          correct: 0,
          incorrect: 0,
          unattempted: 0,
          score: 0,
          maxScore: 0
        };
      }
      topicStats[tag].totalQuestions += 1;
      topicStats[tag].maxScore += qMarks;
      topicStats[tag].score += awarded;
      if (!isAttempted) {
        topicStats[tag].unattempted += 1;
      } else if (isCorrect) {
        topicStats[tag].correct += 1;
      } else {
        topicStats[tag].incorrect += 1;
      }
    });
  }

  // Constrain totalScore to max 2 decimal places
  totalScore = Math.round(totalScore * 100) / 100;
  const percentage = maxScore > 0 ? Math.round((Math.max(0, totalScore) / maxScore) * 100) : 0;
  const passMarks = scoringConfig.passMarks || 0;
  const passed = totalScore >= passMarks;
  const timeTakenSeconds = Math.max(
    0,
    Math.round((lockedAttempt.submittedAt.getTime() - lockedAttempt.startedAt.getTime()) / 1000)
  );

  lockedAttempt.score = totalScore;
  lockedAttempt.maxScore = maxScore;
  lockedAttempt.percentage = percentage;
  lockedAttempt.passed = passed;
  lockedAttempt.timeTakenSeconds = timeTakenSeconds;
  lockedAttempt.topicAnalytics = Object.values(topicStats);
  lockedAttempt.status = MOCK_TEST_ATTEMPT_STATUSES.EVALUATED;

  await lockedAttempt.save();

  await recordAuditEvent({
    organizationId,
    actorId: studentUserId,
    action: 'MOCK_TEST_EVALUATED',
    entityType: 'MockTestAttempt',
    entityId: lockedAttempt._id,
    metadata: {
      mockTestId: lockedAttempt.mockTestId,
      score: totalScore,
      maxScore,
      percentage,
      passed,
      timedOut: isOverdue
    },
    allowedMetadataKeys: ['mockTestId', 'score', 'maxScore', 'percentage', 'passed', 'timedOut']
  });

  return getAttemptResult(organizationId, studentUserId, lockedAttempt._id);
};

// ==========================================
// 5. Get Attempt Evaluation Results
// ==========================================

export const getAttemptResult = async (organizationId, studentUserId, attemptId) => {
  const attempt = await findByIdInOrg(MockTestAttempt, attemptId, organizationId, {
    populate: { path: 'mockTestId', select: 'title description instructions durationMinutes' }
  });

  if (!attempt || attempt.studentId.toString() !== studentUserId.toString()) {
    throw ApiError.notFound('Mock test attempt not found', [], ERROR_CODES.NOT_FOUND);
  }

  if (attempt.status === MOCK_TEST_ATTEMPT_STATUSES.IN_PROGRESS) {
    throw ApiError.badRequest('Test attempt is still in progress', [], ERROR_CODES.VALIDATION_ERROR);
  }

  const reviewPolicy = attempt.reviewPolicy || MOCK_TEST_REVIEW_POLICIES.IMMEDIATE;
  let questionBreakdown = null;

  // Include detailed question review ONLY if allowed by reviewPolicy
  if (reviewPolicy === MOCK_TEST_REVIEW_POLICIES.IMMEDIATE) {
    const questions = await Question.find({ _id: { $in: attempt.questionOrder } }).select(
      '+answerKey +explanation'
    );
    const answers = await MockTestAnswer.find({ attemptId: attempt._id });
    const answerMap = new Map();
    answers.forEach((ans) => answerMap.set(ans.questionId.toString(), ans));

    const qMap = new Map();
    questions.forEach((q) => qMap.set(q._id.toString(), q));

    questionBreakdown = attempt.questionOrder.map((qId) => {
      const q = qMap.get(qId.toString());
      const ans = answerMap.get(qId.toString());
      return {
        questionId: qId,
        prompt: q?.prompt || '',
        type: q?.type || 'SINGLE_CHOICE',
        options: q?.options || [],
        difficulty: q?.difficulty || 'MEDIUM',
        studentSelectedOptions: ans?.selectedOptions || [],
        studentTextAnswer: ans?.textAnswer || '',
        correctAnswerKey: q?.answerKey || null,
        explanation: q?.explanation || '',
        isCorrect: ans?.isCorrect ?? false,
        marksAwarded: ans?.marksAwarded ?? 0
      };
    });
  }

  return {
    attemptId: attempt._id,
    mockTest: attempt.mockTestId,
    status: attempt.status,
    startedAt: attempt.startedAt,
    deadlineAt: attempt.deadlineAt,
    submittedAt: attempt.submittedAt,
    timeTakenSeconds: attempt.timeTakenSeconds,
    score: attempt.score,
    maxScore: attempt.maxScore,
    percentage: attempt.percentage,
    passed: attempt.passed,
    attemptNumber: attempt.attemptNumber,
    testVersion: attempt.testVersion,
    topicAnalytics: attempt.topicAnalytics || [],
    reviewPolicy,
    questionBreakdown // Null if review policy is NEVER or AFTER_DEADLINE
  };
};

// ==========================================
// 6. Student Mock Test History
// ==========================================

export const getStudentMockTestHistory = async (
  organizationId,
  studentUserId,
  { page = 1, limit = 20 } = {}
) => {
  return paginateInOrg(
    MockTestAttempt,
    { studentId: studentUserId },
    organizationId,
    {
      page: Number(page) || 1,
      limit: Number(limit) || 20,
      sort: { createdAt: -1 },
      populate: { path: 'mockTestId', select: 'title durationMinutes categoryId' }
    }
  );
};

// ==========================================
// 7. Staff Mock Test Aggregate Report
// ==========================================

export const getAdminMockTestReport = async (organizationId, { mockTestId } = {}) => {
  const filter = {};
  if (mockTestId) filter.mockTestId = mockTestId;

  const [totalAttempts, completedAttempts, timedOutAttempts] = await Promise.all([
    MockTestAttempt.countDocuments(scopeOrg(organizationId, filter)),
    MockTestAttempt.countDocuments(
      scopeOrg(organizationId, { ...filter, status: MOCK_TEST_ATTEMPT_STATUSES.EVALUATED })
    ),
    MockTestAttempt.countDocuments(
      scopeOrg(organizationId, { ...filter, status: MOCK_TEST_ATTEMPT_STATUSES.TIMED_OUT })
    )
  ]);

  const attempts = await MockTestAttempt.find(
    scopeOrg(organizationId, {
      ...filter,
      status: { $in: [MOCK_TEST_ATTEMPT_STATUSES.EVALUATED, MOCK_TEST_ATTEMPT_STATUSES.TIMED_OUT] }
    })
  ).select('score maxScore percentage passed');

  let avgPercentage = 0;
  let passCount = 0;
  if (attempts.length > 0) {
    const sumPct = attempts.reduce((acc, a) => acc + (a.percentage || 0), 0);
    avgPercentage = Math.round(sumPct / attempts.length);
    passCount = attempts.filter((a) => a.passed).length;
  }

  const passRate = attempts.length > 0 ? Math.round((passCount / attempts.length) * 100) : 0;

  return {
    summary: {
      totalAttempts,
      completedAttempts,
      timedOutAttempts,
      averagePercentage: avgPercentage,
      passRate
    }
  };
};
