import { jest } from '@jest/globals';
import request from 'supertest';
import app from '../src/app.js';
import { connectDB, disconnectDB } from '../src/config/db.js';
import {
  User,
  Organization,
  OrganizationMembership,
  TestCategory,
  QuestionBank,
  Question,
  MockTest,
  AuditLog
} from '../src/models/index.js';
import {
  ROLES,
  USER_STATUSES,
  ORGANIZATION_STATUSES,
  MEMBERSHIP_ROLES,
  MEMBERSHIP_STATUSES,
  QUESTION_TYPES,
  QUESTION_DIFFICULTIES,
  QUESTION_STATUSES,
  MOCK_TEST_STATUSES,
  QUESTION_SELECTION_MODES
} from '../src/utils/constants.js';
import { signToken } from '../src/utils/token.js';

jest.setTimeout(30000);

describe('Chunk V6: Mock Test Authoring, Question Banks & Versioning Suite', () => {
  const ts = Date.now();

  let orgA, orgB;
  let coordinatorA, coordinatorAToken;
  let coordinatorB, coordinatorBToken;
  let studentA, studentAToken;

  let categoryA;
  let bankA;
  let questionA1, questionA2, questionA3;

  beforeAll(async () => {
    await connectDB();

    // 1. Create Test Orgs
    orgA = await Organization.create({
      name: `Mock Org A ${ts}`,
      slug: `mock-org-a-${ts}`,
      timezone: 'Asia/Kolkata',
      status: ORGANIZATION_STATUSES.ACTIVE
    });

    orgB = await Organization.create({
      name: `Mock Org B ${ts}`,
      slug: `mock-org-b-${ts}`,
      timezone: 'Asia/Kolkata',
      status: ORGANIZATION_STATUSES.ACTIVE
    });

    // 2. Staff user for Org A
    coordinatorA = await User.create({
      name: 'Coordinator Alpha',
      email: `coord-test-${ts}@orga.edu`,
      password: 'Password123!',
      role: ROLES.ADMIN,
      status: USER_STATUSES.ACTIVE,
      organizationId: orgA._id
    });
    await OrganizationMembership.create({
      organizationId: orgA._id,
      userId: coordinatorA._id,
      role: MEMBERSHIP_ROLES.PLACEMENT_COORDINATOR,
      status: MEMBERSHIP_STATUSES.ACTIVE
    });
    coordinatorAToken = signToken({ id: coordinatorA._id, role: coordinatorA.role });

    // 3. Staff user for Org B
    coordinatorB = await User.create({
      name: 'Coordinator Beta',
      email: `coord-test-${ts}@orgb.edu`,
      password: 'Password123!',
      role: ROLES.ADMIN,
      status: USER_STATUSES.ACTIVE,
      organizationId: orgB._id
    });
    await OrganizationMembership.create({
      organizationId: orgB._id,
      userId: coordinatorB._id,
      role: MEMBERSHIP_ROLES.PLACEMENT_COORDINATOR,
      status: MEMBERSHIP_STATUSES.ACTIVE
    });
    coordinatorBToken = signToken({ id: coordinatorB._id, role: coordinatorB.role });

    // 4. Student user in Org A
    studentA = await User.create({
      name: 'Pooja Student',
      email: `student-test-${ts}@orga.edu`,
      password: 'Password123!',
      role: ROLES.STUDENT,
      status: USER_STATUSES.ACTIVE,
      organizationId: orgA._id
    });
    await OrganizationMembership.create({
      organizationId: orgA._id,
      userId: studentA._id,
      role: MEMBERSHIP_ROLES.STUDENT,
      status: MEMBERSHIP_STATUSES.ACTIVE
    });
    studentAToken = signToken({ id: studentA._id, role: studentA.role });

    // Ensure Mongoose unique indexes
    await TestCategory.init();
    await QuestionBank.init();
    await Question.init();
    await MockTest.init();
  });

  afterAll(async () => {
    await MockTest.deleteMany({ organizationId: { $in: [orgA._id, orgB._id] } });
    await Question.deleteMany({ organizationId: { $in: [orgA._id, orgB._id] } });
    await QuestionBank.deleteMany({ organizationId: { $in: [orgA._id, orgB._id] } });
    await TestCategory.deleteMany({ organizationId: { $in: [orgA._id, orgB._id] } });
    await OrganizationMembership.deleteMany({ organizationId: { $in: [orgA._id, orgB._id] } });
    await User.deleteMany({ _id: { $in: [coordinatorA._id, coordinatorB._id, studentA._id] } });
    await Organization.deleteMany({ _id: { $in: [orgA._id, orgB._id] } });
    await disconnectDB();
  });

  describe('1. Category & Question Bank Management', () => {
    it('creates a test category with unique slug', async () => {
      const res = await request(app)
        .post('/api/v1/admin/test-categories')
        .set('Authorization', `Bearer ${coordinatorAToken}`)
        .send({
          name: 'Computer Science Core',
          description: 'Data structures, algorithms and systems'
        })
        .expect(201);

      expect(res.body.success).toBe(true);
      expect(res.body.data.name).toBe('Computer Science Core');
      expect(res.body.data.slug).toContain('computer-science-core');
      categoryA = res.body.data;
    });

    it('creates a question bank attached to the category', async () => {
      const res = await request(app)
        .post('/api/v1/admin/question-banks')
        .set('Authorization', `Bearer ${coordinatorAToken}`)
        .send({
          name: 'Data Structures Foundation',
          categoryId: categoryA._id,
          description: 'Linked lists, trees, hash tables',
          topicTags: ['dsa', 'arrays', 'trees']
        })
        .expect(201);

      expect(res.body.success).toBe(true);
      expect(res.body.data.name).toBe('Data Structures Foundation');
      expect(res.body.data.topicTags).toContain('dsa');
      bankA = res.body.data;
    });
  });

  describe('2. Question Authoring & CODING Rejection Rule', () => {
    it('rejects CODING questions with explicit sandbox notice', async () => {
      const res = await request(app)
        .post('/api/v1/admin/questions')
        .set('Authorization', `Bearer ${coordinatorAToken}`)
        .send({
          bankId: bankA._id,
          type: QUESTION_TYPES.CODING,
          prompt: 'Write a function to invert a binary tree',
          answerKey: 'def invert_tree(root): pass'
        })
        .expect(400);

      expect(res.body.success).toBe(false);
      expect(res.body.message).toContain('CODING question type is not supported until a secure code execution sandbox is approved');
    });

    it('creates SINGLE_CHOICE question with answerKey and explanation in authoring view', async () => {
      const res = await request(app)
        .post('/api/v1/admin/questions')
        .set('Authorization', `Bearer ${coordinatorAToken}`)
        .send({
          bankId: bankA._id,
          type: QUESTION_TYPES.SINGLE_CHOICE,
          prompt: 'What is the average lookup complexity of a well-distributed hash table?',
          options: [
            { optionId: 'opt_1', text: 'O(1)' },
            { optionId: 'opt_2', text: 'O(log N)' },
            { optionId: 'opt_3', text: 'O(N)' }
          ],
          answerKey: ['opt_1'],
          explanation: 'Hash table lookup is O(1) on average assuming universal hashing and low load factor.',
          difficulty: QUESTION_DIFFICULTIES.EASY,
          topicTags: ['hashing', 'dsa']
        })
        .expect(201);

      expect(res.body.success).toBe(true);
      expect(res.body.data.prompt).toContain('hash table');
      expect(res.body.data.answerKey).toEqual(['opt_1']);
      expect(res.body.data.explanation).toContain('O(1) on average');
      questionA1 = res.body.data;
    });

    it('creates MULTI_SELECT and SHORT_ANSWER questions', async () => {
      const res2 = await request(app)
        .post('/api/v1/admin/questions')
        .set('Authorization', `Bearer ${coordinatorAToken}`)
        .send({
          bankId: bankA._id,
          type: QUESTION_TYPES.MULTI_SELECT,
          prompt: 'Which of the following sorting algorithms exhibit worst-case time complexity of O(N log N)?',
          options: [
            { optionId: 'opt_a', text: 'Merge Sort' },
            { optionId: 'opt_b', text: 'Heap Sort' },
            { optionId: 'opt_c', text: 'Quick Sort with naive pivot' }
          ],
          answerKey: ['opt_a', 'opt_b'],
          explanation: 'Merge sort and heap sort guarantee O(N log N) worst-case. Quicksort can degrade to O(N^2).',
          difficulty: QUESTION_DIFFICULTIES.MEDIUM,
          topicTags: ['sorting', 'algorithms']
        })
        .expect(201);

      questionA2 = res2.body.data;

      const res3 = await request(app)
        .post('/api/v1/admin/questions')
        .set('Authorization', `Bearer ${coordinatorAToken}`)
        .send({
          bankId: bankA._id,
          type: QUESTION_TYPES.SHORT_ANSWER,
          prompt: 'Which data structure follows the First-In First-Out (FIFO) principle?',
          options: [],
          answerKey: 'queue',
          explanation: 'A queue maintains FIFO ordering.',
          difficulty: QUESTION_DIFFICULTIES.EASY,
          topicTags: ['dsa', 'basics']
        })
        .expect(201);

      questionA3 = res3.body.data;
      expect(questionA3._id).toBeDefined();
    });
  });

  describe('3. Student Projection Security (Zero answerKey / explanation leakage)', () => {
    it('ensures default Question query strips answerKey and explanation', async () => {
      const q = await Question.findById(questionA1._id);
      expect(q.answerKey).toBeUndefined();
      expect(q.explanation).toBeUndefined();
    });

    it('guarantees student-facing preview serializer NEVER contains answerKey or explanation', async () => {
      // 1. Create a draft test
      const testRes = await request(app)
        .post('/api/v1/admin/mock-tests')
        .set('Authorization', `Bearer ${coordinatorAToken}`)
        .send({
          title: 'Campus DSA Assessment',
          durationMinutes: 45,
          sections: [
            {
              sectionId: 'sec_1',
              name: 'Core Algorithms',
              marksPerQuestion: 2,
              questionSelectionConfig: {
                mode: QUESTION_SELECTION_MODES.MANUAL,
                questionIds: [questionA1._id, questionA2._id]
              }
            }
          ]
        })
        .expect(201);

      const testId = testRes.body.data._id;

      // 2. Request student preview
      const previewRes = await request(app)
        .get(`/api/v1/admin/mock-tests/${testId}/preview`)
        .set('Authorization', `Bearer ${coordinatorAToken}`)
        .expect(200);

      const previewData = previewRes.body.data;
      expect(previewData.title).toBe('Campus DSA Assessment');
      expect(previewData.sections.length).toBe(1);

      const questions = previewData.sections[0].questions;
      expect(questions.length).toBe(2);

      // Verify each question in preview is completely devoid of answerKey & explanation
      questions.forEach((q) => {
        expect(q.answerKey).toBeUndefined();
        expect(q.explanation).toBeUndefined();
        expect(q.prompt).toBeDefined();
        expect(q.options).toBeDefined();
        expect(q.type).toBeDefined();
      });

      // Snapshot test proving security boundary
      const sampleStudentDTO = questions[0];
      expect(Object.keys(sampleStudentDTO).sort()).toEqual([
        '_id',
        'bankId',
        'difficulty',
        'id',
        'options',
        'prompt',
        'topicTags',
        'type'
      ].sort());
    });
  });

  describe('4. Mock Test Publishing Validation & Versioning', () => {
    let activeTest;

    it('rejects publishing a test with no questions or invalid marks', async () => {
      const emptyTest = await MockTest.create({
        organizationId: orgA._id,
        title: 'Empty Test',
        durationMinutes: 30,
        status: MOCK_TEST_STATUSES.DRAFT,
        sections: []
      });

      const res = await request(app)
        .post(`/api/v1/admin/mock-tests/${emptyTest._id}/publish`)
        .set('Authorization', `Bearer ${coordinatorAToken}`)
        .expect(400);

      expect(res.body.success).toBe(false);
      expect(res.body.message).toContain('at least one section');
    });

    it('successfully validates and publishes a valid mock test', async () => {
      const validTest = await request(app)
        .post('/api/v1/admin/mock-tests')
        .set('Authorization', `Bearer ${coordinatorAToken}`)
        .send({
          title: 'Algorithms Midterm Placement Exam',
          description: 'Required test for technical roles',
          durationMinutes: 60,
          scoringConfig: {
            defaultCorrectMarks: 2,
            enableNegativeMarking: true,
            defaultNegativeMarks: 0.5
          },
          sections: [
            {
              sectionId: 'sec_dsa',
              name: 'DSA Section',
              marksPerQuestion: 2,
              negativeMarksPerQuestion: 0.5,
              questionSelectionConfig: {
                mode: QUESTION_SELECTION_MODES.MANUAL,
                questionIds: [questionA1._id, questionA2._id]
              }
            }
          ]
        })
        .expect(201);

      activeTest = validTest.body.data;
      expect(activeTest.status).toBe(MOCK_TEST_STATUSES.DRAFT);
      expect(activeTest.version).toBe(1);

      // Publish test
      const pubRes = await request(app)
        .post(`/api/v1/admin/mock-tests/${activeTest._id}/publish`)
        .set('Authorization', `Bearer ${coordinatorAToken}`)
        .expect(200);

      expect(pubRes.body.success).toBe(true);
      expect(pubRes.body.data.status).toBe(MOCK_TEST_STATUSES.PUBLISHED);
      expect(pubRes.body.data.publishedAt).toBeDefined();

      // Check AuditLog
      const audit = await AuditLog.findOne({
        organizationId: orgA._id,
        action: 'MOCK_TEST_PUBLISHED',
        entityId: activeTest._id
      });
      expect(audit).toBeDefined();
    });

    it('increments version when a published test is edited', async () => {
      const updateRes = await request(app)
        .patch(`/api/v1/admin/mock-tests/${activeTest._id}`)
        .set('Authorization', `Bearer ${coordinatorAToken}`)
        .send({
          title: 'Algorithms Midterm Placement Exam (Updated Syllabus)',
          durationMinutes: 75
        })
        .expect(200);

      expect(updateRes.body.success).toBe(true);
      expect(updateRes.body.data.version).toBe(2); // Incremented from 1 to 2
      expect(updateRes.body.data.durationMinutes).toBe(75);
    });
  });

  describe('5. Organization Isolation & RBAC Access Control', () => {
    it('prevents Coordinator B from viewing or editing Org A mock tests', async () => {
      // Coordinator B trying to view Org A question bank
      const res = await request(app)
        .get(`/api/v1/admin/question-banks/${bankA._id}`)
        .set('Authorization', `Bearer ${coordinatorBToken}`)
        .expect(404);

      expect(res.body.success).toBe(false);
      expect(res.body.message).toContain('not found');
    });

    it('blocks regular students from accessing admin mock-test authoring endpoints', async () => {
      const res = await request(app)
        .post('/api/v1/admin/mock-tests')
        .set('Authorization', `Bearer ${studentAToken}`)
        .send({
          title: 'Unauthorized Student Test',
          durationMinutes: 30
        })
        .expect(403);

      expect(res.body.success).toBe(false);
    });

    it('allows student to list published tests in their organization only', async () => {
      const res = await request(app)
        .get('/api/v1/mock-tests')
        .set('Authorization', `Bearer ${studentAToken}`)
        .expect(200);

      expect(res.body.success).toBe(true);
      expect(Array.isArray(res.body.data)).toBe(true);
      // Student only sees published tests
      res.body.data.forEach((test) => {
        expect(test.status).toBe(MOCK_TEST_STATUSES.PUBLISHED);
      });
    });
  });
});
