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
  AmbassadorProfile,
  AmbassadorCampaign,
  AmbassadorReferralCode,
  ReferredParticipant,
  AmbassadorCertificate,
  AuditLog
} from '../src/models/index.js';
import { signToken } from '../src/utils/token.js';
import {
  ROLES,
  USER_STATUSES,
  MEMBERSHIP_ROLES,
  MEMBERSHIP_STATUSES,
  AMBASSADOR_PROFILE_STATUSES,
  AMBASSADOR_CAMPAIGN_STATUSES,
  REFERRED_PARTICIPANT_STATUSES,
  AMBASSADOR_CERTIFICATE_STATUSES
} from '../src/utils/constants.js';

jest.setTimeout(45000);

describe('Chunk V11: Campus Ambassadors & Referral Lifecycle Suite', () => {
  const ts = Date.now();
  let orgA, orgB;
  let adminA, adminAToken;
  let coordinatorA, coordinatorAToken;
  let studentA1, studentA1Profile, studentA1Token;
  let studentA2, studentA2Profile, studentA2Token;
  let adminB, adminBToken;
  let studentB1, studentB1Profile, studentB1Token;

  let activeCampaignA;
  let ambassadorProfileA1;
  let referralCodeA1;

  beforeAll(async () => {
    await connectDB();

    // 1. Create Org A and Org B
    orgA = await Organization.create({
      name: `Ambassador Univ A ${ts}`,
      code: `AMB_A_${ts}`,
      slug: `amb-a-${ts}`,
      domain: `amb-a-${ts}.edu`
    });

    orgB = await Organization.create({
      name: `Ambassador Univ B ${ts}`,
      code: `AMB_B_${ts}`,
      slug: `amb-b-${ts}`,
      domain: `amb-b-${ts}.edu`
    });

    // 2. Org A Users
    adminA = await User.create({
      name: 'Admin Alice',
      email: `admin-a-${ts}@univ.edu`,
      passwordHash: 'hash',
      role: 'admin',
      status: USER_STATUSES.ACTIVE
    });
    await Membership.create({
      userId: adminA._id,
      organizationId: orgA._id,
      role: MEMBERSHIP_ROLES.ORG_ADMIN,
      status: MEMBERSHIP_STATUSES.ACTIVE
    });
    adminAToken = signToken({ id: adminA._id, role: 'admin', organizationId: orgA._id });

    coordinatorA = await User.create({
      name: 'Coordinator Chloe',
      email: `coordinator-a-${ts}@univ.edu`,
      passwordHash: 'hash',
      role: 'admin',
      status: USER_STATUSES.ACTIVE
    });
    await Membership.create({
      userId: coordinatorA._id,
      organizationId: orgA._id,
      role: MEMBERSHIP_ROLES.AMBASSADOR_COORDINATOR,
      status: MEMBERSHIP_STATUSES.ACTIVE
    });
    coordinatorAToken = signToken({ id: coordinatorA._id, role: 'staff', organizationId: orgA._id });

    studentA1 = await User.create({
      name: 'Ambassador Student 1',
      email: `student-a1-${ts}@univ.edu`,
      passwordHash: 'hash',
      role: 'student',
      status: USER_STATUSES.ACTIVE
    });
    await Membership.create({
      userId: studentA1._id,
      organizationId: orgA._id,
      role: MEMBERSHIP_ROLES.STUDENT,
      status: MEMBERSHIP_STATUSES.ACTIVE
    });
    studentA1Profile = await StudentProfile.create({
      userId: studentA1._id,
      organizationId: orgA._id,
      fullName: 'Student Ambassador One',
      studentId: `USN-AMB-1-${ts}`,
      rollNumber: `USN-AMB-1-${ts}`,
      degree: 'B.Tech',
      branch: 'CSE',
      graduationYear: 2026,
      cgpa: 8.5
    });
    studentA1Token = signToken({ id: studentA1._id, role: 'student', organizationId: orgA._id });

    studentA2 = await User.create({
      name: 'Dual Role Ambassador Student 2',
      email: `student-a2-${ts}@univ.edu`,
      passwordHash: 'hash',
      role: 'student',
      status: USER_STATUSES.ACTIVE
    });
    // Student A2 has both STUDENT and AMBASSADOR_COORDINATOR roles to test anti-self-approval!
    await Membership.create({
      userId: studentA2._id,
      organizationId: orgA._id,
      role: MEMBERSHIP_ROLES.STUDENT,
      status: MEMBERSHIP_STATUSES.ACTIVE
    });
    await Membership.create({
      userId: studentA2._id,
      organizationId: orgA._id,
      role: MEMBERSHIP_ROLES.AMBASSADOR_COORDINATOR,
      status: MEMBERSHIP_STATUSES.ACTIVE
    });
    studentA2Profile = await StudentProfile.create({
      userId: studentA2._id,
      organizationId: orgA._id,
      fullName: 'Dual Role Candidate',
      studentId: `USN-AMB-2-${ts}`,
      rollNumber: `USN-AMB-2-${ts}`,
      degree: 'B.Tech',
      branch: 'ECE',
      graduationYear: 2026,
      cgpa: 8.2
    });
    studentA2Token = signToken({ id: studentA2._id, role: 'student', organizationId: orgA._id });

    // 3. Org B Users
    adminB = await User.create({
      name: 'Admin Bob',
      email: `admin-b-${ts}@univ.edu`,
      passwordHash: 'hash',
      role: 'admin',
      status: USER_STATUSES.ACTIVE
    });
    await Membership.create({
      userId: adminB._id,
      organizationId: orgB._id,
      role: MEMBERSHIP_ROLES.ORG_ADMIN,
      status: MEMBERSHIP_STATUSES.ACTIVE
    });
    adminBToken = signToken({ id: adminB._id, role: 'admin', organizationId: orgB._id });

    studentB1 = await User.create({
      name: 'Student Org B',
      email: `student-b1-${ts}@univ.edu`,
      passwordHash: 'hash',
      role: 'student',
      status: USER_STATUSES.ACTIVE
    });
    await Membership.create({
      userId: studentB1._id,
      organizationId: orgB._id,
      role: MEMBERSHIP_ROLES.STUDENT,
      status: MEMBERSHIP_STATUSES.ACTIVE
    });
    studentB1Profile = await StudentProfile.create({
      userId: studentB1._id,
      organizationId: orgB._id,
      fullName: 'Student Org B',
      studentId: `USN-B-1-${ts}`,
      rollNumber: `USN-B-1-${ts}`,
      degree: 'B.Tech',
      branch: 'IT',
      graduationYear: 2026,
      cgpa: 8.0
    });
    studentB1Token = signToken({ id: studentB1._id, role: 'student', organizationId: orgB._id });

    // 4. Seed an Active Campaign in Org A
    activeCampaignA = await AmbassadorCampaign.create({
      organizationId: orgA._id,
      name: 'Fall 2026 Campus Outreach',
      description: 'Campus outreach program to introduce peer students to placement readiness tools.',
      targetCount: 2, // low target for fast test verification
      startsAt: new Date(Date.now() - 24 * 3600 * 1000),
      endsAt: new Date(Date.now() + 30 * 24 * 3600 * 1000),
      verificationRules: {
        requireContactVerified: true,
        requireValidInstitute: true,
        requireQualifyingActivity: false
      },
      status: AMBASSADOR_CAMPAIGN_STATUSES.ACTIVE,
      createdBy: adminA._id
    });
  });

  afterAll(async () => {
    await Organization.deleteMany({});
    await User.deleteMany({});
    await Membership.deleteMany({});
    await StudentProfile.deleteMany({});
    await AmbassadorProfile.deleteMany({});
    await AmbassadorCampaign.deleteMany({});
    await AmbassadorReferralCode.deleteMany({});
    await ReferredParticipant.deleteMany({});
    await AmbassadorCertificate.deleteMany({});
    await AuditLog.deleteMany({});
    await disconnectDB();
  });

  describe('1. Ambassador Application & Coordinator Approval Lifecycle', () => {
    it('allows a student to apply for the ambassador program with statement notes', async () => {
      const res = await request(app)
        .post('/api/v1/students/me/ambassador/apply')
        .set('Authorization', `Bearer ${studentA1Token}`)
        .send({ applicationNotes: 'Passionate about helping peers navigate tech career prep.' });

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.data.status).toBe(AMBASSADOR_PROFILE_STATUSES.PENDING);
      expect(res.body.data.applicationNotes).toContain('Passionate about helping');

      ambassadorProfileA1 = await AmbassadorProfile.findById(res.body.data._id);
      expect(ambassadorProfileA1).toBeDefined();
    });

    it('rejects duplicate pending ambassador applications', async () => {
      const res = await request(app)
        .post('/api/v1/students/me/ambassador/apply')
        .set('Authorization', `Bearer ${studentA1Token}`)
        .send({ applicationNotes: 'Trying to apply twice' });

      expect(res.status).toBe(409);
      expect(res.body.message).toContain('already pending');
    });

    it('allows coordinator to list pending applications and approve with automated referral code provisioning', async () => {
      const listRes = await request(app)
        .get('/api/v1/admin/ambassadors/profiles')
        .set('Authorization', `Bearer ${coordinatorAToken}`);

      expect(listRes.status).toBe(200);
      expect(listRes.body.data.profiles.length).toBeGreaterThanOrEqual(1);

      const targetApp = listRes.body.data.profiles.find((p) => p.id.toString() === ambassadorProfileA1._id.toString());
      expect(targetApp).toBeDefined();
      expect(targetApp.status).toBe(AMBASSADOR_PROFILE_STATUSES.PENDING);

      // Approve application
      const approveRes = await request(app)
        .patch(`/api/v1/admin/ambassadors/profiles/${ambassadorProfileA1._id}/status`)
        .set('Authorization', `Bearer ${coordinatorAToken}`)
        .send({ status: AMBASSADOR_PROFILE_STATUSES.APPROVED });

      expect(approveRes.status).toBe(200);
      expect(approveRes.body.data.status).toBe(AMBASSADOR_PROFILE_STATUSES.APPROVED);

      // Verify referral code was auto-provisioned
      referralCodeA1 = await AmbassadorReferralCode.findOne({
        organizationId: orgA._id,
        ambassadorProfileId: ambassadorProfileA1._id,
        campaignId: activeCampaignA._id
      });

      expect(referralCodeA1).toBeDefined();
      expect(referralCodeA1.code).toMatch(/^HT-[A-F0-9]{8}$/);
      expect(referralCodeA1.active).toBe(true);
    });

    it('requires a reason when rejecting or suspending an ambassador application', async () => {
      const studentTemp = await User.create({
        name: 'Temp Student',
        email: `temp-student-${ts}@univ.edu`,
        passwordHash: 'hash',
        role: 'student',
        status: USER_STATUSES.ACTIVE
      });
      await Membership.create({
        userId: studentTemp._id,
        organizationId: orgA._id,
        role: MEMBERSHIP_ROLES.STUDENT,
        status: MEMBERSHIP_STATUSES.ACTIVE
      });
      const tempProfile = await StudentProfile.create({
        userId: studentTemp._id,
        organizationId: orgA._id,
        fullName: 'Temp Student',
        studentId: `USN-TEMP-${ts}`,
        degree: 'B.Tech',
        branch: 'CSE',
        graduationYear: 2026
      });
      const tempToken = signToken({ id: studentTemp._id, role: 'student', organizationId: orgA._id });

      const applyRes = await request(app)
        .post('/api/v1/students/me/ambassador/apply')
        .set('Authorization', `Bearer tempToken`) // invalid token test
        .set('Authorization', `Bearer ${tempToken}`)
        .send({ applicationNotes: 'Temp apply' });

      // Reject without reason should fail
      const rejectFail = await request(app)
        .patch(`/api/v1/admin/ambassadors/profiles/${applyRes.body.data._id}/status`)
        .set('Authorization', `Bearer ${coordinatorAToken}`)
        .send({ status: AMBASSADOR_PROFILE_STATUSES.REJECTED });

      expect(rejectFail.status).toBe(400);
      expect(rejectFail.body.message).toContain('reason is required');

      // Reject with valid reason
      const rejectSuccess = await request(app)
        .patch(`/api/v1/admin/ambassadors/profiles/${applyRes.body.data._id}/status`)
        .set('Authorization', `Bearer ${coordinatorAToken}`)
        .send({ status: AMBASSADOR_PROFILE_STATUSES.REJECTED, reason: 'Incomplete semester criteria' });

      expect(rejectSuccess.status).toBe(200);
      expect(rejectSuccess.body.data.status).toBe(AMBASSADOR_PROFILE_STATUSES.REJECTED);
      expect(rejectSuccess.body.data.rejectionReason).toBe('Incomplete semester criteria');
    });

    it('denies self-approval when a user attempts to approve their own ambassador profile', async () => {
      // Student A2 applies
      const applyRes = await request(app)
        .post('/api/v1/students/me/ambassador/apply')
        .set('Authorization', `Bearer ${studentA2Token}`)
        .send({ applicationNotes: 'Dual role self-approval attempt' });

      const profileId = applyRes.body.data._id;

      // Student A2 is also an AMBASSADOR_COORDINATOR, but cannot approve own profile!
      const selfApproveRes = await request(app)
        .patch(`/api/v1/admin/ambassadors/profiles/${profileId}/status`)
        .set('Authorization', `Bearer ${studentA2Token}`)
        .send({ status: AMBASSADOR_PROFILE_STATUSES.APPROVED });

      expect(selfApproveRes.status).toBe(403);
      expect(selfApproveRes.body.message).toContain('cannot approve or modify their own ambassador status');
    });
  });

  describe('2. Student Ambassador Dashboard & PII Masking', () => {
    it('returns ambassador status, code, sharable link, and target progress', async () => {
      const res = await request(app)
        .get('/api/v1/students/me/ambassador')
        .set('Authorization', `Bearer ${studentA1Token}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.isAmbassador).toBe(true);
      expect(res.body.data.profile.status).toBe(AMBASSADOR_PROFILE_STATUSES.APPROVED);
      expect(res.body.data.referralCode).toBe(referralCodeA1.code);
      expect(res.body.data.referralLink).toContain(`referral?code=${referralCodeA1.code}`);
      expect(res.body.data.stats.targetCount).toBe(2);
      expect(res.body.data.stats.verifiedCount).toBe(0);
    });
  });

  describe('3. Public Referral Capture & Deduplication (POST /api/v1/referrals/capture)', () => {
    it('captures a valid public referral using the active referral code', async () => {
      const res = await request(app)
        .post('/api/v1/referrals/capture')
        .send({
          code: referralCodeA1.code,
          name: 'Jane Doe',
          email: 'jane.doe@samplecollege.edu',
          phone: '+91-9876543210',
          institute: 'St. Xavier Institute of Tech',
          notes: 'Interested in frontend interview prep'
        });

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.data.verificationStatus).toBe(REFERRED_PARTICIPANT_STATUSES.PENDING);
    });

    it('rejects capture when using an invalid or inactive referral code', async () => {
      const res = await request(app)
        .post('/api/v1/referrals/capture')
        .send({
          code: 'HT-INVALID99',
          name: 'John Smith',
          email: 'john@sample.edu',
          phone: '9876500000',
          institute: 'ABC College'
        });

      expect(res.status).toBe(404);
      expect(res.body.message).toContain('Invalid or inactive referral code');
    });

    it('flags duplicate referrals as DUPLICATE and never silently counts them', async () => {
      // Submit same email and phone again with different casing/spacing
      const dupRes = await request(app)
        .post('/api/v1/referrals/capture')
        .send({
          code: referralCodeA1.code,
          name: 'Jane Doe Variant',
          email: ' JANE.DOE@SampleCollege.edu ',
          phone: '98765-43210',
          institute: 'St. Xavier Institute of Tech'
        });

      expect(dupRes.status).toBe(201);
      expect(dupRes.body.data.verificationStatus).toBe(REFERRED_PARTICIPANT_STATUSES.DUPLICATE);
      expect(dupRes.body.message).toContain('marked duplicate');

      const dupRecord = await ReferredParticipant.findById(dupRes.body.data.referralId);
      expect(dupRecord.verificationStatus).toBe(REFERRED_PARTICIPANT_STATUSES.DUPLICATE);
      expect(dupRecord.reason).toContain('Duplicate participant email or phone');
    });

    it('masks PII in the ambassador referral list view', async () => {
      const res = await request(app)
        .get('/api/v1/students/me/ambassador/referrals')
        .set('Authorization', `Bearer ${studentA1Token}`);

      expect(res.status).toBe(200);
      expect(res.body.data.referrals.length).toBe(2);

      const item = res.body.data.referrals[0];
      // Name, email, and phone must be masked!
      expect(item.maskedName).toMatch(/^[A-Z]\*+/);
      expect(item.maskedEmail).toMatch(/^[a-z]\*+@/);
      expect(item.maskedPhone).toMatch(/^\*+\d{4}$/);
      expect(item.email).toBeUndefined();
      expect(item.phone).toBeUndefined();
    });
  });

  describe('4. Referral Verification Queue & Anti-Self-Verification', () => {
    let pendingReferralId;

    beforeAll(async () => {
      const ref = await ReferredParticipant.findOne({
        ambassadorProfileId: ambassadorProfileA1._id,
        verificationStatus: REFERRED_PARTICIPANT_STATUSES.PENDING
      });
      pendingReferralId = ref._id;
    });

    it('denies verification if an ambassador attempts to verify their own referral', async () => {
      // Create a referral under Student A2
      const codeA2 = await AmbassadorReferralCode.create({
        organizationId: orgA._id,
        ambassadorProfileId: ambassadorProfileA1._id,
        campaignId: activeCampaignA._id,
        code: 'HT-TESTA2CODE',
        active: true
      });
      const ownRef = await ReferredParticipant.create({
        organizationId: orgA._id,
        codeId: codeA2._id,
        campaignId: activeCampaignA._id,
        ambassadorProfileId: ambassadorProfileA1._id,
        name: 'Peer Student',
        email: 'peer@univ.edu',
        phone: '9988776655',
        institute: 'Engineering College',
        dedupeKey: 'unique-key-own-ref'
      });

      // studentA1 is the ambassador for ownRef. If studentA1 tries to verify it:
      const res = await request(app)
        .patch(`/api/v1/admin/ambassadors/referrals/${ownRef._id}/verify`)
        .set('Authorization', `Bearer ${studentA1Token}`)
        .send({
          verificationStatus: REFERRED_PARTICIPANT_STATUSES.VERIFIED,
          reason: 'Self-approval attempt'
        });

      // Should be forbidden (either by membership authorization or anti-self-verification guard)
      expect([403, 401]).toContain(res.status);
    });

    it('requires a reason when coordinator verifies or rejects a referral', async () => {
      const failRes = await request(app)
        .patch(`/api/v1/admin/ambassadors/referrals/${pendingReferralId}/verify`)
        .set('Authorization', `Bearer ${coordinatorAToken}`)
        .send({ verificationStatus: REFERRED_PARTICIPANT_STATUSES.VERIFIED });

      expect(failRes.status).toBe(400);
      expect(failRes.body.message).toContain('reason is required');
    });

    it('allows coordinator to verify referrals and records audit trail', async () => {
      // 1. Verify First Referral
      const verify1 = await request(app)
        .patch(`/api/v1/admin/ambassadors/referrals/${pendingReferralId}/verify`)
        .set('Authorization', `Bearer ${coordinatorAToken}`)
        .send({
          verificationStatus: REFERRED_PARTICIPANT_STATUSES.VERIFIED,
          reason: 'Verified enrolled student via official college register'
        });

      expect(verify1.status).toBe(200);
      expect(verify1.body.data.verificationStatus).toBe(REFERRED_PARTICIPANT_STATUSES.VERIFIED);

      // Audit log recorded
      const audit = await AuditLog.findOne({
        action: 'VERIFY_REFERRAL',
        resourceId: pendingReferralId
      });
      expect(audit).toBeDefined();
      expect(audit.metadata.reason).toContain('college register');

      // 2. Capture and Verify Second Referral to hit the target count of 2
      const ref2Capture = await request(app)
        .post('/api/v1/referrals/capture')
        .send({
          code: referralCodeA1.code,
          name: 'Robert Fox',
          email: 'robert.fox@college.edu',
          phone: '9123456780',
          institute: 'Tech Institute of Science'
        });

      const verify2 = await request(app)
        .patch(`/api/v1/admin/ambassadors/referrals/${ref2Capture.body.data.referralId}/verify`)
        .set('Authorization', `Bearer ${coordinatorAToken}`)
        .send({
          verificationStatus: REFERRED_PARTICIPANT_STATUSES.VERIFIED,
          reason: 'Verified enrollment credentials'
        });

      expect(verify2.status).toBe(200);

      // Automatically triggers certificate ELIGIBLE status
      const cert = await AmbassadorCertificate.findOne({
        organizationId: orgA._id,
        ambassadorProfileId: ambassadorProfileA1._id,
        campaignId: activeCampaignA._id
      });

      expect(cert).toBeDefined();
      expect(cert.status).toBe(AMBASSADOR_CERTIFICATE_STATUSES.ELIGIBLE);
      expect(cert.metadata.verifiedCount).toBe(2);
      expect(cert.metadata.includeBranding).toBe(false); // No branding unless configured
    });
  });

  describe('5. Certificate Review & Issuance Lifecycle', () => {
    let certificateId;

    it('allows student to request certificate review once ELIGIBLE', async () => {
      const res = await request(app)
        .post('/api/v1/students/me/ambassador/certificate/request')
        .set('Authorization', `Bearer ${studentA1Token}`)
        .send({ campaignId: activeCampaignA._id });

      expect(res.status).toBe(200);
      expect(res.body.data.status).toBe(AMBASSADOR_CERTIFICATE_STATUSES.UNDER_REVIEW);
      certificateId = res.body.data._id;
    });

    it('denies certificate approval when an ambassador attempts to approve their own certificate', async () => {
      // Student A1 attempting to approve certificate under their own profile:
      const res = await request(app)
        .patch(`/api/v1/admin/ambassadors/certificates/${certificateId}/status`)
        .set('Authorization', `Bearer ${studentA1Token}`)
        .send({ status: AMBASSADOR_CERTIFICATE_STATUSES.APPROVED });

      expect([403, 401]).toContain(res.status);
    });

    it('coordinator approves and issues certificate with unique certificate number and object key', async () => {
      // 1. Coordinator approves
      const approveRes = await request(app)
        .patch(`/api/v1/admin/ambassadors/certificates/${certificateId}/status`)
        .set('Authorization', `Bearer ${coordinatorAToken}`)
        .send({ status: AMBASSADOR_CERTIFICATE_STATUSES.APPROVED });

      expect(approveRes.status).toBe(200);
      expect(approveRes.body.data.status).toBe(AMBASSADOR_CERTIFICATE_STATUSES.APPROVED);

      // 2. Coordinator issues
      const issueRes = await request(app)
        .patch(`/api/v1/admin/ambassadors/certificates/${certificateId}/status`)
        .set('Authorization', `Bearer ${coordinatorAToken}`)
        .send({ status: AMBASSADOR_CERTIFICATE_STATUSES.ISSUED });

      expect(issueRes.status).toBe(200);
      expect(issueRes.body.data.status).toBe(AMBASSADOR_CERTIFICATE_STATUSES.ISSUED);
      expect(issueRes.body.data.certificateNumber).toMatch(/^CERT-AMB-/);
      expect(issueRes.body.data.certificateObjectKey).toContain(`certificates/ambassador-${certificateId}.pdf`);
      expect(issueRes.body.data.issuedAt).toBeDefined();

      // Verified on student self view
      const studentView = await request(app)
        .get('/api/v1/students/me/ambassador')
        .set('Authorization', `Bearer ${studentA1Token}`);

      expect(studentView.body.data.certificate.status).toBe(AMBASSADOR_CERTIFICATE_STATUSES.ISSUED);
      expect(studentView.body.data.certificate.certificateNumber).toBeDefined();
    });
  });

  describe('6. Organization Isolation & Reporting', () => {
    it('strictly isolates ambassador data: Org B admin cannot see Org A referrals or approve Org A certificates', async () => {
      const listRes = await request(app)
        .get('/api/v1/admin/ambassadors/profiles')
        .set('Authorization', `Bearer ${adminBToken}`);

      expect(listRes.status).toBe(200);
      expect(listRes.body.data.profiles.length).toBe(0);

      // Org B admin cannot verify Org A referral
      const anyRefOrgA = await ReferredParticipant.findOne({ organizationId: orgA._id });
      const crossVerifyRes = await request(app)
        .patch(`/api/v1/admin/ambassadors/referrals/${anyRefOrgA._id}/verify`)
        .set('Authorization', `Bearer ${adminBToken}`)
        .send({
          verificationStatus: REFERRED_PARTICIPANT_STATUSES.VERIFIED,
          reason: 'Cross-org breach attempt'
        });

      expect(crossVerifyRes.status).toBe(404);
    });

    it('generates institutional ambassador metrics report for coordinators', async () => {
      const reportRes = await request(app)
        .get('/api/v1/admin/ambassadors/reports')
        .set('Authorization', `Bearer ${coordinatorAToken}`);

      expect(reportRes.status).toBe(200);
      expect(reportRes.body.data.overview.activeAmbassadors).toBeGreaterThanOrEqual(1);
      expect(reportRes.body.data.referrals.verified).toBeGreaterThanOrEqual(2);
      expect(reportRes.body.data.certificates.issued).toBeGreaterThanOrEqual(1);
    });
  });
});
