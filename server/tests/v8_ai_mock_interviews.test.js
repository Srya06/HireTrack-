import { jest } from '@jest/globals';
import request from 'supertest';
import app from '../src/app.js';
import { connectDB, disconnectDB } from '../src/config/db.js';
import {
  User,
  Organization,
  OrganizationMembership,
  InterviewTrack,
  AiMockInterviewSession,
  AiInterviewTurn,
  Interview,
  AuditLog
} from '../src/models/index.js';
import {
  ROLES,
  USER_STATUSES,
  ORGANIZATION_STATUSES,
  MEMBERSHIP_ROLES,
  MEMBERSHIP_STATUSES,
  INTERVIEW_TRACK_TYPES,
  INTERVIEW_TRACK_STATUSES,
  AI_INTERVIEW_SESSION_STATUSES,
  AI_INTERVIEW_SPEAKERS
} from '../src/utils/constants.js';
import { signToken } from '../src/utils/token.js';
import { setAiProviderForTesting, resetAiProvider } from '../src/services/ai/aiProviderFactory.js';
import MockAiProvider from '../src/services/ai/mockAiProvider.js';

jest.setTimeout(30000);

describe('Chunk V8: AI Mock Interviews Engine & Safe Prompting Suite', () => {
  const ts = Date.now();

  let orgA, orgB;
  let coordinatorA, coordinatorAToken;
  let studentA1, studentA1Token;
  let studentA2, studentA2Token;
  let studentB1, studentB1Token;

  let trackA;

  beforeAll(async () => {
    await connectDB();

    // 1. Orgs
    orgA = await Organization.create({
      name: `AI Interview Org A ${ts}`,
      slug: `ai-interview-org-a-${ts}`,
      timezone: 'Asia/Kolkata',
      status: ORGANIZATION_STATUSES.ACTIVE
    });

    orgB = await Organization.create({
      name: `AI Interview Org B ${ts}`,
      slug: `ai-interview-org-b-${ts}`,
      timezone: 'Asia/Kolkata',
      status: ORGANIZATION_STATUSES.ACTIVE
    });

    // 2. Placement Coordinator
    coordinatorA = await User.create({
      name: 'Placement Head',
      email: `placement-${ts}@orga.edu`,
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

    // 3. Student A1
    studentA1 = await User.create({
      name: 'Kavita Krishnan',
      email: `kavita-${ts}@orga.edu`,
      phoneNumber: '9876543210',
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

    // 4. Student A2
    studentA2 = await User.create({
      name: 'Rohan Joshi',
      email: `rohan-${ts}@orga.edu`,
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

    // 5. Student B1 (Other Org)
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

    await InterviewTrack.init();
    await AiMockInterviewSession.init();
    await AiInterviewTurn.init();
  });

  afterAll(async () => {
    resetAiProvider();
    await AiInterviewTurn.deleteMany({ organizationId: { $in: [orgA._id, orgB._id] } });
    await AiMockInterviewSession.deleteMany({ organizationId: { $in: [orgA._id, orgB._id] } });
    await InterviewTrack.deleteMany({ organizationId: { $in: [orgA._id, orgB._id] } });
    await OrganizationMembership.deleteMany({ organizationId: { $in: [orgA._id, orgB._id] } });
    await User.deleteMany({ _id: { $in: [coordinatorA._id, studentA1._id, studentA2._id, studentB1._id] } });
    await Organization.deleteMany({ _id: { $in: [orgA._id, orgB._id] } });
    await disconnectDB();
  });

  describe('1. Track Authoring & Admin Configuration', () => {
    it('creates an AI InterviewTrack with questionConfig and rubricConfig', async () => {
      const res = await request(app)
        .post('/api/v1/admin/interview-tracks')
        .set('Authorization', `Bearer ${coordinatorAToken}`)
        .send({
          title: 'Full Stack Engineering (AI)',
          roleCategory: 'Software Engineering',
          description: 'Focuses on systems architecture, REST APIs, and database fundamentals.',
          interviewType: INTERVIEW_TRACK_TYPES.AI,
          questionConfig: {
            maxQuestions: 2,
            maxFollowUps: 1,
            maxTurnChars: 500
          },
          rubricConfig: [
            {
              dimension: 'Technical Architecture',
              maxScore: 10,
              description: 'System design and REST knowledge',
              criteria: ['Architecture clarity', 'Scalability concepts']
            },
            {
              dimension: 'Problem Solving & Communication',
              maxScore: 10,
              description: 'Clarity and articulation',
              criteria: ['Structured answers']
            }
          ]
        })
        .expect(201);

      expect(res.body.success).toBe(true);
      expect(res.body.data.title).toBe('Full Stack Engineering (AI)');
      expect(res.body.data.questionConfig.maxQuestions).toBe(2);
      expect(res.body.data.rubricConfig).toHaveLength(2);
      expect(res.body.data.status).toBe(INTERVIEW_TRACK_STATUSES.ACTIVE);

      trackA = res.body.data;
    });

    it('lists active AI tracks for students via GET /api/v1/ai-interviews/tracks', async () => {
      const res = await request(app)
        .get('/api/v1/ai-interviews/tracks')
        .set('Authorization', `Bearer ${studentA1Token}`)
        .expect(200);

      expect(res.body.success).toBe(true);
      expect(res.body.data.length).toBeGreaterThanOrEqual(1);
      const found = res.body.data.find((t) => t._id === trackA._id);
      expect(found).toBeDefined();
      expect(found.interviewType).toBe(INTERVIEW_TRACK_TYPES.AI);
    });
  });

  describe('2. Safe Prompting, Zero PII & Session Initialization', () => {
    let sessionId;

    it('starts an AI session and generates initial greeting Turn 1 with zero student PII sent', async () => {
      const mockProvider = new MockAiProvider();
      const generateSpy = jest.spyOn(mockProvider, 'generateTurn');
      setAiProviderForTesting(mockProvider);

      const res = await request(app)
        .post('/api/v1/ai-interviews/sessions')
        .set('Authorization', `Bearer ${studentA1Token}`)
        .send({ trackId: trackA._id })
        .expect(201);

      expect(res.body.success).toBe(true);
      const data = res.body.data;
      expect(data.session).toBeDefined();
      expect(data.session.status).toBe(AI_INTERVIEW_SESSION_STATUSES.IN_PROGRESS);
      expect(data.session.provider).toBe('mock');
      expect(data.session.promptVersion).toBe('v1');

      // Initial turn is AI greeting
      expect(data.initialTurn).toBeDefined();
      expect(data.initialTurn.turnNumber).toBe(1);
      expect(data.initialTurn.speaker).toBe(AI_INTERVIEW_SPEAKERS.AI);
      expect(data.initialTurn.content).toContain('Welcome to your mock interview session');

      sessionId = data.session._id;

      // Safe Prompting Verification: Assert spy payload strictly contains NO student PII
      expect(generateSpy).toHaveBeenCalled();
      const callArgs = generateSpy.mock.calls[0][0];

      // Track & roleCategory allowed
      expect(callArgs.track.roleCategory).toBe('Software Engineering');

      // Assert zero PII sent in payload
      const serialized = JSON.stringify(callArgs);
      expect(serialized).not.toContain('Kavita');
      expect(serialized).not.toContain('kavita-');
      expect(serialized).not.toContain('9876543210');
      expect(serialized).not.toContain(studentA1._id.toString());
    });

    it('enforces turn character bounds (maxTurnChars rejection)', async () => {
      // track maxTurnChars is 500
      const longText = 'A'.repeat(550);

      const res = await request(app)
        .post(`/api/v1/ai-interviews/sessions/${sessionId}/turns`)
        .set('Authorization', `Bearer ${studentA1Token}`)
        .send({ content: longText })
        .expect(400);

      expect(res.body.success).toBe(false);
      expect(res.body.message).toMatch(/exceeds character limit/i);
    });

    it('submits student response Turn 2 and generates AI follow-up Turn 3', async () => {
      const studentAnswer = 'I design services by decoupling business logic into RESTful services with Redis caching.';

      const res = await request(app)
        .post(`/api/v1/ai-interviews/sessions/${sessionId}/turns`)
        .set('Authorization', `Bearer ${studentA1Token}`)
        .send({ content: studentAnswer })
        .expect(200);

      expect(res.body.success).toBe(true);
      const data = res.body.data;
      expect(data.studentTurn.turnNumber).toBe(2);
      expect(data.studentTurn.speaker).toBe(AI_INTERVIEW_SPEAKERS.STUDENT);
      expect(data.studentTurn.content).toBe(studentAnswer);

      // AI follow-up turn
      expect(data.aiTurn.turnNumber).toBe(3);
      expect(data.aiTurn.speaker).toBe(AI_INTERVIEW_SPEAKERS.AI);
      expect(data.aiTurn.isFollowUp).toBe(true);
      expect(data.isConcluding).toBe(false);
    });

    it('submits follow-up answer Turn 4 and moves to Question 2', async () => {
      const res = await request(app)
        .post(`/api/v1/ai-interviews/sessions/${sessionId}/turns`)
        .set('Authorization', `Bearer ${studentA1Token}`)
        .send({ content: 'We handle database failover using replication and Circuit Breaker patterns.' })
        .expect(200);

      expect(res.body.success).toBe(true);
      expect(res.body.data.currentQuestionIndex).toBe(2);
      expect(res.body.data.aiTurn.isFollowUp).toBe(false);
    });
  });

  describe('3. Evaluation, Schema Validation & Practice Disclaimer', () => {
    let evalSessionId;

    beforeAll(async () => {
      const startRes = await request(app)
        .post('/api/v1/ai-interviews/sessions')
        .set('Authorization', `Bearer ${studentA2Token}`)
        .send({ trackId: trackA._id })
        .expect(201);

      evalSessionId = startRes.body.data.session._id;

      // Submit an answer
      await request(app)
        .post(`/api/v1/ai-interviews/sessions/${evalSessionId}/turns`)
        .set('Authorization', `Bearer ${studentA2Token}`)
        .send({ content: 'I prioritize unit testing, schema validation, and structured error handling.' });
    });

    it('completes session and generates structured evaluation with practice disclaimer', async () => {
      const res = await request(app)
        .post(`/api/v1/ai-interviews/sessions/${evalSessionId}/complete`)
        .set('Authorization', `Bearer ${studentA2Token}`)
        .expect(200);

      expect(res.body.success).toBe(true);
      const evalData = res.body.data;

      expect(evalData.overallScore).toBeDefined();
      expect(evalData.maxScore).toBe(20);
      expect(evalData.percentage).toBeDefined();
      expect(evalData.passed).toBe(true);
      expect(evalData.feedbackSummary).toContain('Software Engineering');

      // Verify rubric dimensions match track rubric
      expect(evalData.dimensionScores).toHaveLength(2);
      expect(evalData.dimensionScores[0].dimension).toBe('Technical Architecture');
      expect(evalData.dimensionScores[0].strengths.length).toBeGreaterThan(0);

      // Verify strict practice disclaimer label
      expect(evalData.disclaimer).toBe('AI-generated practice guidance, not an employer decision');

      // Verify session updated to COMPLETED in database
      const dbSession = await AiMockInterviewSession.findById(evalSessionId);
      expect(dbSession.status).toBe(AI_INTERVIEW_SESSION_STATUSES.COMPLETED);
      expect(dbSession.completedAt).toBeDefined();
    });

    it('rejects malformed evaluation output from AI provider without fabricating data', async () => {
      // Start another session to test malformed rejection
      const startRes = await request(app)
        .post('/api/v1/ai-interviews/sessions')
        .set('Authorization', `Bearer ${studentA2Token}`)
        .send({ trackId: trackA._id })
        .expect(201);

      const malformedSessionId = startRes.body.data.session._id;

      // Mock provider returning malformed data
      const mockProvider = new MockAiProvider();
      jest.spyOn(mockProvider, 'evaluate').mockResolvedValue({
        invalidData: true,
        summary: 'Bad output'
      });
      setAiProviderForTesting(mockProvider);

      const res = await request(app)
        .post(`/api/v1/ai-interviews/sessions/${malformedSessionId}/complete`)
        .set('Authorization', `Bearer ${studentA2Token}`)
        .expect(400);

      expect(res.body.success).toBe(false);
      expect(res.body.message).toMatch(/malformed/i);

      // Verify status is FAILED and evaluation is null (never fabricated)
      const session = await AiMockInterviewSession.findById(malformedSessionId);
      expect(session.status).toBe(AI_INTERVIEW_SESSION_STATUSES.FAILED);
      expect(session.evaluation).toBeNull();
    });
  });

  describe('4. Outage Path, Preserved Transcript & Controlled Retry', () => {
    let outageSessionId;

    it('transitions session to FAILED/INTERRUPTED during provider outage while preserving transcript', async () => {
      const mockProvider = new MockAiProvider();
      setAiProviderForTesting(mockProvider);

      const startRes = await request(app)
        .post('/api/v1/ai-interviews/sessions')
        .set('Authorization', `Bearer ${studentA1Token}`)
        .send({ trackId: trackA._id })
        .expect(201);

      outageSessionId = startRes.body.data.session._id;

      // Submit a response
      await request(app)
        .post(`/api/v1/ai-interviews/sessions/${outageSessionId}/turns`)
        .set('Authorization', `Bearer ${studentA1Token}`)
        .send({ content: 'I have experience building microservices with MongoDB and Docker.' });

      // Simulate outage during evaluation
      jest.spyOn(mockProvider, 'evaluate').mockRejectedValue(
        new Error('AI Provider Evaluation Service Unavailable (Simulated Outage)')
      );

      const res = await request(app)
        .post(`/api/v1/ai-interviews/sessions/${outageSessionId}/complete`)
        .set('Authorization', `Bearer ${studentA1Token}`)
        .expect(500);

      expect(res.body.message).toMatch(/failed to evaluate/i);

      // Verify transcript was NOT deleted and session marked FAILED
      const turns = await AiInterviewTurn.find({ sessionId: outageSessionId });
      expect(turns.length).toBeGreaterThanOrEqual(3);

      const session = await AiMockInterviewSession.findById(outageSessionId);
      expect(session.status).toBe(AI_INTERVIEW_SESSION_STATUSES.FAILED);
    });

    it('successfully evaluates preserved transcript via controlled retry endpoint', async () => {
      // Restore normal provider operation
      const normalProvider = new MockAiProvider();
      setAiProviderForTesting(normalProvider);

      const retryRes = await request(app)
        .post(`/api/v1/ai-interviews/sessions/${outageSessionId}/retry-evaluation`)
        .set('Authorization', `Bearer ${studentA1Token}`)
        .expect(200);

      expect(retryRes.body.success).toBe(true);
      expect(retryRes.body.data.overallScore).toBeDefined();

      const session = await AiMockInterviewSession.findById(outageSessionId);
      expect(session.status).toBe(AI_INTERVIEW_SESSION_STATUSES.COMPLETED);
      expect(session.evaluation).toBeDefined();
    });
  });

  describe('5. Transcript Isolation & Domain Segregation', () => {
    it('prevents another student from viewing the session transcript (404)', async () => {
      // Find Student A1's session
      const session = await AiMockInterviewSession.findOne({ studentId: studentA1._id });

      // Student A2 tries to access A1's transcript
      await request(app)
        .get(`/api/v1/ai-interviews/sessions/${session._id}/turns`)
        .set('Authorization', `Bearer ${studentA2Token}`)
        .expect(404);

      // Student B1 from another org tries to access it
      await request(app)
        .get(`/api/v1/ai-interviews/sessions/${session._id}/turns`)
        .set('Authorization', `Bearer ${studentB1Token}`)
        .expect(404);
    });

    it('verifies AI data is stored strictly in AI models, never touching human Interview table', async () => {
      // The legacy Interview table should contain zero records from AI sessions
      const humanInterviews = await Interview.find({ organizationId: orgA._id });
      expect(humanInterviews).toHaveLength(0);

      // All AI records are in AiMockInterviewSession and AiInterviewTurn
      const aiSessions = await AiMockInterviewSession.find({ organizationId: orgA._id });
      expect(aiSessions.length).toBeGreaterThan(0);
    });

    it('fetches student AI interview history via GET /api/v1/students/me/ai-interview-history', async () => {
      const res = await request(app)
        .get('/api/v1/students/me/ai-interview-history')
        .set('Authorization', `Bearer ${studentA1Token}`)
        .expect(200);

      expect(res.body.success).toBe(true);
      const items = Array.isArray(res.body.data) ? res.body.data : res.body.data.items;
      expect(items.length).toBeGreaterThanOrEqual(1);
      expect(items[0].trackId).toBeDefined();
    });
  });
});
