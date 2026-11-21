import bcrypt from 'bcryptjs';
import { connectDB, disconnectDB } from '../config/db.js';
import { env } from '../config/env.js';
import { ensureDemoResumeFile } from '../utils/demoPdfGenerator.js';
import { runOrgBackfill } from './migrateOrgBackfill.js';
import { ensureDefaultOrganization } from './seedDefaultOrg.js';
import { seedMockTestData } from './seedMockTests.js';
import { seedSyntheticDemoV3 } from './seedSyntheticDemoV3.js';
import {
  User,
  StudentProfile,
  RecruiterProfile,
  Job,
  Application,
  Interview
} from '../models/index.js';
import {
  ROLES,
  USER_STATUSES,
  RECRUITER_APPROVAL_STATUSES,
  JOB_STATUSES,
  APPLICATION_STATUSES,
  INTERVIEW_MODES,
  INTERVIEW_STATUSES
} from '../utils/constants.js';

export const seedDemo = async () => {
  try {
    const conn = await connectDB();
    if (!conn) {
      throw new Error(
        'Database connection failed. Please ensure your MONGODB_URI in server/.env is valid and your current IP address is whitelisted in your MongoDB Atlas cluster (Network Access -> Add IP Address).'
      );
    }
    console.log('[Seed Demo] Connected to database. Seeding demo dataset...');

    const saltRounds = 10;
    const adminHash = await bcrypt.hash('Admin@123456', saltRounds);
    const recHash = await bcrypt.hash('Recruiter@123456', saltRounds);
    const stuHash = await bcrypt.hash('Student@123456', saltRounds);

    // 1. Admin Account
    let admin = await User.findOne({ email: 'admin@hiretrack.edu' });
    if (!admin) {
      admin = await User.create({
        name: 'Placement Dean (Dr. Sharma)',
        email: 'admin@hiretrack.edu',
        passwordHash: adminHash,
        role: ROLES.ADMIN,
        accountStatus: USER_STATUSES.ACTIVE
      });
      console.log('  ✔ Created Admin: admin@hiretrack.edu / Admin@123456');
    } else {
      console.log('  ℹ Admin already exists: admin@hiretrack.edu');
    }

    // 2. Approved Recruiter Account (Google Cloud)
    let approvedRecUser = await User.findOne({ email: 'recruiter.approved@google.com' });
    if (!approvedRecUser) {
      approvedRecUser = await User.create({
        name: 'Sundar P. (Campus Talent)',
        email: 'recruiter.approved@google.com',
        passwordHash: recHash,
        role: ROLES.RECRUITER,
        accountStatus: USER_STATUSES.ACTIVE
      });
      console.log('  ✔ Created Approved Recruiter User: recruiter.approved@google.com / Recruiter@123456');
    }

    let approvedRecProfile = await RecruiterProfile.findOne({ userId: approvedRecUser._id });
    if (!approvedRecProfile) {
      approvedRecProfile = await RecruiterProfile.create({
        userId: approvedRecUser._id,
        companyName: 'Google Cloud Platform',
        website: 'https://cloud.google.com',
        phone: '+91 9876543210',
        contactPerson: 'Sundar P.',
        address: 'Google India, RMZ Infinity, Old Madras Rd, Bengaluru',
        description: 'Global cloud infrastructure, AI models, and distributed enterprise platforms.',
        approvalStatus: RECRUITER_APPROVAL_STATUSES.APPROVED,
        reviewedBy: admin._id,
        reviewedAt: new Date()
      });
      console.log('  ✔ Created Approved RecruiterProfile: Google Cloud Platform');
    }

    // 3. Pending Recruiter Account (NextGen AI Labs)
    let pendingRecUser = await User.findOne({ email: 'recruiter.pending@startup.io' });
    if (!pendingRecUser) {
      pendingRecUser = await User.create({
        name: 'Alex Mercer (Talent Lead)',
        email: 'recruiter.pending@startup.io',
        passwordHash: recHash,
        role: ROLES.RECRUITER,
        accountStatus: USER_STATUSES.PENDING
      });
      console.log('  ✔ Created Pending Recruiter User: recruiter.pending@startup.io / Recruiter@123456');
    }

    let pendingRecProfile = await RecruiterProfile.findOne({ userId: pendingRecUser._id });
    if (!pendingRecProfile) {
      pendingRecProfile = await RecruiterProfile.create({
        userId: pendingRecUser._id,
        companyName: 'NextGen AI Labs',
        website: 'https://nextgenai.example.com',
        phone: '+91 9123456780',
        contactPerson: 'Alex Mercer',
        address: 'HSR Layout Sector 2, Bengaluru',
        description: 'Next-generation multimodal reasoning and edge inference agents.',
        approvalStatus: RECRUITER_APPROVAL_STATUSES.PENDING
      });
      console.log('  ✔ Created Pending RecruiterProfile: NextGen AI Labs (Awaiting UC-04 Approval)');
    }

    // 4. Sample Students
    // Student 1: Maya Rao (CSE, 9.2 CGPA)
    let stu1User = await User.findOne({ email: 'maya.rao@hiretrack.edu' });
    if (!stu1User) {
      stu1User = await User.create({
        name: 'Maya Rao',
        email: 'maya.rao@hiretrack.edu',
        passwordHash: stuHash,
        role: ROLES.STUDENT,
        accountStatus: USER_STATUSES.ACTIVE
      });
      console.log('  ✔ Created Student 1: maya.rao@hiretrack.edu / Student@123456');
    }

    const apiBase = process.env.API_PUBLIC_URL || `http://localhost:${env.PORT}`;

    let stu1Profile = await StudentProfile.findOne({ userId: stu1User._id });
    if (!stu1Profile) {
      const mayaPdf = ensureDemoResumeFile('Maya_Rao_Resume.pdf', {
        name: 'Maya Rao',
        studentId: '1RV22CS099',
        branch: 'CSE',
        graduationYear: 2026,
        cgpa: 9.2,
        email: 'maya.rao@hiretrack.edu',
        phone: '+91 9888111222',
        skills: ['React', 'Node.js', 'PostgreSQL', 'Distributed Systems'],
        bio: 'Aspiring full-stack and systems developer with active open-source contributions.'
      });

      stu1Profile = await StudentProfile.create({
        userId: stu1User._id,
        studentId: '1RV22CS099',
        branch: 'CSE',
        graduationYear: 2026,
        cgpa: 9.2,
        skills: ['React', 'Node.js', 'PostgreSQL', 'Distributed Systems'],
        bio: 'Aspiring full-stack and systems developer with active open-source contributions.',
        phone: '+91 9888111222',
        resume: {
          url: `${apiBase}/api/v1/uploads/resumes/Maya_Rao_Resume.pdf`,
          publicId: 'resumes/maya_rao_demo',
          fileName: 'Maya_Rao_Resume.pdf',
          mimeType: 'application/pdf',
          size: mayaPdf.size,
          uploadedAt: new Date()
        }
      });
      console.log('  ✔ Created StudentProfile: Maya Rao (1RV22CS099, 9.2 CGPA)');
    }

    // Student 2: Rohan Verma (ISE, 8.5 CGPA)
    let stu2User = await User.findOne({ email: 'rohan.verma@hiretrack.edu' });
    if (!stu2User) {
      stu2User = await User.create({
        name: 'Rohan Verma',
        email: 'rohan.verma@hiretrack.edu',
        passwordHash: stuHash,
        role: ROLES.STUDENT,
        accountStatus: USER_STATUSES.ACTIVE
      });
      console.log('  ✔ Created Student 2: rohan.verma@hiretrack.edu / Student@123456');
    }

    let stu2Profile = await StudentProfile.findOne({ userId: stu2User._id });
    if (!stu2Profile) {
      const rohanPdf = ensureDemoResumeFile('Rohan_Verma_Resume.pdf', {
        name: 'Rohan Verma',
        studentId: '1RV22IS045',
        branch: 'ISE',
        graduationYear: 2026,
        cgpa: 8.5,
        email: 'rohan.verma@hiretrack.edu',
        phone: '+91 9888333444',
        skills: ['Python', 'Docker', 'Kubernetes', 'FastAPI'],
        bio: 'Cloud enthusiast focused on DevOps and backend infrastructure.'
      });

      stu2Profile = await StudentProfile.create({
        userId: stu2User._id,
        studentId: '1RV22IS045',
        branch: 'ISE',
        graduationYear: 2026,
        cgpa: 8.5,
        skills: ['Python', 'Docker', 'Kubernetes', 'FastAPI'],
        bio: 'Cloud enthusiast focused on DevOps and backend infrastructure.',
        phone: '+91 9888333444',
        resume: {
          url: `${apiBase}/api/v1/uploads/resumes/Rohan_Verma_Resume.pdf`,
          publicId: 'resumes/rohan_verma_demo',
          fileName: 'Rohan_Verma_Resume.pdf',
          mimeType: 'application/pdf',
          size: rohanPdf.size,
          uploadedAt: new Date()
        }
      });
      console.log('  ✔ Created StudentProfile: Rohan Verma (1RV22IS045, 8.5 CGPA)');
    }

    // Student 3: Ananya Sen (ECE, 7.2 CGPA)
    let stu3User = await User.findOne({ email: 'ananya.sen@hiretrack.edu' });
    if (!stu3User) {
      stu3User = await User.create({
        name: 'Ananya Sen',
        email: 'ananya.sen@hiretrack.edu',
        passwordHash: stuHash,
        role: ROLES.STUDENT,
        accountStatus: USER_STATUSES.ACTIVE
      });
      console.log('  ✔ Created Student 3: ananya.sen@hiretrack.edu / Student@123456');
    }

    let stu3Profile = await StudentProfile.findOne({ userId: stu3User._id });
    if (!stu3Profile) {
      stu3Profile = await StudentProfile.create({
        userId: stu3User._id,
        studentId: '1RV22EC012',
        branch: 'ECE',
        graduationYear: 2026,
        cgpa: 7.2,
        skills: ['Embedded C', 'Verilog', 'IoT Architecture'],
        bio: 'Hardware-software co-design and firmware engineer.',
        phone: '+91 9888555666'
      });
      console.log('  ✔ Created StudentProfile: Ananya Sen (1RV22EC012, 7.2 CGPA)');
    }

    // 5. Sample Jobs by Google Cloud
    const deadline1 = new Date();
    deadline1.setDate(deadline1.getDate() + 21);

    let job1 = await Job.findOne({ title: 'Associate Cloud Software Engineer', recruiterId: approvedRecUser._id });
    if (!job1) {
      job1 = await Job.create({
        recruiterId: approvedRecUser._id,
        companyName: 'Google Cloud Platform',
        title: 'Associate Cloud Software Engineer',
        description: 'Design and implement resilient backend cloud services supporting millions of global developers.',
        location: 'Bengaluru (Hybrid)',
        employmentType: 'full_time',
        ctc: '18 - 24 LPA',
        applicationDeadline: deadline1,
        minCgpa: 8.0,
        eligibleBranches: ['CSE', 'ISE', 'AIML'],
        eligibleGraduationYears: [2026],
        status: JOB_STATUSES.PUBLISHED
      });
      console.log('  ✔ Created Published Job: Associate Cloud Software Engineer');
    }

    const deadline2 = new Date();
    deadline2.setDate(deadline2.getDate() + 35);

    let job2 = await Job.findOne({ title: 'Systems Infrastructure Intern', recruiterId: approvedRecUser._id });
    if (!job2) {
      job2 = await Job.create({
        recruiterId: approvedRecUser._id,
        companyName: 'Google Cloud Platform',
        title: 'Systems Infrastructure Intern',
        description: '6-month pre-placement internship working directly with site reliability and Linux systems kernel teams.',
        location: 'Hyderabad',
        employmentType: 'internship',
        ctc: '75,000 / month Stipend',
        applicationDeadline: deadline2,
        minCgpa: 7.0,
        eligibleBranches: ['CSE', 'ISE', 'ECE', 'EEE', 'AIML'],
        eligibleGraduationYears: [2026, 2027],
        status: JOB_STATUSES.DRAFT
      });
      console.log('  ✔ Created Draft Job: Systems Infrastructure Intern');
    }

    // 6. Sample Application & Scheduled Interview
    let app1 = await Application.findOne({ studentId: stu1User._id, jobId: job1._id });
    if (!app1) {
      app1 = await Application.create({
        studentId: stu1User._id,
        jobId: job1._id,
        status: APPLICATION_STATUSES.SHORTLISTED,
        resumeSnapshot: stu1Profile.resume,
        statusHistory: [
          {
            status: APPLICATION_STATUSES.APPLIED,
            changedBy: stu1User._id,
            changedAt: new Date(Date.now() - 3 * 86400000),
            note: 'Initial campus application submitted.'
          },
          {
            status: APPLICATION_STATUSES.UNDER_REVIEW,
            changedBy: approvedRecUser._id,
            changedAt: new Date(Date.now() - 2 * 86400000),
            note: 'Profile evaluated against technical requirements.'
          },
          {
            status: APPLICATION_STATUSES.SHORTLISTED,
            changedBy: approvedRecUser._id,
            changedAt: new Date(Date.now() - 1 * 86400000),
            note: 'Candidate shortlisted for technical interview round.'
          }
        ]
      });
      console.log('  ✔ Created Shortlisted Application: Maya Rao -> Associate Cloud Software Engineer');

      // 7. Scheduled Interview
      const interviewTime = new Date();
      interviewTime.setDate(interviewTime.getDate() + 2);
      interviewTime.setHours(15, 0, 0, 0);

      await Interview.create({
        applicationId: app1._id,
        scheduledBy: approvedRecUser._id,
        scheduledAt: interviewTime,
        mode: INTERVIEW_MODES.ONLINE,
        locationOrLink: 'https://meet.google.com/hiretrack-round1',
        notes: 'Round 1: Problem solving and cloud system design fundamentals.',
        status: INTERVIEW_STATUSES.SCHEDULED
      });
      console.log('  ✔ Scheduled Interview for Maya Rao');
    }

    // 8. Ensure default Organization & v3 OrganizationMemberships for seeded demo users
    await runOrgBackfill({ dryRun: false });
    const { organization: defaultOrg } = await ensureDefaultOrganization();
    if (defaultOrg && admin) {
      await seedMockTestData(defaultOrg._id, admin._id);
    }

    // 9. Seed HireTrack v3 synthetic opportunities, mock tests, and outreach models (0 real PII)
    await seedSyntheticDemoV3();

    console.log('\n[Seed Demo] Dataset seeded successfully!');
    console.log('========================================================================');
    console.log('DEMO ACCOUNTS READY:');
    console.log('  • Admin:     admin@hiretrack.edu            / Admin@123456');
    console.log('  • Recruiter: recruiter.approved@google.com  / Recruiter@123456 (Approved)');
    console.log('  • Recruiter: recruiter.pending@startup.io   / Recruiter@123456 (Pending UC-04)');
    console.log('  • Student 1: maya.rao@hiretrack.edu         / Student@123456   (CSE, 9.2 CGPA)');
    console.log('  • Student 2: rohan.verma@hiretrack.edu      / Student@123456   (ISE, 8.5 CGPA)');
    console.log('  • Student 3: ananya.sen@hiretrack.edu       / Student@123456   (ECE, 7.2 CGPA)');
    console.log('========================================================================\n');

    if (process.argv[1] && process.argv[1].endsWith('seedDemo.js')) {
      await disconnectDB();
      process.exit(0);
    }
  } catch (error) {
    console.error('[Seed Demo] Error:', error);
    if (process.argv[1] && process.argv[1].endsWith('seedDemo.js')) {
      await disconnectDB().catch(() => {});
      process.exit(1);
    }
  }
};

if (process.argv[1] && process.argv[1].endsWith('seedDemo.js')) {
  seedDemo();
}

