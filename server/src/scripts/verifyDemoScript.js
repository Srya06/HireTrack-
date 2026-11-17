import request from 'supertest';
import bcrypt from 'bcryptjs';
import app from '../app.js';
import { connectDB, disconnectDB } from '../config/db.js';
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
  INTERVIEW_MODES
} from '../utils/constants.js';

export const runDemoVerification = async () => {
  console.log('\n========================================================================');
  console.log('HIRETRACK — END-TO-END DEMO SCRIPT VERIFICATION (DEVELOPMENT_ROADMAP §6)');
  console.log('========================================================================\n');

  await connectDB();
  const results = [];
  const testRunId = Date.now();

  const recordStep = (stepNumber, stepName, passed, details = '') => {
    results.push({ stepNumber, stepName, passed, details });
    const status = passed ? '✅ PASS' : '❌ FAIL';
    console.log(`[Step ${stepNumber}] ${status} — ${stepName}`);
    if (details) {
      console.log(`         Details: ${details}`);
    }
  };

  try {
    const saltRounds = 10;
    const commonPassword = 'DemoPassword123!';
    const passwordHash = await bcrypt.hash(commonPassword, saltRounds);

    // Bootstrap test accounts
    const adminEmail = `admin_demo_${testRunId}@hiretrack.edu`;
    const recruiterEmail = `recruiter_demo_${testRunId}@techcorp.com`;
    const studentEmail = `student_demo_${testRunId}@college.edu`;

    const adminUser = await User.create({
      name: 'Dr. Placement Dean',
      email: adminEmail,
      passwordHash,
      role: ROLES.ADMIN,
      accountStatus: USER_STATUSES.ACTIVE
    });

    const pendingRecUser = await User.create({
      name: 'Sarah Connor',
      email: recruiterEmail,
      passwordHash,
      role: ROLES.RECRUITER,
      accountStatus: USER_STATUSES.PENDING
    });

    const pendingProfile = await RecruiterProfile.create({
      userId: pendingRecUser._id,
      companyName: `TechCorp Innovations ${testRunId}`,
      website: 'https://techcorp.example.com',
      contactPerson: 'Sarah Connor',
      phone: '+91 9988776655',
      approvalStatus: RECRUITER_APPROVAL_STATUSES.PENDING
    });

    const studentUser = await User.create({
      name: 'Maya Demo Rao',
      email: studentEmail,
      passwordHash,
      role: ROLES.STUDENT,
      accountStatus: USER_STATUSES.ACTIVE
    });

    const studentProfile = await StudentProfile.create({
      userId: studentUser._id,
      studentId: `DEMO_${testRunId}`,
      branch: 'CSE',
      graduationYear: 2026,
      cgpa: 9.0,
      skills: ['React', 'Node.js', 'System Architecture'],
      resume: {
        url: 'https://cloudinary.example.com/demo_resume.pdf',
        publicId: 'resumes/demo_maya',
        fileName: 'Maya_Resume.pdf',
        mimeType: 'application/pdf',
        size: 150000,
        uploadedAt: new Date()
      }
    });

    let adminToken = '';
    let recruiterToken = '';
    let studentToken = '';
    let createdJobId = '';
    let applicationId = '';

    // Step 1: Sign in as admin
    try {
      const res = await request(app)
        .post('/api/v1/auth/login')
        .send({ email: adminEmail, password: commonPassword });

      if (res.status === 200 && res.body.data?.accessToken) {
        adminToken = res.body.data.accessToken;
        recordStep(1, 'Sign in as Admin', true, `Authenticated as ${adminEmail}`);
      } else {
        recordStep(1, 'Sign in as Admin', false, `Status ${res.status}: ${res.body.message}`);
      }
    } catch (err) {
      recordStep(1, 'Sign in as Admin', false, err.message);
    }

    // Step 2: Approve a pending recruiter (UC-04)
    try {
      const res = await request(app)
        .patch(`/api/v1/admin/recruiters/${pendingProfile._id}/approval`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ approvalStatus: 'approved' });

      const updatedProfile = await RecruiterProfile.findById(pendingProfile._id);
      const updatedUser = await User.findById(pendingRecUser._id);

      const pass =
        res.status === 200 &&
        updatedProfile.approvalStatus === 'approved' &&
        updatedUser.accountStatus === 'active';

      recordStep(
        2,
        'Admin approves pending recruiter (UC-04)',
        pass,
        `Recruiter profile approvalStatus = ${updatedProfile.approvalStatus}, user accountStatus = ${updatedUser.accountStatus}`
      );
    } catch (err) {
      recordStep(2, 'Admin approves pending recruiter (UC-04)', false, err.message);
    }

    // Step 3: Sign in as recruiter and create/publish a job
    try {
      const loginRes = await request(app)
        .post('/api/v1/auth/login')
        .send({ email: recruiterEmail, password: commonPassword });

      recruiterToken = loginRes.body.data?.accessToken;

      const deadline = new Date();
      deadline.setDate(deadline.getDate() + 20);

      const jobRes = await request(app)
        .post('/api/v1/jobs')
        .set('Authorization', `Bearer ${recruiterToken}`)
        .send({
          title: 'Full Stack Cloud Engineer',
          description: 'Build robust cloud applications and backend microservices.',
          location: 'Bengaluru',
          employmentType: 'full_time',
          ctc: '14 - 18 LPA',
          minCgpa: 8.0,
          eligibleBranches: ['CSE', 'ISE', 'AIML'],
          eligibleGraduationYears: [2026],
          requiredSkills: ['React', 'Node.js'],
          applicationDeadline: deadline.toISOString(),
          status: 'draft'
        });

      createdJobId = jobRes.body.data?._id || jobRes.body.data?.id;

      const publishRes = await request(app)
        .patch(`/api/v1/jobs/${createdJobId}/publish`)
        .set('Authorization', `Bearer ${recruiterToken}`)
        .send();

      const pass =
        loginRes.status === 200 &&
        jobRes.status === 201 &&
        publishRes.status === 200 &&
        publishRes.body.data?.status === 'published';

      recordStep(
        3,
        'Recruiter creates and publishes job drive',
        pass,
        `Created job "${jobRes.body.data?.title}" (_id: ${createdJobId}) and published successfully`
      );
    } catch (err) {
      recordStep(3, 'Recruiter creates and publishes job drive', false, err.message);
    }

    // Step 4: Sign in as student and complete profile
    try {
      const loginRes = await request(app)
        .post('/api/v1/auth/login')
        .send({ email: studentEmail, password: commonPassword });

      studentToken = loginRes.body.data?.accessToken;

      const updateRes = await request(app)
        .patch('/api/v1/students/me')
        .set('Authorization', `Bearer ${studentToken}`)
        .send({
          skills: ['React', 'Node.js', 'System Architecture', 'Kubernetes'],
          bio: 'Verified candidate with full profile completion.'
        });

      const pass =
        loginRes.status === 200 &&
        updateRes.status === 200 &&
        updateRes.body.data?.completeness?.isComplete === true;

      recordStep(
        4,
        'Student signs in and verifies 100% profile completeness',
        pass,
        `Completeness: ${updateRes.body.data?.completeness?.percentage}%, isComplete: ${updateRes.body.data?.completeness?.isComplete}`
      );
    } catch (err) {
      recordStep(4, 'Student signs in and verifies profile completeness', false, err.message);
    }

    // Step 5: Browse jobs and apply
    try {
      const listRes = await request(app)
        .get('/api/v1/jobs')
        .set('Authorization', `Bearer ${studentToken}`);

      const foundJob = (listRes.body.data || []).find((j) => (j._id || j.id) === createdJobId);

      const applyRes = await request(app)
        .post(`/api/v1/jobs/${createdJobId}/applications`)
        .set('Authorization', `Bearer ${studentToken}`)
        .send();

      applicationId = applyRes.body.data?._id || applyRes.body.data?.id;

      const pass =
        listRes.status === 200 &&
        Boolean(foundJob) &&
        applyRes.status === 201 &&
        applyRes.body.data?.status === 'applied';

      recordStep(
        5,
        'Student browses published drive and submits application',
        pass,
        `Application _id: ${applicationId}, initial status: ${applyRes.body.data?.status}`
      );
    } catch (err) {
      recordStep(5, 'Student browses jobs and applies', false, err.message);
    }

    // Step 6: Recruiter shortlists student and schedules interview
    try {
      const applicantsRes = await request(app)
        .get(`/api/v1/jobs/${createdJobId}/applications`)
        .set('Authorization', `Bearer ${recruiterToken}`);

      const statusRes = await request(app)
        .patch(`/api/v1/applications/${applicationId}/status`)
        .set('Authorization', `Bearer ${recruiterToken}`)
        .send({
          status: 'shortlisted',
          note: 'Resume matches technical requirements. Advancing to round 1.'
        });

      const interviewDate = new Date();
      interviewDate.setDate(interviewDate.getDate() + 3);

      const interviewRes = await request(app)
        .post(`/api/v1/applications/${applicationId}/interviews`)
        .set('Authorization', `Bearer ${recruiterToken}`)
        .send({
          scheduledAt: interviewDate.toISOString(),
          mode: 'online',
          locationOrLink: 'https://meet.google.com/demo-round-1',
          notes: 'Technical Interview: Problem Solving'
        });

      const pass =
        applicantsRes.status === 200 &&
        statusRes.status === 200 &&
        statusRes.body.data?.status === 'shortlisted' &&
        interviewRes.status === 201 &&
        interviewRes.body.data?.interview?.mode === 'online';

      recordStep(
        6,
        'Recruiter reviews applicant, shortlists, and schedules interview',
        pass,
        `Status updated to shortlisted, interview round scheduled with Google Meet URL`
      );
    } catch (err) {
      recordStep(6, 'Recruiter shortlists student and schedules interview', false, err.message);
    }

    // Step 7: Student sees updated status and interview details
    try {
      const appRes = await request(app)
        .get(`/api/v1/applications/${applicationId}`)
        .set('Authorization', `Bearer ${studentToken}`);

      const appData = appRes.body.data;
      const pass =
        appRes.status === 200 &&
        appData?.status === 'interview_scheduled' &&
        appData?.statusHistory?.length >= 2;

      recordStep(
        7,
        'Student tracks updated application timeline and interview invite',
        pass,
        `Status transitioned to "${appData?.status}", chronological history entries: ${appData?.statusHistory?.length}`
      );
    } catch (err) {
      recordStep(7, 'Student sees updated application status', false, err.message);
    }

    // Step 8: Admin views updated institutional platform metrics
    try {
      const overviewRes = await request(app)
        .get('/api/v1/admin/overview')
        .set('Authorization', `Bearer ${adminToken}`);

      const overview = overviewRes.body.data;
      const pass =
        overviewRes.status === 200 &&
        overview.students >= 1 &&
        overview.approvedRecruiters >= 1 &&
        overview.activeJobs >= 1 &&
        overview.applications >= 1;

      recordStep(
        8,
        'Admin dashboard reflects updated real-time platform metrics',
        pass,
        `Students: ${overview?.students}, Approved Recruiters: ${overview?.approvedRecruiters}, Active Jobs: ${overview?.activeJobs}, Total Applications: ${overview?.applications}`
      );
    } catch (err) {
      recordStep(8, 'Admin views updated platform metrics', false, err.message);
    }

    // Clean up created demo records
    await User.deleteMany({ _id: { $in: [adminUser._id, pendingRecUser._id, studentUser._id] } });
    await RecruiterProfile.deleteMany({ _id: pendingProfile._id });
    await StudentProfile.deleteMany({ _id: studentProfile._id });
    if (createdJobId) await Job.findByIdAndDelete(createdJobId);
    if (applicationId) await Application.findByIdAndDelete(applicationId);
    await Interview.deleteMany({ applicationId });

    console.log('\n========================================================================');
    const allPassed = results.every((r) => r.passed);
    if (allPassed) {
      console.log('🎉 ALL 8 DEMO SCRIPT STEPS PASSED WITH 100% SUCCESS!');
    } else {
      console.error('⚠️ SOME DEMO SCRIPT STEPS FAILED');
    }
    console.log('========================================================================\n');

    await disconnectDB();
    return allPassed;
  } catch (globalErr) {
    console.error('Fatal demo verification error:', globalErr);
    await disconnectDB().catch(() => {});
    return false;
  }
};

if (process.argv[1] && process.argv[1].endsWith('verifyDemoScript.js')) {
  runDemoVerification().then((ok) => process.exit(ok ? 0 : 1));
}
