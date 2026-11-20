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
  EligibilityEvaluation,
  AuditLog
} from '../src/models/index.js';
import { evaluateEligibility } from '../src/services/eligibilityEngine.js';
import {
  ROLES,
  USER_STATUSES,
  ORGANIZATION_STATUSES,
  MEMBERSHIP_ROLES,
  MEMBERSHIP_STATUSES,
  OPPORTUNITY_STATUSES,
  CRITERIA_TYPES,
  CRITERIA_OPERATORS,
  ELIGIBILITY_STATUSES,
  ELIGIBILITY_RESULT
} from '../src/utils/constants.js';
import { signToken } from '../src/utils/token.js';

jest.setTimeout(30000);

describe('Chunk V4: Eligibility Engine, Snapshot Versioning & Staff Override Suite', () => {
  const ts = Date.now();

  let orgA, orgB;
  let coordinatorA, coordinatorAToken;
  let coordinatorB, coordinatorBToken;
  let studentA, studentAToken, studentAProfile;
  let studentIneligible, studentIneligibleToken, studentIneligibleProfile;
  let studentMissing, studentMissingToken, studentMissingProfile;
  let studentB, studentBToken;
  let opportunityA;

  beforeAll(async () => {
    await connectDB();

    // 1. Create Orgs
    orgA = await Organization.create({
      name: `Org Alpha ${ts}`,
      slug: `org-alpha-${ts}`,
      timezone: 'Asia/Kolkata',
      status: ORGANIZATION_STATUSES.ACTIVE
    });

    orgB = await Organization.create({
      name: `Org Beta ${ts}`,
      slug: `org-beta-${ts}`,
      timezone: 'Asia/Kolkata',
      status: ORGANIZATION_STATUSES.ACTIVE
    });

    // 2. Staff: Placement Coordinator for Org A
    coordinatorA = await User.create({
      name: 'Coordinator A',
      email: `coord_a_${ts}@test.edu`,
      passwordHash: 'dummyhash',
      role: ROLES.ADMIN,
      accountStatus: USER_STATUSES.ACTIVE,
      organizationId: orgA._id
    });
    await OrganizationMembership.create({
      organizationId: orgA._id,
      userId: coordinatorA._id,
      role: MEMBERSHIP_ROLES.PLACEMENT_COORDINATOR,
      status: MEMBERSHIP_STATUSES.ACTIVE
    });
    coordinatorAToken = signToken({ id: coordinatorA._id, role: coordinatorA.role });

    // 3. Staff: Coordinator for Org B
    coordinatorB = await User.create({
      name: 'Coordinator B',
      email: `coord_b_${ts}@test.edu`,
      passwordHash: 'dummyhash',
      role: ROLES.ADMIN,
      accountStatus: USER_STATUSES.ACTIVE,
      organizationId: orgB._id
    });
    await OrganizationMembership.create({
      organizationId: orgB._id,
      userId: coordinatorB._id,
      role: MEMBERSHIP_ROLES.PLACEMENT_COORDINATOR,
      status: MEMBERSHIP_STATUSES.ACTIVE
    });
    coordinatorBToken = signToken({ id: coordinatorB._id, role: coordinatorB.role });

    // 4. Eligible Student for Org A (CGPA 8.0, Branch Computer Science and Engineering, Grad 2026)
    studentA = await User.create({
      name: 'Eligible Student',
      email: `student_eligible_${ts}@test.edu`,
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
    studentAToken = signToken({ id: studentA._id, role: studentA.role });

    studentAProfile = await StudentProfile.create({
      userId: studentA._id,
      organizationId: orgA._id,
      studentCode: `STU-ELG-${ts}`,
      fullName: 'Eligible Student',
      degree: 'B.Tech',
      branch: 'Computer Science and Engineering',
      graduationYear: 2026,
      cgpa: 8.0, // Exactly equals minimum requirement
      skills: ['React', 'Node.js', 'Python']
    });

    // 5. Ineligible Student for Org A (CGPA 7.4 < 8.0)
    studentIneligible = await User.create({
      name: 'Ineligible Student',
      email: `student_ineligible_${ts}@test.edu`,
      passwordHash: 'dummyhash',
      role: ROLES.STUDENT,
      accountStatus: USER_STATUSES.ACTIVE,
      organizationId: orgA._id
    });
    await OrganizationMembership.create({
      organizationId: orgA._id,
      userId: studentIneligible._id,
      role: MEMBERSHIP_ROLES.STUDENT,
      status: MEMBERSHIP_STATUSES.ACTIVE
    });
    studentIneligibleToken = signToken({ id: studentIneligible._id, role: studentIneligible.role });

    studentIneligibleProfile = await StudentProfile.create({
      userId: studentIneligible._id,
      organizationId: orgA._id,
      studentCode: `STU-INEL-${ts}`,
      fullName: 'Ineligible Student',
      degree: 'B.Tech',
      branch: 'Mechanical Engineering',
      graduationYear: 2026,
      cgpa: 7.4,
      skills: ['CAD']
    });

    // 6. Missing Data Student (no CGPA recorded)
    studentMissing = await User.create({
      name: 'Missing Data Student',
      email: `student_missing_${ts}@test.edu`,
      passwordHash: 'dummyhash',
      role: ROLES.STUDENT,
      accountStatus: USER_STATUSES.ACTIVE,
      organizationId: orgA._id
    });
    await OrganizationMembership.create({
      organizationId: orgA._id,
      userId: studentMissing._id,
      role: MEMBERSHIP_ROLES.STUDENT,
      status: MEMBERSHIP_STATUSES.ACTIVE
    });
    studentMissingToken = signToken({ id: studentMissing._id, role: studentMissing.role });

    studentMissingProfile = await StudentProfile.create({
      userId: studentMissing._id,
      organizationId: orgA._id,
      studentCode: `STU-MISS-${ts}`,
      fullName: 'Missing Data Student',
      degree: 'B.Tech',
      branch: 'Computer Science and Engineering',
      graduationYear: 2026,
      cgpa: null // missing CGPA
    });

    // 7. Student in Org B
    studentB = await User.create({
      name: 'Student Org B',
      email: `student_b_${ts}@test.edu`,
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
    studentBToken = signToken({ id: studentB._id, role: studentB.role });

    // 8. Published JobOpportunity in Org A with hard + preferred criteria
    opportunityA = await JobOpportunity.create({
      organizationId: orgA._id,
      companyName: 'Acme Technologies',
      jobTitle: 'Associate Software Engineer',
      description: '### Job Overview\nBuild scalable web services.',
      workMode: 'on_site',
      location: 'Bengaluru',
      compensationText: '₹12-16 LPA',
      applicationUrl: 'https://careers.acme.com/jobs/99',
      applicationInstructions: 'Apply with college verified resume.',
      deadline: new Date(Date.now() + 15 * 86400000),
      status: OPPORTUNITY_STATUSES.PUBLISHED,
      sourceNote: 'Direct campus placement cell drive',
      lastVerifiedAt: new Date(),
      createdBy: coordinatorA._id,
      criteriaVersion: 1,
      criteria: [
        {
          type: CRITERIA_TYPES.MIN_CGPA,
          operator: CRITERIA_OPERATORS.GREATER_EQUAL,
          value: 8.0,
          isHardRequirement: true,
          displayLabel: 'Minimum CGPA 8.0'
        },
        {
          type: CRITERIA_TYPES.BRANCH,
          operator: CRITERIA_OPERATORS.IN,
          value: ['CSE', 'ISE', 'ECE'],
          isHardRequirement: true,
          displayLabel: 'Eligible Branches: CSE, ISE, ECE'
        },
        {
          type: CRITERIA_TYPES.GRADUATION_YEAR,
          operator: CRITERIA_OPERATORS.EQUALS,
          value: 2026,
          isHardRequirement: true,
          displayLabel: 'Batch 2026'
        },
        {
          type: CRITERIA_TYPES.SKILL,
          operator: CRITERIA_OPERATORS.CONTAINS,
          value: 'Docker',
          isHardRequirement: false, // Preferred criterion
          displayLabel: 'Preferred: Docker experience'
        }
      ]
    });
  });

  afterAll(async () => {
    await disconnectDB();
  });

  describe('Pure Deterministic Eligibility Engine (Unit)', () => {
    it('evaluates exact CGPA match (CGPA == min) as a PASS', () => {
      const criteria = [
        { type: CRITERIA_TYPES.MIN_CGPA, value: 8.0, isHardRequirement: true }
      ];
      const result = evaluateEligibility({ cgpa: 8.0 }, criteria);
      expect(result.status).toBe(ELIGIBILITY_STATUSES.LIKELY_ELIGIBLE);
      expect(result.perCriterion[0].result).toBe(ELIGIBILITY_RESULT.PASS);
      expect(result.matched.length).toBe(1);
    });

    it('evaluates CGPA below min as FAIL and returns DOES_NOT_MEET', () => {
      const criteria = [
        { type: CRITERIA_TYPES.MIN_CGPA, value: 8.0, isHardRequirement: true, displayLabel: 'CGPA >= 8.0' }
      ];
      const result = evaluateEligibility({ cgpa: 7.99 }, criteria);
      expect(result.status).toBe(ELIGIBILITY_STATUSES.DOES_NOT_MEET);
      expect(result.unmet).toContain('CGPA >= 8.0');
    });

    it('evaluates branch match with group abbreviations (Computer Science and Engineering <-> CSE)', () => {
      const criteria = [
        { type: CRITERIA_TYPES.BRANCH, value: ['CSE', 'ECE'], isHardRequirement: true }
      ];
      const result = evaluateEligibility({ branch: 'Computer Science and Engineering' }, criteria);
      expect(result.status).toBe(ELIGIBILITY_STATUSES.LIKELY_ELIGIBLE);
      expect(result.perCriterion[0].result).toBe(ELIGIBILITY_RESULT.PASS);
    });

    it('evaluates branch mismatch as FAIL and returns DOES_NOT_MEET', () => {
      const criteria = [
        { type: CRITERIA_TYPES.BRANCH, value: ['CSE'], isHardRequirement: true, displayLabel: 'CSE Only' }
      ];
      const result = evaluateEligibility({ branch: 'Civil Engineering' }, criteria);
      expect(result.status).toBe(ELIGIBILITY_STATUSES.DOES_NOT_MEET);
      expect(result.unmet).toContain('CSE Only');
    });

    it('evaluates missing profile field as MISSING and returns POTENTIALLY_ELIGIBLE', () => {
      const criteria = [
        { type: CRITERIA_TYPES.MIN_CGPA, value: 7.5, isHardRequirement: true, displayLabel: 'Min CGPA 7.5' },
        { type: CRITERIA_TYPES.GRADUATION_YEAR, value: 2026, isHardRequirement: true, displayLabel: 'Batch 2026' }
      ];
      // Profile has year 2026, but cgpa is null
      const result = evaluateEligibility({ graduationYear: 2026, cgpa: null }, criteria);
      expect(result.status).toBe(ELIGIBILITY_STATUSES.POTENTIALLY_ELIGIBLE);
      expect(result.missing).toContain('Min CGPA 7.5');
      expect(result.unmet.length).toBe(0);
    });

    it('ensures preferred criteria never change the status even when unmet', () => {
      const criteria = [
        { type: CRITERIA_TYPES.GRADUATION_YEAR, value: 2026, isHardRequirement: true, displayLabel: 'Batch 2026' },
        { type: CRITERIA_TYPES.SKILL, value: 'Kubernetes', isHardRequirement: false, displayLabel: 'Kubernetes' }
      ];
      // Student has year 2026, but does not have Kubernetes
      const result = evaluateEligibility({ graduationYear: 2026, skills: ['HTML', 'CSS'] }, criteria);
      expect(result.status).toBe(ELIGIBILITY_STATUSES.LIKELY_ELIGIBLE);
      expect(result.preferred.length).toBe(1);
      expect(result.preferred[0].satisfied).toBe(false);
    });

    it('always includes the mandatory advisory disclaimer in the output', () => {
      const result = evaluateEligibility({}, []);
      expect(result.disclaimer).toBeDefined();
      expect(result.disclaimer).toContain('Advisory placement eligibility');
    });
  });

  describe('Student Eligibility Endpoints & Snapshot Versioning', () => {
    it('GET /api/v1/opportunities/:id/eligibility returns LIKELY_ELIGIBLE for fully qualified student', async () => {
      const res = await request(app)
        .get(`/api/v1/opportunities/${opportunityA._id}/eligibility`)
        .set('Authorization', `Bearer ${studentAToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.status).toBe(ELIGIBILITY_STATUSES.LIKELY_ELIGIBLE);
      expect(res.body.data.criteriaVersion).toBe(1);
      expect(res.body.data.snapshot.matched.length).toBe(3); // CGPA, Branch, Year
      expect(res.body.data.snapshot.disclaimer).toBeDefined();

      // Check that evaluation record was created in database
      const count = await EligibilityEvaluation.countDocuments({
        opportunityId: opportunityA._id,
        studentId: studentA._id
      });
      expect(count).toBe(1);
    });

    it('reuses existing evaluation snapshot without creating duplicate records on repeat calls', async () => {
      await request(app)
        .get(`/api/v1/opportunities/${opportunityA._id}/eligibility`)
        .set('Authorization', `Bearer ${studentAToken}`);

      const count = await EligibilityEvaluation.countDocuments({
        opportunityId: opportunityA._id,
        studentId: studentA._id
      });
      expect(count).toBe(1);
    });

    it('returns DOES_NOT_MEET for ineligible student but NEVER gates applicationUrl', async () => {
      const res = await request(app)
        .get(`/api/v1/opportunities/${opportunityA._id}/eligibility`)
        .set('Authorization', `Bearer ${studentIneligibleToken}`);

      expect(res.status).toBe(200);
      expect(res.body.data.status).toBe(ELIGIBILITY_STATUSES.DOES_NOT_MEET);
      expect(res.body.data.snapshot.unmet.length).toBeGreaterThan(0);

      // Student can still view the opportunity details and applicationUrl is present!
      const detailRes = await request(app)
        .get(`/api/v1/opportunities/${opportunityA._id}`)
        .set('Authorization', `Bearer ${studentIneligibleToken}`);

      expect(detailRes.status).toBe(200);
      expect(detailRes.body.data.applicationUrl).toBe('https://careers.acme.com/jobs/99');
      expect(detailRes.body.data.applicationInstructions).toBe('Apply with college verified resume.');
    });

    it('returns POTENTIALLY_ELIGIBLE when hard requirements are missing from student profile', async () => {
      const res = await request(app)
        .get(`/api/v1/opportunities/${opportunityA._id}/eligibility`)
        .set('Authorization', `Bearer ${studentMissingToken}`);

      expect(res.status).toBe(200);
      expect(res.body.data.status).toBe(ELIGIBILITY_STATUSES.POTENTIALLY_ELIGIBLE);
      expect(res.body.data.snapshot.missing).toContain('Minimum CGPA 8.0');
    });

    it('re-evaluates and creates a new snapshot when opportunity criteriaVersion is bumped', async () => {
      // Coordinator edits opportunity criteria (which bumps criteriaVersion to 2)
      await request(app)
        .patch(`/api/v1/admin/opportunities/${opportunityA._id}`)
        .set('Authorization', `Bearer ${coordinatorAToken}`)
        .send({
          criteria: [
            {
              type: CRITERIA_TYPES.MIN_CGPA,
              value: 7.0, // lowered requirement
              isHardRequirement: true,
              displayLabel: 'Minimum CGPA 7.0'
            }
          ]
        });

      // Calling eligibility endpoint now detects criteriaVersion 2 and snapshots a new record
      const res = await request(app)
        .get(`/api/v1/opportunities/${opportunityA._id}/eligibility`)
        .set('Authorization', `Bearer ${studentIneligibleToken}`);

      expect(res.status).toBe(200);
      expect(res.body.data.criteriaVersion).toBe(2);
      // With CGPA 7.4 >= 7.0, studentIneligible is now LIKELY_ELIGIBLE!
      expect(res.body.data.status).toBe(ELIGIBILITY_STATUSES.LIKELY_ELIGIBLE);

      // Verify that history was preserved (2 snapshot evaluations exist for studentIneligible)
      const evals = await EligibilityEvaluation.find({
        opportunityId: opportunityA._id,
        studentId: studentIneligible._id
      }).sort({ evaluatedAt: 1 });

      expect(evals.length).toBe(2);
      expect(evals[0].criteriaVersion).toBe(1);
      expect(evals[0].status).toBe(ELIGIBILITY_STATUSES.DOES_NOT_MEET);
      expect(evals[1].criteriaVersion).toBe(2);
      expect(evals[1].status).toBe(ELIGIBILITY_STATUSES.LIKELY_ELIGIBLE);
    });

    it('allows student to list their eligibility evaluation history across opportunities', async () => {
      const res = await request(app)
        .get('/api/v1/opportunities/me/eligibility')
        .set('Authorization', `Bearer ${studentIneligibleToken}`);

      expect(res.status).toBe(200);
      expect(res.body.data.length).toBeGreaterThan(0);
      expect(res.body.data[0].opportunityId).toBeDefined();
    });
  });

  describe('Staff Cohort View & Override Management', () => {
    let targetEvaluation;

    beforeAll(async () => {
      targetEvaluation = await EligibilityEvaluation.findOne({
        opportunityId: opportunityA._id,
        studentId: studentMissing._id
      });
    });

    it('allows placement coordinator to fetch paginated eligibility cohort results', async () => {
      const res = await request(app)
        .get(`/api/v1/admin/opportunities/${opportunityA._id}/eligibility-results`)
        .set('Authorization', `Bearer ${coordinatorAToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.length).toBeGreaterThan(0);
      expect(res.body.metadata.opportunity).toBeDefined();
    });

    it('denies students from accessing staff cohort results (403 Forbidden)', async () => {
      const res = await request(app)
        .get(`/api/v1/admin/opportunities/${opportunityA._id}/eligibility-results`)
        .set('Authorization', `Bearer ${studentAToken}`);

      expect(res.status).toBe(403);
    });

    it('rejects staff override when required justification reason is missing', async () => {
      const res = await request(app)
        .post(`/api/v1/admin/eligibility/${targetEvaluation._id}/override`)
        .set('Authorization', `Bearer ${coordinatorAToken}`)
        .send({
          overrideStatus: ELIGIBILITY_STATUSES.LIKELY_ELIGIBLE
          // reason missing!
        });

      expect(res.status).toBe(400);
      expect(res.body.message).toContain('Override reason is required');
    });

    it('successfully overrides evaluation when reason is provided and logs audit event', async () => {
      const res = await request(app)
        .post(`/api/v1/admin/eligibility/${targetEvaluation._id}/override`)
        .set('Authorization', `Bearer ${coordinatorAToken}`)
        .send({
          overrideStatus: ELIGIBILITY_STATUSES.LIKELY_ELIGIBLE,
          reason: 'Verified candidate Grade Sheet directly with Dean of Academics.'
        });

      expect(res.status).toBe(200);
      expect(res.body.data.override.isOverridden).toBe(true);
      expect(res.body.data.override.overrideStatus).toBe(ELIGIBILITY_STATUSES.LIKELY_ELIGIBLE);
      expect(res.body.data.override.reason).toContain('Grade Sheet');

      // Verify AuditLog record
      const audit = await AuditLog.findOne({
        action: 'ELIGIBILITY_OVERRIDDEN',
        entityId: targetEvaluation._id
      });
      expect(audit).not.toBeNull();
      expect(audit.actorId.toString()).toBe(coordinatorA._id.toString());

      // Student GET shows override notice
      const studentRes = await request(app)
        .get(`/api/v1/opportunities/${opportunityA._id}/eligibility`)
        .set('Authorization', `Bearer ${studentMissingToken}`);

      expect(studentRes.status).toBe(200);
      expect(studentRes.body.data.override.isOverridden).toBe(true);
      expect(studentRes.body.data.override.overrideStatus).toBe(ELIGIBILITY_STATUSES.LIKELY_ELIGIBLE);
    });
  });

  describe('Organization Scoping & Multi-Tenant Isolation', () => {
    it('prevents student in Org B from checking eligibility for an opportunity in Org A (404)', async () => {
      const res = await request(app)
        .get(`/api/v1/opportunities/${opportunityA._id}/eligibility`)
        .set('Authorization', `Bearer ${studentBToken}`);

      expect(res.status).toBe(404);
    });

    it('prevents coordinator in Org B from overriding evaluation in Org A (404)', async () => {
      const anyEval = await EligibilityEvaluation.findOne({ organizationId: orgA._id });

      const res = await request(app)
        .post(`/api/v1/admin/eligibility/${anyEval._id}/override`)
        .set('Authorization', `Bearer ${coordinatorBToken}`)
        .send({
          overrideStatus: ELIGIBILITY_STATUSES.LIKELY_ELIGIBLE,
          reason: 'Cross-tenant illegal attempt'
        });

      expect(res.status).toBe(404);
    });
  });
});
