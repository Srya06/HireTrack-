import {
  TestCategory,
  QuestionBank,
  Question,
  MockTest
} from '../models/index.js';
import { ApiError } from '../utils/ApiError.js';
import { findByIdInOrg, paginateInOrg, scopeOrg } from '../utils/orgScope.js';
import { recordAuditEvent } from './audit.service.js';
import {
  QUESTION_TYPES,
  QUESTION_DIFFICULTIES,
  QUESTION_STATUSES,
  MOCK_TEST_STATUSES,
  QUESTION_SELECTION_MODES,
  ERROR_CODES
} from '../utils/constants.js';

const toSlug = (text) =>
  String(text || '')
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, '')
    .replace(/[\s_-]+/g, '-')
    .replace(/^-+|-+$/g, '');

// ==========================================
// 1. Test Category Service
// ==========================================

export const listCategories = async (organizationId, { status, q, page = 1, limit = 50 } = {}) => {
  const filter = {};
  if (status) filter.status = status;
  if (q) filter.name = { $regex: q.trim(), $options: 'i' };

  return paginateInOrg(TestCategory, filter, organizationId, {
    page,
    limit,
    sort: { name: 1 }
  });
};

export const createCategory = async (organizationId, actorUser, { name, description = '' }) => {
  if (!name || !name.trim()) {
    throw ApiError.badRequest('Category name is required', [], ERROR_CODES.VALIDATION_ERROR);
  }

  const baseSlug = toSlug(name) || `cat-${Date.now()}`;
  let slug = baseSlug;
  let counter = 1;

  while (await TestCategory.findOne(scopeOrg(organizationId, { slug }))) {
    slug = `${baseSlug}-${counter++}`;
  }

  const category = await TestCategory.create({
    organizationId,
    name: name.trim(),
    slug,
    description: description?.trim() || '',
    status: 'ACTIVE',
    createdBy: actorUser._id
  });

  return category.toJSON();
};

export const getCategoryById = async (organizationId, id) => {
  const category = await findByIdInOrg(TestCategory, id, organizationId);
  if (!category) {
    throw ApiError.notFound('Test category not found', [], ERROR_CODES.NOT_FOUND);
  }
  return category.toJSON();
};

export const updateCategory = async (organizationId, id, { name, description, status }) => {
  const category = await findByIdInOrg(TestCategory, id, organizationId);
  if (!category) {
    throw ApiError.notFound('Test category not found', [], ERROR_CODES.NOT_FOUND);
  }

  if (name && name.trim()) {
    category.name = name.trim();
  }
  if (description !== undefined) {
    category.description = String(description).trim();
  }
  if (status && ['ACTIVE', 'ARCHIVED'].includes(status)) {
    category.status = status;
  }

  await category.save();
  return category.toJSON();
};

export const archiveCategory = async (organizationId, id) => {
  return updateCategory(organizationId, id, { status: 'ARCHIVED' });
};

// ==========================================
// 2. Question Bank Service
// ==========================================

export const listQuestionBanks = async (
  organizationId,
  { categoryId, status, q, page = 1, limit = 50 } = {}
) => {
  const filter = {};
  if (categoryId) filter.categoryId = categoryId;
  if (status) filter.status = status;
  if (q) filter.name = { $regex: q.trim(), $options: 'i' };

  return paginateInOrg(QuestionBank, filter, organizationId, {
    page,
    limit,
    sort: { name: 1 },
    populate: { path: 'categoryId', select: 'name slug' }
  });
};

export const createQuestionBank = async (
  organizationId,
  actorUser,
  { name, categoryId, description = '', topicTags = [] }
) => {
  if (!name || !name.trim()) {
    throw ApiError.badRequest('Question bank name is required', [], ERROR_CODES.VALIDATION_ERROR);
  }
  if (!categoryId) {
    throw ApiError.badRequest('Category ID is required', [], ERROR_CODES.VALIDATION_ERROR);
  }

  const category = await findByIdInOrg(TestCategory, categoryId, organizationId);
  if (!category) {
    throw ApiError.notFound('Test category not found', [], ERROR_CODES.NOT_FOUND);
  }

  const tags = Array.isArray(topicTags)
    ? topicTags.map((t) => String(t).trim()).filter(Boolean)
    : [];

  const bank = await QuestionBank.create({
    organizationId,
    name: name.trim(),
    categoryId: category._id,
    description: description?.trim() || '',
    topicTags: tags,
    status: 'ACTIVE',
    createdBy: actorUser._id
  });

  return bank.toJSON();
};

