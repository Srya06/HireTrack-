import mongoose from 'mongoose';
import { StudentProfile } from '../models/studentProfile.model.js';
import { JobOpportunity } from '../models/jobOpportunity.model.js';
import { JobApplication } from '../models/jobApplication.model.js';
import { MockTest } from '../models/mockTest.model.js';
import { MockTestAttempt } from '../models/mockTestAttempt.model.js';
import { AiMockInterviewSession } from '../models/aiMockInterviewSession.model.js';
import { HumanMockInterviewSlot } from '../models/humanMockInterviewSlot.model.js';
import { HumanMockInterviewBooking } from '../models/humanMockInterviewBooking.model.js';
import { HumanInterviewEvaluation } from '../models/humanInterviewEvaluation.model.js';
import { recordAuditEvent } from './audit.service.js';

/**
 * Builds date range match condition.
 */
const buildDateFilter = (startDate, endDate, dateField = 'createdAt') => {
  const filter = {};
  if (startDate) {
    filter[dateField] = filter[dateField] || {};
    filter[dateField].$gte = new Date(startDate);
  }
  if (endDate) {
    filter[dateField] = filter[dateField] || {};
    filter[dateField].$lte = new Date(endDate);
  }
  return filter;
};

/**
 * Overview Report: Aggregated placement preparation and opportunity metrics.
 */
export const getOverviewReport = async (organizationId, { startDate, endDate, graduationYear, degree, branch } = {}) => {
  const orgId = new mongoose.Types.ObjectId(organizationId);
  const dateFilter = buildDateFilter(startDate, endDate);

  // Student Cohort Filter
  const studentQuery = { organizationId: orgId, ...dateFilter };
  if (graduationYear) studentQuery.graduationYear = parseInt(graduationYear, 10);
  if (degree) studentQuery.degree = degree;
  if (branch) studentQuery.branch = branch;

  const [
    totalStudents,
    totalJobs,
    totalApplications,
    totalMockAttempts,
    totalAiSessions,
    totalHumanBookings
  ] = await Promise.all([
    StudentProfile.countDocuments(studentQuery),
    JobOpportunity.countDocuments({ organizationId: orgId, ...dateFilter }),
    JobApplication.countDocuments({ organizationId: orgId, ...dateFilter }),
    MockTestAttempt.countDocuments({ organizationId: orgId, ...dateFilter }),
    AiMockInterviewSession.countDocuments({ organizationId: orgId, ...dateFilter }),
    HumanMockInterviewBooking.countDocuments({ organizationId: orgId, ...dateFilter })
  ]);

  // Status breakdowns
  const [jobStatusCounts, appStatusCounts] = await Promise.all([
    JobOpportunity.aggregate([
      { $match: { organizationId: orgId, ...dateFilter } },
      { $group: { _id: '$status', count: { $sum: 1 } } }
    ]),
    JobApplication.aggregate([
      { $match: { organizationId: orgId, ...dateFilter } },
      { $group: { _id: '$status', count: { $sum: 1 } } }
    ])
  ]);

  const jobsByStatus = {};
  jobStatusCounts.forEach((s) => {
    jobsByStatus[s._id] = s.count;
  });

  const appsByStatus = {};
  appStatusCounts.forEach((s) => {
    appsByStatus[s._id] = s.count;
  });

  return {
    reportType: 'OVERVIEW',
    generatedAt: new Date().toISOString(),
    metrics: {
      totalStudents,
      totalJobs,
      totalApplications,
      totalMockAttempts,
      totalAiSessions,
      totalHumanBookings,
      jobsByStatus,
      appsByStatus
    }
  };
};

/**
 * Job Opportunities Report: Metrics per opportunity and application stats.
 */
export const getJobsReport = async (organizationId, { startDate, endDate } = {}) => {
  const orgId = new mongoose.Types.ObjectId(organizationId);
  const dateFilter = buildDateFilter(startDate, endDate);

  const jobs = await JobOpportunity.find({ organizationId: orgId, ...dateFilter })
    .sort({ createdAt: -1 })
    .lean();

  const jobMetrics = await Promise.all(
    jobs.map(async (job) => {
      const [totalApps, verifiedApps] = await Promise.all([
        JobApplication.countDocuments({ organizationId: orgId, jobOpportunityId: job._id }),
        JobApplication.countDocuments({
          organizationId: orgId,
          jobOpportunityId: job._id,
          verificationStatus: 'VERIFIED'
        })
      ]);

      return {
        jobId: job._id,
        companyName: job.companyName,
        jobTitle: job.jobTitle,
        workMode: job.workMode,
        location: job.location || 'N/A',
        status: job.status,
        deadline: job.deadline ? new Date(job.deadline).toISOString() : null,
        totalApplications: totalApps,
        verifiedApplications: verifiedApps
      };
    })
  );

  const totalAppsAll = jobMetrics.reduce((acc, j) => acc + j.totalApplications, 0);

  return {
    reportType: 'JOBS',
    generatedAt: new Date().toISOString(),
    summary: {
      totalJobs: jobs.length,
      totalApplications: totalAppsAll,
      averageApplicationsPerJob: jobs.length > 0 ? Math.round((totalAppsAll / jobs.length) * 10) / 10 : 0
    },
    items: jobMetrics
  };
};

