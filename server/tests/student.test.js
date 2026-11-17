import { jest } from '@jest/globals';
import request from 'supertest';
import app from '../src/app.js';
import { connectDB, disconnectDB } from '../src/config/db.js';
import { User, StudentProfile } from '../src/models/index.js';
import { setStorageAdapter, getStorageAdapter } from '../src/utils/storage/storageAdapter.js';
import { ROLES, USER_STATUSES } from '../src/utils/constants.js';
import { signToken } from '../src/utils/token.js';

describe('Student Profile & Resume Suite (CHUNK 2)', () => {
  const timestamp = Date.now();
  let studentA, profileA, tokenA;
  let studentB, profileB, tokenB;
  let recruiterUser, recruiterToken;

  const mockCloudinaryStorage = {
    upload: jest.fn().mockImplementation(async (buffer, { filename, mimetype }) => ({
      url: `https://res.cloudinary.com/demo/raw/upload/v12345/hiretrack/resumes/${filename}`,
      publicId: `hiretrack/resumes/mock_${Date.now()}`,
      fileName: filename,
      mimeType: mimetype,
      size: buffer.length,
      uploadedAt: new Date()
    })),
    delete: jest.fn().mockResolvedValue(true)
  };

  beforeAll(async () => {
    await connectDB();
    // Inject mocked storage adapter
    setStorageAdapter(mockCloudinaryStorage);

    // Create Student A
    studentA = await User.create({
      name: 'Student A',
      email: `studentA_${timestamp}@hiretrack.test`,
      passwordHash: 'dummyhash',
      role: ROLES.STUDENT,
      accountStatus: USER_STATUSES.ACTIVE
    });
    profileA = await StudentProfile.create({
      userId: studentA._id,
      studentId: `USN_A_${timestamp}`,
      branch: 'CSE',
      graduationYear: 2026,
      cgpa: 8.0,
      skills: ['C++', 'Java']
    });
    tokenA = signToken({ id: studentA._id, role: studentA.role });

    // Create Student B
    studentB = await User.create({
      name: 'Student B',
      email: `studentB_${timestamp}@hiretrack.test`,
      passwordHash: 'dummyhash',
      role: ROLES.STUDENT,
      accountStatus: USER_STATUSES.ACTIVE
    });
    profileB = await StudentProfile.create({
      userId: studentB._id,
      studentId: `USN_B_${timestamp}`,
      branch: 'ISE',
      graduationYear: 2026,
      cgpa: 8.5
    });
    tokenB = signToken({ id: studentB._id, role: studentB.role });

    // Create Recruiter
    recruiterUser = await User.create({
      name: 'Recruiter User',
      email: `recruiter_${timestamp}@hiretrack.test`,
      passwordHash: 'dummyhash',
      role: ROLES.RECRUITER,
      accountStatus: USER_STATUSES.PENDING
    });
    recruiterToken = signToken({ id: recruiterUser._id, role: recruiterUser.role });
  });

  afterAll(async () => {
    await User.deleteMany({ _id: { $in: [studentA._id, studentB._id, recruiterUser._id] } });
    await StudentProfile.deleteMany({ _id: { $in: [profileA._id, profileB._id] } });
    await disconnectDB();
  });

  // GET /students/me
  it('should retrieve student own profile with completeness details', async () => {
    const res = await request(app)
      .get('/api/v1/students/me')
      .set('Authorization', `Bearer ${tokenA}`);

    expect(res.statusCode).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.profile.studentId).toBe(`USN_A_${timestamp}`);
    expect(res.body.data.completeness).toHaveProperty('isComplete', false); // No resume yet
    expect(res.body.data.completeness.missingFields).toContain('resume');
  });

  // STU-01: Student updates own profile
  it('STU-01: should allow student to update own profile fields (branch, cgpa, skills)', async () => {
    const res = await request(app)
      .patch('/api/v1/students/me')
      .set('Authorization', `Bearer ${tokenA}`)
      .send({
        branch: 'AI & Data Science',
        cgpa: 9.35,
        skills: ['Python', 'PyTorch', 'FastAPI'],
        bio: 'Aspiring AI engineer.',
        phone: '+91 9876543210'
      });

    expect(res.statusCode).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.profile.branch).toBe('AI & Data Science');
    expect(res.body.data.profile.cgpa).toBe(9.35);
    expect(res.body.data.profile.skills).toEqual(['Python', 'PyTorch', 'FastAPI']);
    expect(res.body.data.profile.phone).toBe('+91 9876543210');

    // Verify DB side effects directly
    const updated = await StudentProfile.findById(profileA._id);
    expect(updated.branch).toBe('AI & Data Science');
    expect(updated.cgpa).toBe(9.35);
  });

  // studentId is immutable
  it('should reject modification of immutable studentId', async () => {
    const res = await request(app)
      .patch('/api/v1/students/me')
      .set('Authorization', `Bearer ${tokenA}`)
      .send({
        studentId: 'NEW_HACKED_ID'
      });

    expect(res.statusCode).toBe(400);
    expect(res.body.success).toBe(false);
    expect(JSON.stringify(res.body.errors)).toMatch(/immutable/i);

    const check = await StudentProfile.findById(profileA._id);
    expect(check.studentId).toBe(`USN_A_${timestamp}`);
  });

  // STU-02: Student attempts to edit another profile
  it('STU-02: should return 403 when student attempts to edit another student profile', async () => {
    const res = await request(app)
      .patch(`/api/v1/students/${profileB._id}`)
      .set('Authorization', `Bearer ${tokenA}`) // Student A acting
      .send({
        branch: 'HACKED_BRANCH',
        cgpa: 2.0
      });

    expect(res.statusCode).toBe(403);
    expect(res.body.success).toBe(false);
    expect(res.body.message).toMatch(/cannot modify another student's profile|denied|forbidden/i);

    // Verify student B was not modified
    const untouchedB = await StudentProfile.findById(profileB._id);
    expect(untouchedB.branch).toBe('ISE');
    expect(untouchedB.cgpa).toBe(8.5);
  });

  // STU-03: CGPA outside configured range
  it('STU-03: should return 400 validation error when CGPA is > 10.0', async () => {
    const res = await request(app)
      .patch('/api/v1/students/me')
      .set('Authorization', `Bearer ${tokenA}`)
      .send({
        cgpa: 11.5
      });

    expect(res.statusCode).toBe(400);
    expect(res.body.success).toBe(false);
    expect(JSON.stringify(res.body.errors)).toMatch(/cgpa/i);
  });

  it('STU-03: should return 400 validation error when CGPA is < 0.0', async () => {
    const res = await request(app)
      .patch('/api/v1/students/me')
      .set('Authorization', `Bearer ${tokenA}`)
      .send({
        cgpa: -0.5
      });

    expect(res.statusCode).toBe(400);
    expect(res.body.success).toBe(false);
    expect(JSON.stringify(res.body.errors)).toMatch(/cgpa/i);
  });

  // FILE-01: Valid resume upload (PDF)
  it('FILE-01: should upload valid PDF resume and store metadata with profile-completeness update', async () => {
    const fakePdfBuffer = Buffer.from('%PDF-1.4 Mock PDF Content');

    const res = await request(app)
      .post('/api/v1/students/me/resume')
      .set('Authorization', `Bearer ${tokenA}`)
      .attach('resume', fakePdfBuffer, 'resume_asha.pdf');

    expect(res.statusCode).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data).toHaveProperty('resume');
    expect(res.body.data.resume.fileName).toBe('resume_asha.pdf');
    expect(res.body.data.resume.mimeType).toBe('application/pdf');
    expect(res.body.data.resume.url).toContain('https://res.cloudinary.com');

    // Profile completeness should now be complete (all academic info + resume present)
    expect(res.body.data.completeness.isComplete).toBe(true);
    expect(res.body.data.completeness.percentage).toBe(100);

    // Verify DB has resume metadata
    const updated = await StudentProfile.findById(profileA._id);
    expect(updated.resume).not.toBeNull();
    expect(updated.resume.fileName).toBe('resume_asha.pdf');
    expect(updated.resume.url).toBe(res.body.data.resume.url);
  });

  // FILE-01: Valid DOCX resume upload
  it('FILE-01: should accept DOCX resume upload', async () => {
    const fakeDocxBuffer = Buffer.from('PK\x03\x04 fake docx content');

    const res = await request(app)
      .post('/api/v1/students/me/resume')
      .set('Authorization', `Bearer ${tokenB}`)
      .attach(
        'resume',
        fakeDocxBuffer,
        {
          filename: 'cv_student_b.docx',
          contentType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
        }
      );

    expect(res.statusCode).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.resume.fileName).toBe('cv_student_b.docx');
  });

  // FILE-02: Disallowed file extension / mime type (.png or .exe)
  it('FILE-02: should reject file with disallowed extension (.png)', async () => {
    const fakeImageBuffer = Buffer.from('Fake PNG Image bytes');

    const res = await request(app)
      .post('/api/v1/students/me/resume')
      .set('Authorization', `Bearer ${tokenA}`)
      .attach('resume', fakeImageBuffer, {
        filename: 'avatar.png',
        contentType: 'image/png'
      });

    expect(res.statusCode).toBe(400);
    expect(res.body.success).toBe(false);
    expect(res.body.message).toMatch(/only pdf, doc, and docx/i);
  });

  // FILE-02: Disallowed file extension (.exe)
  it('FILE-02: should reject executable file upload (.exe)', async () => {
    const fakeExeBuffer = Buffer.from('MZ\x90 fake executable bytes');

    const res = await request(app)
      .post('/api/v1/students/me/resume')
      .set('Authorization', `Bearer ${tokenA}`)
      .attach('resume', fakeExeBuffer, {
        filename: 'malware.exe',
        contentType: 'application/octet-stream'
      });

    expect(res.statusCode).toBe(400);
    expect(res.body.success).toBe(false);
  });

  // Missing resume field
  it('should return 400 when no resume file is attached in upload request', async () => {
    const res = await request(app)
      .post('/api/v1/students/me/resume')
      .set('Authorization', `Bearer ${tokenA}`);

    expect(res.statusCode).toBe(400);
    expect(res.body.success).toBe(false);
    expect(res.body.message).toMatch(/resume file is required/i);
  });

  // Non-student role access restriction
  it('should return 403 when recruiter attempts to access /students/me', async () => {
    const res = await request(app)
      .get('/api/v1/students/me')
      .set('Authorization', `Bearer ${recruiterToken}`);

    expect(res.statusCode).toBe(403);
    expect(res.body.success).toBe(false);
  });
});
