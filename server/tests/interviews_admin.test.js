import { jest } from '@jest/globals';
import request from 'supertest';
import app from '../src/app.js';
import { connectDB, disconnectDB } from '../src/config/db.js';
import {
  User,
  StudentProfile,
  RecruiterProfile,
  Job,
  Application,
  Interview,
  AuditLog
} from '../src/models/index.js';
import {
  ROLES,
  USER_STATUSES,
  RECRUITER_APPROVAL_STATUSES,
  JOB_STATUSES,
  APPLICATION_STATUSES,
  INTERVIEW_STATUSES
} from '../src/utils/constants.js';
import { signToken } from '../src/utils/token.js';

jest.setTimeout(30000);

describe('Interviews & Admin Moderation Suite (CHUNK 5)', () => {
  const timestamp = Date.now();

  let admin1, adminToken1;
  let admin2, adminToken2;
  let recruiter1, profile1, token1;
  let recruiter2, profile2, token2;
  let student1, studentProfile1, studentToken1;

  let jobId1;
  let applicationId1;
  let interviewId1;

  beforeAll(async () => {
    await connectDB();

    // Admin 1
    admin1 = await User.create({
      name: 'Admin Chief',
      email: `admin1_ch5_${timestamp}@hiretrack.test`,
      passwordHash: 'dummyhash',
      role: ROLES.ADMIN,
      accountStatus: USER_STATUSES.ACTIVE
    });
    adminToken1 = signToken({ id: admin1._id, role: admin1.role });

    // Admin 2
    admin2 = await User.create({
      name: 'Admin Deputy',
      email: `admin2_ch5_${timestamp}@hiretrack.test`,
      passwordHash: 'dummyhash',
      role: ROLES.ADMIN,
      accountStatus: USER_STATUSES.ACTIVE
    });
    adminToken2 = signToken({ id: admin2._id, role: admin2.role });

    // Recruiter 1
    recruiter1 = await User.create({
      name: 'Lead Recruiter 1',
      email: `rec1_ch5_${timestamp}@hiretrack.test`,
      passwordHash: 'dummyhash',
      role: ROLES.RECRUITER,
      accountStatus: USER_STATUSES.ACTIVE
    });
    profile1 = await RecruiterProfile.create({
      userId: recruiter1._id,
      companyName: `Oracle India ${timestamp}`,
      approvalStatus: RECRUITER_APPROVAL_STATUSES.APPROVED
    });
    token1 = signToken({ id: recruiter1._id, role: recruiter1.role });

    // Recruiter 2
    recruiter2 = await User.create({
      name: 'Lead Recruiter 2',
      email: `rec2_ch5_${timestamp}@hiretrack.test`,
      passwordHash: 'dummyhash',
      role: ROLES.RECRUITER,
      accountStatus: USER_STATUSES.ACTIVE
    });
    profile2 = await RecruiterProfile.create({
      userId: recruiter2._id,
      companyName: `Cisco Systems ${timestamp}`,
      approvalStatus: RECRUITER_APPROVAL_STATUSES.APPROVED
    });
    token2 = signToken({ id: recruiter2._id, role: recruiter2.role });

    // Student 1
    student1 = await User.create({
      name: 'Maya Candidate',
      email: `stu1_ch5_${timestamp}@hiretrack.test`,
      passwordHash: 'dummyhash',
      role: ROLES.STUDENT,
      accountStatus: USER_STATUSES.ACTIVE
    });
    studentProfile1 = await StudentProfile.create({
      userId: student1._id,
      studentId: `USN_CH5_${timestamp}`,
      branch: 'CSE',
      graduationYear: 2026,
      cgpa: 9.1,
      resume: {
        url: 'https://cloudinary.example.com/resumes/maya.pdf',
        publicId: 'resumes/maya_ch5',
        fileName: 'maya_resume.pdf',
        mimeType: 'application/pdf',
        size: 1024,
        uploadedAt: new Date()
      }
    });
    studentToken1 = signToken({ id: student1._id, role: student1.role });

    // Job
    const futureDate = new Date();
    futureDate.setDate(futureDate.getDate() + 15);
    const job = await Job.create({
      recruiterId: recruiter1._id,
      title: 'DevOps Engineer',
      companyName: profile1.companyName,
      description: 'CI/CD pipeline and cloud infrastructure monitoring.',
      location: 'Bengaluru',
      employmentType: 'full_time',
      applicationDeadline: futureDate,
      status: JOB_STATUSES.PUBLISHED
    });
    jobId1 = job._id.toString();

    // Application - initialized to shortlisted
    const app = await Application.create({
      jobId: job._id,
      studentId: student1._id,
      resumeSnapshot: { ...studentProfile1.resume },
      status: APPLICATION_STATUSES.SHORTLISTED,
      statusHistory: [
        {
          status: APPLICATION_STATUSES.APPLIED,
          changedBy: student1._id,
          note: 'Submitted',
          changedAt: new Date()
        },
        {
          status: APPLICATION_STATUSES.SHORTLISTED,
          changedBy: recruiter1._id,
          note: 'Profile shortlisted for technical round',
          changedAt: new Date()
        }
      ]
    });
    applicationId1 = app._id.toString();
  });

  afterAll(async () => {
    try {
      const userIds = [admin1?._id, admin2?._id, recruiter1?._id, recruiter2?._id, student1?._id].filter(Boolean);
      if (userIds.length > 0) {
        await User.deleteMany({ _id: { $in: userIds } });
      }
      if (studentProfile1?._id) {
        await StudentProfile.deleteMany({ _id: studentProfile1._id });
      }
      const profIds = [profile1?._id, profile2?._id].filter(Boolean);
      if (profIds.length > 0) {
        await RecruiterProfile.deleteMany({ _id: { $in: profIds } });
      }
      if (jobId1) {
        await Job.deleteMany({ _id: jobId1 });
      }
      if (applicationId1) {
        await Application.deleteMany({ _id: applicationId1 });
      }
      if (interviewId1) {
        await Interview.deleteMany({ _id: interviewId1 });
      }
      const adminIds = [admin1?._id, admin2?._id].filter(Boolean);
      if (adminIds.length > 0) {
        await AuditLog.deleteMany({ actorId: { $in: adminIds } });
      }
    } finally {
      await disconnectDB();
    }
  });

  // INT-01: Recruiter schedules interview for own applicant
  it('INT-01: should allow owning recruiter to schedule interview and update candidate status to interview_scheduled', async () => {
    const interviewDate = new Date();
    interviewDate.setDate(interviewDate.getDate() + 5);

    const res = await request(app)
      .post(`/api/v1/applications/${applicationId1}/interviews`)
      .set('Authorization', `Bearer ${token1}`)
      .send({
        scheduledAt: interviewDate.toISOString(),
        mode: 'online',
        locationOrLink: 'https://meet.google.com/xyz-abcd-uvw',
        notes: 'Technical coding round in Python/Node.js'
      });

    expect(res.statusCode).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.data.interview).toHaveProperty('id');
    expect(res.body.data.interview.mode).toBe('online');
    expect(res.body.data.interview.status).toBe(INTERVIEW_STATUSES.SCHEDULED);
    expect(res.body.data.application.status).toBe(APPLICATION_STATUSES.INTERVIEW_SCHEDULED);

    interviewId1 = res.body.data.interview.id;

    // Verify DB side effects
    const appDoc = await Application.findById(applicationId1);
    expect(appDoc.status).toBe(APPLICATION_STATUSES.INTERVIEW_SCHEDULED);
  });

  // INT-02: Unrelated recruiter attempts to schedule interview -> 403 Forbidden
  it("INT-02: should return 403 when unrelated recruiter attempts to schedule interview for another's applicant", async () => {
    const interviewDate = new Date();
    interviewDate.setDate(interviewDate.getDate() + 5);

    const res = await request(app)
      .post(`/api/v1/applications/${applicationId1}/interviews`)
      .set('Authorization', `Bearer ${token2}`) // Recruiter 2 calling
      .send({
        scheduledAt: interviewDate.toISOString(),
        mode: 'online',
        locationOrLink: 'https://meet.google.com/unauthorized'
      });

    expect(res.statusCode).toBe(403);
    expect(res.body.success).toBe(false);
  });

  // Unrelated recruiter attempts to cancel interview -> 403
  it("INT-02: should return 403 when unrelated recruiter attempts to cancel another recruiter's interview", async () => {
    const res = await request(app)
      .patch(`/api/v1/interviews/${interviewId1}/cancel`)
      .set('Authorization', `Bearer ${token2}`); // Recruiter 2

    expect(res.statusCode).toBe(403);
    expect(res.body.success).toBe(false);
  });

  // Owning recruiter cancels interview
  it('should allow owning recruiter to cancel interview', async () => {
    const res = await request(app)
      .patch(`/api/v1/interviews/${interviewId1}/cancel`)
      .set('Authorization', `Bearer ${token1}`);

    expect(res.statusCode).toBe(200);
    expect(res.body.data.status).toBe(INTERVIEW_STATUSES.CANCELLED);

    const intDoc = await Interview.findById(interviewId1);
    expect(intDoc.status).toBe(INTERVIEW_STATUSES.CANCELLED);
  });

  // ADM-01: Admin views overview with live DB counts
  it('ADM-01: should return live persisted counts from MongoDB for admin overview', async () => {
    const res = await request(app)
      .get('/api/v1/admin/overview')
      .set('Authorization', `Bearer ${adminToken1}`);

    expect(res.statusCode).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.students).toBeGreaterThanOrEqual(1);
    expect(res.body.data.approvedRecruiters).toBeGreaterThanOrEqual(2);
    expect(res.body.data.activeJobs).toBeGreaterThanOrEqual(1);
    expect(res.body.data.applications).toBeGreaterThanOrEqual(1);
    expect(res.body.data.statusBreakdown).toHaveProperty(APPLICATION_STATUSES.INTERVIEW_SCHEDULED);
  });

  // ADM-02: Non-admin accesses admin overview -> 403
  it('ADM-02: should return 403 when student or recruiter attempts to access admin overview', async () => {
    const studentRes = await request(app)
      .get('/api/v1/admin/overview')
      .set('Authorization', `Bearer ${studentToken1}`);

    expect(studentRes.statusCode).toBe(403);

    const recruiterRes = await request(app)
      .get('/api/v1/admin/overview')
      .set('Authorization', `Bearer ${token1}`);

    expect(recruiterRes.statusCode).toBe(403);
  });

  // AUTH-06 on every admin route
  it('AUTH-06: should strictly reject student access on every admin endpoint with 403', async () => {
    const routes = [
      { method: 'get', url: '/api/v1/admin/overview' },
      { method: 'get', url: '/api/v1/admin/recruiters/pending' },
      { method: 'patch', url: `/api/v1/admin/recruiters/${profile1._id}/approval` },
      { method: 'get', url: '/api/v1/admin/users' },
      { method: 'patch', url: `/api/v1/admin/users/${student1._id}/status` },
      { method: 'get', url: '/api/v1/admin/jobs' },
      { method: 'patch', url: `/api/v1/admin/jobs/${jobId1}/status` }
    ];

    for (const route of routes) {
      const res = await request(app)[route.method](route.url)
        .set('Authorization', `Bearer ${studentToken1}`)
        .send({ accountStatus: 'suspended', approvalStatus: 'approved', status: 'closed' });

      expect(res.statusCode).toBe(403);
      expect(res.body.success).toBe(false);
    }
  });

  // Admin user moderation: admin suspends student and writes AuditLog
  it('should allow admin to suspend student account and write AuditLog entry', async () => {
    const res = await request(app)
      .patch(`/api/v1/admin/users/${student1._id}/status`)
      .set('Authorization', `Bearer ${adminToken1}`)
      .send({ accountStatus: USER_STATUSES.SUSPENDED });

    expect(res.statusCode).toBe(200);
    expect(res.body.data.accountStatus).toBe(USER_STATUSES.SUSPENDED);

    // Verify DB
    const studentDoc = await User.findById(student1._id);
    expect(studentDoc.accountStatus).toBe(USER_STATUSES.SUSPENDED);

    // Verify AuditLog written
    const auditDoc = await AuditLog.findOne({
      actorId: admin1._id,
      action: 'UPDATE_USER_STATUS',
      resourceId: student1._id
    });
    expect(auditDoc).not.toBeNull();
    expect(auditDoc.metadata.newStatus).toBe(USER_STATUSES.SUSPENDED);
    expect(auditDoc.metadata.password).toBeUndefined();
  });

  // Admin self-suspension guard
  it('should prevent admin from suspending their own account with 400', async () => {
    const res = await request(app)
      .patch(`/api/v1/admin/users/${admin1._id}/status`)
      .set('Authorization', `Bearer ${adminToken1}`)
      .send({ accountStatus: USER_STATUSES.SUSPENDED });

    expect(res.statusCode).toBe(400);
    expect(res.body.message).toMatch(/cannot modify their own/i);
  });

  // Admin cannot suspend another admin guard
  it('should prevent admin from suspending another administrator with 403', async () => {
    const res = await request(app)
      .patch(`/api/v1/admin/users/${admin2._id}/status`)
      .set('Authorization', `Bearer ${adminToken1}`)
      .send({ accountStatus: USER_STATUSES.SUSPENDED });

    expect(res.statusCode).toBe(403);
    expect(res.body.message).toMatch(/cannot modify account status of another administrator/i);
  });

  // Admin job moderation: admin closes job and writes AuditLog
  it('should allow admin to moderate job status and write AuditLog', async () => {
    const res = await request(app)
      .patch(`/api/v1/admin/jobs/${jobId1}/status`)
      .set('Authorization', `Bearer ${adminToken1}`)
      .send({ status: JOB_STATUSES.CLOSED });

    expect(res.statusCode).toBe(200);
    expect(res.body.data.status).toBe(JOB_STATUSES.CLOSED);

    // Verify DB
    const jobDoc = await Job.findById(jobId1);
    expect(jobDoc.status).toBe(JOB_STATUSES.CLOSED);

    // Verify AuditLog
    const auditDoc = await AuditLog.findOne({
      actorId: admin1._id,
      action: 'UPDATE_JOB_STATUS',
      resourceId: jobDoc._id
    });
    expect(auditDoc).not.toBeNull();
    expect(auditDoc.metadata.newStatus).toBe(JOB_STATUSES.CLOSED);
  });
});
