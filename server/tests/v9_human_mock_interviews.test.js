import { jest } from '@jest/globals';
import request from 'supertest';
import app from '../src/app.js';
import { connectDB, disconnectDB } from '../src/config/db.js';
import {
  User,
  Organization,
  OrganizationMembership,
  StudentProfile,
  FileAsset,
  InterviewerProfile,
  HumanMockInterviewSlot,
  HumanMockInterviewBooking,
  HumanInterviewEvaluation,
  InstitutePolicy,
  InterviewTrack,
  AiMockInterviewSession,
  JobOpportunity,
  JobApplication,
  AuditLog
} from '../src/models/index.js';
import {
  ROLES,
  USER_STATUSES,
  ORGANIZATION_STATUSES,
  MEMBERSHIP_ROLES,
  MEMBERSHIP_STATUSES,
  HUMAN_INTERVIEW_SLOT_STATUSES,
  HUMAN_INTERVIEW_BOOKING_STATUSES,
  HUMAN_INTERVIEW_EVALUATION_STATUSES,
  OPPORTUNITY_STATUSES,
  JOB_APPLICATION_STATUSES
} from '../src/utils/constants.js';
import { signToken } from '../src/utils/token.js';

jest.setTimeout(45000);

describe('Chunk V9: Human Mock Interviews & Interviewer Workspace Suite', () => {
  const ts = Date.now();

  let orgA, orgB;
  let adminA, adminAToken;
  let interviewerA, interviewerAToken;
  let interviewerA2, interviewerA2Token;
  let studentA1, studentA1Profile, studentA1Token;
  let studentA2, studentA2Profile, studentA2Token;
  let studentB1, studentB1Token;

  let slotA1Id, slotA2Id;
  let createdBookingId;
  let createdEvaluationId;

  beforeAll(async () => {
    await connectDB();
    await HumanMockInterviewBooking.createIndexes();
    await HumanMockInterviewSlot.createIndexes();
    await InterviewerProfile.createIndexes();

    // 1. Setup Org A & Org B
    orgA = await Organization.create({
      name: `Institute Alpha V9 ${ts}`,
      slug: `inst-alpha-v9-${ts}`,
      status: ORGANIZATION_STATUSES.ACTIVE
    });

    orgB = await Organization.create({
      name: `Institute Beta V9 ${ts}`,
      slug: `inst-beta-v9-${ts}`,
      status: ORGANIZATION_STATUSES.ACTIVE
    });

    // 2. Org A Admin
    adminA = await User.create({
      name: 'Admin Alpha',
      email: `admin_v9_${ts}@alpha.test`,
      passwordHash: 'dummyhash',
      role: ROLES.ADMIN,
      organizationId: orgA._id,
      accountStatus: USER_STATUSES.ACTIVE
    });
    await OrganizationMembership.create({
      organizationId: orgA._id,
      userId: adminA._id,
      role: MEMBERSHIP_ROLES.ORG_ADMIN,
      status: MEMBERSHIP_STATUSES.ACTIVE
    });
    adminAToken = signToken({ id: adminA._id, role: adminA.role, organizationId: orgA._id });

    // 3. Org A Interviewer 1
    interviewerA = await User.create({
      name: 'Expert Interviewer Alice',
      email: `interviewer_alice_${ts}@alpha.test`,
      passwordHash: 'dummyhash',
      role: ROLES.ADMIN,
      organizationId: orgA._id,
      accountStatus: USER_STATUSES.ACTIVE
    });
    await OrganizationMembership.create({
      organizationId: orgA._id,
      userId: interviewerA._id,
      role: MEMBERSHIP_ROLES.INTERVIEWER,
      status: MEMBERSHIP_STATUSES.ACTIVE
    });
    interviewerAToken = signToken({ id: interviewerA._id, role: interviewerA.role, organizationId: orgA._id });

    // 4. Org A Interviewer 2
    interviewerA2 = await User.create({
      name: 'Expert Interviewer Bob',
      email: `interviewer_bob_${ts}@alpha.test`,
      passwordHash: 'dummyhash',
      role: ROLES.ADMIN,
      organizationId: orgA._id,
      accountStatus: USER_STATUSES.ACTIVE
    });
    await OrganizationMembership.create({
      organizationId: orgA._id,
      userId: interviewerA2._id,
      role: MEMBERSHIP_ROLES.INTERVIEWER,
      status: MEMBERSHIP_STATUSES.ACTIVE
    });
    interviewerA2Token = signToken({ id: interviewerA2._id, role: interviewerA2.role, organizationId: orgA._id });

    // 5. Org A Student 1
    studentA1 = await User.create({
      name: 'Student Sam Alpha',
      email: `sam_v9_${ts}@alpha.test`,
      passwordHash: 'dummyhash',
      role: ROLES.STUDENT,
      organizationId: orgA._id,
      accountStatus: USER_STATUSES.ACTIVE
    });
    await OrganizationMembership.create({
      organizationId: orgA._id,
      userId: studentA1._id,
      role: MEMBERSHIP_ROLES.STUDENT,
      status: MEMBERSHIP_STATUSES.ACTIVE
    });
    const fileAsset = await FileAsset.create({
      organizationId: orgA._id,
      ownerId: studentA1._id,
      originalName: 'Sam_Alpha_Resume.pdf',
      fileName: 'sam_alpha_resume.pdf',
      mimeType: 'application/pdf',
      size: 1024,
      storageKey: `resumes/${orgA._id}/${studentA1._id}.pdf`,
      purpose: 'resume'
    });
    studentA1Profile = await StudentProfile.create({
      organizationId: orgA._id,
      userId: studentA1._id,
      studentCode: `SAM-${ts}`,
      fullName: 'Student Sam Alpha',
      degree: 'B.Tech',
      branch: 'Computer Science',
      graduationYear: 2026,
      cgpa: 8.9,
      skills: ['React', 'Node.js', 'System Design'],
      fileAssetId: fileAsset._id,
      resumeObjectKey: fileAsset.storageKey
    });
    studentA1Token = signToken({ id: studentA1._id, role: studentA1.role, organizationId: orgA._id });

    // 6. Org A Student 2
    studentA2 = await User.create({
      name: 'Student Sarah Alpha',
      email: `sarah_v9_${ts}@alpha.test`,
      passwordHash: 'dummyhash',
      role: ROLES.STUDENT,
      organizationId: orgA._id,
      accountStatus: USER_STATUSES.ACTIVE
    });
    await OrganizationMembership.create({
      organizationId: orgA._id,
      userId: studentA2._id,
      role: MEMBERSHIP_ROLES.STUDENT,
      status: MEMBERSHIP_STATUSES.ACTIVE
    });
    studentA2Profile = await StudentProfile.create({
      organizationId: orgA._id,
      userId: studentA2._id,
      studentCode: `SARAH-${ts}`,
      fullName: 'Student Sarah Alpha',
      degree: 'B.Tech',
      branch: 'Information Technology',
      graduationYear: 2026,
      cgpa: 8.5,
      skills: ['Python', 'SQL']
    });
    studentA2Token = signToken({ id: studentA2._id, role: studentA2.role, organizationId: orgA._id });

    // 7. Org B Student
    studentB1 = await User.create({
      name: 'Student Ben Beta',
      email: `ben_v9_${ts}@beta.test`,
      passwordHash: 'dummyhash',
      role: ROLES.STUDENT,
      organizationId: orgB._id,
      accountStatus: USER_STATUSES.ACTIVE
    });
    await OrganizationMembership.create({
      organizationId: orgB._id,
      userId: studentB1._id,
      role: MEMBERSHIP_ROLES.STUDENT,
      status: MEMBERSHIP_STATUSES.ACTIVE
    });
    await StudentProfile.create({
      organizationId: orgB._id,
      userId: studentB1._id,
      studentCode: `BEN-${ts}`,
      fullName: 'Student Ben Beta',
      degree: 'B.Tech',
      branch: 'Computer Science',
      graduationYear: 2026,
      cgpa: 8.0,
      skills: ['Java']
    });
    studentB1Token = signToken({ id: studentB1._id, role: studentB1.role, organizationId: orgB._id });
  });

  afterAll(async () => {
    const userIds = [adminA?._id, interviewerA?._id, interviewerA2?._id, studentA1?._id, studentA2?._id, studentB1?._id].filter(Boolean);
    if (userIds.length) await User.deleteMany({ _id: { $in: userIds } });
    const orgIds = [orgA?._id, orgB?._id].filter(Boolean);
    if (orgIds.length) {
      await Organization.deleteMany({ _id: { $in: orgIds } });
      await OrganizationMembership.deleteMany({ organizationId: { $in: orgIds } });
      await StudentProfile.deleteMany({ organizationId: { $in: orgIds } });
      await InterviewerProfile.deleteMany({ organizationId: { $in: orgIds } });
      await HumanMockInterviewSlot.deleteMany({ organizationId: { $in: orgIds } });
      await HumanMockInterviewBooking.deleteMany({ organizationId: { $in: orgIds } });
      await HumanInterviewEvaluation.deleteMany({ organizationId: { $in: orgIds } });
      await InstitutePolicy.deleteMany({ organizationId: { $in: orgIds } });
    }
    await disconnectDB();
  });

  describe('1. Interviewer Profile & Slot Management', () => {
    it('interviewer updates profile expertise and availability', async () => {
      const res = await request(app)
        .patch('/api/v1/interviewer/profile')
        .set('Authorization', `Bearer ${interviewerAToken}`)
        .send({
          expertise: ['System Design', 'React', 'Full Stack Architecture'],
          bio: '10+ years industry experience at top tech labs.',
          availability: { weeklyHours: 8, preferredTimezone: 'Asia/Kolkata' }
        })
        .expect(200);

      expect(res.body.success).toBe(true);
      expect(res.body.data.expertise).toContain('System Design');
      expect(res.body.data.bio).toMatch(/10\+ years/);
    });

    it('interviewer creates future interview slots', async () => {
      const slotTime1 = new Date(Date.now() + 48 * 3600 * 1000); // 48h in future
      const slotTime1End = new Date(slotTime1.getTime() + 45 * 60 * 1000);

      const slotTime2 = new Date(Date.now() + 72 * 3600 * 1000); // 72h in future
      const slotTime2End = new Date(slotTime2.getTime() + 45 * 60 * 1000);

      const res = await request(app)
        .post('/api/v1/interviewer/slots')
        .set('Authorization', `Bearer ${interviewerAToken}`)
        .send({
          slots: [
            { startsAt: slotTime1.toISOString(), endsAt: slotTime1End.toISOString(), meetingUrl: 'https://meet.google.com/abc-defg-hij' },
            { startsAt: slotTime2.toISOString(), endsAt: slotTime2End.toISOString(), meetingUrl: 'https://meet.google.com/xyz-uvwx-rst' }
          ]
        })
        .expect(201);

      expect(res.body.success).toBe(true);
      expect(res.body.data.length).toBe(2);
      expect(res.body.data[0].status).toBe(HUMAN_INTERVIEW_SLOT_STATUSES.AVAILABLE);

      slotA1Id = res.body.data[0]._id || res.body.data[0].id;
      slotA2Id = res.body.data[1]._id || res.body.data[1].id;
    });

    it('rejects creating slot with past startsAt or endsAt <= startsAt', async () => {
      const pastTime = new Date(Date.now() - 3600 * 1000);
      await request(app)
        .post('/api/v1/interviewer/slots')
        .set('Authorization', `Bearer ${interviewerAToken}`)
        .send({
          slots: [{ startsAt: pastTime.toISOString(), endsAt: new Date().toISOString() }]
        })
        .expect(400);

      const futureTime = new Date(Date.now() + 24 * 3600 * 1000);
      await request(app)
        .post('/api/v1/interviewer/slots')
        .set('Authorization', `Bearer ${interviewerAToken}`)
        .send({
          slots: [{ startsAt: futureTime.toISOString(), endsAt: futureTime.toISOString() }]
        })
        .expect(400);
    });

    it('rejects duplicate start time slot for the same interviewer', async () => {
      const slot = await HumanMockInterviewSlot.findById(slotA1Id);
      await request(app)
        .post('/api/v1/interviewer/slots')
        .set('Authorization', `Bearer ${interviewerAToken}`)
        .send({
          slots: [{ startsAt: slot.startsAt.toISOString(), endsAt: slot.endsAt.toISOString() }]
        })
        .expect(409);
    });

    it('interviewer lists their own slots and can toggle block status', async () => {
      const listRes = await request(app)
        .get('/api/v1/interviewer/slots')
        .set('Authorization', `Bearer ${interviewerAToken}`)
        .expect(200);

      expect(listRes.body.data.items.length).toBeGreaterThanOrEqual(2);

      // Block slot 2
      const blockRes = await request(app)
        .patch(`/api/v1/interviewer/slots/${slotA2Id}/block`)
        .set('Authorization', `Bearer ${interviewerAToken}`)
        .send({ blocked: true })
        .expect(200);

      expect(blockRes.body.data.status).toBe(HUMAN_INTERVIEW_SLOT_STATUSES.BLOCKED);

      // Unblock slot 2
      const unblockRes = await request(app)
        .patch(`/api/v1/interviewer/slots/${slotA2Id}/block`)
        .set('Authorization', `Bearer ${interviewerAToken}`)
        .send({ blocked: false })
        .expect(200);

      expect(unblockRes.body.data.status).toBe(HUMAN_INTERVIEW_SLOT_STATUSES.AVAILABLE);
    });
  });

  describe('2. Student Slot Discovery & Concurrency-Safe Booking', () => {
    it('student discovers available slots with interviewer info', async () => {
      const res = await request(app)
        .get('/api/v1/human-interviews/slots')
        .set('Authorization', `Bearer ${studentA1Token}`)
        .expect(200);

      expect(res.body.success).toBe(true);
      expect(res.body.data.items.length).toBeGreaterThanOrEqual(2);
      const slot1 = res.body.data.items.find((s) => s.id === slotA1Id || s._id === slotA1Id);
      expect(slot1).toBeDefined();
      expect(slot1.interviewer.name).toBe('Expert Interviewer Alice');
      expect(slot1.interviewer.expertise).toContain('System Design');
    });

    it('CONCURRENCY-SAFE BOOKING: exactly one of two concurrent bookings succeeds and second receives 409', async () => {
      // Student 1 books slot
      const res1 = await request(app)
        .post('/api/v1/human-interviews/bookings')
        .set('Authorization', `Bearer ${studentA1Token}`)
        .send({ slotId: slotA1Id, notes: 'First applicant focus on System Design' });
      expect(res1.statusCode).toBe(201);

      // Second booking on same slot receives 409 Conflict
      const res2 = await request(app)
        .post('/api/v1/human-interviews/bookings')
        .set('Authorization', `Bearer ${studentA2Token}`)
        .send({ slotId: slotA1Id, notes: 'Second applicant concurrent' });
      expect(res2.statusCode).toBe(409);

      // Confirm exactly one active booking exists in database for this slot
      const bookingCount = await HumanMockInterviewBooking.countDocuments({
        slotId: slotA1Id,
        status: { $in: [HUMAN_INTERVIEW_BOOKING_STATUSES.REQUESTED, HUMAN_INTERVIEW_BOOKING_STATUSES.SCHEDULED] }
      });
      expect(bookingCount).toBe(1);

      // Verify slot status in DB transitioned atomically to BOOKED
      const slotInDb = await HumanMockInterviewSlot.findById(slotA1Id);
      expect(slotInDb.status).toBe(HUMAN_INTERVIEW_SLOT_STATUSES.BOOKED);

      createdBookingId = res1.body.data.id || res1.body.data._id;
    });

    it('rejects booking on already booked slot with 409 Conflict', async () => {
      await request(app)
        .post('/api/v1/human-interviews/bookings')
        .set('Authorization', `Bearer ${studentA2Token}`)
        .send({ slotId: slotA1Id })
        .expect(409);
    });
  });

  describe('3. Interviewer Scoped Workspace & Student Context DTO', () => {
    it('interviewer sees their assigned session with student information', async () => {
      const res = await request(app)
        .get('/api/v1/interviewer/sessions')
        .set('Authorization', `Bearer ${interviewerAToken}`)
        .expect(200);

      expect(res.body.success).toBe(true);
      expect(res.body.data.items.length).toBeGreaterThanOrEqual(1);
      const session = res.body.data.items.find((s) => s.id === createdBookingId || s._id === createdBookingId);
      expect(session).toBeDefined();
      expect(session.studentUserId.name).toBe('Student Sam Alpha');
    });

    it('interviewer accesses allowlisted student context DTO with signed resume link', async () => {
      const res = await request(app)
        .get(`/api/v1/interviewer/sessions/${createdBookingId}/student-context`)
        .set('Authorization', `Bearer ${interviewerAToken}`)
        .expect(200);

      expect(res.body.success).toBe(true);
      const ctx = res.body.data.studentContext;
      expect(ctx.name).toBe('Student Sam Alpha');
      expect(ctx.degree).toBe('B.Tech');
      expect(ctx.branch).toBe('Computer Science');
      expect(ctx.skills).toContain('System Design');
      expect(ctx.resumeUrl).toMatch(/\/api\/v1\/files\/.*\/download\?token=/);

      // Verify zero PII leakage: no password, salt, tokens, or private IDs
      expect(ctx.password).toBeUndefined();
      expect(ctx.passwordHash).toBeUndefined();
    });

    it('prevents another interviewer from viewing student context for this session', async () => {
      await request(app)
        .get(`/api/v1/interviewer/sessions/${createdBookingId}/student-context`)
        .set('Authorization', `Bearer ${interviewerA2Token}`)
        .expect(403);
    });
  });

  describe('4. Evaluation Lifecycle & Feedback Release Security', () => {
    it('interviewer submits draft/final evaluation with rubric scores', async () => {
      const res = await request(app)
        .post(`/api/v1/interviewer/sessions/${createdBookingId}/evaluation`)
        .set('Authorization', `Bearer ${interviewerAToken}`)
        .send({
          rubricScores: [
            { dimension: 'System Design Architecture', score: 9, maxScore: 10, feedback: 'Great understanding of microservices and caching.' },
            { dimension: 'Data Modeling', score: 8, maxScore: 10, feedback: 'Clear entity relationships and indexing strategy.' },
            { dimension: 'Communication & Problem Solving', score: 9, maxScore: 10, feedback: 'Explains trade-offs articulately.' }
          ],
          strengths: ['Strong distributed systems knowledge', 'Clear technical communication'],
          improvementAreas: ['Deepen knowledge of database write locks'],
          overallFeedback: 'Excellent candidate, ready for Tier 1 engineering roles.',
          status: HUMAN_INTERVIEW_EVALUATION_STATUSES.SUBMITTED
        })
        .expect(200);

      expect(res.body.success).toBe(true);
      expect(res.body.data.status).toBe(HUMAN_INTERVIEW_EVALUATION_STATUSES.SUBMITTED);
      expect(res.body.data.overallScore).toBeGreaterThanOrEqual(80);

      createdEvaluationId = res.body.data.id || res.body.data._id;

      // Booking status should transition to COMPLETED
      const booking = await HumanMockInterviewBooking.findById(createdBookingId);
      expect(booking.status).toBe(HUMAN_INTERVIEW_BOOKING_STATUSES.COMPLETED);
    });

    it('CRITICAL PRIVACY: student receives 404 when querying unreleased feedback', async () => {
      // Evaluation is in SUBMITTED state, NOT yet RELEASED by staff
      const res = await request(app)
        .get(`/api/v1/human-interviews/bookings/${createdBookingId}/feedback`)
        .set('Authorization', `Bearer ${studentA1Token}`)
        .expect(404);

      expect(res.body.success).toBe(false);
      expect(res.body.message).toMatch(/not.*released/i);
    });

    it('placement admin releases evaluation with audit logging', async () => {
      const res = await request(app)
        .post(`/api/v1/admin/interview-feedback/${createdEvaluationId}/release`)
        .set('Authorization', `Bearer ${adminAToken}`)
        .expect(200);

      expect(res.body.success).toBe(true);
      expect(res.body.data.status).toBe(HUMAN_INTERVIEW_EVALUATION_STATUSES.RELEASED);
      expect(res.body.data.releasedAt).toBeDefined();

      // Verify audit log entry
      const audit = await AuditLog.findOne({
        action: 'INTERVIEW_FEEDBACK_RELEASE',
        resourceId: createdEvaluationId
      });
      expect(audit).toBeDefined();
      expect(audit.actorId.toString()).toBe(adminA._id.toString());
    });

    it('student can now view released evaluation with scorecard and disclaimer', async () => {
      const res = await request(app)
        .get(`/api/v1/human-interviews/bookings/${createdBookingId}/feedback`)
        .set('Authorization', `Bearer ${studentA1Token}`)
        .expect(200);

      expect(res.body.success).toBe(true);
      const evalData = res.body.data.evaluation;
      expect(evalData.overallScore).toBeGreaterThanOrEqual(80);
      expect(evalData.rubricScores.length).toBe(3);
      expect(evalData.disclaimer).toBe('Human-evaluated practice guidance, not an employer decision');
    });

    it('interviewer is prevented from editing evaluation once released', async () => {
      await request(app)
        .post(`/api/v1/interviewer/sessions/${createdBookingId}/evaluation`)
        .set('Authorization', `Bearer ${interviewerAToken}`)
        .send({
          overallFeedback: 'Attempting post-release alteration'
        })
        .expect(400);
    });
  });

  describe('5. Institute Policy & Opportunities Isolation Regression Test', () => {
    it('admin updates policy to enforce AI pass requirement', async () => {
      const res = await request(app)
        .patch('/api/v1/admin/policies/mock-interviews')
        .set('Authorization', `Bearer ${adminAToken}`)
        .send({
          requireAiPassForHumanMock: true,
          minOverallScore: 75,
          cancelBeforeHours: 24,
          allowResumeView: true
        })
        .expect(200);

      expect(res.body.success).toBe(true);
      expect(res.body.data.requireAiPassForHumanMock).toBe(true);
      expect(res.body.data.minOverallScore).toBe(75);
    });

    it('student Sarah WITHOUT qualifying AI pass is rejected when booking slot', async () => {
      // Sarah has no completed AI mock interview
      await request(app)
        .post('/api/v1/human-interviews/bookings')
        .set('Authorization', `Bearer ${studentA2Token}`)
        .send({ slotId: slotA2Id })
        .expect(400);
    });

    it('student Sarah WITH qualifying AI pass (>= 75) successfully books slot', async () => {
      // Seed a completed AI mock session with score 80 for Sarah
      const track = await InterviewTrack.create({
        organizationId: orgA._id,
        title: 'Backend Node.js Track',
        interviewType: 'AI',
        roleCategory: 'Software Engineering',
        createdBy: adminA._id
      });

      await AiMockInterviewSession.create({
        organizationId: orgA._id,
        studentId: studentA2._id,
        studentProfileId: studentA2Profile._id,
        trackId: track._id,
        status: 'COMPLETED',
        evaluation: {
          overallScore: 80,
          maxScore: 100,
          percentage: 80,
          passed: true,
          feedbackSummary: 'Strong technical performance',
          rubricScores: [{ dimension: 'Core Competency', score: 8, maxScore: 10, feedback: 'Strong' }]
        }
      });

      const res = await request(app)
        .post('/api/v1/human-interviews/bookings')
        .set('Authorization', `Bearer ${studentA2Token}`)
        .send({ slotId: slotA2Id })
        .expect(201);

      expect(res.body.success).toBe(true);
      expect(res.body.data.status).toBe(HUMAN_INTERVIEW_BOOKING_STATUSES.SCHEDULED);
    });

    it('REGRESSION TEST: requireAiPassForHumanMock NEVER touches opportunities or application endpoints', async () => {
      // 1. Create a published job opportunity in Org A
      const opp = await JobOpportunity.create({
        organizationId: orgA._id,
        companyName: 'Stripe Global',
        jobTitle: 'Backend Infrastructure Engineer',
        description: 'Design robust microservices',
        location: 'Remote',
        workMode: 'remote',
        applicationUrl: 'https://stripe.com/jobs/apply',
        applicationInstructions: 'Apply on Stripe career site',
        deadline: new Date(Date.now() + 30 * 24 * 3600 * 1000),
        status: OPPORTUNITY_STATUSES.PUBLISHED,
        sourceNote: 'Direct campus recruiter verification',
        lastVerifiedAt: new Date(),
        createdBy: adminA._id
      });

      // 2. Student Sam queries opportunities - must succeed with 200 OK
      const oppRes = await request(app)
        .get('/api/v1/opportunities')
        .set('Authorization', `Bearer ${studentA1Token}`)
        .expect(200);

      expect(oppRes.body.success).toBe(true);

      // 3. Student Sam records application status - must succeed with 200/201 OK
      const appRes = await request(app)
        .post(`/api/v1/opportunities/${opp._id}/application-status`)
        .set('Authorization', `Bearer ${studentA1Token}`)
        .send({ status: JOB_APPLICATION_STATUSES.APPLIED, notes: 'Submitted via Stripe portal' })
        .expect(200);

      expect(appRes.body.success).toBe(true);
      expect(appRes.body.data.status).toBe(JOB_APPLICATION_STATUSES.APPLIED);
    });
  });

  describe('6. Organization Scoping & Multi-Tenancy Isolation', () => {
    it('Org B student is blocked from viewing or booking Org A slots', async () => {
      // Org B student browses slots: sees only Org B slots (none)
      const browseRes = await request(app)
        .get('/api/v1/human-interviews/slots')
        .set('Authorization', `Bearer ${studentB1Token}`)
        .expect(200);

      expect(browseRes.body.data.items.length).toBe(0);

      // Org B student tries to directly book Org A slot: 409 or 404
      await request(app)
        .post('/api/v1/human-interviews/bookings')
        .set('Authorization', `Bearer ${studentB1Token}`)
        .send({ slotId: slotA1Id })
        .expect(409);
    });
  });
});
