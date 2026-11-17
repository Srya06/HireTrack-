import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { applicationService, interviewService, jobService } from '../../services/index.js';
import DataTable from '../../components/DataTable.jsx';
import Pagination from '../../components/Pagination.jsx';
import StatusBadge from '../../components/StatusBadge.jsx';
import Button from '../../components/Button.jsx';
import Modal from '../../components/Modal.jsx';
import ConfirmDialog from '../../components/ConfirmDialog.jsx';
import FormField from '../../components/FormField.jsx';
import {
  ArrowLeft,
  Calendar,
  Edit,
  ExternalLink,
  FileText,
  User,
  GraduationCap,
  Clock,
  Video,
  CheckCircle2,
  AlertCircle
} from 'lucide-react';
import { sanitizeUrl } from '../../utils/security.js';

const STATUS_TRANSITION_MAP = {
  applied: [
    { value: 'under_review', label: 'Under Review' },
    { value: 'shortlisted', label: 'Shortlist' },
    { value: 'rejected', label: 'Reject' }
  ],
  under_review: [
    { value: 'shortlisted', label: 'Shortlist' },
    { value: 'rejected', label: 'Reject' }
  ],
  shortlisted: [
    { value: 'interview_scheduled', label: 'Schedule Interview' },
    { value: 'selected', label: 'Select Candidate' },
    { value: 'rejected', label: 'Reject' }
  ],
  interview_scheduled: [
    { value: 'selected', label: 'Select Candidate' },
    { value: 'rejected', label: 'Reject' }
  ],
  selected: [],
  rejected: [],
  withdrawn: []
};

