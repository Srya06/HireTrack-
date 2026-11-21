import mongoose from 'mongoose';
import { StudentProfile } from '../models/studentProfile.model.js';
import { JobOpportunity } from '../models/jobOpportunity.model.js';
import { EligibilityEvaluation } from '../models/eligibilityEvaluation.model.js';
import { JobApplication } from '../models/jobApplication.model.js';
import { MockTestAttempt } from '../models/mockTestAttempt.model.js';
import { AiMockInterviewSession } from '../models/aiMockInterviewSession.model.js';
import { HumanMockInterviewBooking } from '../models/humanMockInterviewBooking.model.js';
import { HumanInterviewEvaluation } from '../models/humanInterviewEvaluation.model.js';
import { ApiError } from '../utils/ApiError.js';

/**
 * Calculates student profile completeness.
 */
const calculateProfileCompleteness = (profile) => {
  if (!profile) {
    return {
      percentage: 0,
      missingFields: ['fullName', 'studentId', 'degree', 'branch', 'graduationYear', 'cgpa', 'skills', 'resume'],
      isComplete: false
    };
  }

  const fields = [
    { key: 'fullName', value: profile.fullName },
    { key: 'studentId', value: profile.studentId || profile.rollNumber },
    { key: 'degree', value: profile.degree },
    { key: 'branch', value: profile.branch },
    { key: 'graduationYear', value: profile.graduationYear },
    { key: 'cgpa', value: profile.cgpa },
    { key: 'skills', value: Array.isArray(profile.skills) && profile.skills.length > 0 },
    { key: 'resume', value: Boolean(profile.resumeObjectKey || profile.resumeKey || profile.resumeUrl || profile.fileAssetId || profile.resume) }
  ];

  const missingFields = fields.filter((f) => !f.value).map((f) => f.key);
  const filledCount = fields.length - missingFields.length;
  const percentage = Math.round((filledCount / fields.length) * 100);

  return {
    percentage,
    missingFields,
    isComplete: missingFields.length === 0
  };
};

/**
 * Computes deterministic rule-based next actions for a student.
 */
const computeNextActions = ({
  profileCompleteness,
  activeOpportunities,
  eligibilityDistribution,
  applicationStatuses,
  mockTests,
  aiInterviews,
  humanInterviews
}) => {
  const actions = [];

  // 1. Profile Completeness
  if (!profileCompleteness.value.isComplete) {
    actions.push({
      id: 'complete-profile',
      category: 'PROFILE',
      priority: 'HIGH',
      title: 'Complete Profile Details',
      description: `Complete missing fields: ${profileCompleteness.value.missingFields.join(', ')}`,
      actionUrl: '/student/profile'
    });
  }

  // 2. Resume check
  if (profileCompleteness.value.missingFields.includes('resume')) {
    actions.push({
      id: 'upload-resume',
      category: 'PROFILE',
      priority: 'HIGH',
      title: 'Upload Verified Resume',
      description: 'Upload your verified resume PDF to apply for upcoming campus opportunities.',
      actionUrl: '/student/profile'
    });
  }

  // 3. Eligible Opportunities but not yet applied
  const likelyEligible = eligibilityDistribution.value.likelyEligibleCount || 0;
  const appliedCount = applicationStatuses.value.byStatus?.APPLIED || 0;
  if (likelyEligible > 0 && appliedCount === 0) {
    actions.push({
      id: 'explore-eligible-jobs',
      category: 'OPPORTUNITY',
      priority: 'HIGH',
      title: 'Apply to Eligible Opportunities',
      description: `You are likely eligible for ${likelyEligible} active job opportunities. Review criteria and apply.`,
      actionUrl: '/student/opportunities'
    });
  }

  // 4. Mock Tests practice
  if (mockTests.value.completedAttempts === 0) {
    actions.push({
      id: 'take-mock-test',
      category: 'MOCK_TEST',
      priority: 'MEDIUM',
      title: 'Take Practice Mock Test',
      description: 'Evaluate your technical foundation with timed campus mock tests.',
      actionUrl: '/student/mock-tests'
    });
  } else if (mockTests.value.topicGaps && mockTests.value.topicGaps.length > 0) {
    actions.push({
      id: 'review-topic-gaps',
      category: 'MOCK_TEST',
      priority: 'MEDIUM',
      title: 'Address Topic Gaps',
      description: `Target improvement in weak topics: ${mockTests.value.topicGaps.slice(0, 3).map((t) => t.topic).join(', ')}.`,
      actionUrl: '/student/mock-tests'
    });
  }

  // 5. AI Mock Interviews
  if (aiInterviews.value.completedSessions === 0) {
    actions.push({
      id: 'start-ai-interview',
      category: 'AI_INTERVIEW',
      priority: 'MEDIUM',
      title: 'Practice with AI Mock Interview',
      description: 'Run role-specific simulated interviews with instant objective rubric evaluation.',
      actionUrl: '/student/mock-interviews'
    });
  }

  // 6. Human 1:1 Mock Interviews
  if (humanInterviews.value.completedBookings === 0) {
    actions.push({
      id: 'schedule-human-mock',
      category: 'HUMAN_INTERVIEW',
      priority: 'LOW',
      title: 'Schedule 1:1 Live Practice Interview',
      description: 'Book a 1:1 interview slot with verified alumni or placement staff.',
      actionUrl: '/student/mock-interviews'
    });
  }

  return actions;
};

