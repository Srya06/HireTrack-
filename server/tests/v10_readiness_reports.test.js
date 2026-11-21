import { jest } from '@jest/globals';
import request from 'supertest';
import mongoose from 'mongoose';
import app from '../src/app.js';
import { connectDB, disconnectDB } from '../src/config/db.js';
import {
  Organization,
  User,
  OrganizationMembership as Membership,
  StudentProfile,
  JobOpportunity,
  EligibilityEvaluation,
  JobApplication,
  MockTest,
  MockTestAttempt,
  InterviewTrack,
  AiMockInterviewSession,
  HumanMockInterviewSlot,
  HumanMockInterviewBooking,
  HumanInterviewEvaluation,
  Notification,
  AuditLog
} from '../src/models/index.js';
import { signToken } from '../src/utils/token.js';
import {
  ROLES,
  USER_STATUSES,
  MEMBERSHIP_ROLES,
  MEMBERSHIP_STATUSES,
  OPPORTUNITY_STATUSES,
  MOCK_TEST_STATUSES,
  MOCK_TEST_ATTEMPT_STATUSES,
  AI_INTERVIEW_SESSION_STATUSES,
  HUMAN_INTERVIEW_BOOKING_STATUSES,
  HUMAN_INTERVIEW_EVALUATION_STATUSES
} from '../src/utils/constants.js';

jest.setTimeout(45000);

