import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { jobService, applicationService, studentService } from '../../services/index.js';
import Card from '../../components/Card.jsx';
import Button from '../../components/Button.jsx';
import Modal from '../../components/Modal.jsx';
import StatusBadge from '../../components/StatusBadge.jsx';
import {
  Building2,
  MapPin,
  Calendar,
  Briefcase,
  DollarSign,
  GraduationCap,
  CheckCircle2,
  AlertCircle,
  Clock,
  ArrowLeft,
  FileCheck,
  UploadCloud,
  Loader2
} from 'lucide-react';

export default function JobDetails() {
  const { jobId } = useParams();
  const navigate = useNavigate();

  const [job, setJob] = useState(null);
  const [eligibility, setEligibility] = useState(null);
  const [studentProfile, setStudentProfile] = useState(null);
  const [hasApplied, setHasApplied] = useState(false);
  const [applicationId, setApplicationId] = useState(null);

  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);

  // Apply modal
  const [isApplyModalOpen, setIsApplyModalOpen] = useState(false);
  const [applyError, setApplyError] = useState('');
  const [applySuccess, setApplySuccess] = useState(false);

  useEffect(() => {
    const fetchDetails = async () => {
      setLoading(true);
      setError(null);
      try {
        const [jobRes, profRes, myAppsRes] = await Promise.allSettled([
          jobService.getJobById(jobId),
          studentService.getMyProfile(),
          applicationService.getMyApplications({ limit: 100 })
        ]);

        if (jobRes.status === 'fulfilled' && jobRes.value.data) {
          setJob(jobRes.value.data.job);
          setEligibility(jobRes.value.data.eligibility);
        } else {
          throw new Error('Failed to load job details');
        }

        if (profRes.status === 'fulfilled' && profRes.value.data) {
          setStudentProfile(profRes.value.data);
        }

        if (myAppsRes.status === 'fulfilled' && myAppsRes.value.data) {
          const found = (myAppsRes.value.data.applications || []).find(
            (a) => (a.jobId?._id || a.jobId) === jobId
          );
          if (found) {
            setHasApplied(true);
            setApplicationId(found._id);
          }
        }
      } catch (err) {
        setError(err.message || 'Error loading job details');
      } finally {
        setLoading(false);
      }
    };

    fetchDetails();
  }, [jobId]);

  const handleConfirmApply = async () => {
    setApplyError('');
    setSubmitting(true);
    try {
      const res = await applicationService.applyToJob(jobId);
      if (res.success) {
        setApplySuccess(true);
        setHasApplied(true);
        setTimeout(() => {
          setIsApplyModalOpen(false);
          navigate('/student/applications');
        }, 1200);
      }
    } catch (err) {
      setApplyError(err.message || 'Failed to submit application');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-24 space-y-3">
        <Loader2 className="w-8 h-8 animate-spin text-indigo-600" />
        <p className="text-xs text-slate-500 font-medium">Loading position details...</p>
      </div>
    );
  }

  if (error || !job) {
    return (
      <div className="max-w-2xl mx-auto py-12 text-center space-y-4">
        <div className="p-4 bg-rose-50 text-rose-700 rounded-xl border border-rose-200">
          <p className="text-sm font-semibold">{error || 'Job not found'}</p>
        </div>
        <Button variant="outline" size="sm" onClick={() => navigate('/student/jobs')} icon={ArrowLeft}>
          Back to Browse Jobs
        </Button>
      </div>
    );
  }

  const deadline = new Date(job.applicationDeadline);
  const isExpired = deadline < new Date();
  const hasResume = !!studentProfile?.resume?.url;
  const isEligible = eligibility ? eligibility.isEligible : true;

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Back button */}
      <div>
        <button
          onClick={() => navigate('/student/jobs')}
          className="inline-flex items-center text-xs font-semibold text-slate-500 hover:text-slate-900 transition-colors"
        >
          <ArrowLeft className="w-3.5 h-3.5 mr-1" />
          <span>Back to Opportunities</span>
        </button>
      </div>

      {/* Hero Job Header */}
      <Card>
        <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
          <div className="space-y-2">
            <div className="flex items-center space-x-2 text-xs font-semibold text-indigo-600">
              <Building2 className="w-4 h-4" />
              <span>{job.companyName}</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
              {job.title}
            </h1>
            <div className="flex flex-wrap items-center gap-3 text-xs text-slate-500 pt-1">
              <span className="flex items-center gap-1">
                <MapPin className="w-3.5 h-3.5 text-slate-400" />
                {job.location || 'Multiple Locations'}
              </span>
              <span>•</span>
              <span className="flex items-center gap-1">
                <Briefcase className="w-3.5 h-3.5 text-slate-400" />
                <span className="capitalize">{job.employmentType?.replace('_', ' ')}</span>
              </span>
              {job.salaryRange && (
                <>
                  <span>•</span>
                  <span className="flex items-center gap-1 font-medium text-slate-700">
                    <DollarSign className="w-3.5 h-3.5 text-emerald-600" />
                    {job.salaryRange}
                  </span>
                </>
              )}
            </div>
          </div>

          {/* Action Button */}
          <div className="flex flex-col items-end space-y-2">
            {hasApplied ? (
              <div className="bg-emerald-50 text-emerald-700 border border-emerald-200 px-4 py-2 rounded-lg text-xs font-bold flex items-center space-x-1.5">
                <CheckCircle2 className="w-4 h-4" />
                <span>Application Submitted</span>
              </div>
            ) : isExpired ? (
              <div className="bg-slate-100 text-slate-500 px-4 py-2 rounded-lg text-xs font-bold">
                Application Closed
              </div>
            ) : !isEligible ? (
              <Button variant="secondary" size="md" disabled>
                Not Eligible to Apply
              </Button>
            ) : !hasResume ? (
              <Link to="/student/profile">
                <Button variant="primary" size="md" icon={UploadCloud}>
                  Upload Resume to Apply
                </Button>
              </Link>
            ) : (
              <Button
                variant="primary"
                size="md"
                onClick={() => setIsApplyModalOpen(true)}
                icon={FileCheck}
              >
                Apply for this Position
              </Button>
            )}

            <div className="flex items-center space-x-1 text-[11px] text-slate-400">
              <Clock className="w-3 h-3" />
              <span>Deadline: {deadline.toLocaleDateString()}</span>
            </div>
          </div>
        </div>
      </Card>

      {/* Eligibility Evaluation Banner */}
      {eligibility && (
        <div
          className={`p-4 rounded-xl border flex items-start space-x-3 ${
            isEligible
              ? 'bg-emerald-50/70 border-emerald-200 text-emerald-900'
              : 'bg-amber-50/80 border-amber-200 text-amber-900'
          }`}
        >
          {isEligible ? (
            <CheckCircle2 className="w-5 h-5 text-emerald-600 flex-shrink-0 mt-0.5" />
          ) : (
            <AlertCircle className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
          )}
          <div className="space-y-1 text-xs">
            <h4 className="font-bold text-sm">
              {isEligible ? 'You are eligible to apply!' : 'Eligibility Notice'}
            </h4>
            {isEligible ? (
              <p className="text-emerald-700">
                Your branch ({studentProfile?.branch}), CGPA ({studentProfile?.cgpa}), and graduation year ({studentProfile?.graduationYear}) satisfy the listed criteria.
              </p>
            ) : (
              <div className="space-y-1 text-amber-800">
                <p>You currently do not satisfy one or more listed requirements:</p>
                <ul className="list-disc list-inside space-y-0.5 font-medium pl-1">
                  {eligibility.reasons?.map((r, i) => (
                    <li key={i}>{r}</li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Criteria Breakdown Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white p-4 rounded-xl border border-slate-200 space-y-1">
          <span className="text-[11px] uppercase tracking-wider font-semibold text-slate-400 block">
            Minimum CGPA Required
          </span>
          <span className="text-lg font-bold text-slate-900">
            {job.eligibilityCriteria?.minCgpa > 0 ? job.eligibilityCriteria.minCgpa : 'No Minimum'}
          </span>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200 space-y-1">
          <span className="text-[11px] uppercase tracking-wider font-semibold text-slate-400 block">
            Eligible Branches
          </span>
          <span className="text-sm font-semibold text-slate-900">
            {job.eligibilityCriteria?.allowedBranches?.length > 0
              ? job.eligibilityCriteria.allowedBranches.join(', ')
              : 'Open to All Branches'}
          </span>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200 space-y-1">
          <span className="text-[11px] uppercase tracking-wider font-semibold text-slate-400 block">
            Eligible Graduation Years
          </span>
          <span className="text-sm font-semibold text-slate-900">
            {job.eligibilityCriteria?.allowedGraduationYears?.length > 0
              ? job.eligibilityCriteria.allowedGraduationYears.join(', ')
              : 'Any Batch'}
          </span>
        </div>
      </div>

      {/* Description & Requirements */}
      <Card title="Job Description & Responsibilities">
        <div className="prose prose-sm max-w-none text-slate-700 whitespace-pre-line leading-relaxed">
          {job.description}
        </div>

        {job.requirements && (
          <div className="mt-6 pt-6 border-t border-slate-100">
            <h4 className="text-sm font-bold text-slate-900 mb-2">Qualifications & Requirements</h4>
            <div className="prose prose-sm max-w-none text-slate-700 whitespace-pre-line leading-relaxed">
              {job.requirements}
            </div>
          </div>
        )}
      </Card>

      {/* Apply Confirmation Modal */}
      <Modal
        isOpen={isApplyModalOpen}
        onClose={() => !submitting && setIsApplyModalOpen(false)}
        title="Confirm Job Application"
        maxWidth="max-w-md"
      >
        <div className="space-y-4">
          <p className="text-sm text-slate-600">
            You are applying for <strong>{job.title}</strong> at <strong>{job.companyName}</strong>.
          </p>

          <div className="bg-slate-50 border border-slate-200 rounded-lg p-3 space-y-2 text-xs">
            <div className="flex justify-between">
              <span className="text-slate-500">Applicant:</span>
              <span className="font-semibold text-slate-800">{studentProfile?.userId?.name || 'You'}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500">Resume Attached:</span>
              <span className="font-semibold text-emerald-600 truncate max-w-[200px]">
                {studentProfile?.resume?.fileName || 'Attached Resume'}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500">Current CGPA:</span>
              <span className="font-semibold text-slate-800">{studentProfile?.cgpa}</span>
            </div>
          </div>

          {applyError && (
            <div className="p-3 bg-rose-50 border border-rose-200 text-rose-700 rounded-lg text-xs">
              {applyError}
            </div>
          )}

          {applySuccess && (
            <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-700 rounded-lg text-xs font-semibold">
              ✓ Application submitted successfully! Redirecting...
            </div>
          )}

          <div className="flex justify-end space-x-3 pt-4 border-t border-slate-100">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setIsApplyModalOpen(false)}
              disabled={submitting || applySuccess}
            >
              Cancel
            </Button>
            <Button
              variant="primary"
              size="sm"
              onClick={handleConfirmApply}
              loading={submitting}
              disabled={applySuccess}
            >
              Submit Application
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}