/**
 * Pure, read-only readiness aggregator for a single student.
 * Never merges or overwrites records from individual domains.
 * Each dimension returns { value, source, asOf }.
 */
export const getStudentReadiness = async (organizationId, userId) => {
  const orgId = new mongoose.Types.ObjectId(organizationId);
  const uId = new mongoose.Types.ObjectId(userId);

  // 1. Student Profile
  const profile = await StudentProfile.findOne({
    userId: uId,
    organizationId: orgId
  }).lean();

  if (!profile) {
    throw ApiError.notFound('Student profile not found for this organization');
  }

  const profileCompletenessData = calculateProfileCompleteness(profile);
  const profileCompleteness = {
    value: profileCompletenessData,
    source: 'StudentProfile',
    asOf: profile.updatedAt || profile.createdAt || new Date()
  };

  const studentProfileId = profile._id;

  // 2. Active Opportunities
  const now = new Date();
  const activeJobsCount = await JobOpportunity.countDocuments({
    organizationId: orgId,
    status: 'PUBLISHED',
    deadline: { $gte: now }
  });

  const latestJob = await JobOpportunity.findOne({
    organizationId: orgId,
    status: 'PUBLISHED'
  })
    .sort({ updatedAt: -1 })
    .select('updatedAt')
    .lean();

  const activeOpportunities = {
    value: {
      totalActive: activeJobsCount
    },
    source: 'JobOpportunity',
    asOf: latestJob?.updatedAt || now
  };

  // 3. Eligibility Distribution
  const evaluations = await EligibilityEvaluation.find({
    organizationId: orgId,
    $or: [{ studentProfileId }, { studentId: uId }]
  })
    .sort({ evaluatedAt: -1 })
    .lean();

  const eligibilityCounts = {
    LIKELY_ELIGIBLE: 0,
    POTENTIALLY_ELIGIBLE: 0,
    DOES_NOT_MEET: 0
  };

  let latestEvalDate = null;
  evaluations.forEach((ev) => {
    if (eligibilityCounts[ev.status] !== undefined) {
      eligibilityCounts[ev.status]++;
    }
    if (!latestEvalDate && ev.evaluatedAt) {
      latestEvalDate = ev.evaluatedAt;
    }
  });

  const eligibilityDistribution = {
    value: {
      totalEvaluated: evaluations.length,
      likelyEligibleCount: eligibilityCounts.LIKELY_ELIGIBLE,
      potentiallyEligibleCount: eligibilityCounts.POTENTIALLY_ELIGIBLE,
      doesNotMeetCount: eligibilityCounts.DOES_NOT_MEET
    },
    source: 'EligibilityEvaluation',
    asOf: latestEvalDate || profile.updatedAt || now
  };

  // 4. Application Statuses
  const applications = await JobApplication.find({
    organizationId: orgId,
    $or: [{ studentProfileId }, { studentId: uId }]
  })
    .sort({ updatedAt: -1 })
    .lean();

  const appStatusCounts = {
    APPLIED: 0,
    INTERESTED: 0,
    NOT_PROCEEDING: 0,
    WITHDRAWN: 0
  };
  let verifiedCount = 0;
  let unverifiedCount = 0;
  let latestAppDate = null;

  applications.forEach((app) => {
    if (appStatusCounts[app.status] !== undefined) {
      appStatusCounts[app.status]++;
    }
    if (app.verificationStatus === 'VERIFIED') {
      verifiedCount++;
    } else {
      unverifiedCount++;
    }
    if (!latestAppDate && app.updatedAt) {
      latestAppDate = app.updatedAt;
    }
  });

  const applicationStatuses = {
    value: {
      totalApplications: applications.length,
      byStatus: appStatusCounts,
      verifiedCount,
      unverifiedCount
    },
    source: 'JobApplication',
    asOf: latestAppDate || now
  };

  // 5. Mock Tests
  const testAttempts = await MockTestAttempt.find({
    organizationId: orgId,
    $or: [{ studentId: uId }, { studentUserId: uId }]
  })
    .sort({ updatedAt: -1 })
    .lean();

  const completedAttemptsList = testAttempts.filter(
    (a) => a.status === 'EVALUATED' || a.status === 'SUBMITTED'
  );

  let totalPercentage = 0;
  let highestPercentage = 0;
  const topicStats = {};

  completedAttemptsList.forEach((att) => {
    const p = att.percentage || 0;
    totalPercentage += p;
    if (p > highestPercentage) {
      highestPercentage = p;
    }

    if (att.scoringSnapshot?.topicWise && Array.isArray(att.scoringSnapshot.topicWise)) {
      att.scoringSnapshot.topicWise.forEach((t) => {
        if (!topicStats[t.topic]) {
          topicStats[t.topic] = { totalPercentage: 0, count: 0 };
        }
        topicStats[t.topic].totalPercentage += t.percentage || 0;
        topicStats[t.topic].count += 1;
      });
    }
  });

  const averagePercentage =
    completedAttemptsList.length > 0
      ? Math.round((totalPercentage / completedAttemptsList.length) * 10) / 10
      : 0;

  const topicGaps = Object.entries(topicStats)
    .map(([topic, stat]) => ({
      topic,
      averagePercentage: Math.round((stat.totalPercentage / stat.count) * 10) / 10
    }))
    .filter((t) => t.averagePercentage < 60)
    .sort((a, b) => a.averagePercentage - b.averagePercentage);

  const mockTests = {
    value: {
      totalAttempts: testAttempts.length,
      completedAttempts: completedAttemptsList.length,
      averagePercentage,
      highestPercentage,
      topicGaps
    },
    source: 'MockTestAttempt',
    asOf: testAttempts[0]?.updatedAt || testAttempts[0]?.submittedAt || now
  };

  // 6. AI Mock Interviews
  const aiSessions = await AiMockInterviewSession.find({
    organizationId: orgId,
    $or: [{ studentId: uId }, { studentUserId: uId }]
  })
    .sort({ updatedAt: -1 })
    .lean();

  const completedAiSessions = aiSessions.filter((s) => s.status === 'COMPLETED');
  let totalAiScore = 0;
  completedAiSessions.forEach((s) => {
    totalAiScore += s.evaluation?.percentage || s.evaluation?.overallScore || 0;
  });

  const avgAiScore =
    completedAiSessions.length > 0
      ? Math.round((totalAiScore / completedAiSessions.length) * 10) / 10
      : 0;

  const latestAiSession = completedAiSessions[0] || aiSessions[0];

  const aiInterviews = {
    value: {
      totalSessions: aiSessions.length,
      completedSessions: completedAiSessions.length,
      averagePercentage: avgAiScore,
      latestFeedbackSummary: latestAiSession?.evaluation?.feedbackSummary || null
    },
    source: 'AiMockInterviewSession',
    asOf: latestAiSession?.completedAt || latestAiSession?.updatedAt || now
  };

  // 7. Human 1:1 Mock Interviews
  const humanBookings = await HumanMockInterviewBooking.find({
    organizationId: orgId,
    $or: [{ studentId: uId }, { studentUserId: uId }]
  })
    .sort({ updatedAt: -1 })
    .lean();

  const completedBookings = humanBookings.filter((b) => b.status === 'COMPLETED');

  // ONLY Released Evaluations!
  const bookingIds = humanBookings.map((b) => b._id);
  const releasedEvaluations = await HumanInterviewEvaluation.find({
    organizationId: orgId,
    bookingId: { $in: bookingIds },
    status: 'RELEASED'
  })
    .sort({ updatedAt: -1 })
    .lean();

  let totalHumanScore = 0;
  releasedEvaluations.forEach((ev) => {
    totalHumanScore += ev.overallScore || 0;
  });

  const avgHumanScore =
    releasedEvaluations.length > 0
      ? Math.round((totalHumanScore / releasedEvaluations.length) * 10) / 10
      : 0;

  const latestReleasedEval = releasedEvaluations[0];

  const humanInterviews = {
    value: {
      totalBookings: humanBookings.length,
      completedBookings: completedBookings.length,
      releasedEvaluationsCount: releasedEvaluations.length,
      averageReleasedScore: avgHumanScore,
      latestFeedback: latestReleasedEval
        ? {
            overallScore: latestReleasedEval.overallScore,
            strengths: latestReleasedEval.strengths || [],
            improvementAreas: latestReleasedEval.improvementAreas || [],
            overallFeedback: latestReleasedEval.overallFeedback
          }
        : null
    },
    source: 'HumanInterviewEvaluation',
    asOf: latestReleasedEval?.updatedAt || humanBookings[0]?.updatedAt || now
  };

  // 8. Next Actions
  const nextActions = computeNextActions({
    profileCompleteness,
    activeOpportunities,
    eligibilityDistribution,
    applicationStatuses,
    mockTests,
    aiInterviews,
    humanInterviews
  });

  return {
    student: {
      id: profile._id,
      userId: profile.userId,
      fullName: profile.fullName,
      rollNumber: profile.studentId || profile.rollNumber,
      studentId: profile.studentId,
      degree: profile.degree,
      branch: profile.branch,
      graduationYear: profile.graduationYear
    },
    components: {
      profileCompleteness,
      activeOpportunities,
      eligibilityDistribution,
      applicationStatuses,
      mockTests,
      aiInterviews,
      humanInterviews
    },
    nextActions,
    compositeIndicator: null // Default: no composite score per specification
  };
};

