import bcrypt from 'bcryptjs';
import crypto from 'crypto';
import { connectDB, disconnectDB } from '../config/db.js';
import {
  Organization,
  OrganizationMembership,
  User,
  StudentProfile,
  JobOpportunity,
  JobApplication,
  TestCategory,
  QuestionBank,
  Question,
  MockTest,
  InterviewTrack,
  InterviewerProfile,
  HumanMockInterviewSlot,
  AmbassadorCampaign,
  AmbassadorProfile,
  AmbassadorReferralCode,
  ReferredParticipant,
  InstitutePolicy
} from '../models/index.js';
import {
  ROLES,
  USER_STATUSES,
  MEMBERSHIP_ROLES,
  OPPORTUNITY_STATUSES,
  JOB_APPLICATION_STATUSES,
  QUESTION_TYPES,
  MOCK_TEST_STATUSES,
  AMBASSADOR_PROFILE_STATUSES,
  AMBASSADOR_CAMPAIGN_STATUSES,
  REFERRED_PARTICIPANT_STATUSES
} from '../utils/constants.js';

export const seedSyntheticDemoV3 = async () => {
  console.log('[Seed V3 Demo] Starting synthetic demo data generation (Zero real PII)...');

  const saltRounds = 10;
  const adminHash = await bcrypt.hash('Admin@123456', saltRounds);
  const staffHash = await bcrypt.hash('Staff@123456', saltRounds);
  const stuHash = await bcrypt.hash('Student@123456', saltRounds);
  const intHash = await bcrypt.hash('Interviewer@123456', saltRounds);

  // 1. Organization
  let org = await Organization.findOne({ slug: 'niet-tech' });
  if (!org) {
    org = await Organization.create({
      name: 'National Institute of Engineering & Technology',
      slug: 'niet-tech',
      timezone: 'Asia/Kolkata',
      status: 'active'
    });
    console.log('  ✔ Created Organization: National Institute of Engineering & Technology (niet-tech)');
  }

  // 2. Staff Users & Memberships
  // Org Admin
  let adminUser = await User.findOne({ email: 'admin@niet.edu' });
  if (!adminUser) {
    adminUser = await User.create({
      name: 'Dr. S. K. Raman (Director of Placements)',
      email: 'admin@niet.edu',
      passwordHash: adminHash,
      role: ROLES.ADMIN,
      accountStatus: USER_STATUSES.ACTIVE,
      organizationId: org._id
    });
    console.log('  ✔ Created Admin: admin@niet.edu / Admin@123456');
  }
  await OrganizationMembership.findOneAndUpdate(
    { organizationId: org._id, userId: adminUser._id, role: MEMBERSHIP_ROLES.ORG_ADMIN },
    { status: 'active' },
    { upsert: true }
  );

  // Placement Coordinator
  let placementUser = await User.findOne({ email: 'placement@niet.edu' });
  if (!placementUser) {
    placementUser = await User.create({
      name: 'Prof. Anita Deshmukh (Placement Officer)',
      email: 'placement@niet.edu',
      passwordHash: staffHash,
      role: ROLES.ADMIN,
      accountStatus: USER_STATUSES.ACTIVE,
      organizationId: org._id
    });
    console.log('  ✔ Created Placement Staff: placement@niet.edu / Staff@123456');
  }
  await OrganizationMembership.findOneAndUpdate(
    { organizationId: org._id, userId: placementUser._id, role: MEMBERSHIP_ROLES.PLACEMENT_COORDINATOR },
    { status: 'active' },
    { upsert: true }
  );

  // Ambassador Coordinator
  let ambassadorCoordUser = await User.findOne({ email: 'ambassadors@niet.edu' });
  if (!ambassadorCoordUser) {
    ambassadorCoordUser = await User.create({
      name: 'Arun Varma (Outreach Lead)',
      email: 'ambassadors@niet.edu',
      passwordHash: staffHash,
      role: ROLES.ADMIN,
      accountStatus: USER_STATUSES.ACTIVE,
      organizationId: org._id
    });
    console.log('  ✔ Created Ambassador Coordinator: ambassadors@niet.edu / Staff@123456');
  }
  await OrganizationMembership.findOneAndUpdate(
    { organizationId: org._id, userId: ambassadorCoordUser._id, role: MEMBERSHIP_ROLES.AMBASSADOR_COORDINATOR },
    { status: 'active' },
    { upsert: true }
  );

  // Interviewer
  let interviewerUser = await User.findOne({ email: 'interviewer.tech@niet.edu' });
  if (!interviewerUser) {
    interviewerUser = await User.create({
      name: 'Vikram Joshi (Principal Architect & Alumni Mock Interviewer)',
      email: 'interviewer.tech@niet.edu',
      passwordHash: intHash,
      role: ROLES.ADMIN,
      accountStatus: USER_STATUSES.ACTIVE,
      organizationId: org._id
    });
    console.log('  ✔ Created Interviewer: interviewer.tech@niet.edu / Interviewer@123456');
  }
  await OrganizationMembership.findOneAndUpdate(
    { organizationId: org._id, userId: interviewerUser._id, role: MEMBERSHIP_ROLES.INTERVIEWER },
    { status: 'active' },
    { upsert: true }
  );

  let interviewerProfile = await InterviewerProfile.findOne({ userId: interviewerUser._id });
  if (!interviewerProfile) {
    interviewerProfile = await InterviewerProfile.create({
      organizationId: org._id,
      userId: interviewerUser._id,
      expertise: ['Distributed Systems', 'Cloud Native Architecture', 'System Design'],
      bio: '15+ years experience in distributed storage systems and engineering mentoring.',
      isActive: true
    });
  }

  // 3. Synthetic Students
  const syntheticStudents = [
    {
      name: 'Aarav Patel',
      email: 'student.aarav@niet.edu',
      studentCode: 'NIET2026CS101',
      branch: 'Computer Science & Engineering',
      degree: 'B.Tech',
      cohort: '2022-2026',
      graduationYear: 2026,
      cgpa: 8.9,
      verificationStatus: 'verified'
    },
    {
      name: 'Diya Sharma',
      email: 'student.diya@niet.edu',
      studentCode: 'NIET2026IS042',
      branch: 'Information Science & Engineering',
      degree: 'B.Tech',
      cohort: '2022-2026',
      graduationYear: 2026,
      cgpa: 8.4,
      verificationStatus: 'verified'
    },
    {
      name: 'Kabir Mehta',
      email: 'student.kabir@niet.edu',
      studentCode: 'NIET2026EC018',
      branch: 'Electronics & Communication',
      degree: 'B.Tech',
      cohort: '2022-2026',
      graduationYear: 2026,
      cgpa: 7.8,
      verificationStatus: 'pending'
    }
  ];

  const studentDocs = [];
  for (const s of syntheticStudents) {
    let user = await User.findOne({ email: s.email });
    if (!user) {
      user = await User.create({
        name: s.name,
        email: s.email,
        passwordHash: stuHash,
        role: ROLES.STUDENT,
        accountStatus: USER_STATUSES.ACTIVE,
        organizationId: org._id
      });
      console.log(`  ✔ Created Synthetic Student: ${s.email} / Student@123456`);
    }

    await OrganizationMembership.findOneAndUpdate(
      { organizationId: org._id, userId: user._id, role: MEMBERSHIP_ROLES.STUDENT },
      { status: 'active' },
      { upsert: true }
    );

    let profile = await StudentProfile.findOne({ userId: user._id });
    if (!profile) {
      profile = await StudentProfile.create({
        organizationId: org._id,
        userId: user._id,
        studentId: s.studentCode,
        studentCode: s.studentCode,
        branch: s.branch,
        degree: s.degree,
        cohort: s.cohort,
        graduationYear: s.graduationYear,
        cgpa: s.cgpa,
        tenthPercentage: 92.5,
        twelfthPercentage: 88.0,
        backlogs: 0,
        verificationStatus: s.verificationStatus,
        skills: ['TypeScript', 'Node.js', 'React', 'MongoDB', 'AWS']
      });
    }
    studentDocs.push({ user, profile });
  }

  // 4. Staff-published Job Opportunities
  let opp1 = await JobOpportunity.findOne({ title: 'Cloud Software Engineer (Associate)' });
  if (!opp1) {
    const deadline = new Date();
    deadline.setDate(deadline.getDate() + 25);

    opp1 = await JobOpportunity.create({
      organizationId: org._id,
      jobTitle: 'Cloud Software Engineer (Associate)',
      companyName: 'Acme Cloud Systems',
      description: 'Build hyper-scalable distributed services, container runtimes, and observability agents.',
      location: 'Bengaluru (Hybrid)',
      employmentType: 'FULL_TIME',
      applicationUrl: 'https://careers.acmecloud.example/apply/ace-2026',
      applicationInstructions: 'Apply on the Acme Cloud careers portal. After submission, update your application status in HireTrack.',
      criteria: [
        {
          type: 'BRANCH',
          operator: 'IN',
          value: ['Computer Science & Engineering', 'Information Science & Engineering'],
          displayLabel: 'Eligible branches: CSE & ISE'
        },
        {
          type: 'MIN_CGPA',
          operator: 'GTE',
          value: 8.0,
          displayLabel: 'Minimum CGPA 8.0'
        }
      ],
      criteriaVersion: 1,
      deadline: deadline,
      status: OPPORTUNITY_STATUSES.PUBLISHED,
      createdBy: placementUser._id
    });
    console.log('  ✔ Created JobOpportunity: Cloud Software Engineer (Acme Cloud Systems)');
  }

  // 5. Self-Reported Application
  const aarav = studentDocs[0];
  if (aarav?.profile) {
    await JobApplication.findOneAndUpdate(
      { organizationId: org._id, studentProfileId: aarav.profile._id, jobOpportunityId: opp1._id },
      {
        status: JOB_APPLICATION_STATUSES.APPLIED,
        verificationStatus: 'UNVERIFIED',
        applicationDate: new Date(),
        notes: 'Submitted external application on company portal. Ref ID: ACM-90214.',
        statusHistory: [
          {
            status: JOB_APPLICATION_STATUSES.APPLIED,
            changedAt: new Date(),
            changedBy: aarav.user._id,
            notes: 'Initial application submission'
          }
        ]
      },
      { upsert: true }
    );
  }

  // 6. Mock Tests & Question Bank
  let category = await TestCategory.findOne({ organizationId: org._id, slug: 'core-cs' });
  if (!category) {
    category = await TestCategory.create({
      organizationId: org._id,
      name: 'Computer Science Fundamentals',
      slug: 'core-cs',
      description: 'Core concepts in Operating Systems, Database Management, and Networking.'
    });
  }

  let bank = await QuestionBank.findOne({ organizationId: org._id, categoryId: category._id });
  if (!bank) {
    bank = await QuestionBank.create({
      organizationId: org._id,
      categoryId: category._id,
      name: 'Systems & Web Architecture',
      description: 'Validated assessment questions for technical placement screening.'
    });
  }

  let sampleQ = await Question.findOne({ organizationId: org._id, questionBankId: bank._id });
  if (!sampleQ) {
    sampleQ = await Question.create({
      organizationId: org._id,
      bankId: bank._id,
      type: QUESTION_TYPES.SINGLE_CHOICE,
      prompt: 'Which ACID property guarantees that concurrent transactions execute without interference?',
      options: [
        { optionId: 'opt_a', text: 'Atomicity' },
        { optionId: 'opt_b', text: 'Consistency' },
        { optionId: 'opt_c', text: 'Isolation' },
        { optionId: 'opt_d', text: 'Durability' }
      ],
      answerKey: ['opt_c'],
      explanation: 'Isolation ensures concurrent execution leaves the database in the same state as serial execution.',
      difficulty: 'MEDIUM',
      topicTags: ['Databases', 'ACID']
    });
  }

  let mockTest = await MockTest.findOne({ organizationId: org._id, title: 'Cloud & Systems Readiness Benchmark' });
  if (!mockTest) {
    mockTest = await MockTest.create({
      organizationId: org._id,
      categoryId: category._id,
      title: 'Cloud & Systems Readiness Benchmark',
      description: '30-minute diagnostic assessment covering database concurrency, networking protocols, and system design.',
      durationMinutes: 30,
      instructions: '1. Negative marking is active. 2. Autosave operates on answer selection.',
      questionSelectionConfig: [
        {
          questionBankId: bank._id,
          count: 1,
          difficulty: 'MEDIUM'
        }
      ],
      scoringConfig: {
        totalMarks: 2,
        passingPercentage: 50,
        negativeMarking: true
      },
      attemptLimit: 3,
      reviewPolicy: 'IMMEDIATE_WITH_ANSWERS',
      status: MOCK_TEST_STATUSES.PUBLISHED,
      version: 1,
      createdBy: placementUser._id
    });
    console.log('  ✔ Created MockTest: Cloud & Systems Readiness Benchmark');
  }

  // 7. AI Interview Track
  let aiTrack = await InterviewTrack.findOne({ organizationId: org._id, slug: 'full-stack-track' });
  if (!aiTrack) {
    aiTrack = await InterviewTrack.create({
      organizationId: org._id,
      slug: 'full-stack-track',
      interviewType: 'AI',
      roleCategory: 'Full-Stack Software Engineer',
      questionConfig: {
        maxQuestions: 4,
        maxFollowUps: 1,
        maxTurnChars: 1000
      },
      rubricConfig: [
        { dimension: 'Technical Depth', weight: 40, description: 'Soundness of architectural choices' },
        { dimension: 'Clarity of Thought', weight: 30, description: 'Structured communication' },
        { dimension: 'Problem Solving', weight: 30, description: 'Tradeoff evaluation' }
      ],
      status: 'ACTIVE'
    });
    console.log('  ✔ Created AI Interview Track: Full-Stack Software Engineer');
  }

  // 8. Human Mock Interview Slot
  const slotDate = new Date();
  slotDate.setDate(slotDate.getDate() + 2);
  slotDate.setHours(15, 0, 0, 0);
  const slotEndDate = new Date(slotDate);
  slotEndDate.setMinutes(slotEndDate.getMinutes() + 45);

  await HumanMockInterviewSlot.findOneAndUpdate(
    { interviewerProfileId: interviewerProfile._id, startsAt: slotDate },
    {
      organizationId: org._id,
      interviewerProfileId: interviewerProfile._id,
      startsAt: slotDate,
      endsAt: slotEndDate,
      status: 'AVAILABLE'
    },
    { upsert: true }
  );
  console.log('  ✔ Created Available Human Mock Slot for Vikram Joshi');

  // 9. Ambassador Campaign & Profile
  const diya = studentDocs[1];
  let campaign = await AmbassadorCampaign.findOne({ organizationId: org._id, name: 'Fall 2026 Campus Outreach' });
  if (!campaign) {
    campaign = await AmbassadorCampaign.create({
      organizationId: org._id,
      name: 'Fall 2026 Campus Outreach',
      targetCount: 3,
      startsAt: new Date(),
      endsAt: new Date(Date.now() + 60 * 24 * 60 * 60 * 1000),
      verificationRules: {
        requireContactVerified: true,
        requireValidInstitute: true,
        requireQualifyingActivity: true
      },
      status: AMBASSADOR_CAMPAIGN_STATUSES.ACTIVE,
      createdBy: ambassadorCoordUser._id
    });
  }

  if (diya?.profile) {
    let ambProfile = await AmbassadorProfile.findOne({ studentProfileId: diya.profile._id });
    if (!ambProfile) {
      ambProfile = await AmbassadorProfile.create({
        organizationId: org._id,
        studentProfileId: diya.profile._id,
        userId: diya.user._id,
        status: AMBASSADOR_PROFILE_STATUSES.APPROVED,
        applicationNotes: 'Lead organizer of the Google Developer Student Club campus hackathon.',
        approvedBy: ambassadorCoordUser._id,
        approvedAt: new Date()
      });

      const refCode = 'HT-DIYA2026';
      await AmbassadorReferralCode.create({
        organizationId: org._id,
        ambassadorProfileId: ambProfile._id,
        campaignId: campaign._id,
        code: refCode,
        active: true
      });

      // Seed 2 masked participants
      const hash1 = crypto.createHash('sha256').update(`${campaign._id}:participant1@synthetic.edu`).digest('hex');
      await ReferredParticipant.create({
        organizationId: org._id,
        campaignId: campaign._id,
        codeId: refCode,
        name: 'Johnathan Smith',
        email: 'johnathan.smith@synthetic.edu',
        phone: '9988776655',
        institute: 'City Engineering College',
        dedupeKey: hash1,
        verificationStatus: REFERRED_PARTICIPANT_STATUSES.VERIFIED,
        reason: 'Contact verified by coordinator',
        verifiedBy: ambassadorCoordUser._id,
        verifiedAt: new Date()
      });
      console.log('  ✔ Created Ambassador Profile and Referral Code for Diya: HT-DIYA2026');
    }
  }

  // 10. Default Institute Policies
  await InstitutePolicy.findOneAndUpdate(
    { organizationId: org._id, policyKey: 'mockInterviews' },
    {
      value: {
        requireAiPassForHumanMock: false,
        minOverallScore: 70,
        cancelBeforeHours: 12
      },
      updatedBy: adminUser._id
    },
    { upsert: true }
  );

  await InstitutePolicy.findOneAndUpdate(
    { organizationId: org._id, policyKey: 'dataRetention' },
    {
      value: {
        profileRetentionDays: 365,
        interviewTranscriptRetentionDays: 90,
        assessmentAttemptRetentionDays: 180,
        auditLogRetentionDays: 730
      },
      updatedBy: adminUser._id
    },
    { upsert: true }
  );

  console.log('[Seed V3 Demo] Synthetic dataset generated successfully. 0 real PII used.');
  return { org, adminUser, placementUser, studentDocs, opp1 };
};

if (process.argv[1]?.endsWith('seedSyntheticDemoV3.js')) {
  connectDB()
    .then(() => seedSyntheticDemoV3())
    .then(() => disconnectDB().then(() => process.exit(0)))
    .catch((err) => {
      console.error('[Seed V3 Demo Error]:', err);
      disconnectDB().then(() => process.exit(1));
    });
}
