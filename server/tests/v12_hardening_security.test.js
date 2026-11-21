import { jest } from '@jest/globals';
import request from 'supertest';
import mongoose from 'mongoose';
import app from '../src/app.js';
import { connectDB, disconnectDB } from '../src/config/db.js';
import {
  User,
  Organization,
  OrganizationMembership,
  StudentProfile,
  JobOpportunity,
  JobApplication,
  TestCategory,
  QuestionBank,
  Question,
  MockTest,
  MockTestAttempt,
  MockTestAnswer,
  InterviewTrack,
  InterviewerProfile,
  HumanMockInterviewSlot,
  HumanMockInterviewBooking,
  AmbassadorCampaign,
  AmbassadorProfile,
  AmbassadorReferralCode,
  ReferredParticipant,
  AuditLog,
  InstitutePolicy
} from '../src/models/index.js';
import {
  ROLES,
  USER_STATUSES,
  MEMBERSHIP_ROLES,
  OPPORTUNITY_STATUSES,
  MOCK_TEST_STATUSES,
  QUESTION_TYPES,
  AMBASSADOR_PROFILE_STATUSES
} from '../src/utils/constants.js';
import { signToken } from '../src/utils/token.js';
import { sanitizeAuditMetadata, isSensitiveAuditKey } from '../src/services/audit.service.js';
import { exportStudentData } from '../src/services/student.service.js';
import { runRetentionMaintenance } from '../src/scripts/privacyRetention.js';
import { runPerformanceAudit } from '../src/scripts/performanceCheck.js';
import { createBackup, restoreBackup } from '../src/scripts/backupRestore.js';
import fs from 'fs';
import path from 'path';

jest.setTimeout(60000);

