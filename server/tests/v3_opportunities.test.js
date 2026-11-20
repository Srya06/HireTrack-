import { jest } from '@jest/globals';
import request from 'supertest';
import app from '../src/app.js';
import { connectDB, disconnectDB } from '../src/config/db.js';
import {
  User,
  Organization,
  OrganizationMembership,
  JobOpportunity,
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
  CRITERIA_TYPES,
  CRITERIA_OPERATORS
} from '../src/utils/constants.js';
import { signToken } from '../src/utils/token.js';

jest.setTimeout(30000);

describe('Job Opportunities & Publishing Lifecycle Suite (CHUNK V3)', () => {
  const ts = Date.now();

  let orgA, orgB;
  let coordinatorA, coordinatorAToken;
  let orgAdminA, orgAdminAToken;
  let studentA, studentAToken;
  let studentB, studentBToken;
  let coordinatorB, coordinatorBToken;

  beforeAll(async () => {
    await connectDB();

    // 1. Create Organization A and Organization B
    orgA = await Organization.create({
      name: `Institute Alpha ${ts}`,
      slug: `inst-alpha-${ts}`,
      timezone: 'Asia/Kolkata',
      status: ORGANIZATION_STATUSES.ACTIVE
    });

    orgB = await Organization.create({
      name: `Institute Beta ${ts}`,
      slug: `inst-beta-${ts}`,
      timezone: 'Asia/Kolkata',
      status: ORGANIZATION_STATUSES.ACTIVE
    });

    // 2. Staff: Placement Coordinator for Org A
    coordinatorA = await User.create({
      name: 'Coordinator Alpha',
      email: `coord_alpha_${ts}@campus.test`,
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

    // 3. Staff: Org Admin for Org A
    orgAdminA = await User.create({
      name: 'Admin Alpha',
      email: `admin_alpha_${ts}@campus.test`,
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

    // 4. Student for Org A
    studentA = await User.create({
      name: 'Student Alpha',
      email: `student_alpha_${ts}@campus.test`,
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

    // 5. Staff: Coordinator for Org B
    coordinatorB = await User.create({
      name: 'Coordinator Beta',
      email: `coord_beta_${ts}@campus.test`,
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

    // 6. Student for Org B
    studentB = await User.create({
      name: 'Student Beta',
      email: `student_beta_${ts}@campus.test`,
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
  });

  afterAll(async () => {
    await disconnectDB();
  });

  describe('Staff Opportunity Creation & Publish Validation', () => {
    it('creates an opportunity in DRAFT status', async () => {
      const res = await request(app)
        .post('/api/v1/admin/opportunities')
        .set('Authorization', `Bearer ${coordinatorAToken}`)
        .send({
          companyName: 'Microsoft Corporation',
          jobTitle: 'Software Development Engineer',
          employerJobId: 'MSFT-2026-001',
          description: '## Role Overview\nJoin Microsoft Azure Core Engineering.',
          workMode: 'hybrid',
          location: 'Bengaluru / Hyderabad',
          compensationText: '₹24 LPA + stock grants',
          deadline: new Date(Date.now() + 14 * 24 * 3600 * 1000).toISOString(),
          criteria: [
            {
              type: CRITERIA_TYPES.MIN_CGPA,
              value: 8.0,
              isHardRequirement: true,
              displayLabel: 'Minimum CGPA 8.0'
            },
            {
              type: CRITERIA_TYPES.GRADUATION_YEAR,
              value: [2026],
              isHardRequirement: true,
              displayLabel: 'Batch of 2026'
            },
            {
              type: CRITERIA_TYPES.SKILL,
              value: 'Distributed Systems',
              isHardRequirement: false,
              displayLabel: 'Preferred: Distributed Systems'
            }
          ]
        });

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.data.companyName).toBe('Microsoft Corporation');
      expect(res.body.data.status).toBe(OPPORTUNITY_STATUSES.DRAFT);
      expect(res.body.data.criteriaVersion).toBe(1);
      expect(res.body.data.criteria.length).toBe(3);
    });

    it('denies students from creating opportunities (403 Forbidden)', async () => {
      const res = await request(app)
        .post('/api/v1/admin/opportunities')
        .set('Authorization', `Bearer ${studentAToken}`)
        .send({
          companyName: 'Hacker Company',
          jobTitle: 'Fake Role',
          description: 'Fake'
        });

      expect(res.status).toBe(403);
    });

    it('rejects publishing when neither applicationUrl nor applicationInstructions are provided', async () => {
      // Create draft without URL or instructions
      const createRes = await request(app)
        .post('/api/v1/admin/opportunities')
        .set('Authorization', `Bearer ${coordinatorAToken}`)
        .send({
          companyName: 'No CTA Company',
          jobTitle: 'Analyst',
          description: 'Job description text',
          sourceNote: 'Direct HR email',
          deadline: new Date(Date.now() + 7 * 24 * 3600 * 1000).toISOString()
        });

      const oppId = createRes.body.data.id;

      // Attempt to publish
      const pubRes = await request(app)
        .post(`/api/v1/admin/opportunities/${oppId}/publish`)
        .set('Authorization', `Bearer ${coordinatorAToken}`);

      expect(pubRes.status).toBe(400);
      expect(pubRes.body.message).toContain('Application URL or explicit Application Instructions');
    });

    it('rejects publishing with disallowed URL protocol (e.g. javascript:)', async () => {
      const createRes = await request(app)
        .post('/api/v1/admin/opportunities')
        .set('Authorization', `Bearer ${coordinatorAToken}`)
        .send({
          companyName: 'Insecure URL Corp',
          jobTitle: 'Developer',
          description: 'Role description',
          sourceNote: 'Source note verified'
        });

      const oppId = createRes.body.data.id;

      const patchRes = await request(app)
        .patch(`/api/v1/admin/opportunities/${oppId}`)
        .set('Authorization', `Bearer ${coordinatorAToken}`)
        .send({
          applicationUrl: 'javascript:alert(document.cookie)'
        });

      expect(patchRes.status).toBe(400);
      expect(patchRes.body.message).toContain('Disallowed URL protocol');
    });

    it('rejects publishing when conflicting criteria are detected (e.g. CGPA > 10)', async () => {
      const res = await request(app)
        .post('/api/v1/admin/opportunities')
        .set('Authorization', `Bearer ${coordinatorAToken}`)
        .send({
          companyName: 'Impossible Standards Corp',
          jobTitle: 'Genius SDE',
          description: 'Description',
          criteria: [
            {
              type: CRITERIA_TYPES.MIN_CGPA,
              value: 12.5, // Conflicting: > 10.0
              isHardRequirement: true
            }
          ]
        });

      expect(res.status).toBe(400);
      expect(res.body.message).toContain('Conflicting criteria');
    });

    it('successfully validates and publishes opportunity when all criteria and source note are valid', async () => {
      const createRes = await request(app)
        .post('/api/v1/admin/opportunities')
        .set('Authorization', `Bearer ${coordinatorAToken}`)
        .send({
          companyName: 'Amazon Web Services',
          jobTitle: 'Cloud Support Associate',
          description: 'Amazon AWS Cloud team hiring.',
          applicationUrl: 'https://amazon.jobs/en/jobs/AWS2026',
          applicationInstructions: 'Submit your resume via Amazon Jobs portal using your student email.',
          sourceNote: 'Direct campus engagement manager notification',
          sourceUrl: 'https://www.linkedin.com/jobs/view/12345678',
          deadline: new Date(Date.now() + 10 * 24 * 3600 * 1000).toISOString()
        });

      const oppId = createRes.body.data.id;

      const pubRes = await request(app)
        .post(`/api/v1/admin/opportunities/${oppId}/publish`)
        .set('Authorization', `Bearer ${coordinatorAToken}`);

      expect(pubRes.status).toBe(200);
      expect(pubRes.body.data.status).toBe(OPPORTUNITY_STATUSES.PUBLISHED);
      expect(pubRes.body.data.lastVerifiedAt).toBeDefined();

      // Verify Audit Log was recorded
      const audit = await AuditLog.findOne({
        entityType: 'JobOpportunity',
        entityId: oppId,
        action: 'OPPORTUNITY_PUBLISHED'
      });
      expect(audit).not.toBeNull();
      expect(audit.actorId.toString()).toBe(coordinatorA._id.toString());
    });
  });

  describe('CriteriaVersion Incrementation on Edit', () => {
    it('increments criteriaVersion when criteria array is updated', async () => {
      const createRes = await request(app)
        .post('/api/v1/admin/opportunities')
        .set('Authorization', `Bearer ${coordinatorAToken}`)
        .send({
          companyName: 'Adobe',
          jobTitle: 'Product Intern',
          description: 'UI/UX & Product Design',
          criteria: [
            { type: CRITERIA_TYPES.SKILL, value: 'Figma', isHardRequirement: true }
          ]
        });

      const oppId = createRes.body.data.id;
      expect(createRes.body.data.criteriaVersion).toBe(1);

      // Update criteria
      const patchRes = await request(app)
        .patch(`/api/v1/admin/opportunities/${oppId}`)
        .set('Authorization', `Bearer ${coordinatorAToken}`)
        .send({
          criteria: [
            { type: CRITERIA_TYPES.SKILL, value: 'Figma', isHardRequirement: true },
            { type: CRITERIA_TYPES.MIN_CGPA, value: 7.5, isHardRequirement: true }
          ]
        });

      expect(patchRes.status).toBe(200);
      expect(patchRes.body.data.criteriaVersion).toBe(2);
      expect(patchRes.body.data.criteria.length).toBe(2);
    });
  });

  describe('Lifecycle State Transitions: CLOSE and ARCHIVE', () => {
    it('allows staff to close and archive opportunities with audit records', async () => {
      const opp = await JobOpportunity.create({
        organizationId: orgA._id,
        companyName: 'Salesforce',
        jobTitle: 'Associate Member of Technical Staff',
        description: 'Salesforce Core',
        deadline: new Date(Date.now() + 5 * 24 * 3600 * 1000),
        status: OPPORTUNITY_STATUSES.PUBLISHED,
        applicationUrl: 'https://salesforce.com/careers',
        sourceNote: 'Verified campus visit',
        createdBy: coordinatorA._id
      });

      // Close opportunity
      const closeRes = await request(app)
        .post(`/api/v1/admin/opportunities/${opp._id}/close`)
        .set('Authorization', `Bearer ${coordinatorAToken}`);

      expect(closeRes.status).toBe(200);
      expect(closeRes.body.data.status).toBe(OPPORTUNITY_STATUSES.CLOSED);

      // Archive opportunity
      const archiveRes = await request(app)
        .post(`/api/v1/admin/opportunities/${opp._id}/archive`)
        .set('Authorization', `Bearer ${coordinatorAToken}`);

      expect(archiveRes.status).toBe(200);
      expect(archiveRes.body.data.status).toBe(OPPORTUNITY_STATUSES.ARCHIVED);
    });
  });

  describe('Student View, CTA Always Visible, and Expiry Computation', () => {
    let publishedOpp;
    let expiredOpp;
    let draftOpp;

    beforeAll(async () => {
      publishedOpp = await JobOpportunity.create({
        organizationId: orgA._id,
        companyName: 'Google',
        jobTitle: 'Associate Software Engineer',
        description: 'Join Google Cloud & Core Systems.',
        location: 'Bengaluru',
        workMode: 'hybrid',
        compensationText: 'Competitive CTC',
        applicationUrl: 'https://careers.google.com/jobs/results/12345',
        applicationInstructions: 'Apply on Google Careers using your official university email.',
        deadline: new Date(Date.now() + 20 * 24 * 3600 * 1000),
        status: OPPORTUNITY_STATUSES.PUBLISHED,
        sourceNote: 'Internal recruiter memo (Confidential)',
        sourceUrl: 'https://internal.google.com/req/12345',
        lastVerifiedAt: new Date(),
        createdBy: coordinatorA._id,
        criteria: [
          { type: CRITERIA_TYPES.DEGREE, value: 'B.Tech', isHardRequirement: true, displayLabel: 'B.Tech Degree' },
          { type: CRITERIA_TYPES.MIN_CGPA, value: 8.5, isHardRequirement: true, displayLabel: 'Min CGPA 8.5' },
          { type: CRITERIA_TYPES.SKILL, value: 'Go / C++', isHardRequirement: false, displayLabel: 'Preferred: Go / C++' }
        ]
      });

      // Opportunity with past deadline (Effective status: EXPIRED)
      expiredOpp = await JobOpportunity.create({
        organizationId: orgA._id,
        companyName: 'Uber',
        jobTitle: 'Backend Intern',
        description: 'Uber Engineering',
        applicationUrl: 'https://uber.com/careers/999',
        deadline: new Date(Date.now() - 24 * 3600 * 1000), // yesterday
        status: OPPORTUNITY_STATUSES.PUBLISHED,
        sourceNote: 'Expired drive note',
        createdBy: coordinatorA._id
      });

      // Draft opportunity (Must not be visible to students)
      draftOpp = await JobOpportunity.create({
        organizationId: orgA._id,
        companyName: 'Secret Stealth AI',
        jobTitle: 'Founding Engineer',
        description: 'Stealth project',
        deadline: new Date(Date.now() + 30 * 24 * 3600 * 1000),
        status: OPPORTUNITY_STATUSES.DRAFT,
        sourceNote: 'Not yet approved for students',
        createdBy: coordinatorA._id
      });
    });

    it('GET /api/v1/opportunities returns published opportunities with CTA and destination domain', async () => {
      const res = await request(app)
        .get('/api/v1/opportunities')
        .set('Authorization', `Bearer ${studentAToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(Array.isArray(res.body.data)).toBe(true);

      const googleJob = res.body.data.find((j) => j.companyName === 'Google');
      expect(googleJob).toBeDefined();

      // CTA data ALWAYS present
      expect(googleJob.applicationUrl).toBe('https://careers.google.com/jobs/results/12345');
      expect(googleJob.applicationInstructions).toContain('Apply on Google Careers');
      expect(googleJob.destinationDomain).toBe('careers.google.com');

      // Criteria split
      expect(googleJob.requiredCriteria.length).toBe(2);
      expect(googleJob.preferredCriteria.length).toBe(1);

      // Sensitive staff fields MUST NOT leak to students
      expect(googleJob.sourceNote).toBeUndefined();
      expect(googleJob.sourceUrl).toBeUndefined();
      expect(googleJob.createdBy).toBeUndefined();
      expect(googleJob.employerJobId).toBeUndefined();
    });

    it('computes effective status as EXPIRED when deadline < now', async () => {
      const res = await request(app)
        .get('/api/v1/opportunities')
        .set('Authorization', `Bearer ${studentAToken}`);

      expect(res.status).toBe(200);
      const uberJob = res.body.data.find((j) => j.companyName === 'Uber');
      expect(uberJob).toBeDefined();
      expect(uberJob.status).toBe(OPPORTUNITY_STATUSES.EXPIRED);
      expect(uberJob.effectiveStatus).toBe(OPPORTUNITY_STATUSES.EXPIRED);
    });

    it('hides DRAFT and ARCHIVED opportunities from student listings', async () => {
      const res = await request(app)
        .get('/api/v1/opportunities')
        .set('Authorization', `Bearer ${studentAToken}`);

      const foundDraft = res.body.data.find((j) => j.companyName === 'Secret Stealth AI');
      expect(foundDraft).toBeUndefined();

      // Direct ID access to DRAFT returns 404
      const directRes = await request(app)
        .get(`/api/v1/opportunities/${draftOpp._id}`)
        .set('Authorization', `Bearer ${studentAToken}`);

      expect(directRes.status).toBe(404);
    });

    it('GET /api/v1/opportunities/:id returns detailed student view with required & preferred split', async () => {
      const res = await request(app)
        .get(`/api/v1/opportunities/${publishedOpp._id}`)
        .set('Authorization', `Bearer ${studentAToken}`);

      expect(res.status).toBe(200);
      expect(res.body.data.jobTitle).toBe('Associate Software Engineer');
      expect(res.body.data.destinationDomain).toBe('careers.google.com');
      expect(res.body.data.requiredCriteria).toBeDefined();
      expect(res.body.data.preferredCriteria).toBeDefined();
    });
  });

  describe('Organization Scoping & Multi-Tenant Isolation', () => {
    it('prevents students in Org B from seeing opportunities in Org A (404)', async () => {
      const oppA = await JobOpportunity.create({
        organizationId: orgA._id,
        companyName: 'Private Org A Partner',
        jobTitle: 'Research Engineer',
        description: 'Org A only',
        deadline: new Date(Date.now() + 10 * 24 * 3600 * 1000),
        status: OPPORTUNITY_STATUSES.PUBLISHED,
        applicationUrl: 'https://orga-partner.com/apply',
        sourceNote: 'Exclusive to Org A',
        createdBy: coordinatorA._id
      });

      // Student B in Org B requests Opp A
      const res = await request(app)
        .get(`/api/v1/opportunities/${oppA._id}`)
        .set('Authorization', `Bearer ${studentBToken}`);

      expect(res.status).toBe(404);

      // Student B listing does NOT contain Org A opportunity
      const listRes = await request(app)
        .get('/api/v1/opportunities')
        .set('Authorization', `Bearer ${studentBToken}`);

      const found = listRes.body.data.find((o) => o.companyName === 'Private Org A Partner');
      expect(found).toBeUndefined();
    });

    it('prevents coordinator in Org B from editing opportunity in Org A (404)', async () => {
      const oppA = await JobOpportunity.create({
        organizationId: orgA._id,
        companyName: 'Org A Job',
        jobTitle: 'Developer',
        description: 'Org A Job',
        deadline: new Date(Date.now() + 10 * 24 * 3600 * 1000),
        status: OPPORTUNITY_STATUSES.DRAFT,
        sourceNote: 'Internal',
        createdBy: coordinatorA._id
      });

      const patchRes = await request(app)
        .patch(`/api/v1/admin/opportunities/${oppA._id}`)
        .set('Authorization', `Bearer ${coordinatorBToken}`)
        .send({ jobTitle: 'Hacked Title' });

      expect(patchRes.status).toBe(404);
    });
  });
});
