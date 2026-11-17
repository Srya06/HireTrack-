import { jest } from '@jest/globals';
import request from 'supertest';
import app from '../src/app.js';
import { connectDB, disconnectDB } from '../src/config/db.js';
import { User, StudentProfile, RecruiterProfile, Job, Application } from '../src/models/index.js';
import {
  ROLES,
  USER_STATUSES,
  RECRUITER_APPROVAL_STATUSES,
  JOB_STATUSES,
  APPLICATION_STATUSES
} from '../src/utils/constants.js';
import { signToken } from '../src/utils/token.js';

describe('Job Discovery & Application Pipeline (CHUNK 4)', () => {
  const timestamp = Date.now();

  let adminUser, adminToken;
  let recruiter1, profile1, token1;
  let recruiter2, profile2, token2;
  let student1, studentProfile1, studentToken1; // eligible
  let student2, studentProfile2, studentToken2; // ineligible (wrong branch, low CGPA)
  let student3, studentProfile3, studentToken3; // for concurrent double-apply & withdraw

  let publishedJobId;
  let recruiter2JobId;
  let expiredJobId;
  let student1AppId;
  let student3AppId;

  beforeAll(async () => {
    await connectDB();

    // Admin
    adminUser = await User.create({
      name: 'Admin Admin',
      email: `admin_app_${timestamp}@hiretrack.test`,
      passwordHash: 'dummyhash',
      role: ROLES.ADMIN,
      accountStatus: USER_STATUSES.ACTIVE
    });
    adminToken = signToken({ id: adminUser._id, role: adminUser.role });

    // Recruiter 1 (Approved)
    recruiter1 = await User.create({
      name: 'Tech Recruiter 1',
      email: `rec1_${timestamp}@hiretrack.test`,
      passwordHash: 'dummyhash',
      role: ROLES.RECRUITER,
      accountStatus: USER_STATUSES.ACTIVE
    });
    profile1 = await RecruiterProfile.create({
      userId: recruiter1._id,
      companyName: `Amazon Web Labs ${timestamp}`,
      approvalStatus: RECRUITER_APPROVAL_STATUSES.APPROVED
    });
    token1 = signToken({ id: recruiter1._id, role: recruiter1.role });

    // Recruiter 2 (Approved)
    recruiter2 = await User.create({
      name: 'Tech Recruiter 2',
      email: `rec2_${timestamp}@hiretrack.test`,
      passwordHash: 'dummyhash',
      role: ROLES.RECRUITER,
      accountStatus: USER_STATUSES.ACTIVE
    });
    profile2 = await RecruiterProfile.create({
      userId: recruiter2._id,
      companyName: `Microsoft R&D ${timestamp}`,
      approvalStatus: RECRUITER_APPROVAL_STATUSES.APPROVED
    });
    token2 = signToken({ id: recruiter2._id, role: recruiter2.role });

    // Eligible Student 1
    student1 = await User.create({
      name: 'Asha Eligible',
      email: `stu1_app_${timestamp}@hiretrack.test`,
      passwordHash: 'dummyhash',
      role: ROLES.STUDENT,
      accountStatus: USER_STATUSES.ACTIVE
    });
    studentProfile1 = await StudentProfile.create({
      userId: student1._id,
      studentId: `USN_APP1_${timestamp}`,
      branch: 'CSE',
      graduationYear: 2026,
      cgpa: 8.9,
      skills: ['Node.js', 'React'],
      resume: {
        url: 'https://cloudinary.example.com/resumes/asha.pdf',
        publicId: 'resumes/asha_123',
        fileName: 'asha_resume.pdf',
        mimeType: 'application/pdf',
        size: 10240,
        uploadedAt: new Date()
      }
    });
    studentToken1 = signToken({ id: student1._id, role: student1.role });

    // Ineligible Student 2 (Branch: MECH, CGPA: 6.5)
    student2 = await User.create({
      name: 'Rahul Ineligible',
      email: `stu2_app_${timestamp}@hiretrack.test`,
      passwordHash: 'dummyhash',
      role: ROLES.STUDENT,
      accountStatus: USER_STATUSES.ACTIVE
    });
    studentProfile2 = await StudentProfile.create({
      userId: student2._id,
      studentId: `USN_APP2_${timestamp}`,
      branch: 'MECH',
      graduationYear: 2025,
      cgpa: 6.5,
      skills: ['AutoCAD'],
      resume: {
        url: 'https://cloudinary.example.com/resumes/rahul.pdf',
        publicId: 'resumes/rahul_123',
        fileName: 'rahul_resume.pdf',
        mimeType: 'application/pdf',
        size: 10240,
        uploadedAt: new Date()
      }
    });
    studentToken2 = signToken({ id: student2._id, role: student2.role });

    // Student 3 (Eligible, for concurrency test)
    student3 = await User.create({
      name: 'Karan Concurrent',
      email: `stu3_app_${timestamp}@hiretrack.test`,
      passwordHash: 'dummyhash',
      role: ROLES.STUDENT,
      accountStatus: USER_STATUSES.ACTIVE
    });
    studentProfile3 = await StudentProfile.create({
      userId: student3._id,
      studentId: `USN_APP3_${timestamp}`,
      branch: 'CSE',
      graduationYear: 2026,
      cgpa: 8.5,
      resume: {
        url: 'https://cloudinary.example.com/resumes/karan.pdf',
        publicId: 'resumes/karan_123',
        fileName: 'karan_resume.pdf',
        mimeType: 'application/pdf',
        size: 10240,
        uploadedAt: new Date()
      }
    });
    studentToken3 = signToken({ id: student3._id, role: student3.role });

    // Create Published Job for Recruiter 1
    const futureDate = new Date();
    futureDate.setDate(futureDate.getDate() + 20);

    const publishedJob = await Job.create({
      recruiterId: recruiter1._id,
      title: 'Cloud Software Engineer',
      companyName: profile1.companyName,
      description: 'Build backend microservices on cloud infrastructure.',
      location: 'Bengaluru',
      employmentType: 'full_time',
      ctc: '10-14 LPA',
      minCgpa: 8.0,
      eligibleBranches: ['CSE', 'ISE'],
      eligibleGraduationYears: [2026],
      applicationDeadline: futureDate,
      status: JOB_STATUSES.PUBLISHED
    });
    publishedJobId = publishedJob._id.toString();

    // Create Job for Recruiter 2
    const rec2Job = await Job.create({
      recruiterId: recruiter2._id,
      title: 'Systems Analyst',
      companyName: profile2.companyName,
      description: 'Analyze enterprise systems and database queries.',
      location: 'Hyderabad',
      employmentType: 'full_time',
      applicationDeadline: futureDate,
      status: JOB_STATUSES.PUBLISHED
    });
    recruiter2JobId = rec2Job._id.toString();

    // Create Expired Job
    const pastDate = new Date();
    pastDate.setDate(pastDate.getDate() - 2);

    const expiredJob = await Job.create({
      recruiterId: recruiter1._id,
      title: 'Expired Internship',
      companyName: profile1.companyName,
      description: 'Past deadline posting.',
      location: 'Remote',
      applicationDeadline: pastDate,
      status: JOB_STATUSES.PUBLISHED
    });
    expiredJobId = expiredJob._id.toString();
  });

  afterAll(async () => {
    await User.deleteMany({
      _id: { $in: [adminUser._id, recruiter1._id, recruiter2._id, student1._id, student2._id, student3._id] }
    });
    await StudentProfile.deleteMany({
      _id: { $in: [studentProfile1._id, studentProfile2._id, studentProfile3._id] }
    });
    await RecruiterProfile.deleteMany({ _id: { $in: [profile1._id, profile2._id] } });
    await Job.deleteMany({ _id: { $in: [publishedJobId, recruiter2JobId, expiredJobId] } });
    await Application.deleteMany({ studentId: { $in: [student1._id, student2._id, student3._id] } });
    await disconnectDB();
  });

  // Discovery: GET /jobs
  it('GET /jobs: should return only published and non-expired jobs with pagination', async () => {
    const res = await request(app)
      .get('/api/v1/jobs?branch=CSE')
      .set('Authorization', `Bearer ${studentToken1}`);

    expect(res.statusCode).toBe(200);
    expect(res.body.success).toBe(true);
    expect(Array.isArray(res.body.data)).toBe(true);

    // Published job must be present
    const foundPublished = res.body.data.some((j) => j.id === publishedJobId);
    expect(foundPublished).toBe(true);

    // Expired job must NOT be present
    const foundExpired = res.body.data.some((j) => j.id === expiredJobId);
    expect(foundExpired).toBe(false);
  });

  // Job Details with Eligibility Summary
  it('GET /jobs/:jobId: should include eligibility summary and application status for student', async () => {
    const res = await request(app)
      .get(`/api/v1/jobs/${publishedJobId}`)
      .set('Authorization', `Bearer ${studentToken1}`);

    expect(res.statusCode).toBe(200);
    expect(res.body.data).toHaveProperty('eligibility');
    expect(res.body.data.eligibility.isEligible).toBe(true);
    expect(res.body.data.userApplication.hasApplied).toBe(false);
  });

  // APP-01: Eligible student applies to job
  it('APP-01: should allow eligible student to apply and snapshot resume with initial status applied', async () => {
    const res = await request(app)
      .post(`/api/v1/jobs/${publishedJobId}/applications`)
      .set('Authorization', `Bearer ${studentToken1}`)
      .send({
        coverLetter: 'Excited about backend cloud engineering.'
      });

    expect(res.statusCode).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.data.status).toBe(APPLICATION_STATUSES.APPLIED);
    expect(res.body.data.resumeSnapshot.url).toBe(studentProfile1.resume.url);
    expect(res.body.data.coverLetter).toBe('Excited about backend cloud engineering.');
    expect(res.body.data.statusHistory).toHaveLength(1);
    expect(res.body.data.statusHistory[0].status).toBe(APPLICATION_STATUSES.APPLIED);

    student1AppId = res.body.data.id;

    // Verify DB side effects
    const appDoc = await Application.findById(student1AppId);
    expect(appDoc).not.toBeNull();
    expect(appDoc.jobId.toString()).toBe(publishedJobId);
    expect(appDoc.studentId.toString()).toBe(student1._id.toString());
  });

  // APP-02: Same student applies twice to same job -> 409
  it('APP-02: should return 409 Conflict when student attempts to apply again to the same job', async () => {
    const res = await request(app)
      .post(`/api/v1/jobs/${publishedJobId}/applications`)
      .set('Authorization', `Bearer ${studentToken1}`)
      .send({
        coverLetter: 'Second attempt should fail'
      });

    expect(res.statusCode).toBe(409);
    expect(res.body.success).toBe(false);
    expect(res.body.message).toMatch(/already applied/i);
  });

  // Concurrent Double-Apply Test
  it('Concurrent Double-Apply: exactly one request succeeds and second receives 409', async () => {
    const [resA, resB] = await Promise.all([
      request(app)
        .post(`/api/v1/jobs/${publishedJobId}/applications`)
        .set('Authorization', `Bearer ${studentToken3}`)
        .send({ coverLetter: 'Concurrent A' }),
      request(app)
        .post(`/api/v1/jobs/${publishedJobId}/applications`)
        .set('Authorization', `Bearer ${studentToken3}`)
        .send({ coverLetter: 'Concurrent B' })
    ]);

    const statusCodes = [resA.statusCode, resB.statusCode];
    expect(statusCodes).toContain(201);
    expect(statusCodes).toContain(409);

    // Verify exactly one application exists in DB
    const count = await Application.countDocuments({
      jobId: publishedJobId,
      studentId: student3._id
    });
    expect(count).toBe(1);

    const appDoc = await Application.findOne({
      jobId: publishedJobId,
      studentId: student3._id
    });
    student3AppId = appDoc._id.toString();
  });

  // APP-03: Ineligible student applies -> 400 with clear reasons
  it('APP-03: should reject application from ineligible student with 400 and clear reasons', async () => {
    const res = await request(app)
      .post(`/api/v1/jobs/${publishedJobId}/applications`)
      .set('Authorization', `Bearer ${studentToken2}`)
      .send({
        coverLetter: 'Hopeful application'
      });

    expect(res.statusCode).toBe(400);
    expect(res.body.success).toBe(false);
    expect(res.body.message).toMatch(/not eligible/i);
    expect(JSON.stringify(res.body)).toMatch(/branch/i);
  });

  // APP-04: Apply to closed/expired job -> 400
  it('APP-04: should reject application to expired job with 400', async () => {
    const res = await request(app)
      .post(`/api/v1/jobs/${expiredJobId}/applications`)
      .set('Authorization', `Bearer ${studentToken1}`)
      .send();

    expect(res.statusCode).toBe(400);
    expect(res.body.success).toBe(false);
    expect(res.body.message).toMatch(/closed or its application deadline has passed/i);
  });

  // APP-05: Student views another student's application -> 403
  it("APP-05: should return 403 when a student attempts to view another student's application", async () => {
    const res = await request(app)
      .get(`/api/v1/applications/${student1AppId}`)
      .set('Authorization', `Bearer ${studentToken2}`); // Student 2 viewing Student 1

    expect(res.statusCode).toBe(403);
    expect(res.body.success).toBe(false);
    expect(res.body.message).toMatch(/access denied|permission/i);
  });

  // APP-06: Recruiter views applicants for own job
  it('APP-06: should allow owning recruiter to view applicants for their job with enriched profile', async () => {
    const res = await request(app)
      .get(`/api/v1/jobs/${publishedJobId}/applications`)
      .set('Authorization', `Bearer ${token1}`);

    expect(res.statusCode).toBe(200);
    expect(res.body.success).toBe(true);
    expect(Array.isArray(res.body.data)).toBe(true);
    expect(res.body.data.length).toBeGreaterThanOrEqual(2);

    const applicant = res.body.data.find((a) => a.id === student1AppId);
    expect(applicant).toBeDefined();
    expect(applicant.studentProfile.branch).toBe('CSE');
    expect(applicant.studentProfile.cgpa).toBe(8.9);
  });

  // APP-07: Recruiter views applicants for another recruiter's job -> 403
  it("APP-07: should return 403 when recruiter attempts to view applicants for another recruiter's job", async () => {
    const res = await request(app)
      .get(`/api/v1/jobs/${publishedJobId}/applications`) // Job belongs to Recruiter 1
      .set('Authorization', `Bearer ${token2}`); // Recruiter 2 calling

    expect(res.statusCode).toBe(403);
    expect(res.body.success).toBe(false);
  });

  // APP-08: Recruiter sets valid status transition
  it('APP-08: should allow owning recruiter to transition status from applied to shortlisted with history', async () => {
    const res = await request(app)
      .patch(`/api/v1/applications/${student1AppId}/status`)
      .set('Authorization', `Bearer ${token1}`)
      .send({
        status: APPLICATION_STATUSES.SHORTLISTED,
        note: 'Exceptional academic record and relevant tech stack.'
      });

    expect(res.statusCode).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.status).toBe(APPLICATION_STATUSES.SHORTLISTED);
    expect(res.body.data.statusHistory).toHaveLength(2);
    expect(res.body.data.statusHistory[1].status).toBe(APPLICATION_STATUSES.SHORTLISTED);
    expect(res.body.data.statusHistory[1].note).toBe(
      'Exceptional academic record and relevant tech stack.'
    );

    // Verify DB
    const updated = await Application.findById(student1AppId);
    expect(updated.status).toBe(APPLICATION_STATUSES.SHORTLISTED);
  });

  // Privacy: Student sees status update but recruiter internal notes are hidden
  it('Privacy: student sees updated status but recruiter notes are hidden from statusHistory', async () => {
    const res = await request(app)
      .get(`/api/v1/applications/${student1AppId}`)
      .set('Authorization', `Bearer ${studentToken1}`);

    expect(res.statusCode).toBe(200);
    expect(res.body.data.status).toBe(APPLICATION_STATUSES.SHORTLISTED);
    expect(res.body.data.statusHistory).toHaveLength(2);
    // Student view must NOT contain note
    expect(res.body.data.statusHistory[1].note).toBeUndefined();
    expect(JSON.stringify(res.body.data.statusHistory)).not.toContain('Exceptional academic record');
  });

  // APP-09: Recruiter sets invalid status transition
  it('APP-09: should reject invalid status transition from shortlisted to applied with 400', async () => {
    const res = await request(app)
      .patch(`/api/v1/applications/${student1AppId}/status`)
      .set('Authorization', `Bearer ${token1}`)
      .send({
        status: APPLICATION_STATUSES.APPLIED
      });

    expect(res.statusCode).toBe(400);
    expect(res.body.success).toBe(false);
    expect(res.body.message).toMatch(/invalid transition/i);
  });

  // Student withdraws application
  it('Withdrawal: should allow student to withdraw application', async () => {
    const res = await request(app)
      .patch(`/api/v1/applications/${student3AppId}/withdraw`)
      .set('Authorization', `Bearer ${studentToken3}`);

    expect(res.statusCode).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.status).toBe(APPLICATION_STATUSES.WITHDRAWN);

    // Verify in DB
    const check = await Application.findById(student3AppId);
    expect(check.status).toBe(APPLICATION_STATUSES.WITHDRAWN);
  });

  // Reapply after withdrawal is blocked (409)
  it('should prevent student from reapplying after withdrawing application', async () => {
    const res = await request(app)
      .post(`/api/v1/jobs/${publishedJobId}/applications`)
      .set('Authorization', `Bearer ${studentToken3}`)
      .send();

    expect(res.statusCode).toBe(409);
    expect(res.body.success).toBe(false);
    expect(res.body.message).toMatch(/reapplication is not permitted|already/i);
  });
});