export const getQuestionBankById = async (organizationId, id) => {
  const bank = await findByIdInOrg(QuestionBank, id, organizationId, {
    populate: { path: 'categoryId', select: 'name slug' }
  });
  if (!bank) {
    throw ApiError.notFound('Question bank not found', [], ERROR_CODES.NOT_FOUND);
  }
  return bank.toJSON();
};

export const updateQuestionBank = async (
  organizationId,
  id,
  { name, categoryId, description, topicTags, status }
) => {
  const bank = await findByIdInOrg(QuestionBank, id, organizationId);
  if (!bank) {
    throw ApiError.notFound('Question bank not found', [], ERROR_CODES.NOT_FOUND);
  }

  if (name && name.trim()) bank.name = name.trim();
  if (description !== undefined) bank.description = String(description).trim();
  if (status && ['ACTIVE', 'ARCHIVED'].includes(status)) bank.status = status;

  if (categoryId) {
    const cat = await findByIdInOrg(TestCategory, categoryId, organizationId);
    if (!cat) throw ApiError.notFound('Test category not found', [], ERROR_CODES.NOT_FOUND);
    bank.categoryId = cat._id;
  }

  if (Array.isArray(topicTags)) {
    bank.topicTags = topicTags.map((t) => String(t).trim()).filter(Boolean);
  }

  await bank.save();
  return bank.toJSON();
};

export const archiveQuestionBank = async (organizationId, id) => {
  return updateQuestionBank(organizationId, id, { status: 'ARCHIVED' });
};

// ==========================================
// 3. Question Authoring Service
// ==========================================

export const listQuestions = async (
  organizationId,
  { bankId, difficulty, type, topicTag, q, status = 'ACTIVE', page = 1, limit = 20, selectAnswerKey = false } = {}
) => {
  const filter = {};
  if (bankId) filter.bankId = bankId;
  if (difficulty) filter.difficulty = difficulty;
  if (type) filter.type = type;
  if (status) filter.status = status;
  if (topicTag) filter.topicTags = topicTag;
  if (q) filter.prompt = { $regex: q.trim(), $options: 'i' };

  const select = selectAnswerKey ? '+answerKey +explanation' : '';

  return paginateInOrg(Question, filter, organizationId, {
    page,
    limit,
    sort: { createdAt: -1 },
    select,
    populate: { path: 'bankId', select: 'name categoryId' }
  });
};