/**
 * Mock Tests Report: Tests authoring, attempts, performance and topic metrics.
 */
export const getMockTestsReport = async (organizationId, { startDate, endDate } = {}) => {
  const orgId = new mongoose.Types.ObjectId(organizationId);
  const dateFilter = buildDateFilter(startDate, endDate);

  const tests = await MockTest.find({ organizationId: orgId, ...dateFilter })
    .sort({ createdAt: -1 })
    .lean();

  const testMetrics = await Promise.all(
    tests.map(async (test) => {
      const attempts = await MockTestAttempt.find({
        organizationId: orgId,
        mockTestId: test._id
      }).lean();

      const completed = attempts.filter((a) => a.status === 'EVALUATED' || a.status === 'SUBMITTED');
      let totalScore = 0;
      let highestScore = 0;

      completed.forEach((att) => {
        const p = att.percentage || 0;
        totalScore += p;
        if (p > highestScore) highestScore = p;
      });

      return {
        testId: test._id,
        title: test.title,
        status: test.status,
        durationMinutes: test.durationMinutes || 0,
        totalAttempts: attempts.length,
        completedAttempts: completed.length,
        averagePercentage: completed.length > 0 ? Math.round((totalScore / completed.length) * 10) / 10 : 0,
        highestPercentage: highestScore
      };
    })
  );

  const totalAttemptsCount = testMetrics.reduce((acc, t) => acc + t.totalAttempts, 0);
  const totalCompletedCount = testMetrics.reduce((acc, t) => acc + t.completedAttempts, 0);

  const allCompletedAttempts = await MockTestAttempt.find({
    organizationId: orgId,
    status: { $in: ['EVALUATED', 'SUBMITTED'] },
    ...dateFilter
  }).lean();

  let overallScoreSum = 0;
  let passedAttemptsCount = 0;
  allCompletedAttempts.forEach((a) => {
    overallScoreSum += a.percentage || 0;
    if (a.passed) passedAttemptsCount++;
  });

  const overallAvgPercentage =
    allCompletedAttempts.length > 0
      ? Math.round((overallScoreSum / allCompletedAttempts.length) * 10) / 10
      : 0;

  const passRate =
    allCompletedAttempts.length > 0
      ? Math.round((passedAttemptsCount / allCompletedAttempts.length) * 100)
      : 0;

  return {
    reportType: 'MOCK_TESTS',
    generatedAt: new Date().toISOString(),
    summary: {
      totalTests: tests.length,
      totalAttempts: totalAttemptsCount,
      completedAttempts: totalCompletedCount,
      averagePercentage: overallAvgPercentage,
      passRate
    },
    items: testMetrics
  };
};

/**
 * Mock Interviews Report: Strictly separates AI vs Human Mock Interview statistics.
 */
export const getMockInterviewsReport = async (organizationId, { startDate, endDate } = {}) => {
  const orgId = new mongoose.Types.ObjectId(organizationId);
  const dateFilter = buildDateFilter(startDate, endDate);

  // AI Interview Statistics
  const aiSessions = await AiMockInterviewSession.find({
    organizationId: orgId,
    ...dateFilter
  }).lean();

  const completedAiSessions = aiSessions.filter((s) => s.status === 'COMPLETED');
  let totalAiScore = 0;
  let passedCount = 0;

  completedAiSessions.forEach((s) => {
    totalAiScore += s.evaluation?.percentage || s.evaluation?.overallScore || 0;
    if (s.evaluation?.passed) passedCount++;
  });

  const avgAiScore =
    completedAiSessions.length > 0
      ? Math.round((totalAiScore / completedAiSessions.length) * 10) / 10
      : 0;

  // Human Interview Statistics
  const [slotsCount, bookings, evaluations] = await Promise.all([
    HumanMockInterviewSlot.countDocuments({ organizationId: orgId, ...dateFilter }),
    HumanMockInterviewBooking.find({ organizationId: orgId, ...dateFilter }).lean(),
    HumanInterviewEvaluation.find({ organizationId: orgId, ...dateFilter }).lean()
  ]);

  const completedBookings = bookings.filter((b) => b.status === 'COMPLETED');
  const releasedEvaluations = evaluations.filter((e) => e.status === 'RELEASED');

  let totalHumanScore = 0;
  releasedEvaluations.forEach((e) => {
    totalHumanScore += e.overallScore || 0;
  });

  const avgHumanScore =
    releasedEvaluations.length > 0
      ? Math.round((totalHumanScore / releasedEvaluations.length) * 10) / 10
      : 0;

  return {
    reportType: 'MOCK_INTERVIEWS',
    generatedAt: new Date().toISOString(),
    aiMetrics: {
      source: 'AiMockInterviewSession',
      totalSessions: aiSessions.length,
      completedSessions: completedAiSessions.length,
      passedSessions: passedCount,
      averageScorePercentage: avgAiScore
    },
    humanMetrics: {
      source: 'HumanMockInterviewBooking & HumanInterviewEvaluation',
      totalSlots: slotsCount,
      totalBookings: bookings.length,
      completedBookings: completedBookings.length,
      releasedEvaluationsCount: releasedEvaluations.length,
      averageReleasedScore: avgHumanScore
    }
  };
};

