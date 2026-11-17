import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { applicationService, interviewService } from '../../services/index.js';
import Card from '../../components/Card.jsx';
import Button from '../../components/Button.jsx';
import StatusBadge from '../../components/StatusBadge.jsx';
import ApplicationTimeline from '../../components/ApplicationTimeline.jsx';
import ConfirmDialog from '../../components/ConfirmDialog.jsx';
import {
  ArrowLeft,
  Building2,
  Calendar,
  Clock,
  Video,
  MapPin,
  ExternalLink,
  FileText,
  Undo2,
  CheckCircle2,
  AlertCircle,
  Loader2,
  Briefcase
} from 'lucide-react';

export default function ApplicationDetails() {
  const { applicationId } = useParams();
  const navigate = useNavigate();

  const [application, setApplication] = useState(null);
  const [interviews, setInterviews] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Withdraw State
  const [isWithdrawOpen, setIsWithdrawOpen] = useState(false);
  const [withdrawing, setWithdrawing] = useState(false);
  const [feedback, setFeedback] = useState({ type: '', message: '' });

  const fetchDetails = async () => {
    setLoading(true);
    setError(null);
    try {
      const [appRes, intRes] = await Promise.allSettled([
        applicationService.getApplicationById(applicationId),
        interviewService.getInterviews(applicationId)
      ]);

      if (appRes.status === 'fulfilled' && appRes.value.data) {
        setApplication(appRes.value.data);
      } else {
        throw new Error('Application details could not be found');
      }

      if (intRes.status === 'fulfilled' && intRes.value.data) {
        setInterviews(intRes.value.data.interviews || intRes.value.data || []);
      }
    } catch (err) {
      setError(err.message || 'Unable to load application');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDetails();
  }, [applicationId]);

  const handleWithdraw = async () => {
    setWithdrawing(true);
    try {
      await applicationService.withdrawApplication(applicationId);
      setIsWithdrawOpen(false);
      setFeedback({ type: 'success', message: 'Application successfully withdrawn.' });
      fetchDetails();
    } catch (err) {
      setFeedback({ type: 'error', message: err.message || 'Failed to withdraw application' });
    } finally {
      setWithdrawing(false);
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-20 space-y-3">
        <Loader2 className="w-8 h-8 animate-spin text-indigo-600" />
        <p className="text-xs text-slate-500 font-medium">Loading application status...</p>
      </div>
    );
  }

  if (error || !application) {
    return (
      <div className="max-w-2xl mx-auto py-12 text-center space-y-4">
        <div className="p-4 bg-rose-50 text-rose-700 rounded-xl border border-rose-200">
          <p className="text-sm font-semibold">{error || 'Application not found'}</p>
        </div>
        <Button variant="outline" size="sm" onClick={() => navigate('/student/applications')} icon={ArrowLeft}>
          Back to My Applications
        </Button>
      </div>
    );
  }

  const job = application.jobId || {};
  const isTerminal = ['withdrawn', 'rejected', 'selected'].includes(application.status);
  const activeInterviews = interviews.filter((i) => i.status !== 'cancelled');

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Back button */}
      <div>
        <button
          onClick={() => navigate('/student/applications')}
          className="inline-flex items-center text-xs font-semibold text-slate-500 hover:text-slate-900 transition-colors"
        >
          <ArrowLeft className="w-3.5 h-3.5 mr-1" />
          <span>Back to My Applications</span>
        </button>
      </div>

      {feedback.message && (
        <div
          className={`p-4 rounded-xl text-xs font-semibold flex items-center space-x-2 border ${
            feedback.type === 'success'
              ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
              : 'bg-rose-50 text-rose-800 border-rose-200'
          }`}
        >
          {feedback.type === 'success' ? (
            <CheckCircle2 className="w-4 h-4 text-emerald-600 flex-shrink-0" />
          ) : (
            <AlertCircle className="w-4 h-4 text-rose-600 flex-shrink-0" />
          )}
          <span>{feedback.message}</span>
        </div>
      )}

      {/* Main Status Header Card */}
      <Card>
        <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
          <div className="space-y-2">
            <div className="flex items-center space-x-2 text-xs font-semibold text-indigo-600">
              <Building2 className="w-4 h-4" />
              <span>{job.companyName || 'Visiting Company'}</span>
            </div>
            <h1 className="text-2xl font-bold text-slate-900">{job.title || 'Placement Position'}</h1>
            <div className="flex flex-wrap items-center gap-3 text-xs text-slate-500">
              {job.location && (
                <span className="flex items-center gap-1">
                  <MapPin className="w-3.5 h-3.5 text-slate-400" />
                  {job.location}
                </span>
              )}
              {job.employmentType && (
                <>
                  <span>•</span>
                  <span className="capitalize">{job.employmentType.replace('_', ' ')}</span>
                </>
              )}
              <span>•</span>
              <span>Applied on: {new Date(application.createdAt).toLocaleDateString()}</span>
            </div>
          </div>

          <div className="flex flex-col items-end space-y-2">
            <StatusBadge status={application.status} size="md" />
            {!isTerminal && (
              <Button
                variant="outline"
                size="sm"
                className="text-rose-600 hover:bg-rose-50 hover:text-rose-700"
                onClick={() => setIsWithdrawOpen(true)}
                icon={Undo2}
              >
                Withdraw Application
              </Button>
            )}
          </div>
        </div>
      </Card>

      {/* Interview Info Banner (If Scheduled) */}
      {activeInterviews.length > 0 && (
        <Card
          title="Scheduled Interview Details"
          subtitle="Instructions provided by the corporate recruiting team"
          className="border-indigo-200 bg-indigo-50/20"
        >
          <div className="space-y-4">
            {activeInterviews.map((intw) => {
              const intwDate = new Date(intw.scheduledAt);
              return (
                <div
                  key={intw._id}
                  className="bg-white rounded-xl border border-indigo-100 p-4 space-y-3 shadow-sm"
                >
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                    <div className="flex items-center space-x-2 text-indigo-700 font-semibold text-sm">
                      <Calendar className="w-4 h-4" />
                      <span>{intwDate.toLocaleDateString(undefined, { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</span>
                    </div>
                    <div className="flex items-center space-x-1.5 text-xs text-slate-600 bg-slate-100 px-2.5 py-1 rounded-md font-medium">
                      <Clock className="w-3.5 h-3.5 text-slate-500" />
                      <span>{intwDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs pt-1 border-t border-slate-100">
                    <div>
                      <span className="text-slate-400 block font-medium">Format:</span>
                      <span className="capitalize font-semibold text-slate-800">
                        {intw.mode === 'online' ? 'Online Video Call' : 'In-Person Campus Interview'}
                      </span>
                    </div>
                    <div>
                      <span className="text-slate-400 block font-medium">Location / Meeting Link:</span>
                      {intw.mode === 'online' && intw.locationOrLink ? (
                        <a
                          href={intw.locationOrLink}
                          target="_blank"
                          rel="noreferrer"
                          className="text-indigo-600 hover:underline font-semibold inline-flex items-center gap-1"
                        >
                          <Video className="w-3.5 h-3.5" />
                          <span>Join Meeting</span>
                          <ExternalLink className="w-2.5 h-2.5" />
                        </a>
                      ) : (
                        <span className="font-semibold text-slate-800">
                          {intw.locationOrLink || 'Placement Cell Interview Room'}
                        </span>
                      )}
                    </div>
                  </div>

                  {intw.notes && (
                    <div className="text-xs bg-slate-50 border border-slate-100 p-2.5 rounded-lg text-slate-700">
                      <strong>Notes from Recruiter:</strong> {intw.notes}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </Card>
      )}

      {/* Resume Snapshot Used For Application */}
      <Card title="Submitted Resume Snapshot" subtitle="Exact resume version received by recruiter at time of application">
        {application.resumeSnapshot?.url ? (
          <div className="flex items-center justify-between p-3.5 bg-slate-50 rounded-xl border border-slate-200">
            <div className="flex items-center space-x-3">
              <div className="p-2 bg-indigo-100 text-indigo-700 rounded-lg">
                <FileText className="w-5 h-5" />
              </div>
              <div>
                <p className="text-sm font-semibold text-slate-900">
                  {application.resumeSnapshot.fileName || 'Attached_Resume.pdf'}
                </p>
                <p className="text-xs text-slate-500">
                  Attached {new Date(application.createdAt).toLocaleDateString()} • {(application.resumeSnapshot.size / 1024).toFixed(1)} KB
                </p>
              </div>
            </div>

            <a
              href={application.resumeSnapshot.url}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center space-x-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg bg-white border border-slate-300 text-slate-700 hover:bg-slate-50 transition-colors shadow-sm"
            >
              <span>View Snapshot</span>
              <ExternalLink className="w-3.5 h-3.5" />
            </a>
          </div>
        ) : (
          <p className="text-xs text-slate-500">Profile credentials used for this drive.</p>
        )}
      </Card>

      {/* Progression Timeline */}
      <Card title="Application Status Timeline" subtitle="Chronological progression of recruitment stages">
        <ApplicationTimeline
          history={application.statusHistory || []}
          currentStatus={application.status}
        />
      </Card>

      {/* Withdraw Dialog */}
      <ConfirmDialog
        isOpen={isWithdrawOpen}
        onClose={() => setIsWithdrawOpen(false)}
        onConfirm={handleWithdraw}
        title="Withdraw Application"
        message={`Are you sure you want to withdraw your application for "${job.title}"? Your application will be marked as withdrawn and you cannot reapply.`}
        confirmText="Confirm Withdrawal"
        variant="danger"
        loading={withdrawing}
      />
    </div>
  );
}