export const createQuestion = async (
  organizationId,
  actorUser,
  { bankId, type, prompt, options = [], answerKey, explanation = '', difficulty = 'MEDIUM', topicTags = [] }
) => {
  // Reject CODING questions with explicit message per requirements
  if (type === QUESTION_TYPES.CODING) {
    throw ApiError.badRequest(
      'CODING question type is not supported until a secure code execution sandbox is approved',
      [{ field: 'type', message: 'CODING questions are prohibited until sandbox approval' }],
      ERROR_CODES.VALIDATION_ERROR
    );
  }

  if (![QUESTION_TYPES.SINGLE_CHOICE, QUESTION_TYPES.MULTI_SELECT, QUESTION_TYPES.SHORT_ANSWER].includes(type)) {
    throw ApiError.badRequest(`Unsupported question type: ${type}`, [], ERROR_CODES.VALIDATION_ERROR);
  }

  if (!bankId) {
    throw ApiError.badRequest('Question bank ID is required', [], ERROR_CODES.VALIDATION_ERROR);
  }

  const bank = await findByIdInOrg(QuestionBank, bankId, organizationId);
  if (!bank) {
    throw ApiError.notFound('Question bank not found', [], ERROR_CODES.NOT_FOUND);
  }

  if (!prompt || !prompt.trim()) {
    throw ApiError.badRequest('Question prompt is required', [], ERROR_CODES.VALIDATION_ERROR);
  }

  if (answerKey === undefined || answerKey === null || answerKey === '') {
    throw ApiError.badRequest('Answer key is required for scoring', [], ERROR_CODES.VALIDATION_ERROR);
  }

  // Validate choices for choice-based questions
  let sanitizedOptions = [];
  if ([QUESTION_TYPES.SINGLE_CHOICE, QUESTION_TYPES.MULTI_SELECT].includes(type)) {
    if (!Array.isArray(options) || options.length < 2) {
      throw ApiError.badRequest(
        'Choice questions must have at least 2 options',
        [{ field: 'options', message: 'At least 2 options are required' }],
        ERROR_CODES.VALIDATION_ERROR
      );
    }
    sanitizedOptions = options.map((opt, i) => ({
      optionId: opt.optionId || `opt_${i + 1}`,
      text: String(opt.text || '').trim()
    }));

    if (sanitizedOptions.some((o) => !o.text)) {
      throw ApiError.badRequest('All options must have non-empty text', [], ERROR_CODES.VALIDATION_ERROR);
    }
  }

  const tags = Array.isArray(topicTags)
    ? topicTags.map((t) => String(t).trim()).filter(Boolean)
    : [];

  const question = new Question({
    organizationId,
    bankId: bank._id,
    type,
    prompt: prompt.trim(),
    options: sanitizedOptions,
    answerKey,
    explanation: explanation ? String(explanation).trim() : '',
    difficulty: Object.values(QUESTION_DIFFICULTIES).includes(difficulty) ? difficulty : QUESTION_DIFFICULTIES.MEDIUM,
    topicTags: tags,
    status: QUESTION_STATUSES.ACTIVE,
    createdBy: actorUser._id
  });

  await question.save();

  // Return authoring view with answerKey & explanation for staff confirmation
  const loaded = await Question.findById(question._id)
    .select('+answerKey +explanation')
    .populate('bankId', 'name categoryId');

  return loaded.toJSON();
};

export const getQuestionById = async (organizationId, id, { selectAnswerKey = true } = {}) => {
  let query = Question.findOne(scopeOrg(organizationId, { _id: id })).populate('bankId', 'name categoryId');
  if (selectAnswerKey) {
    query = query.select('+answerKey +explanation');
  }
  const question = await query;
  if (!question) {
    throw ApiError.notFound('Question not found', [], ERROR_CODES.NOT_FOUND);
  }
  return question.toJSON();
};

export const updateQuestion = async (organizationId, id, data) => {
  if (data.type === QUESTION_TYPES.CODING) {
    throw ApiError.badRequest(
      'CODING question type is not supported until a secure code execution sandbox is approved',
      [{ field: 'type', message: 'CODING questions are prohibited until sandbox approval' }],
      ERROR_CODES.VALIDATION_ERROR
    );
  }

  const question = await Question.findOne(scopeOrg(organizationId, { _id: id })).select('+answerKey +explanation');
  if (!question) {
    throw ApiError.notFound('Question not found', [], ERROR_CODES.NOT_FOUND);
  }

  if (data.prompt !== undefined) question.prompt = String(data.prompt).trim();
  if (data.difficulty) question.difficulty = data.difficulty;
  if (data.status) question.status = data.status;
  if (data.explanation !== undefined) question.explanation = String(data.explanation).trim();
  if (data.answerKey !== undefined) question.answerKey = data.answerKey;
  if (Array.isArray(data.topicTags)) {
    question.topicTags = data.topicTags.map((t) => String(t).trim()).filter(Boolean);
  }

  if (data.options && Array.isArray(data.options)) {
    question.options = data.options.map((opt, i) => ({
      optionId: opt.optionId || `opt_${i + 1}`,
      text: String(opt.text || '').trim()
    }));
  }

  if (data.bankId) {
    const bank = await findByIdInOrg(QuestionBank, data.bankId, organizationId);
    if (!bank) throw ApiError.notFound('Question bank not found', [], ERROR_CODES.NOT_FOUND);
    question.bankId = bank._id;
  }

  await question.save();

  const loaded = await Question.findById(question._id)
    .select('+answerKey +explanation')
    .populate('bankId', 'name categoryId');
  return loaded.toJSON();
};

