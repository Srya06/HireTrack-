import { Router } from 'express';
import * as mockTestController from '../controllers/mockTest.controller.js';
import * as mockTestAttemptController from '../controllers/mockTestAttempt.controller.js';
import { protect } from '../middleware/auth.middleware.js';
import { attachOrganization, authorizeMemberships } from '../middleware/org.middleware.js';
import { validate } from '../middleware/validate.middleware.js';
import { validateObjectId } from '../validators/common.validator.js';
import { MEMBERSHIP_ROLES } from '../utils/constants.js';

const router = Router();

const STAFF_ROLES = [
  MEMBERSHIP_ROLES.ORG_ADMIN,
  MEMBERSHIP_ROLES.PLACEMENT_COORDINATOR
];

// All staff mock test authoring routes require authentication, org context, and staff membership
router.use(
  ['/test-categories', '/question-banks', '/questions', '/mock-tests', '/reports'],
  protect,
  attachOrganization,
  authorizeMemberships(...STAFF_ROLES)
);

// ==========================================
// 1. Categories Endpoints
// ==========================================
router.get('/test-categories', mockTestController.listCategories);
router.post('/test-categories', mockTestController.createCategory);
router.get(
  '/test-categories/:id',
  validate(validateObjectId('id')),
  mockTestController.getCategory
);
router.patch(
  '/test-categories/:id',
  validate(validateObjectId('id')),
  mockTestController.updateCategory
);
router.delete(
  '/test-categories/:id',
  validate(validateObjectId('id')),
  mockTestController.archiveCategory
);

// ==========================================
// 2. Question Banks Endpoints
// ==========================================
router.get('/question-banks', mockTestController.listBanks);
router.post('/question-banks', mockTestController.createBank);
router.get(
  '/question-banks/:id',
  validate(validateObjectId('id')),
  mockTestController.getBank
);
router.patch(
  '/question-banks/:id',
  validate(validateObjectId('id')),
  mockTestController.updateBank
);
router.delete(
  '/question-banks/:id',
  validate(validateObjectId('id')),
  mockTestController.archiveBank
);

// ==========================================
// 3. Questions Authoring Endpoints
// ==========================================
router.get('/questions', mockTestController.listQuestions);
router.post('/questions', mockTestController.createQuestion);
router.get(
  '/questions/:id',
  validate(validateObjectId('id')),
  mockTestController.getQuestion
);
router.patch(
  '/questions/:id',
  validate(validateObjectId('id')),
  mockTestController.updateQuestion
);
router.delete(
  '/questions/:id',
  validate(validateObjectId('id')),
  mockTestController.archiveQuestion
);

// ==========================================
// 4. Mock Tests Endpoints
// ==========================================
router.get('/mock-tests', mockTestController.listMockTests);
router.post('/mock-tests', mockTestController.createMockTest);
router.get(
  '/mock-tests/:id',
  validate(validateObjectId('id')),
  mockTestController.getMockTest
);
router.patch(
  '/mock-tests/:id',
  validate(validateObjectId('id')),
  mockTestController.updateMockTest
);
router.post(
  '/mock-tests/:id/publish',
  validate(validateObjectId('id')),
  mockTestController.publishMockTest
);
router.post(
  '/mock-tests/:id/archive',
  validate(validateObjectId('id')),
  mockTestController.archiveMockTest
);
router.get(
  '/mock-tests/:id/preview',
  validate(validateObjectId('id')),
  mockTestController.getPreview
);

// ==========================================
// 5. Reports Endpoints (Chunk V7)
// ==========================================
router.get('/reports/mock-tests', mockTestAttemptController.getAdminMockTestReport);

export default router;