export default function JobApplicants() {
  const { jobId } = useParams();
  const navigate = useNavigate();

  const [job, setJob] = useState(null);
  const [applications, setApplications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Pagination
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);

  // Status Update Modal
  const [statusModalApp, setStatusModalApp] = useState(null);
  const [nextStatus, setNextStatus] = useState('');
  const [statusNote, setStatusNote] = useState('');
  const [statusUpdating, setStatusUpdating] = useState(false);
  const [statusError, setStatusError] = useState('');
  const [consequentialDialogData, setConsequentialDialogData] = useState(null);

  // Schedule Interview Modal
  const [interviewModalApp, setInterviewModalApp] = useState(null);
  const [scheduledAt, setScheduledAt] = useState('');
  const [interviewMode, setInterviewMode] = useState('online');
  const [interviewLocation, setInterviewLocation] = useState('https://meet.google.com/');
  const [interviewNotes, setInterviewNotes] = useState('Technical Screening Round');
  const [interviewScheduling, setInterviewScheduling] = useState(false);
  const [interviewError, setInterviewError] = useState('');

  const fetchApplicants = async () => {
    setLoading(true);
    setError(null);
    try {
      const [jobRes, appsRes] = await Promise.allSettled([
        jobService.getJobById(jobId),
        applicationService.getJobApplications(jobId, { page, limit: 10 })
      ]);

      if (jobRes.status === 'fulfilled' && jobRes.value.data) {
        setJob(jobRes.value.data.job);
      }
      if (appsRes.status === 'fulfilled' && appsRes.value.data) {
        setApplications(appsRes.value.data.applications || []);
        setTotal(appsRes.value.data.pagination?.total || 0);
        setTotalPages(appsRes.value.data.pagination?.totalPages || 1);
      }
    } catch (err) {
      setError(err.message || 'Failed to fetch applicants');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchApplicants();
  }, [jobId, page]);

  // Open Status Modal
  const openStatusModal = (app) => {
    setStatusModalApp(app);
    const validNext = STATUS_TRANSITION_MAP[app.status] || [];
    setNextStatus(validNext[0]?.value || '');
    setStatusNote('');
    setStatusError('');
  };

  const executeStatusUpdate = async (appId, targetStatus, note) => {
    setStatusUpdating(true);
    setStatusError('');
    try {
      await applicationService.updateApplicationStatus(appId, {
        status: targetStatus,
        note
      });
      setStatusModalApp(null);
      setConsequentialDialogData(null);
      fetchApplicants();
    } catch (err) {
      setStatusError(err.message || 'Failed to update application status');
    } finally {
      setStatusUpdating(false);
    }
  };

  // Submit Status Change
  const handleStatusSubmit = async (e) => {
    e.preventDefault();
    if (!statusModalApp || !nextStatus) return;

    if (['rejected', 'selected'].includes(nextStatus)) {
      setConsequentialDialogData({
        appId: statusModalApp._id,
        candidateName: statusModalApp.studentId?.name || 'Candidate',
        nextStatus,
        note: statusNote.trim()
      });
      return;
    }

    await executeStatusUpdate(statusModalApp._id, nextStatus, statusNote.trim());
  };

  // Open Interview Modal
  const openInterviewModal = (app) => {
    setInterviewModalApp(app);
    // Set default tomorrow same time
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    tomorrow.setHours(14, 0, 0, 0);
    setScheduledAt(tomorrow.toISOString().slice(0, 16));
    setInterviewMode('online');
    setInterviewLocation('https://meet.google.com/hiretrack-round');
    setInterviewNotes('Technical Round 1 - Problem Solving');
    setInterviewError('');
  };

  // Submit Interview
  const handleInterviewSubmit = async (e) => {
    e.preventDefault();
    if (!interviewModalApp || !scheduledAt) return;

    setInterviewScheduling(true);
    setInterviewError('');
    try {
      await interviewService.scheduleInterview(interviewModalApp._id, {
        scheduledAt: new Date(scheduledAt).toISOString(),
        mode: interviewMode,
        locationOrLink: interviewLocation.trim(),
        notes: interviewNotes.trim()
      });
      setInterviewModalApp(null);
      fetchApplicants();
    } catch (err) {
      setInterviewError(err.message || 'Failed to schedule interview');
    } finally {
      setInterviewScheduling(false);
    }
  };

  const columns = [
    {
      header: 'Candidate Name',
      accessor: (row) => (
        <div>
          <div className="font-semibold text-slate-900">{row.studentId?.name || 'Candidate'}</div>
          <div className="text-xs text-slate-500">{row.studentId?.email}</div>
        </div>
      )
    },
    {
      header: 'Academic Profile',
      accessor: (row) => (
        <div className="text-xs text-slate-700 space-y-0.5">
          <div>Branch: <strong className="text-slate-900">{row.studentProfile?.branch || '-'}</strong></div>
          <div>CGPA: <strong className="text-slate-900">{row.studentProfile?.cgpa ?? '-'}</strong> • Batch {row.studentProfile?.graduationYear || '-'}</div>
        </div>
      )
    },
    {
      header: 'Resume',
      accessor: (row) => {
        const resumeUrl = row.resumeSnapshot?.url || row.studentProfile?.resume?.url;
        if (!resumeUrl) {
          return <span className="text-xs text-slate-400">None attached</span>;
        }
        return (
          <a
            href={sanitizeUrl(resumeUrl)}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center space-x-1 text-xs font-semibold text-indigo-600 hover:text-indigo-800 bg-indigo-50 px-2 py-1 rounded"
          >
            <FileText className="w-3.5 h-3.5" />
            <span>View Resume</span>
            <ExternalLink className="w-3 h-3 ml-0.5" />
          </a>
        );
      }
    },
    {
      header: 'Status',
      accessor: (row) => <StatusBadge status={row.status} size="sm" />
    },
    {
      header: 'Actions',
      className: 'text-right',
      accessor: (row) => {
        const validNext = STATUS_TRANSITION_MAP[row.status] || [];
        const isTerminal = ['selected', 'rejected', 'withdrawn'].includes(row.status);

        return (
          <div className="flex items-center justify-end space-x-2">
            {!isTerminal && validNext.length > 0 && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => openStatusModal(row)}
                icon={Edit}
              >
                Update Status
              </Button>
            )}

            {['shortlisted', 'interview_scheduled'].includes(row.status) && (
              <Button
                variant="primary"
                size="sm"
                onClick={() => openInterviewModal(row)}
                icon={Calendar}
              >
                Interview
              </Button>
            )}
          </div>
        );
      }
    }
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center space-x-3">
        <button
          onClick={() => navigate('/recruiter/jobs')}
          className="text-slate-500 hover:text-slate-900 transition-colors"
        >
          <ArrowLeft className="w-5 h-5" />
        </button>
        <div>
          <h2 className="text-xl font-bold text-slate-900">
            Applicants: {job?.title || 'Drive Candidates'}
          </h2>
          <p className="text-xs text-slate-500">
            Review student qualifications, view attached resumes, and progress candidate stages
          </p>
        </div>
      </div>

      <DataTable
        columns={columns}
        data={applications}
        loading={loading}
        error={error}
        onRetry={fetchApplicants}
        emptyMessage="No students have applied to this position yet."
      />

      {!loading && applications.length > 0 && (
        <Pagination
          page={page}
          totalPages={totalPages}
          total={total}
          limit={10}
          onPageChange={(p) => setPage(p)}
        />
      )}

      {/* Update Status Modal */}
      <Modal
        isOpen={!!statusModalApp}
        onClose={() => !statusUpdating && setStatusModalApp(null)}
        title="Update Application Status"
        subtitle={`Candidate: ${statusModalApp?.studentId?.name}`}
        maxWidth="max-w-md"
      >
        <form onSubmit={handleStatusSubmit} className="space-y-4">
          <div className="bg-slate-50 p-3 rounded-lg border border-slate-200 text-xs flex justify-between items-center">
            <span className="text-slate-500">Current Status:</span>
            <StatusBadge status={statusModalApp?.status} size="sm" />
          </div>

          {statusError && (
            <div className="p-3 bg-rose-50 border border-rose-200 text-rose-700 rounded-lg text-xs">
              {statusError}
            </div>
          )}

          <FormField
            label="Next Permitted Status"
            id="modal-nextStatus"
            type="select"
            value={nextStatus}
            onChange={(e) => setNextStatus(e.target.value)}
            options={STATUS_TRANSITION_MAP[statusModalApp?.status] || []}
            required
          />

          <FormField
            label="Internal Notes / Candidate Feedback"
            id="modal-statusNote"
            type="textarea"
            rows={3}
            value={statusNote}
            onChange={(e) => setStatusNote(e.target.value)}
            placeholder="e.g. Cleared technical coding round with high rating..."
          />

          <div className="flex justify-end space-x-3 pt-3 border-t border-slate-100">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setStatusModalApp(null)}
              disabled={statusUpdating}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              variant="primary"
              size="sm"
              loading={statusUpdating}
            >
              Confirm Status Update
            </Button>
          </div>
        </form>
      </Modal>

      {/* Schedule Interview Modal */}
      <Modal
        isOpen={!!interviewModalApp}
        onClose={() => !interviewScheduling && setInterviewModalApp(null)}
        title="Schedule Interview Round"
        subtitle={`Candidate: ${interviewModalApp?.studentId?.name}`}
        maxWidth="max-w-md"
      >
        <form onSubmit={handleInterviewSubmit} className="space-y-4">
          {interviewError && (
            <div className="p-3 bg-rose-50 border border-rose-200 text-rose-700 rounded-lg text-xs">
              {interviewError}
            </div>
          )}

          <FormField
            label="Interview Date & Time"
            id="int-datetime"
            type="datetime-local"
            value={scheduledAt}
            onChange={(e) => setScheduledAt(e.target.value)}
            helperText="Must be a future date and time"
            required
          />

          <FormField
            label="Interview Mode"
            id="int-mode"
            type="select"
            value={interviewMode}
            onChange={(e) => setInterviewMode(e.target.value)}
            options={[
              { value: 'online', label: 'Online (Video Call / Google Meet)' },
              { value: 'in_person', label: 'In-Person (On-Campus Interview)' }
            ]}
            required
          />

          <FormField
            label={interviewMode === 'online' ? 'Meeting URL / Link' : 'Campus Location / Room'}
            id="int-loc"
            value={interviewLocation}
            onChange={(e) => setInterviewLocation(e.target.value)}
            placeholder={interviewMode === 'online' ? 'https://meet.google.com/...' : 'Seminar Hall 2, Main Block'}
            required
          />

          <FormField
            label="Instructions for Candidate"
            id="int-notes"
            type="textarea"
            rows={2}
            value={interviewNotes}
            onChange={(e) => setInterviewNotes(e.target.value)}
            placeholder="Please be prepared with live coding environment..."
          />

          <div className="flex justify-end space-x-3 pt-3 border-t border-slate-100">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setInterviewModalApp(null)}
              disabled={interviewScheduling}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              variant="primary"
              size="sm"
              loading={interviewScheduling}
              icon={Calendar}
            >
              Schedule & Notify
            </Button>
          </div>
        </form>
      </Modal>

      {/* Consequential Status Confirmation Dialog */}
      <ConfirmDialog
        isOpen={Boolean(consequentialDialogData)}
        onClose={() => !statusUpdating && setConsequentialDialogData(null)}
        onConfirm={() => {
          if (consequentialDialogData) {
            executeStatusUpdate(
              consequentialDialogData.appId,
              consequentialDialogData.nextStatus,
              consequentialDialogData.note
            );
          }
        }}
        title={
          consequentialDialogData?.nextStatus === 'rejected'
            ? 'Confirm Candidate Rejection'
            : 'Confirm Candidate Selection'
        }
        message={
          consequentialDialogData?.nextStatus === 'rejected'
            ? `Are you sure you want to reject candidate ${consequentialDialogData?.candidateName}? This decision is terminal and cannot be reversed.`
            : `Are you sure you want to select candidate ${consequentialDialogData?.candidateName} for an offer? This will mark the candidate as selected.`
        }
        confirmText={
          consequentialDialogData?.nextStatus === 'rejected'
            ? 'Confirm Rejection'
            : 'Confirm Selection'
        }
        variant={consequentialDialogData?.nextStatus === 'rejected' ? 'danger' : 'primary'}
        loading={statusUpdating}
      />
    </div>
  );
}

