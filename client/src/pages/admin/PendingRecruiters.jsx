import React, { useState, useEffect } from 'react';
import { adminService } from '../../services/index.js';
import DataTable from '../../components/DataTable.jsx';
import Pagination from '../../components/Pagination.jsx';
import Button from '../../components/Button.jsx';
import Modal from '../../components/Modal.jsx';
import ConfirmDialog from '../../components/ConfirmDialog.jsx';
import FormField from '../../components/FormField.jsx';
import StatusBadge from '../../components/StatusBadge.jsx';
import { Building2, CheckCircle, XCircle, ExternalLink, AlertCircle, Eye, Info } from 'lucide-react';
import { sanitizeUrl } from '../../utils/security.js';

export default function PendingRecruiters() {
  const [recruiters, setRecruiters] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Pagination
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);

  // Action states
  const [detailRecruiter, setDetailRecruiter] = useState(null);
  const [approveRecruiter, setApproveRecruiter] = useState(null);
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
      if (response.success) {
        const recList = Array.isArray(response.data)
          ? response.data
          : response.data?.recruiters || [];
        const pag = response.pagination || response.data?.pagination || {};
        setRecruiters(recList);
        setTotal(pag.total || recList.length);
        setTotalPages(pag.totalPages || 1);
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

  const handleApproveConfirm = async () => {
    if (!approveRecruiter) return;
    setActionLoading(true);
    try {
      await adminService.updateRecruiterApproval(approveRecruiter.id || approveRecruiter._id, {
        approvalStatus: 'approved'
      });
      setApproveRecruiter(null);
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
      await adminService.updateRecruiterApproval(actionRecruiter.id || actionRecruiter._id, {
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
              href={sanitizeUrl(row.website)}
              target="_blank"
              rel="noopener noreferrer"
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
            variant="ghost"
            size="sm"
            onClick={() => setDetailRecruiter(row)}
            icon={Eye}
          >
            Review Details
          </Button>

          <Button
            variant="success"
            size="sm"
            onClick={() => setApproveRecruiter(row)}
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

      {/* Review Company Details Modal */}
      <Modal
        isOpen={Boolean(detailRecruiter)}
        onClose={() => setDetailRecruiter(null)}
        title="Company & Recruiter Verification"
        subtitle={`Organization: ${detailRecruiter?.companyName}`}
        maxWidth="max-w-lg"
      >
        <div className="space-y-4 text-xs">
          <div className="grid grid-cols-2 gap-3 bg-slate-50 p-4 rounded-xl border border-slate-200">
            <div>
              <span className="text-slate-500 block">Company Name:</span>
              <strong className="text-slate-900 text-sm">{detailRecruiter?.companyName}</strong>
            </div>
            <div>
              <span className="text-slate-500 block">Website:</span>
              {detailRecruiter?.website ? (
                <a
                  href={sanitizeUrl(detailRecruiter.website)}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-indigo-600 hover:underline inline-flex items-center gap-1 font-semibold"
                >
                  {detailRecruiter.website} <ExternalLink className="w-3 h-3" />
                </a>
              ) : (
                <span className="text-slate-400">Not provided</span>
              )}
            </div>
            <div>
              <span className="text-slate-500 block">Primary Contact Person:</span>
              <strong className="text-slate-900">{detailRecruiter?.contactPerson || detailRecruiter?.userId?.name || '-'}</strong>
            </div>
            <div>
              <span className="text-slate-500 block">Account Email:</span>
              <strong className="text-slate-900">{detailRecruiter?.userId?.email || '-'}</strong>
            </div>
            <div>
              <span className="text-slate-500 block">Contact Phone:</span>
              <strong className="text-slate-900">{detailRecruiter?.phone || '-'}</strong>
            </div>
            <div>
              <span className="text-slate-500 block">Approval Status:</span>
              <StatusBadge status={detailRecruiter?.approvalStatus} size="sm" />
            </div>
          </div>

          {detailRecruiter?.address && (
            <div>
              <span className="text-slate-500 font-semibold block mb-0.5">Corporate Address:</span>
              <p className="text-slate-700 bg-white p-3 rounded-lg border border-slate-200">
                {detailRecruiter.address}
              </p>
            </div>
          )}

          {detailRecruiter?.description && (
            <div>
              <span className="text-slate-500 font-semibold block mb-0.5">Company Profile & Scope:</span>
              <p className="text-slate-700 bg-white p-3 rounded-lg border border-slate-200 leading-relaxed">
                {detailRecruiter.description}
              </p>
            </div>
          )}

          <div className="flex justify-end space-x-3 pt-3 border-t border-slate-100">
            <Button variant="outline" size="sm" onClick={() => setDetailRecruiter(null)}>
              Close Review
            </Button>
            <Button
              variant="success"
              size="sm"
              icon={CheckCircle}
              onClick={() => {
                const target = detailRecruiter;
                setDetailRecruiter(null);
                setApproveRecruiter(target);
              }}
            >
              Approve Recruiter
            </Button>
          </div>
        </div>
      </Modal>

      {/* Approve Confirmation Dialog */}
      <ConfirmDialog
        isOpen={Boolean(approveRecruiter)}
        onClose={() => !actionLoading && setApproveRecruiter(null)}
        onConfirm={handleApproveConfirm}
        title="Approve Recruiter Registration"
        message={`Are you sure you want to approve recruiter "${approveRecruiter?.userId?.name || 'Recruiter'}" from "${approveRecruiter?.companyName}"? This will activate their account and grant permission to post campus placement drives.`}
        confirmText="Approve Recruiter"
        variant="primary"
        loading={actionLoading}
      />

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