/**
 * Converts report data into CSV string format.
 */
export const convertReportToCsv = (reportType, reportData) => {
  const escapeCsv = (val) => {
    if (val === null || val === undefined) return '""';
    const str = String(val).replace(/"/g, '""');
    return `"${str}"`;
  };

  if (reportType === 'JOBS') {
    const headers = ['Job ID', 'Company', 'Title', 'Work Mode', 'Location', 'Status', 'Deadline', 'Total Applications', 'Verified Applications'];
    const rows = (reportData.items || []).map((j) => [
      j.jobId,
      j.companyName,
      j.jobTitle,
      j.workMode,
      j.location,
      j.status,
      j.deadline || '',
      j.totalApplications,
      j.verifiedApplications
    ]);
    return [headers.map(escapeCsv).join(','), ...rows.map((r) => r.map(escapeCsv).join(','))].join('\n');
  }

  if (reportType === 'MOCK_TESTS') {
    const headers = ['Test ID', 'Title', 'Status', 'Duration (min)', 'Total Attempts', 'Completed Attempts', 'Average Percentage', 'Highest Percentage'];
    const rows = (reportData.items || []).map((t) => [
      t.testId,
      t.title,
      t.status,
      t.durationMinutes,
      t.totalAttempts,
      t.completedAttempts,
      t.averagePercentage,
      t.highestPercentage
    ]);
    return [headers.map(escapeCsv).join(','), ...rows.map((r) => r.map(escapeCsv).join(','))].join('\n');
  }

  if (reportType === 'MOCK_INTERVIEWS') {
    const lines = [
      ['Metric Domain', 'Metric Name', 'Value'],
      ['AI Mock Interview', 'Total Sessions', reportData.aiMetrics?.totalSessions || 0],
      ['AI Mock Interview', 'Completed Sessions', reportData.aiMetrics?.completedSessions || 0],
      ['AI Mock Interview', 'Average Score %', reportData.aiMetrics?.averageScorePercentage || 0],
      ['Human Mock Interview', 'Total Slots', reportData.humanMetrics?.totalSlots || 0],
      ['Human Mock Interview', 'Total Bookings', reportData.humanMetrics?.totalBookings || 0],
      ['Human Mock Interview', 'Completed Bookings', reportData.humanMetrics?.completedBookings || 0],
      ['Human Mock Interview', 'Released Evaluations', reportData.humanMetrics?.releasedEvaluationsCount || 0],
      ['Human Mock Interview', 'Average Released Score', reportData.humanMetrics?.averageReleasedScore || 0]
    ];
    return lines.map((r) => r.map(escapeCsv).join(',')).join('\n');
  }

  // OVERVIEW default
  const lines = [
    ['Metric', 'Value'],
    ['Total Students', reportData.metrics?.totalStudents || 0],
    ['Total Jobs', reportData.metrics?.totalJobs || 0],
    ['Total Applications', reportData.metrics?.totalApplications || 0],
    ['Total Mock Test Attempts', reportData.metrics?.totalMockAttempts || 0],
    ['Total AI Interview Sessions', reportData.metrics?.totalAiSessions || 0],
    ['Total Human Interview Bookings', reportData.metrics?.totalHumanBookings || 0]
  ];
  return lines.map((r) => r.map(escapeCsv).join(',')).join('\n');
};

/**
 * Handles CSV export with mandatory audit logging.
 */
export const exportReportCsvWithAudit = async ({
  organizationId,
  actorId,
  reportType,
  reportData,
  filters = {}
}) => {
  const csvContent = convertReportToCsv(reportType, reportData);

  // Mandatory audit logging for CSV export
  await recordAuditEvent({
    organizationId,
    actorId,
    action: 'EXPORT_REPORT',
    resourceType: 'Report',
    metadata: {
      reportType,
      format: 'csv',
      filters: {
        startDate: filters.startDate || null,
        endDate: filters.endDate || null,
        graduationYear: filters.graduationYear || null,
        degree: filters.degree || null,
        branch: filters.branch || null
      }
    }
  });

  return csvContent;
};
