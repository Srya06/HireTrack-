import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext.jsx';
import { jobService, recruiterService, applicationService } from '../../services/index.js';
import Card from '../../components/Card.jsx';
import StatCard from '../../components/StatCard.jsx';
import StatusBadge from '../../components/StatusBadge.jsx';
import Button from '../../components/Button.jsx';
import {
  Briefcase,
  Users,
  CheckCircle2,
  Calendar,
  AlertTriangle,
  PlusCircle,
  Building2,
  ArrowRight,
  Loader2
} from 'lucide-react';

export default function RecruiterDashboard() {
  const { user } = useAuth();
  const [profile, setProfile] = useState(null);
  const [jobs, setJobs] = useState([]);
  const [awaitingReviewCount, setAwaitingReviewCount] = useState(0);
  const [upcomingInterviewsCount, setUpcomingInterviewsCount] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadDashboard = async () => {
      try {
        const [profRes, jobsRes] = await Promise.allSettled([
          recruiterService.getMyProfile(),
          jobService.getMyJobs({ limit: 20 })
        ]);

        if (profRes.status === 'fulfilled' && profRes.value.data) {
          setProfile(profRes.value.data);
        }

        if (jobsRes.status === 'fulfilled' && jobsRes.value) {
          const fetchedJobs = Array.isArray(jobsRes.value.data)
            ? jobsRes.value.data
            : jobsRes.value.data?.jobs || [];
          setJobs(fetchedJobs);

          // Calculate awaiting review & scheduled interviews across jobs
          if (fetchedJobs.length > 0) {
            const appsResults = await Promise.allSettled(
              fetchedJobs.slice(0, 10).map((j) =>
                applicationService.getJobApplications(j.id || j._id, { limit: 100 })
              )
            );
            let awaiting = 0;
            let interviews = 0;
            for (const res of appsResults) {
              if (res.status === 'fulfilled' && res.value) {
                const appsList = Array.isArray(res.value.data)
                  ? res.value.data
                  : res.value.data?.applications || res.value.data?.applicants || [];
                for (const app of appsList) {
                  if (['applied', 'under_review'].includes(app.status)) awaiting++;
                  if (app.status === 'interview_scheduled') interviews++;
                }
              }
            }
            setAwaitingReviewCount(awaiting);
            setUpcomingInterviewsCount(interviews);
          }
        }
      } finally {
        setLoading(false);
      }
    };

    loadDashboard();
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[50vh]">
        <Loader2 className="w-8 h-8 animate-spin text-indigo-600" />
      </div>
    );
  }

  const isPending = profile?.approvalStatus === 'pending' || user?.accountStatus === 'pending';
  const isApproved = profile?.approvalStatus === 'approved';

  // Stats calculation
  const totalJobs = jobs.length;
  const publishedJobs = jobs.filter((j) => j.status === 'published').length;
  const totalApplicants = jobs.reduce((acc, curr) => acc + (curr.applicantCount || 0), 0);

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center space-x-2 text-xs font-semibold text-indigo-600 mb-1">
            <Building2 className="w-4 h-4" />
            <span>{profile?.companyName || 'Corporate Partner'}</span>
          </div>
          <h2 className="text-2xl font-bold text-slate-900 tracking-tight">
            Recruitment Management Portal
          </h2>
          <p className="text-slate-500 text-xs sm:text-sm mt-0.5">
            Manage your campus hiring drives, review candidate profiles, and schedule interviews.
          </p>
        </div>

        <div>
          {isApproved ? (
            <Link to="/recruiter/jobs/new">
              <Button variant="primary" size="md" icon={PlusCircle}>
                Post New Job Drive
              </Button>
            </Link>
          ) : (
            <span className="text-xs bg-amber-50 text-amber-800 border border-amber-200 px-3 py-1.5 rounded-lg font-semibold flex items-center gap-1.5">
              <AlertTriangle className="w-4 h-4 text-amber-600" />
              Approval Required to Post
            </span>
          )}
        </div>
      </div>

      {/* Pending Account Notice Banner */}
      {isPending && (
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 flex items-start space-x-3 text-amber-900">
          <AlertTriangle className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
          <div className="space-y-1 text-xs">
            <h4 className="font-bold text-sm">Account Awaiting Approval</h4>
            <p>
              Your company profile has been submitted and is currently under review by the college placement cell administration. You can view your dashboard and draft positions, but cannot publish live jobs until your account is approved.
            </p>
          </div>
        </div>
      )}

      {/* Stats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title="Active Drives"
          value={publishedJobs}
          subtitle="Open for student applications"
          icon={Briefcase}
          color="indigo"
        />
        <StatCard
          title="Total Applicants"
          value={totalApplicants}
          subtitle="Received across all drives"
          icon={Users}
          color="sky"
        />
        <StatCard
          title="Awaiting Review"
          value={awaitingReviewCount}
          subtitle="Applications pending screening"
          icon={CheckCircle2}
          color="amber"
        />
        <StatCard
          title="Upcoming Interviews"
          value={upcomingInterviewsCount}
          subtitle="Scheduled candidate rounds"
          icon={Calendar}
          color="emerald"
        />
      </div>

      {/* Jobs Overview */}
      <Card
        title="Your Placement Drives"
        subtitle="Current status and candidate responses"
        action={
          <Link to="/recruiter/jobs">
            <span className="text-xs font-semibold text-indigo-600 hover:text-indigo-700 inline-flex items-center">
              Manage all jobs &rarr;
            </span>
          </Link>
        }
      >
        {jobs.length === 0 ? (
          <div className="text-center py-10 text-slate-500 space-y-3">
            <Briefcase className="w-8 h-8 text-slate-300 mx-auto" />
            <p className="text-sm">No placement drives created yet.</p>
            {isApproved && (
              <Link to="/recruiter/jobs/new">
                <Button variant="outline" size="sm" icon={PlusCircle}>
                  Create your first job
                </Button>
              </Link>
            )}
          </div>
        ) : (
          <div className="divide-y divide-slate-100">
            {jobs.slice(0, 5).map((j) => {
              const jobId = j.id || j._id;
              return (
              <div key={jobId} className="py-3 flex items-center justify-between">
                <div>
                  <h4 className="text-sm font-semibold text-slate-900">{j.title}</h4>
                  <p className="text-xs text-slate-500">
                    Deadline: {new Date(j.applicationDeadline).toLocaleDateString()} • {j.applicantCount || 0} applicants
                  </p>
                </div>
                <div className="flex items-center space-x-3">
                  <StatusBadge status={j.status} size="sm" />
                  <Link to={`/recruiter/jobs/${jobId}/applicants`}>
                    <Button variant="outline" size="sm">
                      View Applicants
                    </Button>
                  </Link>
                </div>
              </div>
              );
            })}
          </div>
        )}
      </Card>
    </div>
  );
}

