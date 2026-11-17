import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext.jsx';
import { studentService, applicationService, jobService } from '../../services/index.js';
import Card from '../../components/Card.jsx';
import StatCard from '../../components/StatCard.jsx';
import StatusBadge from '../../components/StatusBadge.jsx';
import Button from '../../components/Button.jsx';
import {
  FileText,
  Briefcase,
  CheckCircle2,
  Calendar,
  AlertCircle,
  ArrowRight,
  UploadCloud,
  Loader2
} from 'lucide-react';

export default function StudentDashboard() {
  const { user } = useAuth();
  const [profile, setProfile] = useState(null);
  const [applications, setApplications] = useState([]);
  const [activeJobs, setActiveJobs] = useState([]);
  const [totalJobsCount, setTotalJobsCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const loadDashboardData = async () => {
    setLoading(true);
    setError(null);
    try {
      const [profRes, appsRes, jobsRes] = await Promise.allSettled([
        studentService.getMyProfile(),
        applicationService.getMyApplications({ limit: 100 }),
        jobService.getJobs({ limit: 6 })
      ]);

      if (profRes.status === 'fulfilled' && profRes.value.data) {
        setProfile(profRes.value.data);
      }
      if (appsRes.status === 'fulfilled' && appsRes.value.data) {
        setApplications(appsRes.value.data.applications || []);
      }
      if (jobsRes.status === 'fulfilled' && jobsRes.value.data) {
        setActiveJobs(jobsRes.value.data.jobs || []);
        setTotalJobsCount(jobsRes.value.data.pagination?.total || (jobsRes.value.data.jobs || []).length);
      }
    } catch (err) {
      setError(err.message || 'Failed to load dashboard data');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadDashboardData();
  }, []);

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[50vh] space-y-3">
        <Loader2 className="w-8 h-8 animate-spin text-indigo-600" />
        <p className="text-xs text-slate-500 font-medium">Loading your placement dashboard...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-white rounded-xl border border-rose-200 p-8 text-center space-y-3">
        <AlertCircle className="w-8 h-8 text-rose-500 mx-auto" />
        <p className="text-sm font-semibold text-rose-800">{error}</p>
        <Button variant="outline" size="sm" onClick={loadDashboardData}>
          Try Again
        </Button>
      </div>
    );
  }

  // Calculate profile completeness
  const completeness = profile?.profileCompleteness?.percentage ?? (profile?.resume?.url ? 100 : 75);
  const hasResume = !!profile?.resume?.url;

  // Compute status summary counts
  const statusCounts = {
    applied: applications.filter((a) => a.status === 'applied').length,
    under_review: applications.filter((a) => a.status === 'under_review').length,
    shortlisted: applications.filter((a) => a.status === 'shortlisted').length,
    interview_scheduled: applications.filter((a) => a.status === 'interview_scheduled').length,
    selected: applications.filter((a) => a.status === 'selected').length
  };

  const totalApps = applications.length;
  const shortlistedApps = applications.filter((a) =>
    ['shortlisted', 'interview_scheduled', 'selected'].includes(a.status)
  ).length;
  const interviewApps = applications.filter((a) => a.status === 'interview_scheduled').length;

  return (
    <div className="space-y-6">
      {/* Welcome & Profile Completeness Banner */}
      <div className="bg-gradient-to-r from-indigo-700 to-indigo-800 rounded-2xl p-6 text-white shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div className="space-y-2">
          <h2 className="text-2xl font-bold tracking-tight">Welcome back, {user?.name}!</h2>
          <p className="text-indigo-100 text-sm max-w-xl">
            Placement season is active. Keep your profile updated and check job eligibility regularly.
          </p>
          <div className="flex items-center space-x-3 text-xs text-indigo-200 pt-1">
            <span>Branch: <strong>{profile?.branch || 'CSE'}</strong></span>
            <span>•</span>
            <span>CGPA: <strong>{profile?.cgpa || '8.5'}</strong></span>
            <span>•</span>
            <span>USN: <strong>{profile?.studentId || '-'}</strong></span>
          </div>
        </div>

        {/* Completeness Card */}
        <div className="bg-white/10 backdrop-blur-md rounded-xl p-4 border border-white/20 min-w-[260px] space-y-2">
          <div className="flex items-center justify-between text-xs font-semibold">
            <span>Profile Completeness</span>
            <span>{completeness}%</span>
          </div>
          <div className="w-full bg-white/20 rounded-full h-2 overflow-hidden">
            <div
              className="bg-emerald-400 h-full rounded-full transition-all duration-500"
              style={{ width: `${completeness}%` }}
            />
          </div>
          {!hasResume ? (
            <Link to="/student/profile" className="block text-xs text-amber-300 hover:underline font-medium">
              ⚠ Resume missing - Upload now to apply
            </Link>
          ) : (
            <span className="text-xs text-emerald-300 flex items-center gap-1 font-medium">
              <CheckCircle2 className="w-3.5 h-3.5" /> Resume attached & ready
            </span>
          )}
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
        <StatCard
          title="Submitted Applications"
          value={totalApps}
          subtitle="Tracked across all companies"
          icon={FileText}
          color="indigo"
        />
        <StatCard
          title="Shortlisted / In Progress"
          value={shortlistedApps}
          subtitle="Cleared initial resume screening"
          icon={CheckCircle2}
          color="emerald"
        />
        <StatCard
          title="Interviews Scheduled"
          value={interviewApps}
          subtitle="Upcoming technical / HR rounds"
          icon={Calendar}
          color="sky"
        />
      </div>

      {/* Application Status Funnel Summary */}
      <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-sm space-y-2">
        <div className="flex items-center justify-between text-xs font-semibold text-slate-500 uppercase tracking-wider">
          <span>Application Pipeline Summary</span>
          <Link to="/student/applications" className="text-indigo-600 hover:underline">
            View Application Details &rarr;
          </Link>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 pt-1">
          <div className="bg-sky-50 border border-sky-100 rounded-lg p-2.5 text-center">
            <span className="text-xs text-sky-700 font-medium block">Applied</span>
            <span className="text-xl font-bold text-sky-900">{statusCounts.applied}</span>
          </div>
          <div className="bg-amber-50 border border-amber-100 rounded-lg p-2.5 text-center">
            <span className="text-xs text-amber-700 font-medium block">Under Review</span>
            <span className="text-xl font-bold text-amber-900">{statusCounts.under_review}</span>
          </div>
          <div className="bg-indigo-50 border border-indigo-100 rounded-lg p-2.5 text-center">
            <span className="text-xs text-indigo-700 font-medium block">Shortlisted</span>
            <span className="text-xl font-bold text-indigo-900">{statusCounts.shortlisted}</span>
          </div>
          <div className="bg-purple-50 border border-purple-100 rounded-lg p-2.5 text-center">
            <span className="text-xs text-purple-700 font-medium block">Interviews</span>
            <span className="text-xl font-bold text-purple-900">{statusCounts.interview_scheduled}</span>
          </div>
          <div className="bg-emerald-50 border border-emerald-100 rounded-lg p-2.5 text-center">
            <span className="text-xs text-emerald-700 font-medium block">Selected (Offers)</span>
            <span className="text-xl font-bold text-emerald-900">{statusCounts.selected}</span>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent Applications Card */}
        <Card
          title="Recent Applications"
          subtitle="Your latest application status updates"
          action={
            <Link to="/student/applications">
              <span className="text-xs font-semibold text-indigo-600 hover:text-indigo-700 inline-flex items-center">
                View all &rarr;
              </span>
            </Link>
          }
        >
          {applications.length === 0 ? (
            <div className="text-center py-8 text-slate-500 space-y-3">
              <FileText className="w-8 h-8 text-slate-300 mx-auto" />
              <p className="text-sm font-medium">You haven't applied to any jobs yet.</p>
              <Link to="/student/jobs">
                <Button variant="outline" size="sm">
                  Explore Opportunities
                </Button>
              </Link>
            </div>
          ) : (
            <div className="divide-y divide-slate-100">
              {applications.slice(0, 4).map((app) => (
                <div key={app._id} className="py-3 flex items-center justify-between">
                  <div>
                    <h4 className="text-sm font-semibold text-slate-900">{app.jobId?.title || 'Job Opening'}</h4>
                    <p className="text-xs text-slate-500">{app.jobId?.companyName || 'Company'}</p>
                  </div>
                  <div className="flex items-center space-x-3">
                    <StatusBadge status={app.status} size="sm" />
                    <Link to={`/student/applications/${app._id}`}>
                      <Button variant="ghost" size="sm">
                        View
                      </Button>
                    </Link>
                  </div>
                </div>
              ))}
            </div>
          )}
        </Card>

        {/* Featured / Open Jobs Card */}
        <Card
          title={`Active Opportunities (${totalJobsCount})`}
          subtitle="Recently published campus drives"
          action={
            <Link to="/student/jobs">
              <span className="text-xs font-semibold text-indigo-600 hover:text-indigo-700 inline-flex items-center">
                Browse jobs &rarr;
              </span>
            </Link>
          }
        >
          {activeJobs.length === 0 ? (
            <div className="text-center py-8 text-slate-500 space-y-3">
              <Briefcase className="w-8 h-8 text-slate-300 mx-auto" />
              <p className="text-sm">No new campus drives open right now.</p>
            </div>
          ) : (
            <div className="divide-y divide-slate-100">
              {activeJobs.map((job) => (
                <div key={job._id} className="py-3 flex items-center justify-between">
                  <div>
                    <h4 className="text-sm font-semibold text-slate-900">{job.title}</h4>
                    <p className="text-xs text-slate-500">
                      {job.companyName} • {job.location || 'Bengaluru'}
                    </p>
                  </div>
                  <Link to={`/student/jobs/${job._id}`}>
                    <Button variant="outline" size="sm">
                      Details
                    </Button>
                  </Link>
                </div>
              ))}
            </div>
          )}
        </Card>
      </div>
    </div>
  );
}