export const archiveQuestion = async (organizationId, id) => {
  return updateQuestion(organizationId, id, { status: QUESTION_STATUSES.ARCHIVED });
};

// ==========================================
// 4. Mock Test Authoring & Builder Service
// ==========================================

export const listMockTests = async (
  organizationId,
  { status, categoryId, q, page = 1, limit = 20 } = {}
) => {
  const filter = {};
  if (status) filter.status = status;
  if (categoryId) filter.categoryId = categoryId;
  if (q) filter.title = { $regex: q.trim(), $options: 'i' };

  return paginateInOrg(MockTest, filter, organizationId, {
    page,
    limit,
    sort: { updatedAt: -1 },
    populate: [
      { path: 'categoryId', select: 'name slug' },
      { path: 'createdBy', select: 'name email' }
    ]
  });
};

export const createMockTest = async (organizationId, actorUser, testData) => {
  const {
    title,
    description = '',
    instructions = '',
    categoryId,
    durationMinutes = 60,
    attemptLimit = 1,
    reviewPolicy = 'IMMEDIATE',
    scoringConfig = {},
    sections = []
  } = testData;

  if (!title || !title.trim()) {
    throw ApiError.badRequest('Mock test title is required', [], ERROR_CODES.VALIDATION_ERROR);
  }

  if (!durationMinutes || Number(durationMinutes) < 1) {
    throw ApiError.badRequest('Duration must be at least 1 minute', [], ERROR_CODES.VALIDATION_ERROR);
  }

  if (categoryId) {
    const cat = await findByIdInOrg(TestCategory, categoryId, organizationId);
    if (!cat) throw ApiError.notFound('Test category not found', [], ERROR_CODES.NOT_FOUND);
  }

  const mockTest = new MockTest({
    organizationId,
    title: title.trim(),
    description: description?.trim() || '',
    instructions: instructions?.trim() || '',
    categoryId: categoryId || null,
    durationMinutes: Number(durationMinutes),
    attemptLimit: Math.max(1, Number(attemptLimit) || 1),
    reviewPolicy,
    status: MOCK_TEST_STATUSES.DRAFT,
    version: 1,
    scoringConfig: {
      defaultCorrectMarks: Math.max(0.1, Number(scoringConfig.defaultCorrectMarks) || 1),
      enableNegativeMarking: Boolean(scoringConfig.enableNegativeMarking),
      defaultNegativeMarks: Math.max(0, Number(scoringConfig.defaultNegativeMarks) || 0),
      passMarks: Math.max(0, Number(scoringConfig.passMarks) || 0)
    },
    sections: (sections || []).map((sec, i) => ({
      sectionId: sec.sectionId || `sec_${i + 1}`,
      name: sec.name || `Section ${i + 1}`,
      durationMinutes: sec.durationMinutes ? Number(sec.durationMinutes) : undefined,
      marksPerQuestion: Math.max(0.1, Number(sec.marksPerQuestion) || 1),
      negativeMarksPerQuestion: Math.max(0, Number(sec.negativeMarksPerQuestion) || 0),
      questionSelectionConfig: {
        mode: sec.questionSelectionConfig?.mode || QUESTION_SELECTION_MODES.MANUAL,
        bankId: sec.questionSelectionConfig?.bankId || null,
        count: Number(sec.questionSelectionConfig?.count) || (sec.questionSelectionConfig?.questionIds?.length || 0),
        difficultyDistribution: sec.questionSelectionConfig?.difficultyDistribution || { easy: 0, medium: 0, hard: 0 },
        topicTags: sec.questionSelectionConfig?.topicTags || [],
        questionIds: sec.questionSelectionConfig?.questionIds || []
      }
    })),
    createdBy: actorUser._id
  });

  await mockTest.save();

  await recordAuditEvent({
    organizationId,
    actorId: actorUser._id,
    action: 'MOCK_TEST_CREATED',
    entityType: 'MockTest',
    entityId: mockTest._id,
    metadata: { title: mockTest.title, status: mockTest.status, version: mockTest.version },
    allowedMetadataKeys: ['title', 'status', 'version']
  });

  return mockTest.toJSON();
};

