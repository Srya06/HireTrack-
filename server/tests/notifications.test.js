import { jest } from '@jest/globals';
import request from 'supertest';
import app from '../src/app.js';
import { connectDB, disconnectDB } from '../src/config/db.js';
import {
  User,
  StudentProfile,
  RecruiterProfile,
  Job,
  Application,
  Interview,
  Notification
} from '../src/models/index.js';
import {
  ROLES,
  USER_STATUSES,
  RECRUITER_APPROVAL_STATUSES,
  JOB_STATUSES,
  EMPLOYMENT_TYPES,
  APPLICATION_STATUSES
} from '../src/utils/constants.js';
import { signToken } from '../src/utils/token.js';

jest.setTimeout(30000);

describe('Notifications System Suite (CHUNK 11)', () => {
  const timestamp = Date.now();

  let adminUser, adminToken;
  let recruiterUser, recruiterProfile, recruiterToken;
  let studentUser1, studentProfile1, studentToken1;
  let studentUser2, studentProfile2, studentToken2;
  let testJob;
  let testApplication;

  beforeAll(async () => {
    await connectDB();

    // Admin
    adminUser = await User.create({
      name: 'Admin Admin',
      email: `admin_notif_${timestamp}@hiretrack.test`,
      passwordHash: 'dummyhash',
      role: ROLES.ADMIN,
      accountStatus: USER_STATUSES.ACTIVE
    });
    adminToken = signToken({ id: adminUser._id, role: adminUser.role });

    // Recruiter (initially pending)
    recruiterUser = await User.create({
      name: 'Recruiter Bob',
      email: `recruiter_notif_${timestamp}@hiretrack.test`,
      passwordHash: 'dummyhash',
      role: ROLES.RECRUITER,
      accountStatus: USER_STATUSES.PENDING
    });
    recruiterProfile = await RecruiterProfile.create({
      userId: recruiterUser._id,
      companyName: 'Acme Notif Corp',
      approvalStatus: RECRUITER_APPROVAL_STATUSES.PENDING
    });
    recruiterToken = signToken({ id: recruiterUser._id, role: recruiterUser.role });

    // Students
    studentUser1 = await User.create({
      name: 'Student One',
      email: `student1_notif_${timestamp}@hiretrack.test`,
      passwordHash: 'dummyhash',
      role: ROLES.STUDENT,
      accountStatus: USER_STATUSES.ACTIVE
    });
    studentProfile1 = await StudentProfile.create({
      userId: studentUser1._id,
      studentId: `USN_NOTIF_1_${timestamp}`,
      branch: 'CSE',
      graduationYear: 2025,
      cgpa: 8.5,
      resume: {
        url: 'https://cloudinary.com/dummy1.pdf',
        publicId: 'resumes/dummy1',
        fileName: 'dummy1.pdf',
        mimeType: 'application/pdf',
        size: 10240,
        uploadedAt: new Date()
      }
    });
    studentToken1 = signToken({ id: studentUser1._id, role: studentUser1.role });

    studentUser2 = await User.create({
      name: 'Student Two',
      email: `student2_notif_${timestamp}@hiretrack.test`,
      passwordHash: 'dummyhash',
      role: ROLES.STUDENT,
      accountStatus: USER_STATUSES.ACTIVE
    });
    studentProfile2 = await StudentProfile.create({
      userId: studentUser2._id,
      studentId: `USN_NOTIF_2_${timestamp}`,
      branch: 'ECE',
      graduationYear: 2025,
      cgpa: 8.0,
      resume: {
        url: 'https://cloudinary.com/dummy2.pdf',
        publicId: 'resumes/dummy2',
        fileName: 'dummy2.pdf',
        mimeType: 'application/pdf',
        size: 10240,
        uploadedAt: new Date()
      }
    });
    studentToken2 = signToken({ id: studentUser2._id, role: studentUser2.role });

    // Job created for test
    testJob = await Job.create({
      title: 'Software Development Engineer',
      description: 'Exciting SWE role',
      recruiterId: recruiterUser._id,
      companyName: 'Acme Notif Corp',
      location: 'Bangalore',
      employmentType: EMPLOYMENT_TYPES.FULL_TIME,
      applicationDeadline: new Date(Date.now() + 7 * 24 * 3600 * 1000),
      status: JOB_STATUSES.PUBLISHED,
      minCgpa: 7.0,
      eligibleBranches: ['CSE', 'ECE'],
      eligibleGraduationYears: [2025]
    });

    // Application created for Student 1
    testApplication = await Application.create({
      jobId: testJob._id,
      studentId: studentUser1._id,
      resumeSnapshot: studentProfile1.resume,
      status: APPLICATION_STATUSES.APPLIED,
      statusHistory: [
        {
          status: APPLICATION_STATUSES.APPLIED,
          changedBy: studentUser1._id,
          note: 'Initial application'
        }
      ]
    });
  });

  afterAll(async () => {
    await Notification.deleteMany({
      userId: { $in: [adminUser._id, recruiterUser._id, studentUser1._id, studentUser2._id] }
    });
    await Application.deleteMany({ _id: testApplication._id });
    await Job.deleteMany({ _id: testJob._id });
    await StudentProfile.deleteMany({ _id: { $in: [studentProfile1._id, studentProfile2._id] } });
    await RecruiterProfile.deleteMany({ _id: recruiterProfile._id });
    await User.deleteMany({
      _id: { $in: [adminUser._id, recruiterUser._id, studentUser1._id, studentUser2._id] }
    });
    await disconnectDB();
  });

  describe('Event-driven Notification Triggers', () => {
    it('NOTIF-01: Admin approving recruiter generates recruiter_approval notification', async () => {
      const res = await request(app)
        .patch(`/api/v1/admin/recruiters/${recruiterProfile._id}/approval`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ approvalStatus: 'approved' });

      expect(res.status).toBe(200);

      // Verify notification created for recruiter
      const notifs = await Notification.find({
        userId: recruiterUser._id,
        type: 'recruiter_approval'
      });

      expect(notifs.length).toBe(1);
      expect(notifs[0].title).toMatch(/Approved/i);
      expect(notifs[0].readAt).toBeNull();
    });

    it('NOTIF-02: Recruiter updating application status generates application_status notification for student', async () => {
      // Recruiter shortlists student
      const res = await request(app)
        .patch(`/api/v1/applications/${testApplication._id}/status`)
        .set('Authorization', `Bearer ${recruiterToken}`)
        .send({ status: APPLICATION_STATUSES.SHORTLISTED, note: 'Great resume!' });

      expect(res.status).toBe(200);

      // Verify notification created for student 1
      const notifs = await Notification.find({
        userId: studentUser1._id,
        type: 'application_status'
      });

      expect(notifs.length).toBe(1);
      expect(notifs[0].title).toBe('Application Status Updated');
      expect(notifs[0].message).toContain('shortlisted');
      expect(notifs[0].link).toContain(testApplication._id.toString());
      expect(notifs[0].readAt).toBeNull();
    });

    it('NOTIF-03: Recruiter scheduling interview generates interview_scheduled notification for student', async () => {
      const futureDate = new Date(Date.now() + 48 * 3600 * 1000).toISOString();
      const res = await request(app)
        .post(`/api/v1/applications/${testApplication._id}/interviews`)
        .set('Authorization', `Bearer ${recruiterToken}`)
        .send({
          scheduledAt: futureDate,
          mode: 'online',
          locationOrLink: 'https://meet.google.com/abc-xyz',
          notes: 'Technical Round 1'
        });

      expect(res.status).toBe(201);

      // Verify notification created for student 1
      const notifs = await Notification.find({
        userId: studentUser1._id,
        type: 'interview_scheduled'
      });

      expect(notifs.length).toBe(1);
      expect(notifs[0].title).toBe('Interview Scheduled');
      expect(notifs[0].message).toContain('Software Development Engineer');
    });
  });

  describe('Notification Retrieval & Pagination', () => {
    it('NOTIF-04: Student 1 sees their own notifications with correct unreadCount', async () => {
      const res = await request(app)
        .get('/api/v1/notifications')
        .set('Authorization', `Bearer ${studentToken1}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.notifications.length).toBe(2); // status change + interview scheduled
      expect(res.body.data.unreadCount).toBe(2);
      expect(res.body.pagination).toBeDefined();
    });

    it('NOTIF-05: Student 2 sees 0 notifications (Owner isolation)', async () => {
      const res = await request(app)
        .get('/api/v1/notifications')
        .set('Authorization', `Bearer ${studentToken2}`);

      expect(res.status).toBe(200);
      expect(res.body.data.notifications.length).toBe(0);
      expect(res.body.data.unreadCount).toBe(0);
    });
  });

  describe('Read Status Mutations & Access Control', () => {
    let student1NotificationId;

    beforeAll(async () => {
      const notif = await Notification.findOne({ userId: studentUser1._id });
      student1NotificationId = notif._id.toString();
    });

    it('NOTIF-06: Non-owner cannot mark another user notification as read (returns 403)', async () => {
      const res = await request(app)
        .patch(`/api/v1/notifications/${student1NotificationId}/read`)
        .set('Authorization', `Bearer ${studentToken2}`)
        .send();

      expect(res.status).toBe(403);
      expect(res.body.success).toBe(false);

      // Verify still unread
      const notif = await Notification.findById(student1NotificationId);
      expect(notif.readAt).toBeNull();
    });

    it('NOTIF-07: Owner can mark single notification as read', async () => {
      const res = await request(app)
        .patch(`/api/v1/notifications/${student1NotificationId}/read`)
        .set('Authorization', `Bearer ${studentToken1}`)
        .send();

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.read).toBe(true);
      expect(res.body.data.readAt).toBeDefined();

      // Check remaining unread count
      const checkRes = await request(app)
        .get('/api/v1/notifications')
        .set('Authorization', `Bearer ${studentToken1}`);
      expect(checkRes.body.data.unreadCount).toBe(1);
    });

    it('NOTIF-08: Owner can mark all notifications as read via read-all', async () => {
      const res = await request(app)
        .patch('/api/v1/notifications/read-all')
        .set('Authorization', `Bearer ${studentToken1}`)
        .send();

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.modifiedCount).toBe(1);

      // Check unread count is now 0
      const checkRes = await request(app)
        .get('/api/v1/notifications')
        .set('Authorization', `Bearer ${studentToken1}`);
      expect(checkRes.body.data.unreadCount).toBe(0);
    });
  });
});
