import { jest } from '@jest/globals';
import request from 'supertest';
import app from '../src/app.js';
import { connectDB, disconnectDB } from '../src/config/db.js';
import {
  User,
  Organization,
  OrganizationMembership,
  StudentProfile,
  TestCategory,
  QuestionBank,
  Question,
  MockTest,
  MockTestAttempt,
  MockTestAnswer,
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
  MOCK_TEST_REVIEW_POLICIES,
  QUESTION_SELECTION_MODES,
  MOCK_TEST_ATTEMPT_STATUSES
} from '../src/utils/constants.js';
import { signToken } from '../src/utils/token.js';

jest.setTimeout(30000);

describe('Chunk V7: Mock Test Attempt Lifecycle & Scoring Engine Suite', () => {
  const ts = Date.now();

  let orgA, orgB;
  let coordinatorA, coordinatorAToken;
  let studentA1, studentA1Token;
  let studentA2, studentA2Token;
  let studentB1, studentB1Token;

  let categoryA;
  let bankA;
  let questionA1, questionA2, questionA3;
  let publishedTestA, hiddenReviewTestA;

  beforeAll(async () => {
    await connectDB();

    // 1. Create Test Orgs
    orgA = await Organization.create({
      name: `Mock Org V7-A ${ts}`,
      slug: `mock-org-v7-a-${ts}`,
      timezone: 'Asia/Kolkata',
      status: ORGANIZATION_STATUSES.ACTIVE
    });

    orgB = await Organization.create({
      name: `Mock Org V7-B ${ts}`,
      slug: `mock-org-v7-b-${ts}`,
      timezone: 'Asia/Kolkata',
      status: ORGANIZATION_STATUSES.ACTIVE
    });

    // 2. Staff user for Org A
    coordinatorA = await User.create({
      name: 'Coordinator Alpha',
      email: `coord-v7-${ts}@orga.edu`,
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

    // 3. Student 1 in Org A
    studentA1 = await User.create({
      name: 'Aarav Sharma',
      email: `aarav-${ts}@orga.edu`,
      password: 'Password123!',
      role: ROLES.STUDENT,
      status: USER_STATUSES.ACTIVE,
      organizationId: orgA._id
    });
    await OrganizationMembership.create({
      organizationId: orgA._id,
      userId: studentA1._id,
      role: MEMBERSHIP_ROLES.STUDENT,
      status: MEMBERSHIP_STATUSES.ACTIVE
    });
    studentA1Token = signToken({ id: studentA1._id, role: studentA1.role });

    // 4. Student 2 in Org A
    studentA2 = await User.create({
      name: 'Diya Patel',
      email: `diya-${ts}@orga.edu`,
      password: 'Password123!',
      role: ROLES.STUDENT,
      status: USER_STATUSES.ACTIVE,
      organizationId: orgA._id
    });
    await OrganizationMembership.create({
      organizationId: orgA._id,
      userId: studentA2._id,
      role: MEMBERSHIP_ROLES.STUDENT,
      status: MEMBERSHIP_STATUSES.ACTIVE
    });
    studentA2Token = signToken({ id: studentA2._id, role: studentA2.role });

    // 5. Student in Org B (for Org isolation)
    studentB1 = await User.create({
      name: 'Other Org Student',
      email: `other-${ts}@orgb.edu`,
      password: 'Password123!',
      role: ROLES.STUDENT,
      status: USER_STATUSES.ACTIVE,
      organizationId: orgB._id
    });
    await OrganizationMembership.create({
      organizationId: orgB._id,
      userId: studentB1._id,
      role: MEMBERSHIP_ROLES.STUDENT,
      status: MEMBERSHIP_STATUSES.ACTIVE
    });
    studentB1Token = signToken({ id: studentB1._id, role: studentB1.role });

    // 6. Category & Bank
    categoryA = await TestCategory.create({
      organizationId: orgA._id,
      name: `CS Testing ${ts}`,
      slug: `cs-testing-${ts}`,
      createdBy: coordinatorA._id
    });

    bankA = await QuestionBank.create({
      organizationId: orgA._id,
      categoryId: categoryA._id,
      name: `Algorithms & Basics ${ts}`,
      createdBy: coordinatorA._id
    });

    // 7. Seed Questions
    questionA1 = await Question.create({
      organizationId: orgA._id,
      bankId: bankA._id,
      type: QUESTION_TYPES.SINGLE_CHOICE,
      prompt: 'What is the worst-case time complexity of binary search on a sorted array?',
      options: [
        { optionId: 'opt_1', text: 'O(1)' },
        { optionId: 'opt_2', text: 'O(log n)' },
        { optionId: 'opt_3', text: 'O(n)' }
      ],
      answerKey: 'opt_2',
      explanation: 'Binary search halves the search space at each iteration, resulting in O(log n).',
      difficulty: QUESTION_DIFFICULTIES.EASY,
      topicTags: ['Algorithms'],
      createdBy: coordinatorA._id
    });

    questionA2 = await Question.create({
      organizationId: orgA._id,
      bankId: bankA._id,
      type: QUESTION_TYPES.MULTI_SELECT,
      prompt: 'Which of the following are pillars of Object-Oriented Programming?',
      options: [
        { optionId: 'opt_a', text: 'Encapsulation' },
        { optionId: 'opt_b', text: 'Inheritance' },
        { optionId: 'opt_c', text: 'Compilation' }
      ],
      answerKey: ['opt_a', 'opt_b'],
      explanation: 'Encapsulation and Inheritance are primary OOP principles; compilation is a translation phase.',
      difficulty: QUESTION_DIFFICULTIES.MEDIUM,
      topicTags: ['OOP', 'Core CS'],
      createdBy: coordinatorA._id
    });

    questionA3 = await Question.create({
      organizationId: orgA._id,
      bankId: bankA._id,
      type: QUESTION_TYPES.SHORT_ANSWER,
      prompt: 'Which JavaScript keyword is used to declare a block-scoped constant?',
      answerKey: 'const',
      explanation: 'The const keyword declares block-scoped variables that cannot be reassigned.',
      difficulty: QUESTION_DIFFICULTIES.EASY,
      topicTags: ['JavaScript'],
      createdBy: coordinatorA._id
    });

    // 8. Seed Published Mock Test with IMMEDIATE review
    publishedTestA = await MockTest.create({
      organizationId: orgA._id,
      categoryId: categoryA._id,
      title: `Comprehensive Assessment ${ts}`,
      durationMinutes: 45,
      attemptLimit: 2,
      reviewPolicy: MOCK_TEST_REVIEW_POLICIES.IMMEDIATE,
      scoringConfig: {
        defaultCorrectMarks: 2,
        enableNegativeMarking: true,
        defaultNegativeMarks: 0.5,
        passMarks: 3
      },
      sections: [
        {
          sectionId: 'sec_1',
          name: 'Section 1',
          durationMinutes: 45,
          marksPerQuestion: 2,
          negativeMarksPerQuestion: 0.5,
          questionSelectionConfig: {
            mode: QUESTION_SELECTION_MODES.MANUAL,
            questionIds: [questionA1._id, questionA2._id, questionA3._id]
          }
        }
      ],
      status: MOCK_TEST_STATUSES.PUBLISHED,
      publishedAt: new Date(),
      totalQuestions: 3,
      totalMarks: 6,
      createdBy: coordinatorA._id
    });

    // 9. Seed Published Mock Test with NEVER review
    hiddenReviewTestA = await MockTest.create({
      organizationId: orgA._id,
      categoryId: categoryA._id,
      title: `Blind Assessment ${ts}`,
      durationMinutes: 30,
      attemptLimit: 1,
      reviewPolicy: MOCK_TEST_REVIEW_POLICIES.NEVER,
      scoringConfig: {
        defaultCorrectMarks: 2,
        enableNegativeMarking: false,
        defaultNegativeMarks: 0,
        passMarks: 2
      },
      sections: [
        {
          sectionId: 'sec_blind',
          name: 'Blind Section',
          durationMinutes: 30,
          marksPerQuestion: 2,
          negativeMarksPerQuestion: 0,
          questionSelectionConfig: {
            mode: QUESTION_SELECTION_MODES.MANUAL,
            questionIds: [questionA1._id]
          }
        }
      ],
      status: MOCK_TEST_STATUSES.PUBLISHED,
      publishedAt: new Date(),
      totalQuestions: 1,
      totalMarks: 2,
      createdBy: coordinatorA._id
    });

    await MockTestAttempt.init();
    await MockTestAnswer.init();
  });

  afterAll(async () => {
    await MockTestAnswer.deleteMany({ organizationId: { $in: [orgA._id, orgB._id] } });
    await MockTestAttempt.deleteMany({ organizationId: { $in: [orgA._id, orgB._id] } });
    await MockTest.deleteMany({ organizationId: { $in: [orgA._id, orgB._id] } });
    await Question.deleteMany({ organizationId: { $in: [orgA._id, orgB._id] } });
    await QuestionBank.deleteMany({ organizationId: { $in: [orgA._id, orgB._id] } });
    await TestCategory.deleteMany({ organizationId: { $in: [orgA._id, orgB._id] } });
    await OrganizationMembership.deleteMany({ organizationId: { $in: [orgA._id, orgB._id] } });
    await User.deleteMany({ _id: { $in: [coordinatorA._id, studentA1._id, studentA2._id, studentB1._id] } });
    await Organization.deleteMany({ _id: { $in: [orgA._id, orgB._id] } });
    await disconnectDB();
  });

  describe('1. Attempt Lifecycle Initialization & Resume Semantics', () => {
    let attemptId;

    it('starts an attempt: status IN_PROGRESS, stable question order, zero answer leakage', async () => {
      const res = await request(app)
        .post(`/api/v1/mock-tests/${publishedTestA._id}/attempts`)
        .set('Authorization', `Bearer ${studentA1Token}`)
        .expect(200);

      expect(res.body.success).toBe(true);
      const data = res.body.data;
      expect(data.attempt).toBeDefined();
      expect(data.attempt.status).toBe(MOCK_TEST_ATTEMPT_STATUSES.IN_PROGRESS);
      expect(data.attempt.attemptNumber).toBe(1);
      expect(data.questions).toHaveLength(3);
      expect(data.remainingSeconds).toBeGreaterThan(0);

      // Verify ZERO leakage of secret fields during test
      data.questions.forEach((q) => {
        expect(q.answerKey).toBeUndefined();
        expect(q.explanation).toBeUndefined();
      });

      attemptId = data.attempt._id;
    });

    it('resumes existing IN_PROGRESS attempt instead of creating a second attempt', async () => {
      const res = await request(app)
        .post(`/api/v1/mock-tests/${publishedTestA._id}/attempts`)
        .set('Authorization', `Bearer ${studentA1Token}`)
        .expect(200);

      expect(res.body.data.attempt._id.toString()).toBe(attemptId.toString());
    });

    it('gets attempt details via GET /mock-test-attempts/:id with server-driven countdown', async () => {
      const res = await request(app)
        .get(`/api/v1/mock-test-attempts/${attemptId}`)
        .set('Authorization', `Bearer ${studentA1Token}`)
        .expect(200);

      expect(res.body.data.attempt._id.toString()).toBe(attemptId.toString());
      expect(res.body.data.remainingSeconds).toBeGreaterThan(0);
      expect(res.body.data.questions).toHaveLength(3);
    });

    it('prevents another student from accessing the attempt (Org & Student isolation)', async () => {
      // Student A2 cannot access Student A1's attempt
      await request(app)
        .get(`/api/v1/mock-test-attempts/${attemptId}`)
        .set('Authorization', `Bearer ${studentA2Token}`)
        .expect(404);

      // Student B1 from another org cannot access it
      await request(app)
        .get(`/api/v1/mock-test-attempts/${attemptId}`)
        .set('Authorization', `Bearer ${studentB1Token}`)
        .expect(404);
    });
  });

  describe('2. Autosaving Answers & Post-Deadline Guardrails', () => {
    let attemptId;

    beforeAll(async () => {
      const res = await request(app)
        .post(`/api/v1/mock-tests/${publishedTestA._id}/attempts`)
        .set('Authorization', `Bearer ${studentA2Token}`)
        .expect(200);
      attemptId = res.body.data.attempt._id;
    });

    it('autosaves single-choice answer', async () => {
      const res = await request(app)
        .put(`/api/v1/mock-test-attempts/${attemptId}/answers/${questionA1._id}`)
        .set('Authorization', `Bearer ${studentA2Token}`)
        .send({ selectedOptions: ['opt_2'] })
        .expect(200);

      expect(res.body.success).toBe(true);
      expect(res.body.data.questionId).toBe(questionA1._id.toString());
    });

    it('autosaves multi-select answer and updates on repeated call', async () => {
      const res = await request(app)
        .put(`/api/v1/mock-test-attempts/${attemptId}/answers/${questionA2._id}`)
        .set('Authorization', `Bearer ${studentA2Token}`)
        .send({ selectedOptions: ['opt_a', 'opt_b'] })
        .expect(200);

      expect(res.body.success).toBe(true);

      // Verify rehydrated answers on getAttempt
      const attemptRes = await request(app)
        .get(`/api/v1/mock-test-attempts/${attemptId}`)
        .set('Authorization', `Bearer ${studentA2Token}`)
        .expect(200);

      expect(attemptRes.body.data.savedAnswers[questionA1._id.toString()].selectedOptions).toEqual(['opt_2']);
      expect(attemptRes.body.data.savedAnswers[questionA2._id.toString()].selectedOptions).toEqual(['opt_a', 'opt_b']);
    });

    it('rejects saving answer for question not belonging to this attempt', async () => {
      const fakeQId = questionA1._id.toString().replace(/.$/, '0');
      await request(app)
        .put(`/api/v1/mock-test-attempts/${attemptId}/answers/${fakeQId}`)
        .set('Authorization', `Bearer ${studentA2Token}`)
        .send({ selectedOptions: ['opt_1'] })
        .expect(400);
    });

    it('rejects answer save if deadline has passed', async () => {
      // Artificially move deadline to past
      await MockTestAttempt.updateOne(
        { _id: attemptId },
        { deadlineAt: new Date(Date.now() - 5000) }
      );

      const res = await request(app)
        .put(`/api/v1/mock-test-attempts/${attemptId}/answers/${questionA3._id}`)
        .set('Authorization', `Bearer ${studentA2Token}`)
        .send({ textAnswer: 'const' })
        .expect(400);

      expect(res.body.message).toMatch(/deadline has passed/i);

      // Restore deadline for subsequent tests
      await MockTestAttempt.updateOne(
        { _id: attemptId },
        { deadlineAt: new Date(Date.now() + 30 * 60 * 1000) }
      );
    });
  });

  describe('3. Submission, Server-Side Scoring & Idempotency', () => {
    let attemptId;

    beforeAll(async () => {
      // Find Student A1's attempt
      const attempt = await MockTestAttempt.findOne({
        studentId: studentA1._id,
        mockTestId: publishedTestA._id
      });
      attemptId = attempt._id;

      // Question 1: Correct (+2 marks)
      await request(app)
        .put(`/api/v1/mock-test-attempts/${attemptId}/answers/${questionA1._id}`)
        .set('Authorization', `Bearer ${studentA1Token}`)
        .send({ selectedOptions: ['opt_2'] });

      // Question 2: Incorrect (only chose 1 out of 2) -> -0.5 marks
      await request(app)
        .put(`/api/v1/mock-test-attempts/${attemptId}/answers/${questionA2._id}`)
        .set('Authorization', `Bearer ${studentA1Token}`)
        .send({ selectedOptions: ['opt_a'] });

      // Question 3: Left unanswered -> 0 marks
    });

    it('submits attempt and scores: +2 correct, -0.5 incorrect, 0 unanswered = 1.5 score', async () => {
      const res = await request(app)
        .post(`/api/v1/mock-test-attempts/${attemptId}/submit`)
        .set('Authorization', `Bearer ${studentA1Token}`)
        .set('Idempotency-Key', 'sub-key-123')
        .expect(200);

      expect(res.body.success).toBe(true);
      const data = res.body.data;
      expect(data.status).toBe(MOCK_TEST_ATTEMPT_STATUSES.EVALUATED);
      expect(data.score).toBe(1.5);
      expect(data.maxScore).toBe(6);
      expect(data.percentage).toBe(25);
      expect(data.passed).toBe(false); // passMarks was 3
      expect(data.timeTakenSeconds).toBeGreaterThanOrEqual(0);

      // Verify IMMEDIATE review policy returned question breakdown with explanations
      expect(data.questionBreakdown).toHaveLength(3);
      const q1Review = data.questionBreakdown.find((q) => q.questionId.toString() === questionA1._id.toString());
      expect(q1Review.isCorrect).toBe(true);
      expect(q1Review.marksAwarded).toBe(2);
      expect(q1Review.explanation).toContain('O(log n)');

      const q2Review = data.questionBreakdown.find((q) => q.questionId.toString() === questionA2._id.toString());
      expect(q2Review.isCorrect).toBe(false);
      expect(q2Review.marksAwarded).toBe(-0.5);

      const q3Review = data.questionBreakdown.find((q) => q.questionId.toString() === questionA3._id.toString());
      expect(q3Review.isCorrect).toBe(false);
      expect(q3Review.marksAwarded).toBe(0);

      // Topic analytics verification
      expect(data.topicAnalytics.length).toBeGreaterThan(0);
      const algoTopic = data.topicAnalytics.find((t) => t.topicTag === 'Algorithms');
      expect(algoTopic.correct).toBe(1);
      expect(algoTopic.score).toBe(2);
    });

    it('submits idempotently without double-scoring on repeat calls', async () => {
      const res = await request(app)
        .post(`/api/v1/mock-test-attempts/${attemptId}/submit`)
        .set('Authorization', `Bearer ${studentA1Token}`)
        .set('Idempotency-Key', 'sub-key-123')
        .expect(200);

      expect(res.body.data.score).toBe(1.5);
      expect(res.body.data.status).toBe(MOCK_TEST_ATTEMPT_STATUSES.EVALUATED);
    });

    it('rejects saving answers once submitted', async () => {
      await request(app)
        .put(`/api/v1/mock-test-attempts/${attemptId}/answers/${questionA3._id}`)
        .set('Authorization', `Bearer ${studentA1Token}`)
        .send({ textAnswer: 'const' })
        .expect(400);
    });
  });

  describe('4. Review Policy Gating (IMMEDIATE vs NEVER)', () => {
    let blindAttemptId;

    it('hides questionBreakdown and explanations when reviewPolicy is NEVER', async () => {
      // Start attempt on blind assessment
      const startRes = await request(app)
        .post(`/api/v1/mock-tests/${hiddenReviewTestA._id}/attempts`)
        .set('Authorization', `Bearer ${studentA1Token}`)
        .expect(200);

      blindAttemptId = startRes.body.data.attempt._id;

      // Submit
      const submitRes = await request(app)
        .post(`/api/v1/mock-test-attempts/${blindAttemptId}/submit`)
        .set('Authorization', `Bearer ${studentA1Token}`)
        .expect(200);

      expect(submitRes.body.data.score).toBe(0);
      expect(submitRes.body.data.questionBreakdown).toBeNull();

      // Calling GET /mock-test-attempts/:id/result also returns null questionBreakdown
      const getResultRes = await request(app)
        .get(`/api/v1/mock-test-attempts/${blindAttemptId}/result`)
        .set('Authorization', `Bearer ${studentA1Token}`)
        .expect(200);

      expect(getResultRes.body.data.questionBreakdown).toBeNull();
      expect(getResultRes.body.data.reviewPolicy).toBe(MOCK_TEST_REVIEW_POLICIES.NEVER);
    });
  });

  describe('5. Lazy Timeout & Enforcing Attempt Limits', () => {
    it('evaluates automatically on read if deadline has passed (lazy timeout)', async () => {
      // Find Student A2's attempt and expire its deadline
      const attempt = await MockTestAttempt.findOne({
        studentId: studentA2._id,
        mockTestId: publishedTestA._id
      });

      await MockTestAttempt.updateOne(
        { _id: attempt._id },
        { deadlineAt: new Date(Date.now() - 10000) }
      );

      // Fetch attempt as student
      const res = await request(app)
        .get(`/api/v1/mock-test-attempts/${attempt._id}`)
        .set('Authorization', `Bearer ${studentA2Token}`)
        .expect(200);

      // Attempt was lazily closed and evaluated
      expect(res.body.data.status).toBe(MOCK_TEST_ATTEMPT_STATUSES.EVALUATED);
      expect(res.body.data.score).toBeDefined();
    });

    it('enforces attempt limit: rejects starting attempt beyond limit', async () => {
      // Student A1 has completed 1 attempt on publishedTestA (limit is 2)
      // Start 2nd attempt
      const attempt2Res = await request(app)
        .post(`/api/v1/mock-tests/${publishedTestA._id}/attempts`)
        .set('Authorization', `Bearer ${studentA1Token}`)
        .expect(200);

      const attempt2Id = attempt2Res.body.data.attempt._id;

      // Submit 2nd attempt
      await request(app)
        .post(`/api/v1/mock-test-attempts/${attempt2Id}/submit`)
        .set('Authorization', `Bearer ${studentA1Token}`)
        .expect(200);

      // Try starting 3rd attempt -> must be rejected (400 limit reached)
      const res = await request(app)
        .post(`/api/v1/mock-tests/${publishedTestA._id}/attempts`)
        .set('Authorization', `Bearer ${studentA1Token}`)
        .expect(400);

      expect(res.body.message).toMatch(/maximum attempt limit/i);
    });
  });

  describe('6. Student History & Staff Aggregate Report', () => {
    it('fetches student mock test history via GET /api/v1/students/me/mock-test-history', async () => {
      const res = await request(app)
        .get('/api/v1/students/me/mock-test-history')
        .set('Authorization', `Bearer ${studentA1Token}`)
        .expect(200);

      expect(res.body.success).toBe(true);
      expect(res.body.data.items.length).toBeGreaterThanOrEqual(2);
      expect(res.body.data.items[0].mockTestId).toBeDefined();
    });

    it('fetches staff mock test report via GET /api/v1/admin/reports/mock-tests', async () => {
      const res = await request(app)
        .get('/api/v1/admin/reports/mock-tests')
        .set('Authorization', `Bearer ${coordinatorAToken}`)
        .expect(200);

      expect(res.body.success).toBe(true);
      const summary = res.body.data.summary;
      expect(summary.totalAttempts).toBeGreaterThanOrEqual(2);
      expect(summary.completedAttempts).toBeGreaterThanOrEqual(2);
      expect(summary.averagePercentage).toBeDefined();
      expect(summary.passRate).toBeDefined();
    });
  });
});
