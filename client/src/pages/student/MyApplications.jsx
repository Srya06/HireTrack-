import React, { useState, useEffect } from 'react';
import { applicationService } from '../../services/index.js';
import DataTable from '../../components/DataTable.jsx';
import Pagination from '../../components/Pagination.jsx';
import StatusBadge from '../../components/StatusBadge.jsx';
import ApplicationTimeline from '../../components/ApplicationTimeline.jsx';
import Modal from '../../components/Modal.jsx';
import ConfirmDialog from '../../components/ConfirmDialog.jsx';
import Button from '../../components/Button.jsx';
import { Eye, Undo2, Loader2, FileText, Building2 } from 'lucide-react';

export default function MyApplications() {
  const [applications, setApplications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Pagination
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);

  // Timeline Modal
  const [selectedApp, setSelectedApp] = useState(null);
  const [isTimelineOpen, setIsTimelineOpen] = useState(false);

  // Withdraw Dialog
  const [appToWithdraw, setAppToWithdraw] = useState(null);
  const [isWithdrawOpen, setIsWithdrawOpen] = useState(false);
  const [withdrawing, setWithdrawing] = useState(false);

  const fetchApplications = async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await applicationService.getMyApplications({ page, limit: 10 });
      if (response.success && response.data) {
        setApplications(response.data.applications || []);
        setTotal(response.data.pagination?.total || 0);
        setTotalPages(response.data.pagination?.totalPages || 1);
      }
    } catch (err) {
      setError(err.message || 'Failed to load your applications');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchApplications();
  }, [page]);

  const handleWithdrawConfirm = async () => {
    if (!appToWithdraw) return;
    setWithdrawing(true);
    try {
      await applicationService.withdrawApplication(appToWithdraw._id);
      setIsWithdrawOpen(false);
      setAppToWithdraw(null);
      fetchApplications();
    } catch (err) {
      alert(err.message || 'Failed to withdraw application');
    } finally {
      setWithdrawing(false);
    }
  };

  const columns = [
    {
      header: 'Job & Company',
      accessor: (row) => (
        <div>
          <div className="font-semibold text-slate-900">{row.jobId?.title || 'Job Opening'}</div>
          <div className="text-xs text-slate-500 flex items-center gap-1 mt-0.5">
            <Building2 className="w-3 h-3 text-slate-400" />
            <span>{row.jobId?.companyName || 'Company'}</span>
          </div>
        </div>
      )
    },
    {
      header: 'Applied Date',
      accessor: (row) => new Date(row.createdAt).toLocaleDateString()
    },
    {
      header: 'Current Status',
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
            onClick={() => {
              setSelectedApp(row);
              setIsTimelineOpen(true);
            }}
            icon={Eye}
          >
            History
          </Button>

          <Button
            variant="outline"
            size="sm"
            onClick={() => window.location.assign(`/student/applications/${row._id}`)}
          >
            Details
          </Button>

          {!['withdrawn', 'rejected', 'selected'].includes(row.status) && (
            <Button
              variant="ghost"
              size="sm"
              className="text-rose-600 hover:bg-rose-50 hover:text-rose-700"
              onClick={() => {
                setAppToWithdraw(row);
                setIsWithdrawOpen(true);
              }}
              icon={Undo2}
            >
              Withdraw
            </Button>
          )}
        </div>
      )
    }
  ];

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-bold text-slate-900">My Job Applications</h2>
        <p className="text-xs text-slate-500 mt-0.5">
          Track stage progressions and interview invites across all your campus applications
        </p>
      </div>

      <DataTable
        columns={columns}
        data={applications}
        loading={loading}
        error={error}
        onRetry={fetchApplications}
        emptyMessage="You haven't applied to any jobs yet. Explore current opportunities."
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

      {/* Application Timeline Modal */}
      <Modal
        isOpen={isTimelineOpen}
        onClose={() => setIsTimelineOpen(false)}
        title={selectedApp ? `${selectedApp.jobId?.title} - Application Timeline` : 'Application Timeline'}
        subtitle={selectedApp?.jobId?.companyName}
        maxWidth="max-w-md"
      >
        {selectedApp && (
          <div className="space-y-4">
            <div className="bg-slate-50 border border-slate-100 rounded-lg p-3 text-xs flex items-center justify-between">
              <span className="text-slate-500">Current Placement Status:</span>
              <StatusBadge status={selectedApp.status} size="sm" />
            </div>

            <ApplicationTimeline
              history={selectedApp.statusHistory || []}
              currentStatus={selectedApp.status}
            />
          </div>
        )}
      </Modal>

      {/* Withdraw Confirmation Dialog */}
      <ConfirmDialog
        isOpen={isWithdrawOpen}
        onClose={() => setIsWithdrawOpen(false)}
        onConfirm={handleWithdrawConfirm}
        title="Withdraw Application"
        message={`Are you sure you want to withdraw your application for "${appToWithdraw?.jobId?.title}"? This cannot be undone.`}
        confirmText="Withdraw"
        variant="danger"
        loading={withdrawing}
      />
    </div>
  );
}