describe('Chunk V10: Student Readiness Aggregator, Staff Reports & Audit Log Suite', () => {
  const ts = Date.now();
  let orgA, orgB;
  let adminUserA, adminTokenA;
  let staffUserA, staffTokenA;
  let studentUserA, studentTokenA;
  let studentProfileA;
  let adminUserB, adminTokenB;
  let studentUserB, studentTokenB;
  let studentProfileB;

  beforeAll(async () => {
    await connectDB();

    // 1. Create Org A and Org B
    orgA = await Organization.create({
      name: `Readiness Univ A ${ts}`,
      code: `RUNIV_A_${ts}`,
      slug: `runiv-a-${ts}`,
      domain: `runiv-a-${ts}.edu`
    });

    orgB = await Organization.create({
      name: `Readiness Univ B ${ts}`,
      code: `RUNIV_B_${ts}`,
      slug: `runiv-b-${ts}`,
      domain: `runiv-b-${ts}.edu`
    });

    // 2. Org A Users
    adminUserA = await User.create({
      name: 'Admin Alice',
      email: `admin.alice.${ts}@runiv-a.edu`,
      passwordHash: 'dummyhash',
      role: ROLES.ADMIN,
      organizationId: orgA._id,
      accountStatus: USER_STATUSES.ACTIVE,
      isVerified: true
    });
    await Membership.create({
      organizationId: orgA._id,
      userId: adminUserA._id,
      role: MEMBERSHIP_ROLES.ORG_ADMIN,
      status: MEMBERSHIP_STATUSES.ACTIVE
    });
    adminTokenA = signToken({ id: adminUserA._id, role: adminUserA.role, organizationId: orgA._id });

    staffUserA = await User.create({
      name: 'Coordinator Charlie',
      email: `charlie.coord.${ts}@runiv-a.edu`,
      passwordHash: 'dummyhash',
      role: ROLES.ADMIN,
      organizationId: orgA._id,
      accountStatus: USER_STATUSES.ACTIVE,
      isVerified: true
    });
    await Membership.create({
      organizationId: orgA._id,
      userId: staffUserA._id,
      role: MEMBERSHIP_ROLES.PLACEMENT_COORDINATOR,
      status: MEMBERSHIP_STATUSES.ACTIVE
    });
    staffTokenA = signToken({ id: staffUserA._id, role: staffUserA.role, organizationId: orgA._id });

    studentUserA = await User.create({
      name: 'Student Sam',
      email: `sam.student.${ts}@runiv-a.edu`,
      passwordHash: 'dummyhash',
      role: ROLES.STUDENT,
      organizationId: orgA._id,
      accountStatus: USER_STATUSES.ACTIVE,
      isVerified: true
    });
    await Membership.create({
      organizationId: orgA._id,
      userId: studentUserA._id,
      role: MEMBERSHIP_ROLES.STUDENT,
      status: MEMBERSHIP_STATUSES.ACTIVE
    });
    studentTokenA = signToken({ id: studentUserA._id, role: studentUserA.role, organizationId: orgA._id });

    studentProfileA = await StudentProfile.create({
      userId: studentUserA._id,
      organizationId: orgA._id,
      studentId: `CS-${ts}-001`,
      fullName: 'Student Sam',
      rollNumber: `CS-${ts}-001`,
      degree: 'B.Tech',
      branch: 'Computer Science',
      graduationYear: 2025,
      cgpa: 8.5,
      skills: ['JavaScript', 'React', 'Node.js'],
      resumeObjectKey: 'resumes/sam_resume.pdf',
      resumeKey: 'resumes/sam_resume.pdf'
    });

    // 3. Org B Users
    adminUserB = await User.create({
      name: 'Admin Bob',
      email: `admin.bob.${ts}@runiv-b.edu`,
      passwordHash: 'dummyhash',
      role: ROLES.ADMIN,
      organizationId: orgB._id,
      accountStatus: USER_STATUSES.ACTIVE,
      isVerified: true
    });
    await Membership.create({
      organizationId: orgB._id,
      userId: adminUserB._id,
      role: MEMBERSHIP_ROLES.ORG_ADMIN,
      status: MEMBERSHIP_STATUSES.ACTIVE
    });
    adminTokenB = signToken({ id: adminUserB._id, role: adminUserB.role, organizationId: orgB._id });

    studentUserB = await User.create({
      name: 'Student Ben',
      email: `ben.student.${ts}@runiv-b.edu`,
      passwordHash: 'dummyhash',
      role: ROLES.STUDENT,
      organizationId: orgB._id,
      accountStatus: USER_STATUSES.ACTIVE,
      isVerified: true
    });
    await Membership.create({
      organizationId: orgB._id,
      userId: studentUserB._id,
      role: MEMBERSHIP_ROLES.STUDENT,
      status: MEMBERSHIP_STATUSES.ACTIVE
    });
    studentTokenB = signToken({ id: studentUserB._id, role: studentUserB.role, organizationId: orgB._id });

    studentProfileB = await StudentProfile.create({
      userId: studentUserB._id,
      organizationId: orgB._id,
      studentId: `IT-${ts}-002`,
      fullName: 'Student Ben',
      rollNumber: `IT-${ts}-002`,
      degree: 'B.Tech',
      branch: 'Information Technology',
      graduationYear: 2025,
      cgpa: 7.9,
      skills: ['Python']
    });

    // 4. Seed Domain Data for Org A
    // Active Opportunity
    const jobA = await JobOpportunity.create({
      organizationId: orgA._id,
      createdBy: adminUserA._id,
      companyName: 'TechCorp A',
      jobTitle: 'Software Engineer',
      description: 'Full stack development',
      location: 'Bangalore',
      workMode: 'hybrid',
      compensationText: '12 LPA',
      applicationUrl: 'https://techcorp.example/apply',
      deadline: new Date(Date.now() + 10 * 24 * 3600 * 1000),
      status: OPPORTUNITY_STATUSES.PUBLISHED,
      sourceNote: 'Direct campus listing'
    });

    // Eligibility Evaluation
    await EligibilityEvaluation.create({
      organizationId: orgA._id,
      opportunityId: jobA._id,
      studentId: studentUserA._id,
      studentProfileId: studentProfileA._id,
      status: 'LIKELY_ELIGIBLE',
      criteriaVersion: 1,
      engineVersion: '1'
    });

    // Job Application
    await JobApplication.create({
      organizationId: orgA._id,
      studentId: studentUserA._id,
      studentProfileId: studentProfileA._id,
      jobOpportunityId: jobA._id,
      status: 'APPLIED',
      verificationStatus: 'VERIFIED'
    });

    // Mock Test & Attempt
    const testA = await MockTest.create({
      organizationId: orgA._id,
      createdBy: adminUserA._id,
      title: 'Core CS Foundations',
      durationMinutes: 60,
      scoringConfig: { marksPerQuestion: 2, negativeMarks: 0, passMarks: 10 },
      status: MOCK_TEST_STATUSES.PUBLISHED
    });

    await MockTestAttempt.create({
      organizationId: orgA._id,
      studentId: studentUserA._id,
      studentUserId: studentUserA._id,
      mockTestId: testA._id,
      status: MOCK_TEST_ATTEMPT_STATUSES.EVALUATED,
      startedAt: new Date(Date.now() - 3600 * 1000),
      deadlineAt: new Date(Date.now() + 3600 * 1000),
      submittedAt: new Date(),
      score: 18,
      maxScore: 20,
      percentage: 90,
      scoringSnapshot: {
        topicWise: [
          { topic: 'Algorithms', score: 10, maxScore: 10, percentage: 100 },
          { topic: 'Data Structures', score: 8, maxScore: 10, percentage: 80 }
        ]
      }
    });

    // Interview Track & AI Mock Interview Session
    const trackA = await InterviewTrack.create({
      organizationId: orgA._id,
      createdBy: adminUserA._id,
      title: 'Full Stack Engineering Track',
      roleCategory: 'Software Engineering',
      questionConfig: { maxQuestions: 5, maxFollowUps: 2, maxTurnChars: 500 },
      status: 'ACTIVE'
    });

    await AiMockInterviewSession.create({
      organizationId: orgA._id,
      studentId: studentUserA._id,
      studentUserId: studentUserA._id,
      trackId: trackA._id,
      status: AI_INTERVIEW_SESSION_STATUSES.COMPLETED,
      startedAt: new Date(Date.now() - 1800 * 1000),
      completedAt: new Date(),
      evaluation: {
        overallScore: 85,
        maxScore: 100,
        percentage: 85,
        passed: true,
        feedbackSummary: 'Strong problem solving skills and architectural clarity.'
      }
    });

    // Human Mock Interview Booking & Evaluation (RELEASED)
    const slotA = await HumanMockInterviewSlot.create({
      organizationId: orgA._id,
      interviewerProfileId: new mongoose.Types.ObjectId(),
      startsAt: new Date(Date.now() - 7200 * 1000),
      endsAt: new Date(Date.now() - 3600 * 1000),
      status: 'BOOKED'
    });

    const bookingA = await HumanMockInterviewBooking.create({
      organizationId: orgA._id,
      slotId: slotA._id,
      studentProfileId: studentProfileA._id,
      studentUserId: studentUserA._id,
      status: HUMAN_INTERVIEW_BOOKING_STATUSES.COMPLETED,
      bookedAt: new Date(Date.now() - 86400 * 1000),
      completedAt: new Date(Date.now() - 3600 * 1000)
    });

    await HumanInterviewEvaluation.create({
      organizationId: orgA._id,
      bookingId: bookingA._id,
      evaluatedBy: adminUserA._id,
      interviewerProfileId: slotA.interviewerProfileId,
      overallScore: 92,
      rubricScores: [{ dimension: 'Communication', score: 9, maxScore: 10, feedback: 'Articulate' }],
      strengths: ['Communication', 'Systems Thinking'],
      improvementAreas: ['Edge Case Handling'],
      overallFeedback: 'Excellent interview readiness.',
      status: HUMAN_INTERVIEW_EVALUATION_STATUSES.RELEASED,
      releasedAt: new Date()
    });
  });

  afterAll(async () => {
    await Organization.deleteMany({});
    await User.deleteMany({});
    await Membership.deleteMany({});
    await StudentProfile.deleteMany({});
    await JobOpportunity.deleteMany({});
    await EligibilityEvaluation.deleteMany({});
    await JobApplication.deleteMany({});
    await MockTest.deleteMany({});
    await MockTestAttempt.deleteMany({});
    await InterviewTrack.deleteMany({});
    await AiMockInterviewSession.deleteMany({});
    await HumanMockInterviewSlot.deleteMany({});
    await HumanMockInterviewBooking.deleteMany({});
    await HumanInterviewEvaluation.deleteMany({});
    await Notification.deleteMany({});
    await AuditLog.deleteMany({});
    await disconnectDB();
  });

  // ==========================================
  // 1. Student Readiness Aggregator (GET /students/me/readiness)
  // ==========================================
  describe('1. Student Readiness Aggregation (GET /api/v1/students/me/readiness)', () => {
    it('aggregates all readiness dimensions with { value, source, asOf } and no composite score by default', async () => {
      const res = await request(app)
        .get('/api/v1/students/me/readiness')
        .set('Authorization', `Bearer ${studentTokenA}`)
        .set('x-organization-id', orgA._id.toString());

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);

      const { components, nextActions, compositeIndicator } = res.body.data;

      // Rule: Default is NO composite score unless explicitly documented
      expect(compositeIndicator).toBeNull();

      // Rule: Each component must return { value, source, asOf }
      // 1. Profile Completeness
      expect(components.profileCompleteness).toBeDefined();
      expect(components.profileCompleteness.source).toBe('StudentProfile');
      expect(components.profileCompleteness.value.percentage).toBe(100);
      expect(components.profileCompleteness.value.isComplete).toBe(true);
      expect(components.profileCompleteness.asOf).toBeDefined();

      // 2. Active Opportunities
      expect(components.activeOpportunities).toBeDefined();
      expect(components.activeOpportunities.source).toBe('JobOpportunity');
      expect(components.activeOpportunities.value.totalActive).toBe(1);

      // 3. Eligibility Distribution
      expect(components.eligibilityDistribution).toBeDefined();
      expect(components.eligibilityDistribution.source).toBe('EligibilityEvaluation');
      expect(components.eligibilityDistribution.value.likelyEligibleCount).toBe(1);
      expect(components.eligibilityDistribution.value.totalEvaluated).toBe(1);

      // 4. Application Statuses
      expect(components.applicationStatuses).toBeDefined();
      expect(components.applicationStatuses.source).toBe('JobApplication');
      expect(components.applicationStatuses.value.byStatus.APPLIED).toBe(1);
      expect(components.applicationStatuses.value.verifiedCount).toBe(1);

      // 5. Mock Tests
      expect(components.mockTests).toBeDefined();
      expect(components.mockTests.source).toBe('MockTestAttempt');
      expect(components.mockTests.value.completedAttempts).toBe(1);
      expect(components.mockTests.value.averagePercentage).toBe(90);

      // 6. AI Mock Interviews (NEVER mislabelled as human)
      expect(components.aiInterviews).toBeDefined();
      expect(components.aiInterviews.source).toBe('AiMockInterviewSession');
      expect(components.aiInterviews.value.completedSessions).toBe(1);
      expect(components.aiInterviews.value.averagePercentage).toBe(85);

      // 7. Human Mock Interviews (NEVER mislabelled as AI)
      expect(components.humanInterviews).toBeDefined();
      expect(components.humanInterviews.source).toBe('HumanInterviewEvaluation');
      expect(components.humanInterviews.value.releasedEvaluationsCount).toBe(1);
      expect(components.humanInterviews.value.averageReleasedScore).toBe(92);

      // 8. Next Actions (Rule-based recommendations)
      expect(Array.isArray(nextActions)).toBe(true);
    });

    it('strictly isolates readiness data: Org B student only sees Org B metrics', async () => {
      const res = await request(app)
        .get('/api/v1/students/me/readiness')
        .set('Authorization', `Bearer ${studentTokenB}`)
        .set('x-organization-id', orgB._id.toString());

      expect(res.status).toBe(200);
      const { components } = res.body.data;

      // Student B in Org B has 0 tests, 0 AI sessions, 0 opportunities in Org B
      expect(components.mockTests.value.completedAttempts).toBe(0);
      expect(components.aiInterviews.value.completedSessions).toBe(0);
      expect(components.activeOpportunities.value.totalActive).toBe(0);
    });
  });

  // ==========================================
  // 2. Staff Cohort Readiness (GET /admin/readiness/cohorts & /students/:studentId)
  // ==========================================
  describe('2. Staff Cohort Readiness Endpoints', () => {
    it('allows PLACEMENT_COORDINATOR and ORG_ADMIN to view cohort readiness', async () => {
      const res = await request(app)
        .get('/api/v1/admin/readiness/cohorts')
        .set('Authorization', `Bearer ${staffTokenA}`)
        .set('x-organization-id', orgA._id.toString());

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.cohort.totalStudents).toBe(1);
      expect(res.body.data.students[0].fullName).toBe('Student Sam');
      expect(res.body.data.students[0].mockTestsCompleted).toBe(1);
      expect(res.body.data.students[0].aiSessionsCompleted).toBe(1);
      expect(res.body.data.students[0].humanSessionsCompleted).toBe(1);
    });

    it('forbids students from accessing staff cohort readiness (403)', async () => {
      const res = await request(app)
        .get('/api/v1/admin/readiness/cohorts')
        .set('Authorization', `Bearer ${studentTokenA}`)
        .set('x-organization-id', orgA._id.toString());

      expect(res.status).toBe(403);
    });

    it('allows staff to view single student readiness drill-down', async () => {
      const res = await request(app)
        .get(`/api/v1/admin/readiness/students/${studentProfileA._id}`)
        .set('Authorization', `Bearer ${adminTokenA}`)
        .set('x-organization-id', orgA._id.toString());

      expect(res.status).toBe(200);
      expect(res.body.data.student.fullName).toBe('Student Sam');
      expect(res.body.data.components.profileCompleteness.value.isComplete).toBe(true);
    });

    it('rejects cross-organization student readiness drilldown (404)', async () => {
      const res = await request(app)
        .get(`/api/v1/admin/readiness/students/${studentProfileA._id}`)
        .set('Authorization', `Bearer ${adminTokenB}`)
        .set('x-organization-id', orgB._id.toString());

      expect(res.status).toBe(404);
    });
  });

  // ==========================================
  // 3. Reports Endpoints & Audited CSV Export
  // ==========================================
  describe('3. Staff Reports & CSV Export with Mandatory Audit', () => {
    it('generates Overview report with domain breakdown', async () => {
      const res = await request(app)
        .get('/api/v1/admin/reports/overview')
        .set('Authorization', `Bearer ${adminTokenA}`)
        .set('x-organization-id', orgA._id.toString());

      expect(res.status).toBe(200);
      expect(res.body.data.reportType).toBe('OVERVIEW');
      expect(res.body.data.metrics.totalStudents).toBe(1);
      expect(res.body.data.metrics.totalJobs).toBe(1);
      expect(res.body.data.metrics.totalApplications).toBe(1);
    });

    it('generates Jobs report with applicant counts', async () => {
      const res = await request(app)
        .get('/api/v1/admin/reports/jobs')
        .set('Authorization', `Bearer ${staffTokenA}`)
        .set('x-organization-id', orgA._id.toString());

      expect(res.status).toBe(200);
      expect(res.body.data.reportType).toBe('JOBS');
      expect(res.body.data.summary.totalJobs).toBe(1);
      expect(res.body.data.items[0].companyName).toBe('TechCorp A');
      expect(res.body.data.items[0].totalApplications).toBe(1);
    });

    it('generates Mock Tests report', async () => {
      const res = await request(app)
        .get('/api/v1/admin/reports/mock-tests')
        .set('Authorization', `Bearer ${adminTokenA}`)
        .set('x-organization-id', orgA._id.toString());

      expect(res.status).toBe(200);
      expect(res.body.data.reportType).toBe('MOCK_TESTS');
      expect(res.body.data.summary.totalTests).toBe(1);
      expect(res.body.data.items[0].averagePercentage).toBe(90);
    });

    it('generates Mock Interviews report strictly separating AI and Human metrics', async () => {
      const res = await request(app)
        .get('/api/v1/admin/reports/mock-interviews')
        .set('Authorization', `Bearer ${staffTokenA}`)
        .set('x-organization-id', orgA._id.toString());

      expect(res.status).toBe(200);
      expect(res.body.data.reportType).toBe('MOCK_INTERVIEWS');

      // AI Metrics
      expect(res.body.data.aiMetrics.source).toBe('AiMockInterviewSession');
      expect(res.body.data.aiMetrics.totalSessions).toBe(1);
      expect(res.body.data.aiMetrics.averageScorePercentage).toBe(85);

      // Human Metrics
      expect(res.body.data.humanMetrics.totalBookings).toBe(1);
      expect(res.body.data.humanMetrics.releasedEvaluationsCount).toBe(1);
      expect(res.body.data.humanMetrics.averageReleasedScore).toBe(92);
    });

    it('exports CSV report and records mandatory audit log', async () => {
      const res = await request(app)
        .get('/api/v1/admin/reports/jobs?format=csv')
        .set('Authorization', `Bearer ${adminTokenA}`)
        .set('x-organization-id', orgA._id.toString());

      expect(res.status).toBe(200);
      expect(res.headers['content-type']).toContain('text/csv');
      expect(res.text).toContain('TechCorp A');
      expect(res.text).toContain('Software Engineer');

      // Verify Audit Event was recorded
      const auditEntry = await AuditLog.findOne({
        organizationId: orgA._id,
        action: 'EXPORT_REPORT',
        resourceType: 'Report'
      });
      expect(auditEntry).not.toBeNull();
      expect(auditEntry.metadata.reportType).toBe('JOBS');
      expect(auditEntry.metadata.format).toBe('csv');
    });

    it('forbids students from accessing reports (403)', async () => {
      const res = await request(app)
        .get('/api/v1/admin/reports/overview')
        .set('Authorization', `Bearer ${studentTokenA}`)
        .set('x-organization-id', orgA._id.toString());

      expect(res.status).toBe(403);
    });
  });

  // ==========================================
  // 4. Audit Log Viewer (GET /admin/audit-logs)
  // ==========================================
  describe('4. Audit Log Viewer (GET /api/v1/admin/audit-logs)', () => {
    it('allows ORG_ADMIN to view paginated audit trail for their organization', async () => {
      const res = await request(app)
        .get('/api/v1/admin/audit-logs')
        .set('Authorization', `Bearer ${adminTokenA}`)
        .set('x-organization-id', orgA._id.toString());

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(Array.isArray(res.body.data)).toBe(true);
      expect(res.body.pagination).toBeDefined();

      // Should contain the EXPORT_REPORT action from the previous test
      const exportLog = res.body.data.find((l) => l.action === 'EXPORT_REPORT');
      expect(exportLog).toBeDefined();
    });

    it('forbids non-ORG_ADMIN members (e.g. students or PLACEMENT_COORDINATOR) from viewing audit logs', async () => {
      const studentRes = await request(app)
        .get('/api/v1/admin/audit-logs')
        .set('Authorization', `Bearer ${studentTokenA}`)
        .set('x-organization-id', orgA._id.toString());
      expect(studentRes.status).toBe(403);

      const coordRes = await request(app)
        .get('/api/v1/admin/audit-logs')
        .set('Authorization', `Bearer ${staffTokenA}`)
        .set('x-organization-id', orgA._id.toString());
      expect(coordRes.status).toBe(403);
    });

    it('enforces org isolation: Org B admin cannot see Org A audit logs', async () => {
      const res = await request(app)
        .get('/api/v1/admin/audit-logs')
        .set('Authorization', `Bearer ${adminTokenB}`)
        .set('x-organization-id', orgB._id.toString());

      expect(res.status).toBe(200);
      // All logs returned must belong exclusively to Org B
      res.body.data.forEach((log) => {
        expect(log.organizationId.toString()).toBe(orgB._id.toString());
      });
    });
  });

  // ==========================================
  // 5. Notifications & In-App / Email Delivery Fallback
  // ==========================================
  describe('5. Notifications & Delivery Pipeline', () => {
    it('allows students to fetch their notifications and mark as read', async () => {
      // Seed an in-app notification
      const notif = await Notification.create({
        userId: studentUserA._id,
        organizationId: orgA._id,
        type: 'JOB_PUBLISHED',
        title: 'New Campus Drive',
        message: 'TechCorp A has announced opportunities.',
        link: '/student/opportunities'
      });

      // 1. Get notifications
      const listRes = await request(app)
        .get('/api/v1/notifications')
        .set('Authorization', `Bearer ${studentTokenA}`);

      expect(listRes.status).toBe(200);
      expect(listRes.body.data.notifications.length).toBeGreaterThanOrEqual(1);

      // 2. Mark single as read
      const readRes = await request(app)
        .patch(`/api/v1/notifications/${notif._id}/read`)
        .set('Authorization', `Bearer ${studentTokenA}`);

      expect(readRes.status).toBe(200);
      expect(readRes.body.data.read).toBe(true);

      // 3. Mark all as read
      const readAllRes = await request(app)
        .patch('/api/v1/notifications/read-all')
        .set('Authorization', `Bearer ${studentTokenA}`);

      expect(readAllRes.status).toBe(200);
    });

    it('forbids marking another user notification as read (403)', async () => {
      const notifA = await Notification.create({
        userId: studentUserA._id,
        organizationId: orgA._id,
        type: 'JOB_PUBLISHED',
        title: 'Org A Notification',
        message: 'Confidential'
      });

      const res = await request(app)
        .patch(`/api/v1/notifications/${notifA._id}/read`)
        .set('Authorization', `Bearer ${studentTokenB}`);

      expect(res.status).toBe(403);
    });
  });
});