export const getMockTestById = async (organizationId, id) => {
  const mockTest = await findByIdInOrg(MockTest, id, organizationId, {
    populate: [
      { path: 'categoryId', select: 'name slug' },
      { path: 'createdBy', select: 'name email' },
      {
        path: 'sections.questionSelectionConfig.questionIds',
        select: 'prompt type difficulty topicTags options' // Strips answerKey & explanation
      }
    ]
  });

  if (!mockTest) {
    throw ApiError.notFound('Mock test not found', [], ERROR_CODES.NOT_FOUND);
  }

  return mockTest.toJSON();
};

export const updateMockTest = async (organizationId, actorUser, id, updateData) => {
  const mockTest = await findByIdInOrg(MockTest, id, organizationId);
  if (!mockTest) {
    throw ApiError.notFound('Mock test not found', [], ERROR_CODES.NOT_FOUND);
  }

  // Versioning Rule: If published, any update bumps version! Existing attempts keep their pinned version.
  const wasPublished = mockTest.status === MOCK_TEST_STATUSES.PUBLISHED;
  if (wasPublished) {
    mockTest.version += 1;
  }

  if (updateData.title && updateData.title.trim()) mockTest.title = updateData.title.trim();
  if (updateData.description !== undefined) mockTest.description = String(updateData.description).trim();
  if (updateData.instructions !== undefined) mockTest.instructions = String(updateData.instructions).trim();
  if (updateData.durationMinutes) mockTest.durationMinutes = Math.max(1, Number(updateData.durationMinutes));
  if (updateData.attemptLimit) mockTest.attemptLimit = Math.max(1, Number(updateData.attemptLimit));
  if (updateData.reviewPolicy) mockTest.reviewPolicy = updateData.reviewPolicy;

  if (updateData.categoryId) {
    const cat = await findByIdInOrg(TestCategory, updateData.categoryId, organizationId);
    if (!cat) throw ApiError.notFound('Test category not found', [], ERROR_CODES.NOT_FOUND);
    mockTest.categoryId = cat._id;
  }

  if (updateData.scoringConfig) {
    mockTest.scoringConfig = {
      defaultCorrectMarks: Math.max(0.1, Number(updateData.scoringConfig.defaultCorrectMarks) || mockTest.scoringConfig.defaultCorrectMarks),
      enableNegativeMarking: updateData.scoringConfig.enableNegativeMarking !== undefined
        ? Boolean(updateData.scoringConfig.enableNegativeMarking)
        : mockTest.scoringConfig.enableNegativeMarking,
      defaultNegativeMarks: Math.max(0, Number(updateData.scoringConfig.defaultNegativeMarks) || 0),
      passMarks: Math.max(0, Number(updateData.scoringConfig.passMarks) || 0)
    };
  }

  if (Array.isArray(updateData.sections)) {
    mockTest.sections = updateData.sections.map((sec, i) => ({
      sectionId: sec.sectionId || `sec_${i + 1}`,
      name: sec.name || `Section ${i + 1}`,
      durationMinutes: sec.durationMinutes ? Number(sec.durationMinutes) : undefined,
      marksPerQuestion: Math.max(0.1, Number(sec.marksPerQuestion) || 1),
      negativeMarksPerQuestion: Math.max(0, Number(sec.negativeMarksPerQuestion) || 0),
      questionSelectionConfig: {
        mode: sec.questionSelectionConfig?.mode || QUESTION_SELECTION_MODES.MANUAL,
        bankId: sec.questionSelectionConfig?.bankId || null,
        count: Number(sec.questionSelectionConfig?.count) || (sec.questionSelectionConfig?.questionIds?.length || 0),
        difficultyDistribution: sec.questionSelectionConfig?.difficultyDistribution || { easy: 0, medium: 0, hard: 0 },
        topicTags: sec.questionSelectionConfig?.topicTags || [],
        questionIds: sec.questionSelectionConfig?.questionIds || []
      }
    }));
  }

  await mockTest.save();

  await recordAuditEvent({
    organizationId,
    actorId: actorUser._id,
    action: wasPublished ? 'MOCK_TEST_VERSION_BUMPED' : 'MOCK_TEST_UPDATED',
    entityType: 'MockTest',
    entityId: mockTest._id,
    metadata: { title: mockTest.title, version: mockTest.version, status: mockTest.status },
    allowedMetadataKeys: ['title', 'version', 'status']
  });

  return mockTest.toJSON();
};

