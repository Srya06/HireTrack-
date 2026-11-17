import { jest } from '@jest/globals';
import request from 'supertest';
import app from '../src/app.js';
import { connectDB, disconnectDB } from '../src/config/db.js';
import { User, RecruiterProfile, Job } from '../src/models/index.js';
import { ROLES, USER_STATUSES, RECRUITER_APPROVAL_STATUSES, JOB_STATUSES } from '../src/utils/constants.js';
import { signToken } from '../src/utils/token.js';

jest.setTimeout(30000);

describe('Recruiter Approval & Jobs Suite (CHUNK 3)', () => {
  const timestamp = Date.now();

  let adminUser, adminToken;
  let recruiter1, profile1, token1; // will start pending
  let recruiter2, profile2, token2; // will start pending, then approved
  let createdJobId;

  beforeAll(async () => {
    await connectDB();

    // Create Admin
    adminUser = await User.create({
      name: 'Admin User',
      email: `admin_${timestamp}@hiretrack.test`,
      passwordHash: 'dummyhash',
      role: ROLES.ADMIN,
      accountStatus: USER_STATUSES.ACTIVE
    });
    adminToken = signToken({ id: adminUser._id, role: adminUser.role });

    // Create Recruiter 1 (pending)
    recruiter1 = await User.create({
      name: 'Recruiter One',
      email: `recruiter1_${timestamp}@hiretrack.test`,
      passwordHash: 'dummyhash',
      role: ROLES.RECRUITER,
      accountStatus: USER_STATUSES.PENDING
    });
    profile1 = await RecruiterProfile.create({
      userId: recruiter1._id,
      companyName: `Innovatech ${timestamp}`,
      approvalStatus: RECRUITER_APPROVAL_STATUSES.PENDING
    });
    token1 = signToken({ id: recruiter1._id, role: recruiter1.role });

    // Create Recruiter 2 (pending)
    recruiter2 = await User.create({
      name: 'Recruiter Two',
      email: `recruiter2_${timestamp}@hiretrack.test`,
      passwordHash: 'dummyhash',
      role: ROLES.RECRUITER,
      accountStatus: USER_STATUSES.PENDING
    });
    profile2 = await RecruiterProfile.create({
      userId: recruiter2._id,
      companyName: `Nexus Labs ${timestamp}`,
      approvalStatus: RECRUITER_APPROVAL_STATUSES.PENDING
    });
    token2 = signToken({ id: recruiter2._id, role: recruiter2.role });
  });

  afterAll(async () => {
    await User.deleteMany({ _id: { $in: [adminUser._id, recruiter1._id, recruiter2._id] } });
    await RecruiterProfile.deleteMany({ _id: { $in: [profile1._id, profile2._id] } });
    await Job.deleteMany({ recruiterId: { $in: [recruiter1._id, recruiter2._id] } });
    await disconnectDB();
  });

  // REC-01: Pending recruiter creates/publishes job -> 403 Forbidden
  it('REC-01: should return 403 when pending recruiter attempts to create a job', async () => {
    const futureDate = new Date();
    futureDate.setDate(futureDate.getDate() + 14);

    const res = await request(app)
      .post('/api/v1/jobs')
      .set('Authorization', `Bearer ${token1}`)
      .send({
        title: 'Backend Intern',
        description: 'Build backend APIs with Express and Node.js.',
        location: 'Bengaluru',
        employmentType: 'internship',
        applicationDeadline: futureDate.toISOString()
      });

    expect(res.statusCode).toBe(403);
    expect(res.body.success).toBe(false);
    expect(res.body.message).toMatch(/only administrator-approved recruiters can create jobs|pending/i);

    // Verify DB side effects: NO job was created
    const count = await Job.countDocuments({ recruiterId: recruiter1._id });
    expect(count).toBe(0);
  });

  // Admin lists pending recruiters
  it('should list pending recruiters for admin with pagination', async () => {
    const res = await request(app)
      .get('/api/v1/admin/recruiters/pending?page=1&limit=10')
      .set('Authorization', `Bearer ${adminToken}`);

    expect(res.statusCode).toBe(200);
    expect(res.body.success).toBe(true);
    expect(Array.isArray(res.body.data)).toBe(true);
    expect(res.body.pagination).toHaveProperty('page', 1);
    expect(res.body.pagination).toHaveProperty('total');

    const found = res.body.data.some((r) => r.id === profile2._id.toString());
    expect(found).toBe(true);
  });

  // REC-02: Admin approves recruiter -> status updated to approved & active
  it('REC-02: should allow admin to approve recruiter and sync user accountStatus to active', async () => {
    const res = await request(app)
      .patch(`/api/v1/admin/recruiters/${profile2._id}/approval`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ approvalStatus: 'approved' });

    expect(res.statusCode).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.recruiter.approvalStatus).toBe(RECRUITER_APPROVAL_STATUSES.APPROVED);
    expect(res.body.data.recruiter.reviewedBy).toBe(adminUser._id.toString());
    expect(res.body.data.user.accountStatus).toBe(USER_STATUSES.ACTIVE);

    // Verify DB side effects directly
    const updatedProfile = await RecruiterProfile.findById(profile2._id);
    expect(updatedProfile.approvalStatus).toBe(RECRUITER_APPROVAL_STATUSES.APPROVED);
    expect(updatedProfile.reviewedBy.toString()).toBe(adminUser._id.toString());
    expect(updatedProfile.reviewedAt).not.toBeNull();

    const updatedUser = await User.findById(recruiter2._id);
    expect(updatedUser.accountStatus).toBe(USER_STATUSES.ACTIVE);
  });

  // JOB-01: Approved recruiter creates valid job
  it('JOB-01: should allow approved recruiter to create a valid job', async () => {
    const futureDate = new Date();
    futureDate.setDate(futureDate.getDate() + 30);

    const res = await request(app)
      .post('/api/v1/jobs')
      .set('Authorization', `Bearer ${token2}`) // Recruiter 2 is now approved
      .send({
        title: 'Full Stack Engineer',
        description: 'Design and develop scalable web applications using MERN stack.',
        location: 'Remote',
        employmentType: 'full_time',
        ctc: '6-9 LPA',
        minCgpa: 7.5,
        eligibleBranches: ['CSE', 'ISE', 'ECE'],
        eligibleGraduationYears: [2026, 2027],
        requiredSkills: ['JavaScript', 'React', 'MongoDB'],
        applicationDeadline: futureDate.toISOString(),
        status: 'draft'
      });

    expect(res.statusCode).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.data.title).toBe('Full Stack Engineer');
    expect(res.body.data.recruiterId).toBe(recruiter2._id.toString());
    expect(res.body.data.companyName).toBe(profile2.companyName);
    expect(res.body.data.minCgpa).toBe(7.5);
    expect(res.body.data.status).toBe(JOB_STATUSES.DRAFT);

    createdJobId = res.body.data.id;

    // Verify DB side effects
    const savedJob = await Job.findById(createdJobId);
    expect(savedJob).not.toBeNull();
    expect(savedJob.title).toBe('Full Stack Engineer');
  });

  // GET /jobs/mine lists recruiter's jobs
  it('GET /jobs/mine: should return only the authenticated recruiter jobs', async () => {
    const res = await request(app)
      .get('/api/v1/jobs/mine')
      .set('Authorization', `Bearer ${token2}`);

    expect(res.statusCode).toBe(200);
    expect(res.body.success).toBe(true);
    expect(Array.isArray(res.body.data)).toBe(true);
    expect(res.body.data.length).toBeGreaterThanOrEqual(1);
    expect(res.body.data[0].id).toBe(createdJobId);
  });

  // Approved recruiter publishes own job
  it('should allow approved recruiter to publish their draft job', async () => {
    const res = await request(app)
      .patch(`/api/v1/jobs/${createdJobId}/publish`)
      .set('Authorization', `Bearer ${token2}`);

    expect(res.statusCode).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.status).toBe(JOB_STATUSES.PUBLISHED);

    // Verify DB
    const checkJob = await Job.findById(createdJobId);
    expect(checkJob.status).toBe(JOB_STATUSES.PUBLISHED);
  });

  // JOB-02: Recruiter edits another recruiter's job -> 403 Forbidden
  it("JOB-02: should return 403 when recruiter attempts to edit another recruiter's job and prevent DB mutation", async () => {
    // First, approve Recruiter 1 as well so both are approved recruiters
    await RecruiterProfile.findByIdAndUpdate(profile1._id, {
      approvalStatus: RECRUITER_APPROVAL_STATUSES.APPROVED
    });
    await User.findByIdAndUpdate(recruiter1._id, {
      accountStatus: USER_STATUSES.ACTIVE
    });

    const res = await request(app)
      .patch(`/api/v1/jobs/${createdJobId}`) // Job belongs to Recruiter 2
      .set('Authorization', `Bearer ${token1}`) // Recruiter 1 attempts modification
      .send({
        title: 'HACKED TITLE BY RECRUITER 1',
        description: 'Compromised description'
      });

    expect(res.statusCode).toBe(403);
    expect(res.body.success).toBe(false);
    expect(res.body.message).toMatch(/cannot modify another recruiter's job|access denied|forbidden/i);

    // CRITICAL VERIFICATION: Ensure NO mutation occurred in the database!
    const pristineJob = await Job.findById(createdJobId);
    expect(pristineJob.title).toBe('Full Stack Engineer');
    expect(pristineJob.title).not.toBe('HACKED TITLE BY RECRUITER 1');
  });

  // Recruiter cannot close another recruiter's job
  it("should return 403 when recruiter attempts to close another recruiter's job", async () => {
    const res = await request(app)
      .patch(`/api/v1/jobs/${createdJobId}/close`)
      .set('Authorization', `Bearer ${token1}`); // Recruiter 1 acting on Recruiter 2's job

    expect(res.statusCode).toBe(403);
    expect(res.body.success).toBe(false);

    const check = await Job.findById(createdJobId);
    expect(check.status).toBe(JOB_STATUSES.PUBLISHED); // Still published
  });

  // Owner recruiter can close own job
  it('should allow owner recruiter to close their job', async () => {
    const res = await request(app)
      .patch(`/api/v1/jobs/${createdJobId}/close`)
      .set('Authorization', `Bearer ${token2}`);

    expect(res.statusCode).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.status).toBe(JOB_STATUSES.CLOSED);

    const check = await Job.findById(createdJobId);
    expect(check.status).toBe(JOB_STATUSES.CLOSED);
  });

  // Recruiter company profile GET / PATCH
  it('should allow recruiter to retrieve and update own company profile', async () => {
    const getRes = await request(app)
      .get('/api/v1/recruiters/me')
      .set('Authorization', `Bearer ${token2}`);

    expect(getRes.statusCode).toBe(200);
    expect(getRes.body.data.companyName).toBe(profile2.companyName);

    const patchRes = await request(app)
      .patch('/api/v1/recruiters/me')
      .set('Authorization', `Bearer ${token2}`)
      .send({
        website: 'https://nexuslabs.example.com',
        description: 'Leading innovations in software engineering.',
        designation: 'Staff Recruiter'
      });

    expect(patchRes.statusCode).toBe(200);
    expect(patchRes.body.data.website).toBe('https://nexuslabs.example.com');
    expect(patchRes.body.data.designation).toBe('Staff Recruiter');
  });

  // Recruiter cannot self-approve via profile patch
  it('should reject recruiter attempt to self-approve via profile patch', async () => {
    const res = await request(app)
      .patch('/api/v1/recruiters/me')
      .set('Authorization', `Bearer ${token2}`)
      .send({
        approvalStatus: 'approved'
      });

    expect(res.statusCode).toBe(400);
    expect(res.body.success).toBe(false);
    expect(JSON.stringify(res.body.errors)).toMatch(/approval status/i);
  });
});

