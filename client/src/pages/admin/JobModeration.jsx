import React, { useState, useEffect } from 'react';
import { adminService } from '../../services/index.js';
import DataTable from '../../components/DataTable.jsx';
import Pagination from '../../components/Pagination.jsx';
import StatusBadge from '../../components/StatusBadge.jsx';
import Button from '../../components/Button.jsx';
import ConfirmDialog from '../../components/ConfirmDialog.jsx';
import FormField from '../../components/FormField.jsx';
import { Briefcase, Building2, CheckCircle, XCircle, Archive } from 'lucide-react';

export default function JobModeration() {
  const [jobs, setJobs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Status Filter & Pagination
  const [statusFilter, setStatusFilter] = useState('');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);

  // Status Action Modal
  const [actionJob, setActionJob] = useState(null);
  const [targetStatus, setTargetStatus] = useState('');
  const [actionLoading, setActionLoading] = useState(false);

  const fetchJobs = async () => {
    setLoading(true);
    setError(null);
    try {
      const params = {
        page,
        limit: 10,
        ...(statusFilter && { status: statusFilter })
      };
      const response = await adminService.getAdminJobs(params);
      if (response.success) {
        const jobList = Array.isArray(response.data)
          ? response.data
          : response.data?.jobs || [];
        const pag = response.pagination || response.data?.pagination || {};
        setJobs(jobList);
        setTotal(pag.total || jobList.length);
        setTotalPages(pag.totalPages || 1);
      }
    } catch (err) {
      setError(err.message || 'Failed to load jobs');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchJobs();
  }, [page, statusFilter]);

  const openAction = (job, status) => {
    setActionJob(job);
    setTargetStatus(status);
  };

  const handleStatusConfirm = async () => {
    if (!actionJob || !targetStatus) return;
    setActionLoading(true);
    try {
      await adminService.updateAdminJobStatus(actionJob.id || actionJob._id, {
        status: targetStatus,
        reason: `Administrator changed status to ${targetStatus}`
      });
      setActionJob(null);
      fetchJobs();
    } catch (err) {
      alert(err.message || 'Failed to update job status');
    } finally {
      setActionLoading(false);
    }
  };

  const columns = [
    {
      header: 'Job Title & Company',
      accessor: (row) => (
        <div>
          <div className="font-semibold text-slate-900">{row.title}</div>
          <div className="text-xs text-slate-500 flex items-center gap-1 mt-0.5">
            <Building2 className="w-3 h-3 text-slate-400" />
            <span>{row.companyName}</span>
          </div>
        </div>
      )
    },
    {
      header: 'Deadline',
      accessor: (row) => new Date(row.applicationDeadline).toLocaleDateString()
    },
    {
      header: 'Status',
      accessor: (row) => <StatusBadge status={row.status} size="sm" />
    },
    {
      header: 'Moderation Actions',
      className: 'text-right',
      accessor: (row) => (
        <div className="flex items-center justify-end space-x-2">
          {row.status !== 'published' && (
            <Button
              variant="outline"
              size="sm"
              className="text-emerald-600 hover:bg-emerald-50"
              onClick={() => openAction(row, 'published')}
              icon={CheckCircle}
            >
              Publish
            </Button>
          )}

          {row.status === 'published' && (
            <Button
              variant="outline"
              size="sm"
              className="text-slate-600 hover:bg-slate-100"
              onClick={() => openAction(row, 'closed')}
              icon={XCircle}
            >
              Close
            </Button>
          )}

          {row.status !== 'archived' && (
            <Button
              variant="ghost"
              size="sm"
              className="text-slate-500 hover:text-slate-800"
              onClick={() => openAction(row, 'archived')}
              icon={Archive}
            >
              Archive
            </Button>
          )}
        </div>
      )
    }
  ];

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-slate-900">Placement Drive Moderation</h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Oversee campus recruitment postings, manage drive statuses, and archive historical drives
          </p>
        </div>

        <div className="w-full sm:w-48">
          <FormField
            id="job-filter-status"
            type="select"
            value={statusFilter}
            onChange={(e) => {
              setStatusFilter(e.target.value);
              setPage(1);
            }}
            options={[
              { value: '', label: 'All Statuses' },
              { value: 'published', label: 'Published' },
              { value: 'draft', label: 'Drafts' },
              { value: 'closed', label: 'Closed' },
              { value: 'archived', label: 'Archived' }
            ]}
          />
        </div>
      </div>

      <DataTable
        columns={columns}
        data={jobs}
        loading={loading}
        error={error}
        onRetry={fetchJobs}
        emptyMessage="No jobs found."
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
        onConfirm={handleStatusConfirm}
        title={`Set Job Status to "${targetStatus}"`}
        message={`Are you sure you want to mark "${actionJob?.title}" as ${targetStatus}?`}
        confirmText="Confirm Status Update"
        variant={targetStatus === 'published' ? 'primary' : 'danger'}
        loading={actionLoading}
      />
    </div>
  );
}