/**
 * Publish Mock Test with strict validation:
 * - Enough questions available for selection config
 * - Marks > 0
 * - Valid negative marks
 */
export const publishMockTest = async (organizationId, actorUser, id) => {
  const mockTest = await findByIdInOrg(MockTest, id, organizationId);
  if (!mockTest) {
    throw ApiError.notFound('Mock test not found', [], ERROR_CODES.NOT_FOUND);
  }

  if (!mockTest.sections || mockTest.sections.length === 0) {
    throw ApiError.badRequest(
      'Cannot publish a mock test without at least one section',
      [{ field: 'sections', message: 'At least one test section is required' }],
      ERROR_CODES.VALIDATION_ERROR
    );
  }

  // Validate sections & questions availability
  let overallQuestionsCount = 0;

  for (const [index, section] of mockTest.sections.entries()) {
    if (!section.marksPerQuestion || section.marksPerQuestion <= 0) {
      throw ApiError.badRequest(
        `Section "${section.name}" must have positive marks per question (> 0)`,
        [{ field: `sections[${index}].marksPerQuestion`, message: 'Marks must be positive' }],
        ERROR_CODES.VALIDATION_ERROR
      );
    }

    if (section.negativeMarksPerQuestion < 0) {
      throw ApiError.badRequest(
        `Section "${section.name}" cannot have negative values for negative marks`,
        [{ field: `sections[${index}].negativeMarksPerQuestion`, message: 'Negative marks must be >= 0' }],
        ERROR_CODES.VALIDATION_ERROR
      );
    }

    const config = section.questionSelectionConfig || {};

    if (config.mode === QUESTION_SELECTION_MODES.MANUAL) {
      const qIds = config.questionIds || [];
      if (qIds.length === 0) {
        throw ApiError.badRequest(
          `Section "${section.name}" has manual mode but no questions selected`,
          [{ field: `sections[${index}].questionSelectionConfig`, message: 'Please select questions' }],
          ERROR_CODES.VALIDATION_ERROR
        );
      }

      // Check all questions exist, belong to this org, and are ACTIVE
      const activeCount = await Question.countDocuments(
        scopeOrg(organizationId, {
          _id: { $in: qIds },
          status: QUESTION_STATUSES.ACTIVE
        })
      );

      if (activeCount < qIds.length) {
        throw ApiError.badRequest(
          `Section "${section.name}" contains archived or missing questions (${activeCount}/${qIds.length} available)`,
          [{ field: `sections[${index}].questionIds`, message: 'All selected questions must be active' }],
          ERROR_CODES.VALIDATION_ERROR
        );
      }
      overallQuestionsCount += qIds.length;
    } else if (config.mode === QUESTION_SELECTION_MODES.RANDOM_FROM_BANK) {
      const needed = config.count || 0;
      if (needed <= 0) {
        throw ApiError.badRequest(
          `Section "${section.name}" has random selection but count is 0`,
          [{ field: `sections[${index}].count`, message: 'Required count must be > 0' }],
          ERROR_CODES.VALIDATION_ERROR
        );
      }

      if (!config.bankId) {
        throw ApiError.badRequest(
          `Section "${section.name}" requires a question bank for random selection`,
          [{ field: `sections[${index}].bankId`, message: 'Bank ID is required' }],
          ERROR_CODES.VALIDATION_ERROR
        );
      }

      const bankFilter = { bankId: config.bankId, status: QUESTION_STATUSES.ACTIVE };
      if (config.topicTags && config.topicTags.length > 0) {
        bankFilter.topicTags = { $in: config.topicTags };
      }

      const availableInBank = await Question.countDocuments(scopeOrg(organizationId, bankFilter));
      if (availableInBank < needed) {
        throw ApiError.badRequest(
          `Section "${section.name}" requires ${needed} questions, but only ${availableInBank} active questions are available in the bank`,
          [{ field: `sections[${index}].count`, message: 'Not enough questions in bank' }],
          ERROR_CODES.VALIDATION_ERROR
        );
      }
      overallQuestionsCount += needed;
    }
  }

  if (overallQuestionsCount <= 0) {
    throw ApiError.badRequest(
      'Cannot publish mock test: total question count is 0',
      [],
      ERROR_CODES.VALIDATION_ERROR
    );
  }

  mockTest.status = MOCK_TEST_STATUSES.PUBLISHED;
  mockTest.publishedAt = new Date();
  await mockTest.save();

  await recordAuditEvent({
    organizationId,
    actorId: actorUser._id,
    action: 'MOCK_TEST_PUBLISHED',
    entityType: 'MockTest',
    entityId: mockTest._id,
    metadata: { title: mockTest.title, version: mockTest.version, totalQuestions: overallQuestionsCount },
    allowedMetadataKeys: ['title', 'version', 'totalQuestions']
  });

  return mockTest.toJSON();
};

