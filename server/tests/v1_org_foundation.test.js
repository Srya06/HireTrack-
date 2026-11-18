import { jest } from '@jest/globals';
import request from 'supertest';
import app from '../src/app.js';
import { connectDB, disconnectDB } from '../src/config/db.js';
import {
  User,
  StudentProfile,
  Organization,
  OrganizationMembership,
  AuditLog
} from '../src/models/index.js';
import { runOrgBackfill } from '../src/scripts/migrateOrgBackfill.js';
import { logAdminAction } from '../src/utils/auditLogger.js';
import {
  ROLES,
  USER_STATUSES,
  ORGANIZATION_STATUSES,
  MEMBERSHIP_ROLES,
  MEMBERSHIP_STATUSES,
  ERROR_CODES
} from '../src/utils/constants.js';
import { signToken } from '../src/utils/token.js';

jest.setTimeout(30000);

describe('Organization Foundation, Memberships, Backfill & Org Isolation (CHUNK V1)', () => {
  const ts = Date.now();

  let defaultOrg;
  let orgB;

  let adminA, adminAToken;
  let studentA, studentAProfile, studentAToken;
  let recruiterLegacy, recruiterLegacyToken;
  let coordinatorA, coordinatorAToken;
  let interviewerA, interviewerAToken;

  let adminB, adminBToken;
  let userB;

  const createdUserIds = [];
  const createdOrgIds = [];

  beforeAll(async () => {
    await connectDB();

    // Create unmigrated v1 users (no organizationId, no memberships yet)
    adminA = await User.create({
      name: 'Org A Admin',
      email: `admin_v1_${ts}@campus.test`,
      passwordHash: 'dummyhash',
      role: ROLES.ADMIN,
      accountStatus: USER_STATUSES.ACTIVE
    });
    createdUserIds.push(adminA._id);
    adminAToken = signToken({ id: adminA._id, role: adminA.role });

    studentA = await User.create({
      name: 'Org A Student',
      email: `student_v1_${ts}@campus.test`,
      passwordHash: 'dummyhash',
      role: ROLES.STUDENT,
      accountStatus: USER_STATUSES.ACTIVE
    });
    createdUserIds.push(studentA._id);
    studentAToken = signToken({ id: studentA._id, role: studentA.role });

    studentAProfile = await StudentProfile.create({
      userId: studentA._id,
      studentId: `STU_V1_${ts}`,
      branch: 'CSE',
      graduationYear: 2026,
      cgpa: 8.7
    });

    recruiterLegacy = await User.create({
      name: 'Legacy Recruiter',
      email: `recruiter_v1_${ts}@company.test`,
      passwordHash: 'dummyhash',
      role: ROLES.RECRUITER,
      accountStatus: USER_STATUSES.ACTIVE
    });
    createdUserIds.push(recruiterLegacy._id);
    recruiterLegacyToken = signToken({ id: recruiterLegacy._id, role: recruiterLegacy.role });
  });

  afterAll(async () => {
    await AuditLog.deleteMany({ actorId: { $in: createdUserIds } });
    await OrganizationMembership.deleteMany({ userId: { $in: createdUserIds } });
    await StudentProfile.deleteMany({ userId: { $in: createdUserIds } });
    await User.deleteMany({ _id: { $in: createdUserIds } });
    if (createdOrgIds.length > 0) {
      await Organization.deleteMany({ _id: { $in: createdOrgIds } });
    }
    await disconnectDB();
  });

  describe('1. Backfill Migration (--dry-run, real run & idempotency)', () => {
    it('dry-run reports counts without mutating DB and logs zero PII', async () => {
      const logs = [];
      const beforeUsersWithoutOrg = await User.countDocuments({
        _id: { $in: [adminA._id, studentA._id] },
        organizationId: null
      });
      expect(beforeUsersWithoutOrg).toBe(2);

      const summary = await runOrgBackfill({
        dryRun: true,
        logger: (msg) => logs.push(msg)
      });

      expect(summary.dryRun).toBe(true);
      expect(summary.usersUpdated).toBeGreaterThanOrEqual(2);
      expect(summary.studentProfilesUpdated).toBeGreaterThanOrEqual(1);
      expect(summary.membershipsCreated).toBeGreaterThanOrEqual(2);

      // Verify zero DB mutations occurred during dry-run
      const refreshedAdmin = await User.findById(adminA._id);
      const refreshedStudent = await User.findById(studentA._id);
      const refreshedProfile = await StudentProfile.findById(studentAProfile._id);
      const membershipsCount = await OrganizationMembership.countDocuments({
        userId: { $in: [adminA._id, studentA._id] }
      });

      expect(refreshedAdmin.organizationId).toBeNull();
      expect(refreshedStudent.organizationId).toBeNull();
      expect(refreshedProfile.organizationId).toBeNull();
      expect(membershipsCount).toBe(0);

      // Verify count-only logging (zero PII)
      const combinedLogs = logs.join('\n');
      expect(combinedLogs).toContain('DRY_RUN');
      expect(combinedLogs).not.toContain(adminA.email);
      expect(combinedLogs).not.toContain(studentA.email);
      expect(combinedLogs).not.toContain(studentAProfile.studentId);
    });

    it('real backfill assigns default org and creates STUDENT & ORG_ADMIN memberships idempotently', async () => {
      const firstRun = await runOrgBackfill({ dryRun: false, logger: () => {} });
      expect(firstRun.dryRun).toBe(false);
      expect(firstRun.usersUpdated).toBeGreaterThanOrEqual(2);
      expect(firstRun.studentProfilesUpdated).toBeGreaterThanOrEqual(1);
      expect(firstRun.membershipsCreated).toBeGreaterThanOrEqual(2);

      defaultOrg = await Organization.findOne({ slug: 'default-org' });
      expect(defaultOrg).not.toBeNull();

      const refreshedAdmin = await User.findById(adminA._id);
      const refreshedStudent = await User.findById(studentA._id);
      const refreshedProfile = await StudentProfile.findById(studentAProfile._id);

      expect(refreshedAdmin.organizationId.toString()).toBe(defaultOrg._id.toString());
      expect(refreshedStudent.organizationId.toString()).toBe(defaultOrg._id.toString());
      expect(refreshedProfile.organizationId.toString()).toBe(defaultOrg._id.toString());

      const adminMem = await OrganizationMembership.findOne({
        organizationId: defaultOrg._id,
        userId: adminA._id,
        role: MEMBERSHIP_ROLES.ORG_ADMIN
      });
      const studentMem = await OrganizationMembership.findOne({
        organizationId: defaultOrg._id,
        userId: studentA._id,
        role: MEMBERSHIP_ROLES.STUDENT
      });
      const recruiterMem = await OrganizationMembership.findOne({
        userId: recruiterLegacy._id
      });

      expect(adminMem?.status).toBe(MEMBERSHIP_STATUSES.ACTIVE);
      expect(studentMem?.status).toBe(MEMBERSHIP_STATUSES.ACTIVE);
      expect(recruiterMem).toBeNull(); // Legacy recruiter gets no v3 membership

      // Second run must be 100% idempotent (zero new writes)
      const secondRun = await runOrgBackfill({ dryRun: false, logger: () => {} });
      expect(secondRun.defaultOrgCreated).toBe(0);
      expect(secondRun.usersUpdated).toBe(0);
      expect(secondRun.studentProfilesUpdated).toBe(0);
      expect(secondRun.membershipsCreated).toBe(0);
      expect(secondRun.membershipsSkipped).toBeGreaterThanOrEqual(2);
    });
  });

  describe('2. GET /me, GET /auth/me & GET /organizations/current', () => {
    it('GET /api/v1/me returns user + memberships + organization', async () => {
      const res = await request(app)
        .get('/api/v1/me')
        .set('Authorization', `Bearer ${adminAToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.user.email).toBe(adminA.email);
      expect(res.body.data.organization.slug).toBe('default-org');
      expect(res.body.data.memberships).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            role: MEMBERSHIP_ROLES.ORG_ADMIN,
            status: MEMBERSHIP_STATUSES.ACTIVE
          })
        ])
      );
    });

    it('GET /api/v1/auth/me also includes memberships + organization without breaking v1 shape', async () => {
      const res = await request(app)
        .get('/api/v1/auth/me')
        .set('Authorization', `Bearer ${studentAToken}`);

      expect(res.status).toBe(200);
      expect(res.body.data.user.email).toBe(studentA.email);
      expect(res.body.data.profile.studentId).toBe(studentAProfile.studentId);
      expect(res.body.data.memberships[0].role).toBe(MEMBERSHIP_ROLES.STUDENT);
    });

    it('GET /api/v1/organizations/current blocks users with no active membership (403 FORBIDDEN)', async () => {
      const res = await request(app)
        .get('/api/v1/organizations/current')
        .set('Authorization', `Bearer ${recruiterLegacyToken}`);

      expect(res.status).toBe(403);
      expect(res.body.success).toBe(false);
      expect(res.body.code).toBe(ERROR_CODES.FORBIDDEN);
    });
  });

  describe('3. Staff Role Management (Allowed, Denied, Self-Protection & Audit)', () => {
    let grantedMembershipId;

    beforeAll(async () => {
      coordinatorA = await User.create({
        name: 'Coord User',
        email: `coord_v1_${ts}@campus.test`,
        passwordHash: 'dummyhash',
        role: ROLES.STUDENT,
        accountStatus: USER_STATUSES.ACTIVE,
        organizationId: defaultOrg._id
      });
      createdUserIds.push(coordinatorA._id);
      coordinatorAToken = signToken({ id: coordinatorA._id, role: coordinatorA.role });

      interviewerA = await User.create({
        name: 'Interviewer User',
        email: `interviewer_v1_${ts}@campus.test`,
        passwordHash: 'dummyhash',
        role: ROLES.STUDENT,
        accountStatus: USER_STATUSES.ACTIVE,
        organizationId: defaultOrg._id
      });
      createdUserIds.push(interviewerA._id);
      interviewerAToken = signToken({ id: interviewerA._id, role: interviewerA.role });
    });

    it('denies unauthenticated access to /admin/staff with 401 UNAUTHORIZED', async () => {
      const res = await request(app).get('/api/v1/admin/staff');
      expect(res.status).toBe(401);
      expect(res.body.code).toBe(ERROR_CODES.UNAUTHORIZED);
    });

    it('denies STUDENT from listing or granting staff roles (403 FORBIDDEN, no mutation)', async () => {
      const listRes = await request(app)
        .get('/api/v1/admin/staff')
        .set('Authorization', `Bearer ${studentAToken}`);
      expect(listRes.status).toBe(403);
      expect(listRes.body.code).toBe(ERROR_CODES.FORBIDDEN);

      const postRes = await request(app)
        .post('/api/v1/admin/staff')
        .set('Authorization', `Bearer ${studentAToken}`)
        .send({ email: coordinatorA.email, role: MEMBERSHIP_ROLES.PLACEMENT_COORDINATOR });
      expect(postRes.status).toBe(403);

      const count = await OrganizationMembership.countDocuments({ userId: coordinatorA._id });
      expect(count).toBe(0);
    });

    it('allows ORG_ADMIN to grant staff role and records an audit event', async () => {
      const res = await request(app)
        .post('/api/v1/admin/staff')
        .set('Authorization', `Bearer ${adminAToken}`)
        .send({
          email: coordinatorA.email,
          role: MEMBERSHIP_ROLES.PLACEMENT_COORDINATOR
        });

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.data.role).toBe(MEMBERSHIP_ROLES.PLACEMENT_COORDINATOR);
      expect(res.body.data.status).toBe(MEMBERSHIP_STATUSES.ACTIVE);
      grantedMembershipId = res.body.data.id;

      // Verify audit log persisted with org scope & entityType/entityId
      const audit = await AuditLog.findOne({
        organizationId: defaultOrg._id,
        actorId: adminA._id,
        action: 'STAFF_ROLE_GRANTED',
        entityType: 'OrganizationMembership',
        entityId: grantedMembershipId
      });
      expect(audit).not.toBeNull();
      expect(audit.metadata.role).toBe(MEMBERSHIP_ROLES.PLACEMENT_COORDINATOR);
      expect(audit.metadata.newStatus).toBe(MEMBERSHIP_STATUSES.ACTIVE);
    });

    it('rejects duplicate active role grant with 409 CONFLICT', async () => {
      const res = await request(app)
        .post('/api/v1/admin/staff')
        .set('Authorization', `Bearer ${adminAToken}`)
        .send({
          email: coordinatorA.email,
          role: MEMBERSHIP_ROLES.PLACEMENT_COORDINATOR
        });

      expect(res.status).toBe(409);
      expect(res.body.code).toBe(ERROR_CODES.CONFLICT);
    });

    it('denies PLACEMENT_COORDINATOR from managing staff roles (least privilege -> 403)', async () => {
      const res = await request(app)
        .post('/api/v1/admin/staff')
        .set('Authorization', `Bearer ${coordinatorAToken}`)
        .send({ email: interviewerA.email, role: MEMBERSHIP_ROLES.INTERVIEWER });

      expect(res.status).toBe(403);
      expect(res.body.code).toBe(ERROR_CODES.FORBIDDEN);
    });

    it('lists staff memberships with pagination and filters', async () => {
      const res = await request(app)
        .get('/api/v1/admin/staff?role=PLACEMENT_COORDINATOR&page=1&limit=10')
        .set('Authorization', `Bearer ${adminAToken}`);

      expect(res.status).toBe(200);
      expect(Array.isArray(res.body.data)).toBe(true);
      expect(res.body.pagination).toBeDefined();
      expect(res.body.data.some((m) => m.id === grantedMembershipId)).toBe(true);
    });

    it('prevents ORG_ADMIN from revoking own ORG_ADMIN membership (400 VALIDATION_ERROR)', async () => {
      const selfMem = await OrganizationMembership.findOne({
        organizationId: defaultOrg._id,
        userId: adminA._id,
        role: MEMBERSHIP_ROLES.ORG_ADMIN
      });

      const res = await request(app)
        .patch(`/api/v1/admin/staff/${selfMem._id}`)
        .set('Authorization', `Bearer ${adminAToken}`)
        .send({ status: MEMBERSHIP_STATUSES.REVOKED });

      expect(res.status).toBe(400);
      expect(res.body.code).toBe(ERROR_CODES.VALIDATION_ERROR);
    });

    it('allows ORG_ADMIN to suspend/revoke staff membership and audits the change', async () => {
      const res = await request(app)
        .patch(`/api/v1/admin/staff/${grantedMembershipId}`)
        .set('Authorization', `Bearer ${adminAToken}`)
        .send({ status: MEMBERSHIP_STATUSES.REVOKED });

      expect(res.status).toBe(200);
      expect(res.body.data.status).toBe(MEMBERSHIP_STATUSES.REVOKED);

      const audit = await AuditLog.findOne({
        organizationId: defaultOrg._id,
        actorId: adminA._id,
        action: 'STAFF_ROLE_UPDATED',
        entityType: 'OrganizationMembership',
        entityId: grantedMembershipId
      });
      expect(audit).not.toBeNull();
      expect(audit.metadata.previousStatus).toBe(MEMBERSHIP_STATUSES.ACTIVE);
      expect(audit.metadata.newStatus).toBe(MEMBERSHIP_STATUSES.REVOKED);

      // Revoked user no longer has an active org membership
      const orgCheck = await request(app)
        .get('/api/v1/organizations/current')
        .set('Authorization', `Bearer ${coordinatorAToken}`);
      expect(orgCheck.status).toBe(403);
    });
  });

  describe('4. Organization Isolation (Cross-Org Access -> 404)', () => {
    let orgAMembership;

    beforeAll(async () => {
      orgB = await Organization.create({
        name: 'Second Campus Org',
        slug: `org-b-${ts}`,
        timezone: 'UTC',
        status: ORGANIZATION_STATUSES.ACTIVE
      });
      createdOrgIds.push(orgB._id);

      adminB = await User.create({
        name: 'Org B Admin',
        email: `admin_orgb_${ts}@orgb.test`,
        passwordHash: 'dummyhash',
        role: ROLES.ADMIN,
        accountStatus: USER_STATUSES.ACTIVE,
        organizationId: orgB._id
      });
      createdUserIds.push(adminB._id);
      adminBToken = signToken({ id: adminB._id, role: adminB.role });

      await OrganizationMembership.create({
        organizationId: orgB._id,
        userId: adminB._id,
        role: MEMBERSHIP_ROLES.ORG_ADMIN,
        status: MEMBERSHIP_STATUSES.ACTIVE
      });

      userB = await User.create({
        name: 'Org B Staff Candidate',
        email: `user_orgb_${ts}@orgb.test`,
        passwordHash: 'dummyhash',
        role: ROLES.STUDENT,
        accountStatus: USER_STATUSES.ACTIVE,
        organizationId: orgB._id
      });
      createdUserIds.push(userB._id);

      orgAMembership = await OrganizationMembership.findOne({
        organizationId: defaultOrg._id,
        userId: adminA._id,
        role: MEMBERSHIP_ROLES.ORG_ADMIN
      });
    });

    it('Admin B cannot list Org A staff even if supplying organizationId in query', async () => {
      const res = await request(app)
        .get(`/api/v1/admin/staff?organizationId=${defaultOrg._id}`)
        .set('Authorization', `Bearer ${adminBToken}`);

      expect(res.status).toBe(200);
      const returnedUserIds = res.body.data.map((m) => m.userId?.id || m.userId);
      expect(returnedUserIds).not.toContain(adminA._id.toString());
      expect(returnedUserIds).toContain(adminB._id.toString());
    });

    it('Admin B cannot grant a role to an Org A user (returns 404 NOT_FOUND)', async () => {
      const res = await request(app)
        .post('/api/v1/admin/staff')
        .set('Authorization', `Bearer ${adminBToken}`)
        .send({
          email: interviewerA.email,
          role: MEMBERSHIP_ROLES.INTERVIEWER,
          organizationId: defaultOrg._id // Must be ignored
        });

      expect(res.status).toBe(404);
      expect(res.body.code).toBe(ERROR_CODES.NOT_FOUND);
    });

    it('Admin B cannot modify an Org A membership (returns 404 NOT_FOUND, no DB mutation)', async () => {
      const res = await request(app)
        .patch(`/api/v1/admin/staff/${orgAMembership._id}`)
        .set('Authorization', `Bearer ${adminBToken}`)
        .send({ status: MEMBERSHIP_STATUSES.REVOKED });

      expect(res.status).toBe(404);
      expect(res.body.code).toBe(ERROR_CODES.NOT_FOUND);

      const unchanged = await OrganizationMembership.findById(orgAMembership._id);
      expect(unchanged.status).toBe(MEMBERSHIP_STATUSES.ACTIVE);
    });
  });

  describe('5. Legacy v1 AuditLog Compatibility & Metadata Sanitization', () => {
    it('logAdminAction writes via single audit service, mirrors entityType, and strips secrets', async () => {
      const created = await logAdminAction({
        actorId: adminA._id,
        action: 'LEGACY_CHECK',
        resourceType: 'User',
        resourceId: studentA._id,
        metadata: {
          note: 'safe',
          password: 'do_not_log_password',
          accessToken: 'do_not_log_token',
          answerKey: 'do_not_log_key'
        }
      });

      expect(created).not.toBeNull();
      expect(created.resourceType).toBe('User');
      expect(created.entityType).toBe('User');
      expect(created.metadata.note).toBe('safe');
      expect(created.metadata.password).toBeUndefined();
      expect(created.metadata.accessToken).toBeUndefined();
      expect(created.metadata.answerKey).toBeUndefined();
    });
  });
});
