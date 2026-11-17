import React, { useState, useEffect } from 'react';
import { adminService } from '../../services/index.js';
import DataTable from '../../components/DataTable.jsx';
import Pagination from '../../components/Pagination.jsx';
import Button from '../../components/Button.jsx';
import Modal from '../../components/Modal.jsx';
import FormField from '../../components/FormField.jsx';
import StatusBadge from '../../components/StatusBadge.jsx';
import { Building2, CheckCircle, XCircle, ExternalLink, AlertCircle } from 'lucide-react';

export default function PendingRecruiters() {
  const [recruiters, setRecruiters] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Pagination
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);

  // Action states
  const [actionRecruiter, setActionRecruiter] = useState(null);
  const [rejectionReason, setRejectionReason] = useState('');
  const [isRejectModalOpen, setIsRejectModalOpen] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);
  const [actionError, setActionError] = useState('');

  const fetchPending = async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await adminService.getPendingRecruiters({ page, limit: 10 });
      if (response.success && response.data) {
        setRecruiters(response.data.recruiters || []);
        setTotal(response.data.pagination?.total || 0);
        setTotalPages(response.data.pagination?.totalPages || 1);
      }
    } catch (err) {
      setError(err.message || 'Failed to load pending recruiters');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPending();
  }, [page]);

  const handleApprove = async (recruiter) => {
    setActionLoading(true);
    try {
      await adminService.updateRecruiterApproval(recruiter._id, {
        approvalStatus: 'approved'
      });
      fetchPending();
    } catch (err) {
      alert(err.message || 'Approval failed');
    } finally {
      setActionLoading(false);
    }
  };

  const openRejectModal = (recruiter) => {
    setActionRecruiter(recruiter);
    setRejectionReason('Does not meet institutional verification criteria');
    setActionError('');
    setIsRejectModalOpen(true);
  };

  const handleRejectConfirm = async (e) => {
    e.preventDefault();
    if (!actionRecruiter) return;

    setActionLoading(true);
    setActionError('');
    try {
      await adminService.updateRecruiterApproval(actionRecruiter._id, {
        approvalStatus: 'rejected',
        rejectionReason: rejectionReason.trim()
      });
      setIsRejectModalOpen(false);
      setActionRecruiter(null);
      fetchPending();
    } catch (err) {
      setActionError(err.message || 'Rejection failed');
    } finally {
      setActionLoading(false);
    }
  };

  const columns = [
    {
      header: 'Company / Organization',
      accessor: (row) => (
        <div>
          <div className="font-semibold text-slate-900">{row.companyName}</div>
          {row.website && (
            <a
              href={row.website}
              target="_blank"
              rel="noreferrer"
              className="text-xs text-indigo-600 hover:underline inline-flex items-center gap-0.5"
            >
              <span>{row.website}</span>
              <ExternalLink className="w-2.5 h-2.5" />
            </a>
          )}
        </div>
      )
    },
    {
      header: 'Recruiter Contact',
      accessor: (row) => (
        <div>
          <div className="text-sm text-slate-900">{row.userId?.name || 'Recruiter'}</div>
          <div className="text-xs text-slate-500">{row.userId?.email}</div>
          {row.phone && <div className="text-xs text-slate-400">{row.phone}</div>}
        </div>
      )
    },
    {
      header: 'Registered At',
      accessor: (row) => new Date(row.createdAt).toLocaleDateString()
    },
    {
      header: 'Status',
      accessor: (row) => <StatusBadge status={row.approvalStatus} size="sm" />
    },
    {
      header: 'Moderation Actions',
      className: 'text-right',
      accessor: (row) => (
        <div className="flex items-center justify-end space-x-2">
          <Button
            variant="success"
            size="sm"
            onClick={() => handleApprove(row)}
            disabled={actionLoading}
            icon={CheckCircle}
          >
            Approve
          </Button>

          <Button
            variant="outline"
            size="sm"
            className="text-rose-600 hover:bg-rose-50"
            onClick={() => openRejectModal(row)}
            disabled={actionLoading}
            icon={XCircle}
          >
            Reject
          </Button>
        </div>
      )
    }
  ];

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-bold text-slate-900">Pending Recruiter Approvals</h2>
        <p className="text-xs text-slate-500 mt-0.5">
          Review corporate partner registrations before granting job posting permissions
        </p>
      </div>

      <DataTable
        columns={columns}
        data={recruiters}
        loading={loading}
        error={error}
        onRetry={fetchPending}
        emptyMessage="No pending recruiter applications at this time."
      />

      {!loading && recruiters.length > 0 && (
        <Pagination
          page={page}
          totalPages={totalPages}
          total={total}
          limit={10}
          onPageChange={(p) => setPage(p)}
        />
      )}

      {/* Reject Modal */}
      <Modal
        isOpen={isRejectModalOpen}
        onClose={() => !actionLoading && setIsRejectModalOpen(false)}
        title="Reject Recruiter Registration"
        subtitle={`Company: ${actionRecruiter?.companyName}`}
        maxWidth="max-w-md"
      >
        <form onSubmit={handleRejectConfirm} className="space-y-4">
          {actionError && (
            <div className="p-3 bg-rose-50 border border-rose-200 text-rose-700 rounded-lg text-xs">
              {actionError}
            </div>
          )}

          <FormField
            label="Reason for Rejection"
            id="rej-reason"
            type="textarea"
            rows={3}
            value={rejectionReason}
            onChange={(e) => setRejectionReason(e.target.value)}
            placeholder="Specify reason for denial (e.g. Unverified corporate domain)..."
            required
          />

          <div className="flex justify-end space-x-3 pt-3 border-t border-slate-100">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setIsRejectModalOpen(false)}
              disabled={actionLoading}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              variant="danger"
              size="sm"
              loading={actionLoading}
            >
              Confirm Rejection
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}

