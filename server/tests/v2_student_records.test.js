import { jest } from '@jest/globals';
import request from 'supertest';
import app from '../src/app.js';
import { connectDB, disconnectDB } from '../src/config/db.js';
import {
  User,
  StudentProfile,
  Organization,
  OrganizationMembership,
  FileAsset,
  AuditLog
} from '../src/models/index.js';
import { runResumeMigration } from '../src/scripts/migrateResumesToFileAssets.js';
import {
  ROLES,
  USER_STATUSES,
  ORGANIZATION_STATUSES,
  MEMBERSHIP_ROLES,
  MEMBERSHIP_STATUSES
} from '../src/utils/constants.js';
import { signToken } from '../src/utils/token.js';
import { getSignedDownloadUrl, verifySignedToken } from '../src/utils/signedUrl.js';

jest.setTimeout(30000);

describe('Student Records, CSV Import, Invitation Activation & Private Resumes (CHUNK V2)', () => {
  const ts = Date.now();

  let orgA, orgB;
  let orgAdminA, orgAdminAToken;
  let placementCoordA, placementCoordAToken;
  let studentA, studentAProfile, studentAToken;
  let studentB, studentBProfile, studentBToken;
  let unactivatedStudent, validInvitationToken;

  beforeAll(async () => {
    await connectDB();

    // 1. Create Organization A and Organization B
    orgA = await Organization.create({
      name: `Institute A ${ts}`,
      slug: `inst-a-${ts}`,
      timezone: 'Asia/Kolkata',
      status: ORGANIZATION_STATUSES.ACTIVE
    });

    orgB = await Organization.create({
      name: `Institute B ${ts}`,
      slug: `inst-b-${ts}`,
      timezone: 'Asia/Kolkata',
      status: ORGANIZATION_STATUSES.ACTIVE
    });

    // 2. Org Admin for Org A
    orgAdminA = await User.create({
      name: 'Admin Inst A',
      email: `admin_a_${ts}@campus.test`,
      passwordHash: 'dummyhash',
      role: ROLES.ADMIN,
      accountStatus: USER_STATUSES.ACTIVE,
      organizationId: orgA._id
    });
    await OrganizationMembership.create({
      organizationId: orgA._id,
      userId: orgAdminA._id,
      role: MEMBERSHIP_ROLES.ORG_ADMIN,
      status: MEMBERSHIP_STATUSES.ACTIVE
    });
    orgAdminAToken = signToken({ id: orgAdminA._id, role: orgAdminA.role });

    // 3. Placement Coordinator for Org A
    placementCoordA = await User.create({
      name: 'Placement Coordinator A',
      email: `coord_a_${ts}@campus.test`,
      passwordHash: 'dummyhash',
      role: ROLES.ADMIN,
      accountStatus: USER_STATUSES.ACTIVE,
      organizationId: orgA._id
    });
    await OrganizationMembership.create({
      organizationId: orgA._id,
      userId: placementCoordA._id,
      role: MEMBERSHIP_ROLES.PLACEMENT_COORDINATOR,
      status: MEMBERSHIP_STATUSES.ACTIVE
    });
    placementCoordAToken = signToken({ id: placementCoordA._id, role: placementCoordA.role });

    // 4. Student in Org A
    studentA = await User.create({
      name: 'Student A',
      email: `student_a_${ts}@campus.test`,
      passwordHash: 'dummyhash',
      role: ROLES.STUDENT,
      accountStatus: USER_STATUSES.ACTIVE,
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
      studentId: `USN_A_${ts}`,
      studentCode: `USN_A_${ts}`,
      fullName: 'Student Alpha',
      degree: 'B.Tech',
      cohort: '2022-2026',
      branch: 'Computer Science and Engineering',
      graduationYear: 2026,
      cgpa: 8.9,
      phone: '+91 9999900001',
      skills: ['React', 'Node.js']
    });
    studentAToken = signToken({ id: studentA._id, role: studentA.role });

    // 5. Student in Org B
    studentB = await User.create({
      name: 'Student B',
      email: `student_b_${ts}@campus.test`,
      passwordHash: 'dummyhash',
      role: ROLES.STUDENT,
      accountStatus: USER_STATUSES.ACTIVE,
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
      studentId: `USN_B_${ts}`,
      studentCode: `USN_B_${ts}`,
      fullName: 'Student Beta',
      degree: 'B.Tech',
      cohort: '2022-2026',
      branch: 'Information Technology',
      graduationYear: 2026,
      cgpa: 8.5
    });
    studentBToken = signToken({ id: studentB._id, role: studentB.role });
  });

  afterAll(async () => {
    await disconnectDB();
  });

  describe('CSV Template & CSV Import Validation (dry-run & commit)', () => {
    it('GET /api/v1/admin/students/import/template returns downloadable CSV template', async () => {
      const res = await request(app)
        .get('/api/v1/admin/students/import/template')
        .set('Authorization', `Bearer ${orgAdminAToken}`);

      expect(res.status).toBe(200);
      expect(res.headers['content-type']).toContain('text/csv');
      expect(res.text).toContain('studentCode,fullName,email,branch,degree,cohort,graduationYear,cgpa,phone');
    });

    it('denies non-admin from downloading template or importing students', async () => {
      const res = await request(app)
        .get('/api/v1/admin/students/import/template')
        .set('Authorization', `Bearer ${studentAToken}`);

      expect(res.status).toBe(403);
    });

    it('POST /api/v1/admin/students/import with ?dryRun=true returns validation report without modifying DB', async () => {
      const csvPayload = [
        'studentCode,fullName,email,degree,cohort,branch,graduationYear,cgpa,phone',
        `STU_DRY_1_${ts},Dry Run Student 1,dry1_${ts}@campus.test,B.Tech,2022-2026,Computer Science and Engineering,2026,8.8,+91 9876543210`,
        `STU_DRY_2_${ts},Dry Run Student 2,dry2_${ts}@campus.test,B.Tech,2022-2026,Information Technology,2026,9.1,+91 9876543211`
      ].join('\n');

      const res = await request(app)
        .post('/api/v1/admin/students/import?dryRun=true')
        .set('Authorization', `Bearer ${orgAdminAToken}`)
        .send({ csvData: csvPayload });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.dryRun).toBe(true);
      expect(res.body.data.totalRows).toBe(2);
      expect(res.body.data.validRows).toBe(2);
      expect(res.body.data.invalidRows).toBe(0);

      // Verify no records were inserted into DB
      const userExists = await User.findOne({ email: `dry1_${ts}@campus.test` });
      expect(userExists).toBeNull();
    });

    it('POST /api/v1/admin/students/import flags intra-batch duplicates and invalid rows', async () => {
      const csvPayload = [
        'studentCode,fullName,email,degree,cohort,branch,graduationYear,cgpa,phone',
        `STU_DUP_1_${ts},Duplicate Code,dup1_${ts}@campus.test,B.Tech,2022-2026,CSE,2026,8.5,+91 9876543210`,
        `STU_DUP_1_${ts},Duplicate Code 2,dup2_${ts}@campus.test,B.Tech,2022-2026,CSE,2026,8.5,+91 9876543210`, // duplicate code in CSV
        `STU_INV_3_${ts},Invalid Email,not-an-email,B.Tech,2022-2026,CSE,2026,8.5,+91 9876543210` // invalid email
      ].join('\n');

      const res = await request(app)
        .post('/api/v1/admin/students/import?dryRun=true')
        .set('Authorization', `Bearer ${orgAdminAToken}`)
        .send({ csvData: csvPayload });

      expect(res.status).toBe(200);
      expect(res.body.data.invalidRows).toBeGreaterThanOrEqual(2);
      expect(res.body.data.errors.length).toBeGreaterThanOrEqual(1);
      expect(res.body.data.duplicates.length).toBeGreaterThanOrEqual(1);
    });

    it('POST /api/v1/admin/students/import in commit mode creates invited users, memberships, and profiles', async () => {
      const uniqueCode = `STU_COMM_${ts}`;
      const uniqueEmail = `commit_${ts}@campus.test`;
      const csvPayload = [
        'studentCode,fullName,email,degree,cohort,branch,graduationYear,cgpa,phone',
        `${uniqueCode},Commit Test Student,${uniqueEmail},B.Tech,2022-2026,Computer Science and Engineering,2026,9.2,+91 9888877777`
      ].join('\n');

      const res = await request(app)
        .post('/api/v1/admin/students/import?dryRun=false')
        .set('Authorization', `Bearer ${orgAdminAToken}`)
        .send({ csvData: csvPayload });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.dryRun).toBe(false);
      expect(res.body.data.importedCount).toBe(1);
      expect(res.body.data.invitations).toBeDefined();
      expect(res.body.data.invitations.length).toBe(1);

      // Save invitation details for activation tests
      validInvitationToken = res.body.data.invitations[0].invitationToken;
      expect(validInvitationToken).toBeDefined();

      // Verify User in DB is in 'invited' state with hashed token
      const userDoc = await User.findOne({ email: uniqueEmail }).select('+invitationTokenHash');
      expect(userDoc).not.toBeNull();
      expect(userDoc.accountStatus).toBe(USER_STATUSES.INVITED);
      expect(userDoc.invitationTokenHash).toBeDefined();
      expect(userDoc.invitationTokenHash).not.toBe(validInvitationToken); // Must be SHA256 hashed

      // Verify Membership
      const membership = await OrganizationMembership.findOne({
        organizationId: orgA._id,
        userId: userDoc._id
      });
      expect(membership).not.toBeNull();
      expect(membership.role).toBe(MEMBERSHIP_ROLES.STUDENT);

      // Verify StudentProfile
      const profile = await StudentProfile.findOne({ userId: userDoc._id });
      expect(profile).not.toBeNull();
      expect(profile.studentCode).toBe(uniqueCode);
      expect(profile.degree).toBe('B.Tech');
      expect(profile.cohort).toBe('2022-2026');
      expect(profile.cgpa).toBe(9.2);

      unactivatedStudent = userDoc;
    });
  });

  describe('Invitation Activation Flow', () => {
    it('unactivated invited user cannot authenticate on normal protected routes', async () => {
      const invitedToken = signToken({ id: unactivatedStudent._id, role: unactivatedStudent.role });
      const res = await request(app)
        .get('/api/v1/students/me/profile')
        .set('Authorization', `Bearer ${invitedToken}`);

      expect(res.status).toBe(403);
      expect(res.body.message).toContain('invitation');
    });

    it('rejects invitation activation with invalid or forged token', async () => {
      const res = await request(app)
        .post('/api/v1/auth/invitation/accept')
        .send({
          token: 'invalid_nonexistent_hex_token_12345',
          password: 'Password123!',
          confirmPassword: 'Password123!'
        });

      expect(res.status).toBe(400);
      expect(res.body.message).toContain('Invalid or expired invitation token');
    });

    it('successfully activates account with valid invitation token and sets password', async () => {
      const res = await request(app)
        .post('/api/v1/auth/invitation/accept')
        .send({
          token: validInvitationToken,
          password: 'SecureNewPassword123!',
          confirmPassword: 'SecureNewPassword123!'
        });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.token).toBeDefined();
      expect(res.body.data.user.accountStatus).toBe(USER_STATUSES.ACTIVE);

      // Verify DB state
      const updatedUser = await User.findById(unactivatedStudent._id).select('+invitationTokenHash');
      expect(updatedUser.accountStatus).toBe(USER_STATUSES.ACTIVE);
      expect(updatedUser.invitationTokenHash).toBeNull();

      // Now student can log in via POST /auth/login with the new password
      const loginRes = await request(app)
        .post('/api/v1/auth/login')
        .send({
          email: unactivatedStudent.email,
          password: 'SecureNewPassword123!'
        });

      expect(loginRes.status).toBe(200);
      expect(loginRes.body.data.token).toBeDefined();
    });

    it('prevents reusing an already-consumed invitation token', async () => {
      const res = await request(app)
        .post('/api/v1/auth/invitation/accept')
        .send({
          token: validInvitationToken,
          password: 'AnotherPassword123!',
          confirmPassword: 'AnotherPassword123!'
        });

      expect(res.status).toBe(400);
    });
  });

  describe('Student Profile Self-Management & Master Field Immutability', () => {
    it('GET /api/v1/students/me/profile returns profile, completenessV3, and signedResumeUrl', async () => {
      const res = await request(app)
        .get('/api/v1/students/me/profile')
        .set('Authorization', `Bearer ${studentAToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.profile).toBeDefined();
      expect(res.body.data.completenessV3).toBeDefined();
      expect(res.body.data.completenessV3.score).toBeGreaterThanOrEqual(0);
    });

    it('PATCH /api/v1/students/me/profile allows student to update allowed personal fields', async () => {
      const res = await request(app)
        .patch('/api/v1/students/me/profile')
        .set('Authorization', `Bearer ${studentAToken}`)
        .send({
          phone: '+91 9123456789',
          bio: 'Passionate software engineer',
          skills: ['Python', 'Docker', 'MongoDB']
        });

      expect(res.status).toBe(200);
      expect(res.body.data.profile.phone).toBe('+91 9123456789');
      expect(res.body.data.profile.bio).toBe('Passionate software engineer');
      expect(res.body.data.profile.skills).toContain('Docker');
    });

    it('PATCH /api/v1/students/me/profile rejects mass-assignment of master academic fields with 403 Forbidden', async () => {
      const attempts = [
        { studentCode: 'HACKED_CODE' },
        { degree: 'Master of Science' },
        { cohort: '2020-2024' },
        { branch: 'Mechanical Engineering' },
        { graduationYear: 2028 },
        { verificationStatus: 'verified' }
      ];

      for (const payload of attempts) {
        const res = await request(app)
          .patch('/api/v1/students/me/profile')
          .set('Authorization', `Bearer ${studentAToken}`)
          .send(payload);

        expect(res.status).toBe(403);
        expect(res.body.message).toContain('institution staff');
      }
    });
  });

  describe('Admin Student Directory & Master Field Management (audited)', () => {
    it('GET /api/v1/admin/students returns org-scoped student list with pagination', async () => {
      const res = await request(app)
        .get('/api/v1/admin/students?page=1&limit=10')
        .set('Authorization', `Bearer ${orgAdminAToken}`);

      expect(res.status).toBe(200);
      expect(res.body.data).toBeDefined();
      expect(Array.isArray(res.body.data)).toBe(true);
      expect(res.body.pagination).toBeDefined();

      // Ensure student from Org B is NOT returned in Org A's student directory
      const orgBStudentFound = res.body.data.some((s) => s.studentCode === `USN_B_${ts}`);
      expect(orgBStudentFound).toBe(false);
    });

    it('PATCH /api/v1/admin/students/:id allows staff to update master fields and records audit log', async () => {
      const res = await request(app)
        .patch(`/api/v1/admin/students/${studentAProfile._id}`)
        .set('Authorization', `Bearer ${orgAdminAToken}`)
        .send({
          degree: 'B.Tech Honours',
          cohort: '2022-2026 Batch A',
          cgpa: 9.4,
          verificationStatus: 'verified'
        });

      expect(res.status).toBe(200);
      expect(res.body.data.degree).toBe('B.Tech Honours');
      expect(res.body.data.cohort).toBe('2022-2026 Batch A');
      expect(res.body.data.cgpa).toBe(9.4);
      expect(res.body.data.verificationStatus).toBe('verified');
      expect(res.body.data.profileVerifiedAt).toBeDefined();

      // Verify audit log entry was created
      const audit = await AuditLog.findOne({
        entityType: 'StudentProfile',
        entityId: studentAProfile._id.toString(),
        action: { $in: ['UPDATE_STUDENT_MASTER_RECORD', 'STUDENT_PROFILE_VERIFIED', 'STUDENT_PROFILE_MASTER_UPDATED'] }
      });
      expect(audit).not.toBeNull();
      expect(audit.actorId.toString()).toBe(orgAdminA._id.toString());
    });
  });

  describe('Private Resumes, FileAssets & Signed URLs', () => {
    let fileAssetA;

    beforeAll(async () => {
      fileAssetA = await FileAsset.create({
        organizationId: orgA._id,
        ownerId: studentA._id,
        purpose: 'resume',
        originalName: 'alpha_resume.pdf',
        fileName: 'alpha_resume.pdf',
        mimeType: 'application/pdf',
        size: 102400,
        storageProvider: 'local',
        storageKey: `test_resume_${ts}.pdf`,
        isPrivate: true
      });

      await StudentProfile.updateOne(
        { _id: studentAProfile._id },
        {
          $set: {
            fileAssetId: fileAssetA._id,
            resumeObjectKey: fileAssetA.storageKey,
            resume: {
              url: `/api/v1/files/${fileAssetA._id}/download`,
              fileName: 'alpha_resume.pdf',
              originalName: 'alpha_resume.pdf',
              size: 102400
            }
          }
        }
      );
    });

    it('owner can request signed download URL via GET /api/v1/files/:id/signed-url', async () => {
      const res = await request(app)
        .get(`/api/v1/files/${fileAssetA._id}/signed-url`)
        .set('Authorization', `Bearer ${studentAToken}`);

      expect(res.status).toBe(200);
      expect(res.body.data.signedUrl).toBeDefined();
      expect(res.body.data.signedUrl).toContain(`/api/v1/files/${fileAssetA._id}/download?token=`);
    });

    it('staff can request signed download URL for student resume', async () => {
      const res = await request(app)
        .get(`/api/v1/files/${fileAssetA._id}/signed-url`)
        .set('Authorization', `Bearer ${orgAdminAToken}`);

      expect(res.status).toBe(200);
      expect(res.body.data.signedUrl).toBeDefined();
    });

    it('student B cannot request signed URL for student A resume (403 Forbidden)', async () => {
      const res = await request(app)
        .get(`/api/v1/files/${fileAssetA._id}/signed-url`)
        .set('Authorization', `Bearer ${studentBToken}`);

      expect(res.status).toBe(403);
    });

    it('GET /api/v1/files/:id/download rejects requests with missing or invalid token', async () => {
      const res = await request(app).get(`/api/v1/files/${fileAssetA._id}/download`);
      expect(res.status).toBe(403);

      const tamperedRes = await request(app).get(
        `/api/v1/files/${fileAssetA._id}/download?token=fake_tampered_token`
      );
      expect(tamperedRes.status).toBe(403);
    });

    it('GET /api/v1/files/:id/download succeeds with valid signed HMAC token', async () => {
      const signedUrl = getSignedDownloadUrl(fileAssetA._id.toString());
      const res = await request(app).get(signedUrl);

      // Fallback serves valid demo PDF content
      expect(res.status).toBe(200);
      expect(res.headers['content-type']).toContain('application/pdf');
    });
  });

  describe('Resume to FileAsset Migration Script (npm run migrate:v3-resumes)', () => {
    it('dry-run reports counts without modifying DB records', async () => {
      const result = await runResumeMigration({ dryRun: true, logger: () => {} });
      expect(result.dryRun).toBe(true);
      expect(result.totalWithResume).toBeGreaterThanOrEqual(1);
      expect(result.alreadyMigrated).toBeGreaterThanOrEqual(1);
    });
  });
});
