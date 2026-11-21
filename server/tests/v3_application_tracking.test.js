import { jest } from '@jest/globals';
import request from 'supertest';
import app from '../src/app.js';
import { connectDB, disconnectDB } from '../src/config/db.js';
import {
  User,
  StudentProfile,
  Organization,
  OrganizationMembership,
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
  OPPORTUNITY_STATUSES,
  OPPORTUNITY_WORK_MODES,
  JOB_APPLICATION_STATUSES,
  JOB_APPLICATION_VERIFICATION
} from '../src/utils/constants.js';
import { signToken } from '../src/utils/token.js';

jest.setTimeout(30000);

describe('Chunk V5: Student Application Tracking & Staff Reporting Suite', () => {
  const ts = Date.now();

  let orgA, orgB;
  let coordinatorA, coordinatorAToken;
  let studentA, studentAToken, studentAProfile;
  let studentB, studentBToken, studentBProfile;
  let opportunityA, opportunityB;

  beforeAll(async () => {
    await connectDB();

    // 1. Create test organizations
    orgA = await Organization.create({
      name: `Track Org A ${ts}`,
      slug: `track-org-a-${ts}`,
      timezone: 'Asia/Kolkata',
      status: ORGANIZATION_STATUSES.ACTIVE
    });

    orgB = await Organization.create({
      name: `Track Org B ${ts}`,
      slug: `track-org-b-${ts}`,
      timezone: 'Asia/Kolkata',
      status: ORGANIZATION_STATUSES.ACTIVE
    });

    // 2. Create staff / coordinator for Org A
    coordinatorA = await User.create({
      name: 'Coordinator Alpha',
      email: `coord-track-${ts}@orga.edu`,
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

    // 3. Create Student A in Org A
    studentA = await User.create({
      name: 'Alice Student',
      email: `alice-track-${ts}@orga.edu`,
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
    studentAProfile = await StudentProfile.create({
      userId: studentA._id,
      organizationId: orgA._id,
      studentCode: `STU-ALICE-${ts}`,
      fullName: 'Alice Student',
      branch: 'Computer Science',
      graduationYear: 2025,
      cgpa: 8.5
    });
    studentAToken = signToken({ id: studentA._id, role: studentA.role });

    // 4. Create Student B in Org B
    studentB = await User.create({
      name: 'Bob Student',
      email: `bob-track-${ts}@orgb.edu`,
      password: 'Password123!',
      role: ROLES.STUDENT,
      status: USER_STATUSES.ACTIVE,
      organizationId: orgB._id
    });
    await OrganizationMembership.create({
      organizationId: orgB._id,
      userId: studentB._id,
      role: MEMBERSHIP_ROLES.STUDENT,
      status: MEMBERSHIP_STATUSES.ACTIVE
    });
    studentBProfile = await StudentProfile.create({
      userId: studentB._id,
      organizationId: orgB._id,
      studentCode: `STU-BOB-${ts}`,
      fullName: 'Bob Student',
      branch: 'Information Technology',
      graduationYear: 2025,
      cgpa: 7.9
    });
    studentBToken = signToken({ id: studentB._id, role: studentB.role });

    // 5. Create Job Opportunities in Org A and Org B
    opportunityA = await JobOpportunity.create({
      organizationId: orgA._id,
      companyName: 'CloudCorp Global',
      jobTitle: 'Cloud Engineer',
      description: 'Design distributed systems',
      location: 'Bangalore, India',
      workMode: OPPORTUNITY_WORK_MODES.HYBRID,
      applicationUrl: 'https://careers.cloudcorp.example.com/jobs/101',
      deadline: new Date(Date.now() + 14 * 86400000),
      status: OPPORTUNITY_STATUSES.PUBLISHED,
      sourceNote: 'Direct HR referral',
      lastVerifiedAt: new Date(),
      createdBy: coordinatorA._id
    });

    opportunityB = await JobOpportunity.create({
      organizationId: orgB._id,
      companyName: 'Fintech Nexus',
      jobTitle: 'Backend Dev',
      description: 'High throughput ledger systems',
      location: 'Mumbai, India',
      workMode: OPPORTUNITY_WORK_MODES.REMOTE,
      applicationUrl: 'https://careers.fintechnexus.example.com/apply',
      deadline: new Date(Date.now() + 10 * 86400000),
      status: OPPORTUNITY_STATUSES.PUBLISHED,
      sourceNote: 'Campus Placement Portal',
      lastVerifiedAt: new Date(),
      createdBy: studentB._id
    });

    // Ensure Mongoose unique indexes are initialized on MongoDB
    await JobApplication.init();
  });

  afterAll(async () => {
    await JobApplication.deleteMany({
      organizationId: { $in: [orgA._id, orgB._id] }
    });
    await JobOpportunity.deleteMany({
      _id: { $in: [opportunityA._id, opportunityB._id] }
    });
    await StudentProfile.deleteMany({
      _id: { $in: [studentAProfile._id, studentBProfile._id] }
    });
    await OrganizationMembership.deleteMany({
      organizationId: { $in: [orgA._id, orgB._id] }
    });
    await User.deleteMany({
      _id: { $in: [coordinatorA._id, studentA._id, studentB._id] }
    });
    await Organization.deleteMany({
      _id: { $in: [orgA._id, orgB._id] }
    });
    await disconnectDB();
  });

  describe('1. Model Constraints & Unique Index', () => {
    it('enforces compound uniqueness on (studentProfileId, jobOpportunityId)', async () => {
      await JobApplication.deleteMany({
        studentProfileId: studentAProfile._id,
        jobOpportunityId: opportunityA._id
      });

      const first = await JobApplication.create({
        organizationId: orgA._id,
        studentProfileId: studentAProfile._id,
        studentId: studentA._id,
        jobOpportunityId: opportunityA._id,
        status: JOB_APPLICATION_STATUSES.INTERESTED,
        verificationStatus: JOB_APPLICATION_VERIFICATION.UNVERIFIED,
        notes: 'Initial bookmark'
      });
      expect(first._id).toBeDefined();

      // Attempting to insert duplicate should throw duplicate key error
      let duplicateError;
      try {
        await JobApplication.create({
          organizationId: orgA._id,
          studentProfileId: studentAProfile._id,
          studentId: studentA._id,
          jobOpportunityId: opportunityA._id,
          status: JOB_APPLICATION_STATUSES.APPLIED,
          verificationStatus: JOB_APPLICATION_VERIFICATION.UNVERIFIED
        });
      } catch (err) {
        duplicateError = err;
      }
      expect(duplicateError).toBeDefined();
      expect(duplicateError.code).toBe(11000);

      // Clean up for route tests so downstream tests start clean
      await JobApplication.deleteMany({
        studentProfileId: studentAProfile._id,
        jobOpportunityId: opportunityA._id
      });
    });

    it('rejects notes exceeding 500 characters', async () => {
      const longNotes = 'a'.repeat(501);
      let error;
      try {
        await JobApplication.create({
          organizationId: orgA._id,
          studentProfileId: studentAProfile._id,
          studentId: studentA._id,
          jobOpportunityId: opportunityA._id,
          status: JOB_APPLICATION_STATUSES.APPLIED,
          notes: longNotes
        });
      } catch (err) {
        error = err;
      }
      expect(error).toBeDefined();
      expect(error.errors?.notes).toBeDefined();
    });
  });

  describe('2. Student Application Tracking Flow', () => {
    it('records an application click event (POST /opportunities/:id/application-link-click)', async () => {
      const res = await request(app)
        .post(`/api/v1/opportunities/${opportunityA._id}/application-link-click`)
        .set('Authorization', `Bearer ${studentAToken}`)
        .expect(200);

      expect(res.body.success).toBe(true);
      expect(res.body.data.clickCount).toBe(1);
      expect(res.body.data.opportunityUrl).toBe(opportunityA.applicationUrl);

      // Clicking again increments counter
      const res2 = await request(app)
        .post(`/api/v1/opportunities/${opportunityA._id}/application-link-click`)
        .set('Authorization', `Bearer ${studentAToken}`)
        .expect(200);

      expect(res2.body.data.clickCount).toBe(2);
    });

    it('upserts student application status to APPLIED with notes', async () => {
      const res = await request(app)
        .post(`/api/v1/opportunities/${opportunityA._id}/application-status`)
        .set('Authorization', `Bearer ${studentAToken}`)
        .send({
          status: JOB_APPLICATION_STATUSES.APPLIED,
          notes: 'Submitted via company career portal, received confirmation email'
        })
        .expect(200);

      expect(res.body.success).toBe(true);
      expect(res.body.data.status).toBe(JOB_APPLICATION_STATUSES.APPLIED);
      expect(res.body.data.verificationStatus).toBe(JOB_APPLICATION_VERIFICATION.UNVERIFIED);
      expect(res.body.data.notes).toContain('Submitted via company career portal');
      expect(res.body.data.statusHistory.length).toBeGreaterThanOrEqual(1);
    });

    it('updates status to WITHDRAWN and appends to statusHistory without creating duplicates', async () => {
      const res = await request(app)
        .post(`/api/v1/opportunities/${opportunityA._id}/application-status`)
        .set('Authorization', `Bearer ${studentAToken}`)
        .send({
          status: JOB_APPLICATION_STATUSES.WITHDRAWN,
          notes: 'Withdrawing as I accepted another offer'
        })
        .expect(200);

      expect(res.body.success).toBe(true);
      expect(res.body.data.status).toBe(JOB_APPLICATION_STATUSES.WITHDRAWN);
      expect(res.body.data.notes).toContain('Withdrawing as I accepted another offer');

      // Check status history in DB
      const appRecord = await JobApplication.findById(res.body.data._id);
      expect(appRecord.statusHistory.length).toBeGreaterThanOrEqual(2);
      expect(appRecord.statusHistory[appRecord.statusHistory.length - 1].status).toBe(
        JOB_APPLICATION_STATUSES.WITHDRAWN
      );

      // Verify no duplicate records exist for this student and opportunity
      const count = await JobApplication.countDocuments({
        studentProfileId: studentAProfile._id,
        jobOpportunityId: opportunityA._id
      });
      expect(count).toBe(1);

      // Return status back to APPLIED for downstream staff tests
      await request(app)
        .post(`/api/v1/opportunities/${opportunityA._id}/application-status`)
        .set('Authorization', `Bearer ${studentAToken}`)
        .send({
          status: JOB_APPLICATION_STATUSES.APPLIED,
          notes: 'Re-activated application record'
        })
        .expect(200);
    });

    it('allows student to fetch their own job applications (GET /students/me/job-applications)', async () => {
      const res = await request(app)
        .get('/api/v1/students/me/job-applications')
        .set('Authorization', `Bearer ${studentAToken}`)
        .expect(200);

      expect(res.body.success).toBe(true);
      expect(Array.isArray(res.body.data)).toBe(true);
      expect(res.body.data.length).toBe(1);
      expect(res.body.data[0].verificationStatus).toBe(JOB_APPLICATION_VERIFICATION.UNVERIFIED);
      expect(res.body.data[0].jobOpportunityId.companyName).toBe('CloudCorp Global');
    });

    it('enforces student isolation: Student B sees none of Student A applications', async () => {
      const res = await request(app)
        .get('/api/v1/students/me/job-applications')
        .set('Authorization', `Bearer ${studentBToken}`)
        .expect(200);

      expect(res.body.success).toBe(true);
      expect(res.body.data.length).toBe(0);
    });
  });

  describe('3. Staff Applications Reporting & Verification', () => {
    let applicationRecord;

    beforeAll(async () => {
      applicationRecord = await JobApplication.findOne({
        studentProfileId: studentAProfile._id,
        jobOpportunityId: opportunityA._id
      });
    });

    it('allows placement coordinator to fetch admin applications report with summary counts', async () => {
      const res = await request(app)
        .get('/api/v1/admin/applications')
        .set('Authorization', `Bearer ${coordinatorAToken}`)
        .expect(200);

      expect(res.body.success).toBe(true);
      expect(Array.isArray(res.body.data)).toBe(true);
      expect(res.body.data.length).toBe(1);
      expect(res.body.metadata.summary).toBeDefined();
      expect(res.body.metadata.summary.totalApplications).toBe(1);
      expect(res.body.metadata.summary.appliedCount).toBe(1);
      expect(res.body.metadata.summary.unverifiedCount).toBe(1);
      expect(res.body.metadata.summary.verifiedCount).toBe(0);
    });

    it('rejects verification if reason is missing', async () => {
      const res = await request(app)
        .patch(`/api/v1/admin/applications/${applicationRecord._id}/verification`)
        .set('Authorization', `Bearer ${coordinatorAToken}`)
        .send({
          verificationStatus: JOB_APPLICATION_VERIFICATION.VERIFIED,
          reason: ''
        })
        .expect(400);

      expect(res.body.success).toBe(false);
      expect(res.body.message).toContain('reason');
    });

    it('verifies application with audit logging when valid reason is provided', async () => {
      const res = await request(app)
        .patch(`/api/v1/admin/applications/${applicationRecord._id}/verification`)
        .set('Authorization', `Bearer ${coordinatorAToken}`)
        .send({
          verificationStatus: JOB_APPLICATION_VERIFICATION.VERIFIED,
          reason: 'Verified candidate interview invite with HR recruiter via official email confirmation'
        })
        .expect(200);

      expect(res.body.success).toBe(true);
      expect(res.body.data.verificationStatus).toBe(JOB_APPLICATION_VERIFICATION.VERIFIED);
      expect(res.body.data.verificationReason).toContain('Verified candidate interview invite');
      expect(res.body.data.verifiedBy).toBeDefined();
      expect(res.body.data.verifiedAt).toBeDefined();

      // Check AuditLog
      const audit = await AuditLog.findOne({
        action: 'JOB_APPLICATION_VERIFIED',
        entityId: applicationRecord._id
      });
      expect(audit).toBeDefined();
      expect(audit.actorId.toString()).toBe(coordinatorA._id.toString());
      expect(audit.metadata.verificationStatus).toBe(JOB_APPLICATION_VERIFICATION.VERIFIED);
      expect(audit.metadata.reason).toContain('Verified candidate interview invite');
    });

    it('blocks regular students from verifying applications', async () => {
      const res = await request(app)
        .patch(`/api/v1/admin/applications/${applicationRecord._id}/verification`)
        .set('Authorization', `Bearer ${studentAToken}`)
        .send({
          verificationStatus: JOB_APPLICATION_VERIFICATION.VERIFIED,
          reason: 'Attempted student self-verification'
        })
        .expect(403);

      expect(res.body.success).toBe(false);
    });
  });
});
