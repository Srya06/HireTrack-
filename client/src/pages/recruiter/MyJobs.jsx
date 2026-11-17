import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext.jsx';
import { jobService, recruiterService } from '../../services/index.js';
import DataTable from '../../components/DataTable.jsx';
import Pagination from '../../components/Pagination.jsx';
import StatusBadge from '../../components/StatusBadge.jsx';
import Button from '../../components/Button.jsx';
import ConfirmDialog from '../../components/ConfirmDialog.jsx';
import { PlusCircle, Users, CheckCircle, XCircle, Edit, Briefcase, AlertTriangle } from 'lucide-react';

export default function MyJobs() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [profile, setProfile] = useState(null);
  const [jobs, setJobs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Pagination
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);

  // Status Action Dialog
  const [actionJob, setActionJob] = useState(null);
  const [actionType, setActionType] = useState(''); // 'publish' or 'close'
  const [actionLoading, setActionLoading] = useState(false);

  const fetchJobsAndProfile = async () => {
    setLoading(true);
    setError(null);
    try {
      const [jobsRes, profRes] = await Promise.allSettled([
        jobService.getMyJobs({ page, limit: 10 }),
        recruiterService.getMyProfile()
      ]);

      if (jobsRes.status === 'fulfilled' && jobsRes.value.data) {
        setJobs(jobsRes.value.data.jobs || []);
        setTotal(jobsRes.value.data.pagination?.total || 0);
        setTotalPages(jobsRes.value.data.pagination?.totalPages || 1);
      } else if (jobsRes.status === 'rejected') {
        throw new Error(jobsRes.reason?.message || 'Failed to load your jobs');
      }

      if (profRes.status === 'fulfilled' && profRes.value.data) {
        setProfile(profRes.value.data);
      }
    } catch (err) {
      setError(err.message || 'Failed to load your jobs');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchJobsAndProfile();
  }, [page]);

  const isPending = profile?.approvalStatus === 'pending' || user?.accountStatus === 'pending';
  const isApproved = profile?.approvalStatus === 'approved' && user?.accountStatus === 'active';

  const handleActionConfirm = async () => {
    if (!actionJob || !actionType) return;
    setActionLoading(true);
    try {
      if (actionType === 'publish') {
        await jobService.publishJob(actionJob._id);
      } else if (actionType === 'close') {
        await jobService.closeJob(actionJob._id);
      }
      setActionJob(null);
      setActionType('');
      fetchJobsAndProfile();
    } catch (err) {
      alert(err.message || 'Action failed');
    } finally {
      setActionLoading(false);
    }
  };

  const columns = [
    {
      header: 'Job Title',
      accessor: (row) => (
        <div>
          <div className="font-semibold text-slate-900">{row.title}</div>
          <div className="text-xs text-slate-500 capitalize">
            {row.employmentType?.replace('_', ' ')} • {row.location || 'Multiple'}
          </div>
        </div>
      )
    },
    {
      header: 'Deadline',
      accessor: (row) => new Date(row.applicationDeadline).toLocaleDateString()
    },
    {
      header: 'Applicants',
      accessor: (row) => (
        <span className="inline-flex items-center text-xs font-semibold px-2 py-0.5 rounded-full bg-slate-100 text-slate-800">
          <Users className="w-3 h-3 mr-1 text-slate-500" />
          {row.applicantCount || 0}
        </span>
      )
    },
    {
      header: 'Status',
      accessor: (row) => <StatusBadge status={row.status} size="sm" />
    },
    {
      header: 'Actions',
      className: 'text-right',
      accessor: (row) => (
        <div className="flex items-center justify-end space-x-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => navigate(`/recruiter/jobs/${row._id}/applicants`)}
            icon={Users}
          >
            Applicants
          </Button>

          {row.status !== 'published' ? (
            <Button
              variant="outline"
              size="sm"
              className={isApproved ? "text-emerald-600 hover:bg-emerald-50" : "text-slate-400 cursor-not-allowed"}
              disabled={!isApproved}
              title={!isApproved ? "Approval from placement cell required to publish drives" : "Publish to students"}
              onClick={() => {
                if (!isApproved) return;
                setActionJob(row);
                setActionType('publish');
              }}
              icon={CheckCircle}
            >
              Publish
            </Button>
          ) : (
            <Button
              variant="outline"
              size="sm"
              className="text-slate-600 hover:bg-slate-100"
              onClick={() => {
                setActionJob(row);
                setActionType('close');
              }}
              icon={XCircle}
            >
              Close
            </Button>
          )}

          <Button
            variant="ghost"
            size="sm"
            onClick={() => navigate(`/recruiter/jobs/${row._id}/edit`)}
            icon={Edit}
          >
            Edit
          </Button>
        </div>
      )
    }
  ];

  return (
    <div className="space-y-6">
      {/* Pending Account Notice Banner */}
      {isPending && (
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 flex items-start space-x-3 text-amber-900">
          <AlertTriangle className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
          <div className="space-y-1 text-xs">
            <h4 className="font-bold text-sm">Account Awaiting Approval</h4>
            <p>
              Your recruiter account is awaiting placement-cell approval. You can draft and manage position details, but live drive publishing is disabled until verified.
            </p>
          </div>
        </div>
      )}

      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-slate-900">Company Placement Drives</h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Manage your open jobs, track candidate pipelines, and control drive visibility
          </p>
        </div>

        <Link to="/recruiter/jobs/new">
          <Button variant="primary" size="md" icon={PlusCircle}>
            Post New Job
          </Button>
        </Link>
      </div>

      <DataTable
        columns={columns}
        data={jobs}
        loading={loading}
        error={error}
        onRetry={fetchJobs}
        emptyMessage="You haven't posted any jobs yet."
      />

      {!loading && jobs.length > 0 && (
        <Pagination
          page={page}
          totalPages={totalPages}
          total={total}
          limit={10}
          onPageChange={(p) => setPage(p)}
        />
      )}

      {/* Confirmation Dialog */}
      <ConfirmDialog
        isOpen={!!actionJob}
        onClose={() => setActionJob(null)}
        onConfirm={handleActionConfirm}
        title={actionType === 'publish' ? 'Publish Job Opening' : 'Close Job Opening'}
        message={
          actionType === 'publish'
            ? `Are you sure you want to publish "${actionJob?.title}"? Eligible students will immediately be able to view and apply.`
            : `Are you sure you want to close "${actionJob?.title}"? Students will no longer be able to submit applications.`
        }
        confirmText={actionType === 'publish' ? 'Publish Now' : 'Close Drive'}
        variant={actionType === 'publish' ? 'primary' : 'danger'}
        loading={actionLoading}
      />
    </div>
  );
}

