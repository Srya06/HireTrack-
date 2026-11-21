import { asyncHandler } from '../utils/asyncHandler.js';
import { sendSuccess } from '../utils/response.js';
import * as mockTestService from '../services/mockTest.service.js';

// ==========================================
// 1. Categories Controller
// ==========================================

export const listCategories = asyncHandler(async (req, res) => {
  const { status, q, page, limit } = req.query;
  const result = await mockTestService.listCategories(req.organizationId, {
    status,
    q,
    page: page ? Number(page) : 1,
    limit: limit ? Number(limit) : 50
  });

  return sendSuccess(res, {
    statusCode: 200,
    message: 'Test categories retrieved successfully',
    data: result.items || [],
    pagination: result.pagination
  });
});

export const createCategory = asyncHandler(async (req, res) => {
  const { name, description } = req.body;
  const result = await mockTestService.createCategory(req.organizationId, req.user, {
    name,
    description
  });

  return sendSuccess(res, {
    statusCode: 201,
    message: 'Test category created successfully',
    data: result
  });
});

export const getCategory = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const result = await mockTestService.getCategoryById(req.organizationId, id);

  return sendSuccess(res, {
    statusCode: 200,
    message: 'Test category retrieved successfully',
    data: result
  });
});

export const updateCategory = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const result = await mockTestService.updateCategory(req.organizationId, id, req.body);

  return sendSuccess(res, {
    statusCode: 200,
    message: 'Test category updated successfully',
    data: result
  });
});

export const archiveCategory = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const result = await mockTestService.archiveCategory(req.organizationId, id);

  return sendSuccess(res, {
    statusCode: 200,
    message: 'Test category archived successfully',
    data: result
  });
});

// ==========================================
// 2. Question Banks Controller
// ==========================================

export const listBanks = asyncHandler(async (req, res) => {
  const { categoryId, status, q, page, limit } = req.query;
  const result = await mockTestService.listQuestionBanks(req.organizationId, {
    categoryId,
    status,
    q,
    page: page ? Number(page) : 1,
    limit: limit ? Number(limit) : 50
  });

  return sendSuccess(res, {
    statusCode: 200,
    message: 'Question banks retrieved successfully',
    data: result.items || [],
    pagination: result.pagination
  });
});

export const createBank = asyncHandler(async (req, res) => {
  const { name, categoryId, description, topicTags } = req.body;
  const result = await mockTestService.createQuestionBank(req.organizationId, req.user, {
    name,
    categoryId,
    description,
    topicTags
  });

  return sendSuccess(res, {
    statusCode: 201,
    message: 'Question bank created successfully',
    data: result
  });
});

export const getBank = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const result = await mockTestService.getQuestionBankById(req.organizationId, id);

  return sendSuccess(res, {
    statusCode: 200,
    message: 'Question bank retrieved successfully',
    data: result
  });
});

export const updateBank = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const result = await mockTestService.updateQuestionBank(req.organizationId, id, req.body);

  return sendSuccess(res, {
    statusCode: 200,
    message: 'Question bank updated successfully',
    data: result
  });
});

export const archiveBank = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const result = await mockTestService.archiveQuestionBank(req.organizationId, id);

  return sendSuccess(res, {
    statusCode: 200,
    message: 'Question bank archived successfully',
    data: result
  });
});

// ==========================================
// 3. Questions Controller
// ==========================================

export const listQuestions = asyncHandler(async (req, res) => {
  const { bankId, difficulty, type, topicTag, q, status, page, limit } = req.query;
  const result = await mockTestService.listQuestions(req.organizationId, {
    bankId,
    difficulty,
    type,
    topicTag,
    q,
    status: status || 'ACTIVE',
    page: page ? Number(page) : 1,
    limit: limit ? Number(limit) : 20,
    selectAnswerKey: true // Staff authoring view
  });

  return sendSuccess(res, {
    statusCode: 200,
    message: 'Questions retrieved successfully',
    data: result.items || [],
    pagination: result.pagination
  });
});

export const createQuestion = asyncHandler(async (req, res) => {
  const result = await mockTestService.createQuestion(req.organizationId, req.user, req.body);

  return sendSuccess(res, {
    statusCode: 201,
    message: 'Question created successfully',
    data: result
  });
});

export const getQuestion = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const result = await mockTestService.getQuestionById(req.organizationId, id, {
    selectAnswerKey: true
  });

  return sendSuccess(res, {
    statusCode: 200,
    message: 'Question retrieved successfully',
    data: result
  });
});

export const updateQuestion = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const result = await mockTestService.updateQuestion(req.organizationId, id, req.body);

  return sendSuccess(res, {
    statusCode: 200,
    message: 'Question updated successfully',
    data: result
  });
});

export const archiveQuestion = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const result = await mockTestService.archiveQuestion(req.organizationId, id);

  return sendSuccess(res, {
    statusCode: 200,
    message: 'Question archived successfully',
    data: result
  });
});

// ==========================================
// 4. Mock Tests Controller
// ==========================================

export const listMockTests = asyncHandler(async (req, res) => {
  const { status, categoryId, q, page, limit } = req.query;
  const result = await mockTestService.listMockTests(req.organizationId, {
    status,
    categoryId,
    q,
    page: page ? Number(page) : 1,
    limit: limit ? Number(limit) : 20
  });

  return sendSuccess(res, {
    statusCode: 200,
    message: 'Mock tests retrieved successfully',
    data: result.items || [],
    pagination: result.pagination
  });
});

export const createMockTest = asyncHandler(async (req, res) => {
  const result = await mockTestService.createMockTest(req.organizationId, req.user, req.body);

  return sendSuccess(res, {
    statusCode: 201,
    message: 'Mock test created successfully',
    data: result
  });
});

export const getMockTest = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const result = await mockTestService.getMockTestById(req.organizationId, id);

  return sendSuccess(res, {
    statusCode: 200,
    message: 'Mock test retrieved successfully',
    data: result
  });
});

export const updateMockTest = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const result = await mockTestService.updateMockTest(req.organizationId, req.user, id, req.body);

  return sendSuccess(res, {
    statusCode: 200,
    message: 'Mock test updated successfully',
    data: result
  });
});

export const publishMockTest = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const result = await mockTestService.publishMockTest(req.organizationId, req.user, id);

  return sendSuccess(res, {
    statusCode: 200,
    message: 'Mock test published successfully',
    data: result
  });
});

export const archiveMockTest = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const result = await mockTestService.archiveMockTest(req.organizationId, req.user, id);

  return sendSuccess(res, {
    statusCode: 200,
    message: 'Mock test archived successfully',
    data: result
  });
});

export const getPreview = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const result = await mockTestService.getMockTestStudentPreview(req.organizationId, id);

  return sendSuccess(res, {
    statusCode: 200,
    message: 'Student preview generated successfully',
    data: result
  });
});
