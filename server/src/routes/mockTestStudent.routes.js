import { Router } from 'express';
import { protect } from '../middleware/auth.middleware.js';
import { attachOrganization } from '../middleware/org.middleware.js';
import { validate } from '../middleware/validate.middleware.js';
import { validateObjectId } from '../validators/common.validator.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { sendSuccess } from '../utils/response.js';
import { MockTest } from '../models/index.js';
import { scopeOrg, paginateInOrg, findByIdInOrg } from '../utils/orgScope.js';
import { MOCK_TEST_STATUSES, ERROR_CODES } from '../utils/constants.js';
import { ApiError } from '../utils/ApiError.js';
import * as mockTestAttemptController from '../controllers/mockTestAttempt.controller.js';

const router = Router();

// Student routes require student authentication and org context
router.use(protect, attachOrganization);

/**
 * List published mock tests available for students in this organization.
 */
router.get(
  '/',
  asyncHandler(async (req, res) => {
    const { categoryId, q, page = 1, limit = 20 } = req.query;

    const filter = {
      status: MOCK_TEST_STATUSES.PUBLISHED
    };

    if (categoryId) filter.categoryId = categoryId;
    if (q) filter.title = { $regex: q.trim(), $options: 'i' };

    const result = await paginateInOrg(MockTest, filter, req.organizationId, {
      page: Number(page) || 1,
      limit: Number(limit) || 20,
      sort: { publishedAt: -1 },
      populate: { path: 'categoryId', select: 'name slug' }
    });

    return sendSuccess(res, {
      statusCode: 200,
      message: 'Published mock tests retrieved successfully',
      data: result.items || [],
      pagination: result.pagination
    });
  })
);

/**
 * Get published test overview (instructions, duration, totalMarks, totalQuestions - no questions leaked)
 */
router.get(
  '/:id',
  validate(validateObjectId('id')),
  asyncHandler(async (req, res) => {
    const mockTest = await findByIdInOrg(MockTest, req.params.id, req.organizationId, {
      populate: { path: 'categoryId', select: 'name slug' }
    });

    if (!mockTest || mockTest.status !== MOCK_TEST_STATUSES.PUBLISHED) {
      throw ApiError.notFound('Mock test not found or not published', [], ERROR_CODES.NOT_FOUND);
    }

    // Return student-safe test manifest
    const manifest = {
      _id: mockTest._id,
      title: mockTest.title,
      description: mockTest.description,
      instructions: mockTest.instructions,
      categoryId: mockTest.categoryId,
      durationMinutes: mockTest.durationMinutes,
      attemptLimit: mockTest.attemptLimit,
      totalQuestions: mockTest.totalQuestions,
      totalMarks: mockTest.totalMarks,
      reviewPolicy: mockTest.reviewPolicy,
      sections: (mockTest.sections || []).map((sec) => ({
        sectionId: sec.sectionId,
        name: sec.name,
        durationMinutes: sec.durationMinutes,
        marksPerQuestion: sec.marksPerQuestion,
        negativeMarksPerQuestion: sec.negativeMarksPerQuestion,
        questionCount:
          sec.questionSelectionConfig?.mode === 'MANUAL'
            ? sec.questionSelectionConfig?.questionIds?.length || 0
            : sec.questionSelectionConfig?.count || 0
      }))
    };

    return sendSuccess(res, {
      statusCode: 200,
      message: 'Mock test details retrieved successfully',
      data: manifest
    });
  })
);

/**
 * Start or resume a test attempt (Chunk V7)
 */
router.post(
  '/:id/attempts',
  validate(validateObjectId('id')),
  mockTestAttemptController.startOrResumeAttempt
);

export default router;

