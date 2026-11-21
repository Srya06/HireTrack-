import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Compass,
  CheckCircle2,
  AlertCircle,
  Clock,
  User,
  Briefcase,
  FileText,
  Award,
  Bot,
  UserCheck,
  ArrowRight,
  TrendingUp,
  RotateCcw,
  ShieldCheck,
  Sparkles,
  HelpCircle,
  ExternalLink
} from 'lucide-react';
import Card from '../../components/Card.jsx';
import Button from '../../components/Button.jsx';
import readinessService from '../../services/readiness.service.js';

export default function StudentReadinessDashboard() {
  const navigate = useNavigate();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchReadiness = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await readinessService.getStudentReadiness();
      setData(res.data || res);
    } catch (err) {
      setError(err.response?.data?.message || err.message || 'Failed to load readiness report');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchReadiness();
  }, []);

  if (loading) {
    return (
      <div className="py-20 text-center text-slate-500 space-y-3">
        <RotateCcw className="w-8 h-8 animate-spin text-indigo-600 mx-auto" />
        <p className="text-sm font-medium">Aggregating multi-domain readiness metrics...</p>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="p-6 bg-rose-50 border border-rose-200 rounded-xl text-rose-800 space-y-3">
        <div className="flex items-center gap-2">
          <AlertCircle className="w-5 h-5 text-rose-600" />
          <h3 className="font-bold text-sm">Unable to load readiness indicators</h3>
        </div>
        <p className="text-xs text-rose-700">{error || 'Data is unavailable'}</p>
        <Button size="sm" variant="outline" onClick={fetchReadiness}>
          Try Again
        </Button>
      </div>
    );
  }

  const { student, components = {}, nextActions = [] } = data;
  const {
    profileCompleteness,
    activeOpportunities,
    eligibilityDistribution,
    applicationStatuses,
    mockTests,
    aiInterviews,
    humanInterviews
  } = components;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
            <Compass className="w-7 h-7 text-indigo-600" />
            Placement Preparation & Readiness
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            Aggregated readiness across profile, campus opportunities, mock tests, and interview practice.
          </p>
        </div>
        <Button size="sm" variant="outline" onClick={fetchReadiness} className="self-start sm:self-auto flex items-center gap-1.5">
          <RotateCcw className="w-3.5 h-3.5" /> Refresh Metrics
        </Button>
      </div>

      {/* Preparation Principle Banner */}
      <div className="p-4 rounded-xl bg-slate-900 text-white flex flex-col md:flex-row items-start md:items-center justify-between gap-3 shadow-sm">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-lg bg-indigo-500/20 border border-indigo-400/30 flex items-center justify-center flex-shrink-0">
            <ShieldCheck className="w-5 h-5 text-indigo-300" />
          </div>
          <div>
            <h4 className="text-sm font-semibold text-slate-100">Pure Multi-Domain Preparation Indicators</h4>
            <p className="text-xs text-slate-400 mt-0.5">
              Live records from each domain are presented independently. No fabricated placement probability or composite scoring.
            </p>
          </div>
        </div>
        <span className="text-[11px] font-mono px-2.5 py-1 rounded bg-slate-800 text-indigo-300 border border-slate-700">
          Roll No: {student?.rollNumber || student?.studentId || 'N/A'}
        </span>
      </div>

      {/* Dimension Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
        {/* 1. Profile Completeness */}
        <Card className="p-5 flex flex-col justify-between space-y-4">
          <div className="space-y-2.5">
            <div className="flex items-center justify-between">
              <span className="p-2 rounded-lg bg-blue-50 text-blue-600">
                <User className="w-4 h-4" />
              </span>
              <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-slate-100 text-slate-600">
                Source: {profileCompleteness?.source || 'StudentProfile'}
              </span>
            </div>
            <div>
              <h3 className="font-bold text-slate-900 text-sm">Profile Completeness</h3>
              <p className="text-xs text-slate-500 mt-0.5">Verified academic and skill credentials</p>
            </div>
            <div className="space-y-1.5">
              <div className="flex items-baseline justify-between text-xs">
                <span className="font-medium text-slate-600">Status</span>
                <span className="font-bold text-slate-900">{profileCompleteness?.value?.percentage || 0}%</span>
              </div>
              <div className="w-full h-2 rounded-full bg-slate-100 overflow-hidden">
                <div
                  className="h-full bg-blue-600 rounded-full transition-all duration-500"
                  style={{ width: `${profileCompleteness?.value?.percentage || 0}%` }}
                />
              </div>
            </div>
            {profileCompleteness?.value?.missingFields?.length > 0 && (
              <div className="text-[11px] text-amber-700 bg-amber-50 p-2 rounded border border-amber-200">
                <span className="font-semibold block mb-0.5">Missing:</span>
                {profileCompleteness.value.missingFields.join(', ')}
              </div>
            )}
          </div>
          <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-xs text-slate-400">
            <span>As of: {profileCompleteness?.asOf ? new Date(profileCompleteness.asOf).toLocaleDateString() : 'Now'}</span>
            <button
              onClick={() => navigate('/student/profile')}
              className="text-indigo-600 hover:text-indigo-800 font-semibold flex items-center gap-1"
            >
              Update &rarr;
            </button>
          </div>
        </Card>

        {/* 2. Campus Opportunities & Eligibility */}
        <Card className="p-5 flex flex-col justify-between space-y-4">
          <div className="space-y-2.5">
            <div className="flex items-center justify-between">
              <span className="p-2 rounded-lg bg-emerald-50 text-emerald-600">
                <Briefcase className="w-4 h-4" />
              </span>
              <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-slate-100 text-slate-600">
                Source: {activeOpportunities?.source || 'JobOpportunity'}
              </span>
            </div>
            <div>
              <h3 className="font-bold text-slate-900 text-sm">Opportunities & Eligibility</h3>
              <p className="text-xs text-slate-500 mt-0.5">Active listings & advisory criteria match</p>
            </div>
            <div className="grid grid-cols-2 gap-2 text-center pt-1">
              <div className="p-2 rounded-lg bg-slate-50 border border-slate-100">
                <span className="text-xs text-slate-500 block">Active Jobs</span>
                <span className="text-lg font-bold text-slate-900">{activeOpportunities?.value?.totalActive || 0}</span>
              </div>
              <div className="p-2 rounded-lg bg-emerald-50 border border-emerald-100">
                <span className="text-xs text-emerald-700 block">Likely Eligible</span>
                <span className="text-lg font-bold text-emerald-700">{eligibilityDistribution?.value?.likelyEligibleCount || 0}</span>
              </div>
            </div>
            <div className="text-[11px] text-slate-500 flex justify-between px-1">
              <span>Potentially Eligible: {eligibilityDistribution?.value?.potentiallyEligibleCount || 0}</span>
              <span>Does Not Meet: {eligibilityDistribution?.value?.doesNotMeetCount || 0}</span>
            </div>
          </div>
          <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-xs text-slate-400">
            <span>As of: {activeOpportunities?.asOf ? new Date(activeOpportunities.asOf).toLocaleDateString() : 'Now'}</span>
            <button
              onClick={() => navigate('/student/opportunities')}
              className="text-indigo-600 hover:text-indigo-800 font-semibold flex items-center gap-1"
            >
              Explore &rarr;
            </button>
          </div>
        </Card>

        {/* 3. Applications Tracking */}
        <Card className="p-5 flex flex-col justify-between space-y-4">
          <div className="space-y-2.5">
            <div className="flex items-center justify-between">
              <span className="p-2 rounded-lg bg-sky-50 text-sky-600">
                <FileText className="w-4 h-4" />
              </span>
              <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-slate-100 text-slate-600">
                Source: {applicationStatuses?.source || 'JobApplication'}
              </span>
            </div>
            <div>
              <h3 className="font-bold text-slate-900 text-sm">Application Statuses</h3>
              <p className="text-xs text-slate-500 mt-0.5">Student-reported application timeline</p>
            </div>
            <div className="grid grid-cols-2 gap-2 text-center pt-1">
              <div className="p-2 rounded-lg bg-slate-50 border border-slate-100">
                <span className="text-xs text-slate-500 block">Applied</span>
                <span className="text-lg font-bold text-sky-700">{applicationStatuses?.value?.byStatus?.APPLIED || 0}</span>
              </div>
              <div className="p-2 rounded-lg bg-slate-50 border border-slate-100">
                <span className="text-xs text-slate-500 block">Interested</span>
                <span className="text-lg font-bold text-slate-700">{applicationStatuses?.value?.byStatus?.INTERESTED || 0}</span>
              </div>
            </div>
            <div className="text-[11px] text-slate-500 flex justify-between px-1">
              <span>Verified: {applicationStatuses?.value?.verifiedCount || 0}</span>
              <span>Unverified: {applicationStatuses?.value?.unverifiedCount || 0}</span>
            </div>
          </div>
          <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-xs text-slate-400">
            <span>As of: {applicationStatuses?.asOf ? new Date(applicationStatuses.asOf).toLocaleDateString() : 'Now'}</span>
            <button
              onClick={() => navigate('/student/applications')}
              className="text-indigo-600 hover:text-indigo-800 font-semibold flex items-center gap-1"
            >
              Timeline &rarr;
            </button>
          </div>
        </Card>

        {/* 4. Mock Tests Performance */}
        <Card className="p-5 flex flex-col justify-between space-y-4">
          <div className="space-y-2.5">
            <div className="flex items-center justify-between">
              <span className="p-2 rounded-lg bg-purple-50 text-purple-600">
                <Award className="w-4 h-4" />
              </span>
              <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-slate-100 text-slate-600">
                Source: {mockTests?.source || 'MockTestAttempt'}
              </span>
            </div>
            <div>
              <h3 className="font-bold text-slate-900 text-sm">Mock Test Performance</h3>
              <p className="text-xs text-slate-500 mt-0.5">Technical & cognitive assessments</p>
            </div>
            <div className="grid grid-cols-2 gap-2 text-center pt-1">
              <div className="p-2 rounded-lg bg-purple-50/50 border border-purple-100">
                <span className="text-xs text-purple-700 block">Avg Score</span>
                <span className="text-lg font-bold text-purple-900">{mockTests?.value?.averagePercentage || 0}%</span>
              </div>
              <div className="p-2 rounded-lg bg-slate-50 border border-slate-100">
                <span className="text-xs text-slate-500 block">Attempts</span>
                <span className="text-lg font-bold text-slate-900">{mockTests?.value?.completedAttempts || 0}</span>
              </div>
            </div>
            {mockTests?.value?.topicGaps?.length > 0 && (
              <div className="text-[11px] text-amber-700 bg-amber-50 p-2 rounded border border-amber-200">
                <span className="font-semibold block mb-0.5">Topic Gaps (&lt;60%):</span>
                {mockTests.value.topicGaps.map((t) => t.topic || t).join(', ')}
              </div>
            )}
          </div>
          <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-xs text-slate-400">
            <span>As of: {mockTests?.asOf ? new Date(mockTests.asOf).toLocaleDateString() : 'Now'}</span>
            <button
              onClick={() => navigate('/student/mock-tests')}
              className="text-indigo-600 hover:text-indigo-800 font-semibold flex items-center gap-1"
            >
              Assessments &rarr;
            </button>
          </div>
        </Card>

        {/* 5. AI Mock Interviews */}
        <Card className="p-5 flex flex-col justify-between space-y-4">
          <div className="space-y-2.5">
            <div className="flex items-center justify-between">
              <span className="p-2 rounded-lg bg-indigo-50 text-indigo-600">
                <Bot className="w-4 h-4" />
              </span>
              <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-slate-100 text-slate-600">
                Source: {aiInterviews?.source || 'AiMockInterviewSession'}
              </span>
            </div>
            <div>
              <h3 className="font-bold text-slate-900 text-sm">AI Mock Interviews</h3>
              <p className="text-xs text-slate-500 mt-0.5">Safe, role-specific interactive practice</p>
            </div>
            <div className="grid grid-cols-2 gap-2 text-center pt-1">
              <div className="p-2 rounded-lg bg-indigo-50/50 border border-indigo-100">
                <span className="text-xs text-indigo-700 block">Avg Rubric</span>
                <span className="text-lg font-bold text-indigo-900">{aiInterviews?.value?.averagePercentage || 0}%</span>
              </div>
              <div className="p-2 rounded-lg bg-slate-50 border border-slate-100">
                <span className="text-xs text-slate-500 block">Completed</span>
                <span className="text-lg font-bold text-slate-900">{aiInterviews?.value?.completedSessions || 0}</span>
              </div>
            </div>
            {aiInterviews?.value?.latestFeedbackSummary && (
              <p className="text-[11px] text-slate-600 line-clamp-2 bg-slate-50 p-2 rounded italic">
                "{aiInterviews.value.latestFeedbackSummary}"
              </p>
            )}
          </div>
          <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-xs text-slate-400">
            <span>As of: {aiInterviews?.asOf ? new Date(aiInterviews.asOf).toLocaleDateString() : 'Now'}</span>
            <button
              onClick={() => navigate('/student/mock-interviews')}
              className="text-indigo-600 hover:text-indigo-800 font-semibold flex items-center gap-1"
            >
              Practice AI &rarr;
            </button>
          </div>
        </Card>

        {/* 6. Human Mock Interviews */}
        <Card className="p-5 flex flex-col justify-between space-y-4">
          <div className="space-y-2.5">
            <div className="flex items-center justify-between">
              <span className="p-2 rounded-lg bg-teal-50 text-teal-600">
                <UserCheck className="w-4 h-4" />
              </span>
              <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-slate-100 text-slate-600">
                Source: {humanInterviews?.source || 'HumanInterviewEvaluation'}
              </span>
            </div>
            <div>
              <h3 className="font-bold text-slate-900 text-sm">Human 1:1 Mock Interviews</h3>
              <p className="text-xs text-slate-500 mt-0.5">Live expert mock interviews & released rubrics</p>
            </div>
            <div className="grid grid-cols-2 gap-2 text-center pt-1">
              <div className="p-2 rounded-lg bg-teal-50/50 border border-teal-100">
                <span className="text-xs text-teal-700 block">Released Score</span>
                <span className="text-lg font-bold text-teal-900">{humanInterviews?.value?.averageReleasedScore || 0}%</span>
              </div>
              <div className="p-2 rounded-lg bg-slate-50 border border-slate-100">
                <span className="text-xs text-slate-500 block">Completed</span>
                <span className="text-lg font-bold text-slate-900">{humanInterviews?.value?.completedBookings || 0}</span>
              </div>
            </div>
            {humanInterviews?.value?.latestFeedback?.overallFeedback && (
              <p className="text-[11px] text-slate-600 line-clamp-2 bg-slate-50 p-2 rounded italic">
                "{humanInterviews.value.latestFeedback.overallFeedback}"
              </p>
            )}
          </div>
          <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-xs text-slate-400">
            <span>As of: {humanInterviews?.asOf ? new Date(humanInterviews.asOf).toLocaleDateString() : 'Now'}</span>
            <button
              onClick={() => navigate('/student/mock-interviews')}
              className="text-indigo-600 hover:text-indigo-800 font-semibold flex items-center gap-1"
            >
              Schedule 1:1 &rarr;
            </button>
          </div>
        </Card>
      </div>

      {/* Recommended Next Actions */}
      <Card className="p-6">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-indigo-600" />
            <h3 className="text-base font-bold text-slate-900">Recommended Next Steps</h3>
          </div>
          <span className="text-xs text-slate-500">Rule-based deterministic suggestions</span>
        </div>

        {nextActions.length === 0 ? (
          <div className="text-center py-6 text-slate-500 text-xs">
            <CheckCircle2 className="w-8 h-8 text-emerald-500 mx-auto mb-2" />
            You're all set! Profile is complete and all preparation benchmarks are active.
          </div>
        ) : (
          <div className="divide-y divide-slate-100">
            {nextActions.map((action, idx) => (
              <div key={action.id || action.key || idx} className="py-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span
                      className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                        action.priority === 'HIGH'
                          ? 'bg-rose-100 text-rose-800'
                          : action.priority === 'MEDIUM'
                          ? 'bg-amber-100 text-amber-800'
                          : 'bg-slate-100 text-slate-700'
                      }`}
                    >
                      {action.priority} PRIORITY
                    </span>
                    <h4 className="text-sm font-semibold text-slate-900">{action.title}</h4>
                  </div>
                  <p className="text-xs text-slate-600">{action.description}</p>
                </div>
                <Button
                  size="sm"
                  variant="primary"
                  onClick={() => navigate(action.actionUrl)}
                  className="self-start sm:self-auto flex items-center gap-1 flex-shrink-0"
                >
                  Take Action <ArrowRight className="w-3.5 h-3.5" />
                </Button>
              </div>
            ))}
          </div>
        )}
      </Card>
    </div>
  );
}