/**
 * Aggregates cohort readiness for authorized placement staff.
 * Scoped to organization with cohort filters.
 */
export const getCohortReadiness = async (organizationId, filters = {}) => {
  const orgId = new mongoose.Types.ObjectId(organizationId);
  const query = { organizationId: orgId };

  if (filters.graduationYear) {
    query.graduationYear = parseInt(filters.graduationYear, 10);
  }
  if (filters.degree) {
    query.degree = filters.degree;
  }
  if (filters.branch) {
    query.branch = filters.branch;
  }

  const page = Math.max(1, parseInt(filters.page, 10) || 1);
  const limit = Math.min(100, Math.max(1, parseInt(filters.limit, 10) || 20));
  const skip = (page - 1) * limit;

  const [totalStudents, profiles] = await Promise.all([
    StudentProfile.countDocuments(query),
    StudentProfile.find(query)
      .sort({ rollNumber: 1, fullName: 1 })
      .skip(skip)
      .limit(limit)
      .lean()
  ]);

  // Aggregate student summary items
  const studentSummaries = await Promise.all(
    profiles.map(async (p) => {
      const completeness = calculateProfileCompleteness(p);

      const [testCount, aiCount, humanCount, appCount] = await Promise.all([
        MockTestAttempt.countDocuments({
          organizationId: orgId,
          $or: [{ studentId: p.userId }, { studentUserId: p.userId }],
          status: { $in: ['EVALUATED', 'SUBMITTED'] }
        }),
        AiMockInterviewSession.countDocuments({
          organizationId: orgId,
          $or: [{ studentId: p.userId }, { studentUserId: p.userId }],
          status: 'COMPLETED'
        }),
        HumanMockInterviewBooking.countDocuments({
          organizationId: orgId,
          $or: [{ studentId: p.userId }, { studentUserId: p.userId }],
          status: 'COMPLETED'
        }),
        JobApplication.countDocuments({
          organizationId: orgId,
          studentProfileId: p._id
        })
      ]);

      return {
        studentId: p._id,
        userId: p.userId,
        fullName: p.fullName,
        rollNumber: p.studentId || p.rollNumber,
        studentId: p.studentId,
        degree: p.degree,
        branch: p.branch,
        graduationYear: p.graduationYear,
        cgpa: p.cgpa,
        profileCompleteness: completeness.percentage,
        isProfileComplete: completeness.isComplete,
        mockTestsCompleted: testCount,
        aiSessionsCompleted: aiCount,
        humanSessionsCompleted: humanCount,
        applicationsCount: appCount
      };
    })
  );

  // Cohort aggregate overview
  const totalInCohort = await StudentProfile.countDocuments(query);
  let completeProfilesCount = 0;
  let sumCompleteness = 0;

  studentSummaries.forEach((s) => {
    if (s.isProfileComplete) completeProfilesCount++;
    sumCompleteness += s.profileCompleteness;
  });

  const avgCompleteness =
    studentSummaries.length > 0 ? Math.round(sumCompleteness / studentSummaries.length) : 0;

  return {
    cohort: {
      totalStudents,
      filtersApplied: {
        graduationYear: filters.graduationYear || null,
        degree: filters.degree || null,
        branch: filters.branch || null
      },
      averageProfileCompleteness: avgCompleteness,
      completeProfilesCount
    },
    students: studentSummaries,
    pagination: {
      page,
      limit,
      total: totalStudents,
      totalPages: Math.ceil(totalStudents / limit) || 1
    }
  };
};

/**
 * Staff endpoint to view detailed readiness of a single student.
 */
export const getStudentReadinessForStaff = async (organizationId, studentId) => {
  const profile = await StudentProfile.findOne({
    _id: studentId,
    organizationId
  }).lean();

  if (!profile) {
    throw ApiError.notFound('Student profile not found in your organization');
  }

  return getStudentReadiness(organizationId, profile.userId);
};