export const archiveMockTest = async (organizationId, actorUser, id) => {
  const mockTest = await findByIdInOrg(MockTest, id, organizationId);
  if (!mockTest) {
    throw ApiError.notFound('Mock test not found', [], ERROR_CODES.NOT_FOUND);
  }

  mockTest.status = MOCK_TEST_STATUSES.ARCHIVED;
  await mockTest.save();

  await recordAuditEvent({
    organizationId,
    actorId: actorUser._id,
    action: 'MOCK_TEST_ARCHIVED',
    entityType: 'MockTest',
    entityId: mockTest._id,
    metadata: { title: mockTest.title, version: mockTest.version },
    allowedMetadataKeys: ['title', 'version']
  });

  return mockTest.toJSON();
};

/**
 * Staff Student-Preview DTO:
 * Resolves all questions for this test and projects them strictly as student DTOs:
 * - Answer key is NEVER included.
 * - Explanation is NEVER included.
 */
export const getMockTestStudentPreview = async (organizationId, id) => {
  const mockTest = await findByIdInOrg(MockTest, id, organizationId);
  if (!mockTest) {
    throw ApiError.notFound('Mock test not found', [], ERROR_CODES.NOT_FOUND);
  }

  const sectionsWithQuestions = [];

  for (const section of mockTest.sections) {
    let questionDocs = [];
    const config = section.questionSelectionConfig || {};

    if (config.mode === QUESTION_SELECTION_MODES.MANUAL && config.questionIds?.length) {
      // Find manual questions without answerKey or explanation (select: false default)
      questionDocs = await Question.find(
        scopeOrg(organizationId, {
          _id: { $in: config.questionIds },
          status: QUESTION_STATUSES.ACTIVE
        })
      );
    } else if (config.mode === QUESTION_SELECTION_MODES.RANDOM_FROM_BANK && config.bankId) {
      const bankFilter = { bankId: config.bankId, status: QUESTION_STATUSES.ACTIVE };
      if (config.topicTags?.length) {
        bankFilter.topicTags = { $in: config.topicTags };
      }
      questionDocs = await Question.find(scopeOrg(organizationId, bankFilter)).limit(config.count || 5);
    }

    const studentSafeQuestions = questionDocs.map((q) => Question.sanitizeForStudent(q));

    sectionsWithQuestions.push({
      sectionId: section.sectionId,
      name: section.name,
      durationMinutes: section.durationMinutes,
      marksPerQuestion: section.marksPerQuestion,
      negativeMarksPerQuestion: section.negativeMarksPerQuestion,
      questions: studentSafeQuestions
    });
  }

  return {
    _id: mockTest._id,
    title: mockTest.title,
    description: mockTest.description,
    instructions: mockTest.instructions,
    durationMinutes: mockTest.durationMinutes,
    totalQuestions: mockTest.totalQuestions,
    totalMarks: mockTest.totalMarks,
    reviewPolicy: mockTest.reviewPolicy,
    scoringConfig: mockTest.scoringConfig,
    sections: sectionsWithQuestions
  };
};