describe('Chunk V12: Hardening, Security, Authorization Audit & Privacy Suite', () => {
  let orgA, orgB;
  let adminA, staffA, studentA1, studentA2, interviewerA1, interviewerA2;
  let tokenAdminA, tokenStaffA, tokenStudentA1, tokenStudentA2, tokenInterviewerA1, tokenInterviewerA2;
  let profileA1, profileA2, oppA, testA, attemptA1;
  let adminB, studentB, tokenStudentB, oppB, testB;

  beforeAll(async () => {
    await connectDB();
  });

  afterAll(async () => {
    await disconnectDB();
  });

  beforeEach(async () => {
    await mongoose.connection.dropDatabase();

    // Org A
    orgA = await Organization.create({
      name: 'College Alpha',
      slug: 'college-alpha',
      status: 'active',
      timezone: 'Asia/Kolkata'
    });

    // Org B
    orgB = await Organization.create({
      name: 'College Beta',
      slug: 'college-beta',
      status: 'active',
      timezone: 'Asia/Kolkata'
    });

    // Users Org A
    adminA = await User.create({
      name: 'Admin Alpha',
      email: 'admin@alpha.edu',
      passwordHash: 'hash',
      role: ROLES.ADMIN,
      accountStatus: USER_STATUSES.ACTIVE,
      organizationId: orgA._id
    });
    await OrganizationMembership.create({
      organizationId: orgA._id,
      userId: adminA._id,
      role: MEMBERSHIP_ROLES.ORG_ADMIN,
      status: 'active'
    });
    tokenAdminA = signToken({ id: adminA._id, role: adminA.role });

    staffA = await User.create({
      name: 'Staff Alpha',
      email: 'staff@alpha.edu',
      passwordHash: 'hash',
      role: ROLES.ADMIN,
      accountStatus: USER_STATUSES.ACTIVE,
      organizationId: orgA._id
    });
    await OrganizationMembership.create({
      organizationId: orgA._id,
      userId: staffA._id,
      role: MEMBERSHIP_ROLES.PLACEMENT_COORDINATOR,
      status: 'active'
    });
    tokenStaffA = signToken({ id: staffA._id, role: staffA.role });

    studentA1 = await User.create({
      name: 'Alice Student',
      email: 'alice@alpha.edu',
      passwordHash: 'hash',
      role: ROLES.STUDENT,
      accountStatus: USER_STATUSES.ACTIVE,
      organizationId: orgA._id
    });
    await OrganizationMembership.create({
      organizationId: orgA._id,
      userId: studentA1._id,
      role: MEMBERSHIP_ROLES.STUDENT,
      status: 'active'
    });
    tokenStudentA1 = signToken({ id: studentA1._id, role: studentA1.role });

    profileA1 = await StudentProfile.create({
      organizationId: orgA._id,
      userId: studentA1._id,
      studentId: 'ALP001',
      studentCode: 'ALP001',
      branch: 'Computer Science',
      degree: 'B.Tech',
      cohort: '2022-2026',
      graduationYear: 2026,
      cgpa: 8.8,
      verificationStatus: 'verified'
    });

    studentA2 = await User.create({
      name: 'Bob Student',
      email: 'bob@alpha.edu',
      passwordHash: 'hash',
      role: ROLES.STUDENT,
      accountStatus: USER_STATUSES.ACTIVE,
      organizationId: orgA._id
    });
    await OrganizationMembership.create({
      organizationId: orgA._id,
      userId: studentA2._id,
      role: MEMBERSHIP_ROLES.STUDENT,
      status: 'active'
    });
    tokenStudentA2 = signToken({ id: studentA2._id, role: studentA2.role });

    profileA2 = await StudentProfile.create({
      organizationId: orgA._id,
      userId: studentA2._id,
      studentId: 'ALP002',
      studentCode: 'ALP002',
      branch: 'Information Science',
      degree: 'B.Tech',
      cohort: '2022-2026',
      graduationYear: 2026,
      cgpa: 8.2,
      verificationStatus: 'verified'
    });

    interviewerA1 = await User.create({
      name: 'Dr. Inter A1',
      email: 'inta1@alpha.edu',
      passwordHash: 'hash',
      role: ROLES.ADMIN,
      accountStatus: USER_STATUSES.ACTIVE,
      organizationId: orgA._id
    });
    await OrganizationMembership.create({
      organizationId: orgA._id,
      userId: interviewerA1._id,
      role: MEMBERSHIP_ROLES.INTERVIEWER,
      status: 'active'
    });
    tokenInterviewerA1 = signToken({ id: interviewerA1._id, role: interviewerA1.role });

    interviewerA2 = await User.create({
      name: 'Dr. Inter A2',
      email: 'inta2@alpha.edu',
      passwordHash: 'hash',
      role: ROLES.ADMIN,
      accountStatus: USER_STATUSES.ACTIVE,
      organizationId: orgA._id
    });
    await OrganizationMembership.create({
      organizationId: orgA._id,
      userId: interviewerA2._id,
      role: MEMBERSHIP_ROLES.INTERVIEWER,
      status: 'active'
    });
    tokenInterviewerA2 = signToken({ id: interviewerA2._id, role: interviewerA2.role });

    // Org B Users
    adminB = await User.create({
      name: 'Admin Beta',
      email: 'admin@beta.edu',
      passwordHash: 'hash',
      role: ROLES.ADMIN,
      accountStatus: USER_STATUSES.ACTIVE,
      organizationId: orgB._id
    });
    await OrganizationMembership.create({
      organizationId: orgB._id,
      userId: adminB._id,
      role: MEMBERSHIP_ROLES.ORG_ADMIN,
      status: 'active'
    });

    studentB = await User.create({
      name: 'Carol Beta',
      email: 'carol@beta.edu',
      passwordHash: 'hash',
      role: ROLES.STUDENT,
      accountStatus: USER_STATUSES.ACTIVE,
      organizationId: orgB._id
    });
    await OrganizationMembership.create({
      organizationId: orgB._id,
      userId: studentB._id,
      role: MEMBERSHIP_ROLES.STUDENT,
      status: 'active'
    });
    tokenStudentB = signToken({ id: studentB._id, role: studentB.role });

    // Opportunities
    oppA = await JobOpportunity.create({
      organizationId: orgA._id,
      jobTitle: 'Alpha Engineer',
      companyName: 'Alpha Corp',
      description: 'Alpha engineering job',
      location: 'Bengaluru',
      applicationUrl: 'https://alpha.example/apply',
      status: OPPORTUNITY_STATUSES.PUBLISHED,
      deadline: new Date(Date.now() + 86400000),
      createdBy: staffA._id
    });

    oppB = await JobOpportunity.create({
      organizationId: orgB._id,
      jobTitle: 'Beta Engineer',
      companyName: 'Beta Corp',
      description: 'Beta engineering job',
      location: 'Hyderabad',
      applicationUrl: 'https://beta.example/apply',
      status: OPPORTUNITY_STATUSES.PUBLISHED,
      deadline: new Date(Date.now() + 86400000),
      createdBy: adminB._id
    });

    // Mock Tests
    const catA = await TestCategory.create({
      organizationId: orgA._id,
      name: 'Category A',
      slug: 'cat-a'
    });
    const bankA = await QuestionBank.create({
      organizationId: orgA._id,
      categoryId: catA._id,
      name: 'Bank A'
    });
    const qA = await Question.create({
      organizationId: orgA._id,
      bankId: bankA._id,
      type: QUESTION_TYPES.SINGLE_CHOICE,
      prompt: 'What is 2+2?',
      options: [
        { optionId: 'opt_1', text: '3' },
        { optionId: 'opt_2', text: '4' }
      ],
      answerKey: ['opt_2'],
      explanation: 'Basic math',
      difficulty: 'MEDIUM',
      topicTags: ['Math']
    });

    testA = await MockTest.create({
      organizationId: orgA._id,
      categoryId: catA._id,
      title: 'Mock Test Alpha',
      durationMinutes: 15,
      questionSelectionConfig: [{ questionBankId: bankA._id, count: 1 }],
      status: MOCK_TEST_STATUSES.PUBLISHED,
      version: 1,
      createdBy: staffA._id
    });

    attemptA1 = await MockTestAttempt.create({
      organizationId: orgA._id,
      mockTestId: testA._id,
      studentId: studentA1._id,
      studentProfileId: profileA1._id,
      testVersion: 1,
      startedAt: new Date(),
      deadlineAt: new Date(Date.now() + 900000),
      status: 'IN_PROGRESS',
      questionOrder: [qA._id]
    });
  });

  describe('1. Cross-Organization Isolation Negatives', () => {
    it('returns 404 when student in Org B attempts to access Org A opportunity', async () => {
      const res = await request(app)
        .get(`/api/v1/opportunities/${oppA._id}`)
        .set('Authorization', `Bearer ${tokenStudentB}`);

      expect([403, 404]).toContain(res.status);
    });

    it('returns 404 when student in Org B attempts to access Org A mock test', async () => {
      const res = await request(app)
        .get(`/api/v1/mock-tests/${testA._id}`)
        .set('Authorization', `Bearer ${tokenStudentB}`);

      expect([403, 404]).toContain(res.status);
    });

    it('returns only own organization opportunities in opportunity list', async () => {
      const resA = await request(app)
        .get('/api/v1/opportunities')
        .set('Authorization', `Bearer ${tokenStudentA1}`);

      expect(resA.status).toBe(200);
      const itemsA = resA.body.data.items || resA.body.data;
      expect(itemsA.some((item) => (item.jobTitle || item.title) === 'Alpha Engineer')).toBe(true);
      expect(itemsA.some((item) => (item.jobTitle || item.title) === 'Beta Engineer')).toBe(false);
    });
  });

  describe('2. Cross-Student Ownership Negatives', () => {
    it('returns 403 or 404 when Student A2 attempts to view Student A1 mock test attempt', async () => {
      const res = await request(app)
        .get(`/api/v1/mock-test-attempts/${attemptA1._id}`)
        .set('Authorization', `Bearer ${tokenStudentA2}`);

      expect([403, 404]).toContain(res.status);
    });

    it('returns 403 or 404 when Student A2 attempts to save answer on Student A1 attempt', async () => {
      const dummyQId = new mongoose.Types.ObjectId();
      const res = await request(app)
        .put(`/api/v1/mock-test-attempts/${attemptA1._id}/answers/${dummyQId}`)
        .set('Authorization', `Bearer ${tokenStudentA2}`)
        .send({ selectedOptions: ['opt_1'] });

      expect([403, 404]).toContain(res.status);
    });

    it('strictly isolates student self-reported applications to requester', async () => {
      await JobApplication.create({
        organizationId: orgA._id,
        studentId: studentA1._id,
        studentProfileId: profileA1._id,
        jobOpportunityId: oppA._id,
        status: 'APPLIED',
        verificationStatus: 'UNVERIFIED',
        applicationDate: new Date()
      });

      const res = await request(app)
        .get('/api/v1/students/me/job-applications')
        .set('Authorization', `Bearer ${tokenStudentA2}`);

      expect(res.status).toBe(200);
      const apps = res.body.data.items || res.body.data;
      expect(apps.length).toBe(0);
    });
  });

  describe('3. Interviewer Assignment & Anti-Self-Verification Negatives', () => {
    it('prevents unassigned interviewer from evaluating a booking', async () => {
      const p1 = await InterviewerProfile.create({
        organizationId: orgA._id,
        userId: interviewerA1._id,
        expertise: ['Backend']
      });
      const p2 = await InterviewerProfile.create({
        organizationId: orgA._id,
        userId: interviewerA2._id,
        expertise: ['Frontend']
      });

      const slot = await HumanMockInterviewSlot.create({
        organizationId: orgA._id,
        interviewerProfileId: p1._id,
        startsAt: new Date(),
        endsAt: new Date(Date.now() + 3600000),
        status: 'BOOKED'
      });

      const booking = await HumanMockInterviewBooking.create({
        organizationId: orgA._id,
        slotId: slot._id,
        studentUserId: studentA1._id,
        studentProfileId: profileA1._id,
        status: 'SCHEDULED'
      });

      // Interviewer A2 attempts to evaluate Interviewer A1's booking
      const res = await request(app)
        .post(`/api/v1/interviewer/bookings/${booking._id}/evaluation`)
        .set('Authorization', `Bearer ${tokenInterviewerA2}`)
        .send({
          rubricScores: [{ dimension: 'Tech', score: 80 }],
          strengths: 'Good',
          improvementAreas: 'Practice',
          overallFeedback: 'Pass'
        });

      expect([403, 404]).toContain(res.status);
    });
  });

  describe('4. Ambassador PII Masking & Anti-Self-Approval Negatives', () => {
    it('masks participant PII in ambassador referral listings', async () => {
      const ambProfile = await AmbassadorProfile.create({
        organizationId: orgA._id,
        studentProfileId: profileA1._id,
        userId: studentA1._id,
        status: AMBASSADOR_PROFILE_STATUSES.APPROVED
      });

      const campaign = await AmbassadorCampaign.create({
        organizationId: orgA._id,
        name: 'Camp 1',
        targetCount: 5,
        startsAt: new Date(),
        endsAt: new Date(Date.now() + 86400000),
        createdBy: adminA._id
      });

      const code = await AmbassadorReferralCode.create({
        organizationId: orgA._id,
        ambassadorProfileId: ambProfile._id,
        campaignId: campaign._id,
        code: 'HT-TEST123',
        active: true
      });

      await ReferredParticipant.create({
        organizationId: orgA._id,
        campaignId: campaign._id,
        codeId: code._id,
        ambassadorProfileId: ambProfile._id,
        name: 'Secret Person',
        email: 'secret.person@example.com',
        phone: '9876543210',
        institute: 'College Alpha',
        dedupeKey: 'key_1',
        verificationStatus: 'PENDING'
      });

      const res = await request(app)
        .get('/api/v1/students/me/ambassador/referrals')
        .set('Authorization', `Bearer ${tokenStudentA1}`);

      expect(res.status).toBe(200);
      const items = res.body.data.referrals || res.body.data;
      expect(items.length).toBe(1);
      // Verify raw PII is stripped and masked fields are provided
      expect(items[0].email).toBeUndefined();
      expect(items[0].phone).toBeUndefined();
      expect(items[0].maskedEmail).toContain('***');
      expect(items[0].maskedPhone).toContain('***');
      expect(items[0].maskedName).toContain('*');
    });
  });

  describe('5. Audit Log Sanitization & Sensitive Data Scrubbing', () => {
    it('detects sensitive keys correctly', () => {
      expect(isSensitiveAuditKey('password')).toBe(true);
      expect(isSensitiveAuditKey('jwtToken')).toBe(true);
      expect(isSensitiveAuditKey('answerKey')).toBe(true);
      expect(isSensitiveAuditKey('studentTranscript')).toBe(true);
      expect(isSensitiveAuditKey('resumeUrl')).toBe(true);
      expect(isSensitiveAuditKey('safeMeta')).toBe(false);
    });

    it('recursively scrubs sensitive fields from audit metadata', () => {
      const dirty = {
        studentId: '123',
        password: 'plain_password',
        token: 'secret_jwt',
        nested: {
          answerKey: ['opt_1'],
          safeField: 'okay',
          deep: {
            resumeBuffer: 'binary',
            transcriptText: 'turns'
          }
        }
      };

      const clean = sanitizeAuditMetadata(dirty);
      expect(clean.studentId).toBe('123');
      expect(clean.password).toBeUndefined();
      expect(clean.token).toBeUndefined();
      expect(clean.nested.answerKey).toBeUndefined();
      expect(clean.nested.safeField).toBe('okay');
      expect(clean.nested.deep.resumeBuffer).toBeUndefined();
      expect(clean.nested.deep.transcriptText).toBeUndefined();
    });
  });

  describe('6. Data Privacy & Portability (Export & Retention)', () => {
    it('allows student to export their own personal data package', async () => {
      const res = await request(app)
        .get('/api/v1/students/me/data-export')
        .set('Authorization', `Bearer ${tokenStudentA1}`);

      expect(res.status).toBe(200);
      expect(res.body.data.user.email).toBe('alice@alpha.edu');
      expect(res.body.data.user.passwordHash).toBeUndefined();
      expect(res.body.data.profile.studentCode).toBe('ALP001');
      expect(res.body.data.exportedAt).toBeDefined();
    });

    it('runs retention maintenance in dry-run mode without deleting records', async () => {
      const report = await runRetentionMaintenance({ dryRun: true });
      expect(report.dryRun).toBe(true);
      expect(report.organizationsScanned).toBeGreaterThanOrEqual(1);
    });

    it('retrieves and updates data retention policy via admin endpoints', async () => {
      const getRes = await request(app)
        .get('/api/v1/admin/policies/retention')
        .set('Authorization', `Bearer ${tokenAdminA}`);

      expect(getRes.status).toBe(200);
      expect(getRes.body.data.value.profileRetentionDays).toBeDefined();

      const patchRes = await request(app)
        .patch('/api/v1/admin/policies/retention')
        .set('Authorization', `Bearer ${tokenAdminA}`)
        .send({
          interviewTranscriptRetentionDays: 60,
          assessmentAttemptRetentionDays: 120
        });

      expect(patchRes.status).toBe(200);
      expect(patchRes.body.data.value.interviewTranscriptRetentionDays).toBe(60);
      expect(patchRes.body.data.value.assessmentAttemptRetentionDays).toBe(120);
    });
  });

  describe('7. Performance Audit & Index Coverage', () => {
    it('executes performance audit and validates query indexes', async () => {
      const perfResults = await runPerformanceAudit();
      expect(perfResults.length).toBeGreaterThan(0);
      perfResults.forEach((r) => {
        expect(r.target).toBeDefined();
      });
    });
  });

  describe('8. Backup and Restore Lifecycle', () => {
    it('creates snapshot backup and verifies restore dry-run integrity', async () => {
      const tempBackupDir = path.resolve('test-backup-dir');
      const backupResult = await createBackup({ backupDir: tempBackupDir });
      expect(backupResult.manifest).toBeDefined();
      expect(backupResult.manifest.schemaVersion).toBe('v3.0.0');

      const restoreResult = await restoreBackup({ backupDir: tempBackupDir, dryRun: true });
      expect(restoreResult.dryRun).toBe(true);
      expect(restoreResult.collections.User).toBeDefined();
      expect(restoreResult.collections.User.status).toBe('VERIFIED_VALID');

      // Cleanup temp test dir
      if (fs.existsSync(tempBackupDir)) {
        fs.rmSync(tempBackupDir, { recursive: true, force: true });
      }
    });
  });
});
