import { jest } from '@jest/globals';
import request from 'supertest';
import bcrypt from 'bcryptjs';
import app from '../src/app.js';
import { connectDB, disconnectDB } from '../src/config/db.js';
import { User, StudentProfile, RecruiterProfile } from '../src/models/index.js';
import { ROLES, USER_STATUSES } from '../src/utils/constants.js';

jest.setTimeout(30000);

describe('Auth & RBAC Test Suite', () => {
  const timestamp = Date.now();
  const testStudentEmail = `student_${timestamp}@hiretrack.test`;
  const testRecruiterEmail = `recruiter_${timestamp}@hiretrack.test`;
  const testStudentId = `STU_${timestamp}`;
  const validPassword = 'StrongPassword123!';

  let studentToken = '';
  let recruiterToken = '';
  let adminToken = '';

  beforeAll(async () => {
    await connectDB();
    const existingAdmin = await User.findOne({ email: 'admin@hiretrack.edu' });
    if (!existingAdmin) {
      const passwordHash = await bcrypt.hash('Admin@HireTrack2026!', 10);
      await User.create({
        name: 'HireTrack Administrator',
        email: 'admin@hiretrack.edu',
        passwordHash,
        role: ROLES.ADMIN,
        accountStatus: USER_STATUSES.ACTIVE
      });
    }
  });

  afterAll(async () => {
    // Clean up test users created during test run
    await User.deleteMany({
      email: { $in: [testStudentEmail, testRecruiterEmail, `dup_${timestamp}@hiretrack.test`] }
    });
    await StudentProfile.deleteMany({ studentId: testStudentId });
    await RecruiterProfile.deleteMany({ companyName: `Acme Corp ${timestamp}` });
    await disconnectDB();
  });

  // AUTH-01: Register with valid student data
  it('AUTH-01: should register a new student with profile and return 201 with token', async () => {
    const res = await request(app)
      .post('/api/v1/auth/register')
      .send({
        name: 'Asha Rao',
        email: testStudentEmail,
        password: validPassword,
        role: 'student',
        studentProfile: {
          studentId: testStudentId,
          branch: 'CSE',
          graduationYear: 2026,
          cgpa: 8.8,
          skills: ['Node.js', 'React']
        }
      });

    expect(res.statusCode).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.data).toHaveProperty('accessToken');
    expect(res.body.data.user).toHaveProperty('id');
    expect(res.body.data.user.email).toBe(testStudentEmail.toLowerCase());
    expect(res.body.data.user.role).toBe(ROLES.STUDENT);
    expect(res.body.data.user.accountStatus).toBe(USER_STATUSES.ACTIVE);
    expect(res.body.data.profile.studentId).toBe(testStudentId);
    expect(res.body.data.profile.cgpa).toBe(8.8);

    studentToken = res.body.data.accessToken;

    // Verify DB side effects
    const savedUser = await User.findOne({ email: testStudentEmail });
    expect(savedUser).not.toBeNull();
    const savedProfile = await StudentProfile.findOne({ studentId: testStudentId });
    expect(savedProfile).not.toBeNull();
  });

  // Password hash never returned in registration
  it('should NEVER return passwordHash in registration response', async () => {
    const res = await request(app)
      .post('/api/v1/auth/register')
      .send({
        name: 'Hash Check Student',
        email: `hash_check_${timestamp}@hiretrack.test`,
        password: validPassword,
        role: 'student',
        studentProfile: {
          studentId: `HASH_${timestamp}`,
          branch: 'ECE',
          graduationYear: 2026,
          cgpa: 7.5
        }
      });

    expect(res.statusCode).toBe(201);
    expect(res.body.data.user.passwordHash).toBeUndefined();
    expect(JSON.stringify(res.body)).not.toContain('passwordHash');

    // Clean up
    await User.deleteOne({ email: `hash_check_${timestamp}@hiretrack.test` });
    await StudentProfile.deleteOne({ studentId: `HASH_${timestamp}` });
  });

  // AUTH-02: Register with existing email
  it('AUTH-02: should return 409 conflict when registering with existing email', async () => {
    const res = await request(app)
      .post('/api/v1/auth/register')
      .send({
        name: 'Duplicate Student',
        email: testStudentEmail, // Existing email
        password: validPassword,
        role: 'student',
        studentProfile: {
          studentId: `DUP_${timestamp}`,
          branch: 'CSE',
          graduationYear: 2026,
          cgpa: 9.0
        }
      });

    expect(res.statusCode).toBe(409);
    expect(res.body.success).toBe(false);
    expect(res.body.message).toMatch(/already exists/i);
  });

  // AUTH-03: Public registration requests admin role
  it('AUTH-03: should reject public registration requesting admin role with 400', async () => {
    const res = await request(app)
      .post('/api/v1/auth/register')
      .send({
        name: 'Malicious Admin Wannabe',
        email: `fake_admin_${timestamp}@hiretrack.test`,
        password: validPassword,
        role: 'admin'
      });

    expect(res.statusCode).toBe(400);
    expect(res.body.success).toBe(false);
    expect(JSON.stringify(res.body.errors)).toMatch(/admin role cannot be created/i);
  });

  // Mass-assignment check: recruiter trying to pass accountStatus 'active'
  it('Mass-assignment attempt: recruiter passing accountStatus:active must remain pending', async () => {
    const res = await request(app)
      .post('/api/v1/auth/register')
      .send({
        name: 'Hiring Lead',
        email: testRecruiterEmail,
        password: validPassword,
        role: 'recruiter',
        accountStatus: 'active', // Mass-assignment attempt!
        isAdmin: true,           // Mass-assignment attempt!
        recruiterProfile: {
          companyName: `Acme Corp ${timestamp}`,
          website: 'https://acme.example.com',
          designation: 'HR Director'
        }
      });

    expect(res.statusCode).toBe(201);
    expect(res.body.data.user.role).toBe(ROLES.RECRUITER);
    // Server must enforce 'pending' regardless of client request
    expect(res.body.data.user.accountStatus).toBe(USER_STATUSES.PENDING);
    expect(res.body.data.profile.approvalStatus).toBe('pending');

    recruiterToken = res.body.data.accessToken;

    // Verify in DB directly
    const savedRecruiter = await User.findOne({ email: testRecruiterEmail });
    expect(savedRecruiter.accountStatus).toBe(USER_STATUSES.PENDING);
    expect(savedRecruiter.isAdmin).toBeUndefined();
  });

  // AUTH-04: Login with wrong password
  it('AUTH-04: should return 401 generic error when logging in with wrong password', async () => {
    const res = await request(app)
      .post('/api/v1/auth/login')
      .send({
        email: testStudentEmail,
        password: 'WrongPassword999!'
      });

    expect(res.statusCode).toBe(401);
    expect(res.body.success).toBe(false);
    expect(res.body.message).toMatch(/invalid email or password/i);
    expect(res.body.data).toBeUndefined();
  });

  // Successful Login
  it('should successfully log in existing student and update lastLoginAt', async () => {
    const res = await request(app)
      .post('/api/v1/auth/login')
      .send({
        email: testStudentEmail,
        password: validPassword
      });

    expect(res.statusCode).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data).toHaveProperty('accessToken');
    expect(res.body.data.user.email).toBe(testStudentEmail.toLowerCase());
    expect(res.body.data.user.lastLoginAt).not.toBeNull();
    // Password hash must never be in login response
    expect(res.body.data.user.passwordHash).toBeUndefined();
    expect(JSON.stringify(res.body)).not.toContain('passwordHash');
  });

  // Pending recruiter can log in
  it('should allow pending recruiter to log in with pending status', async () => {
    const res = await request(app)
      .post('/api/v1/auth/login')
      .send({
        email: testRecruiterEmail,
        password: validPassword
      });

    expect(res.statusCode).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.user.role).toBe(ROLES.RECRUITER);
    expect(res.body.data.user.accountStatus).toBe(USER_STATUSES.PENDING);
  });

  // Admin login with seeded credentials
  it('should allow seeded admin to log in', async () => {
    const res = await request(app)
      .post('/api/v1/auth/login')
      .send({
        email: 'admin@hiretrack.edu',
        password: 'Admin@HireTrack2026!'
      });

    expect(res.statusCode).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.user.role).toBe(ROLES.ADMIN);
    expect(res.body.data.user.accountStatus).toBe(USER_STATUSES.ACTIVE);
    expect(res.body.data).toHaveProperty('accessToken');

    adminToken = res.body.data.accessToken;
  });

  // AUTH-05: Access protected route without token
  it('AUTH-05: should return 401 when accessing protected route without token', async () => {
    const res = await request(app).get('/api/v1/auth/me');

    expect(res.statusCode).toBe(401);
    expect(res.body.success).toBe(false);
    expect(res.body.message).toMatch(/token missing/i);
  });

  // Protected route with invalid token
  it('should return 401 when accessing protected route with invalid token', async () => {
    const res = await request(app)
      .get('/api/v1/auth/me')
      .set('Authorization', 'Bearer invalid_malformed_token_string');

    expect(res.statusCode).toBe(401);
    expect(res.body.success).toBe(false);
  });

  // GET /auth/me returns current user and profile
  it('GET /auth/me: should return authenticated user details and profile', async () => {
    const res = await request(app)
      .get('/api/v1/auth/me')
      .set('Authorization', `Bearer ${studentToken}`);

    expect(res.statusCode).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.user.email).toBe(testStudentEmail.toLowerCase());
    expect(res.body.data.profile.studentId).toBe(testStudentId);
    expect(res.body.data.user.passwordHash).toBeUndefined();
  });

  // AUTH-06: Student calls admin endpoint
  it('AUTH-06: should return 403 when student calls admin endpoint', async () => {
    const res = await request(app)
      .get('/api/v1/admin/ping')
      .set('Authorization', `Bearer ${studentToken}`);

    expect(res.statusCode).toBe(403);
    expect(res.body.success).toBe(false);
    expect(res.body.message).toMatch(/not authorized|forbidden/i);
  });

  // Recruiter calls admin endpoint
  it('should return 403 when recruiter calls admin endpoint', async () => {
    const res = await request(app)
      .get('/api/v1/admin/ping')
      .set('Authorization', `Bearer ${recruiterToken}`);

    expect(res.statusCode).toBe(403);
    expect(res.body.success).toBe(false);
  });

  // Admin calls admin endpoint
  it('should return 200 when admin calls admin endpoint', async () => {
    const res = await request(app)
      .get('/api/v1/admin/ping')
      .set('Authorization', `Bearer ${adminToken}`);

    expect(res.statusCode).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.role).toBe(ROLES.ADMIN);
  });

  // POST /auth/logout
  it('POST /auth/logout: should return 200 when logging out', async () => {
    const res = await request(app)
      .post('/api/v1/auth/logout')
      .set('Authorization', `Bearer ${studentToken}`);

    expect(res.statusCode).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.message).toMatch(/logged out/i);
  });

  // Block suspended user
  it('should block suspended user from logging in with 403', async () => {
    // Create a suspended user
    const suspendedEmail = `suspended_${timestamp}@hiretrack.test`;
    await User.create({
      name: 'Suspended User',
      email: suspendedEmail,
      passwordHash: await import('bcryptjs').then((b) => b.default.hash(validPassword, 4)),
      role: ROLES.STUDENT,
      accountStatus: USER_STATUSES.SUSPENDED
    });

    const res = await request(app)
      .post('/api/v1/auth/login')
      .send({
        email: suspendedEmail,
        password: validPassword
      });

    expect(res.statusCode).toBe(403);
    expect(res.body.success).toBe(false);
    expect(res.body.message).toMatch(/suspended/i);

    // Clean up
    await User.deleteOne({ email: suspendedEmail });
  });
});

