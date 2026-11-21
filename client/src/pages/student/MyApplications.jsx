import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { applicationService, opportunityService } from '../../services/index.js';
import DataTable from '../../components/DataTable.jsx';
import Pagination from '../../components/Pagination.jsx';
import StatusBadge from '../../components/StatusBadge.jsx';
import ApplicationTimeline from '../../components/ApplicationTimeline.jsx';
import Modal from '../../components/Modal.jsx';
import ConfirmDialog from '../../components/ConfirmDialog.jsx';
import Button from '../../components/Button.jsx';
import {
  Eye,
  Undo2,
  Building2,
  ExternalLink,
  Clock,
  CheckCircle2,
  Edit3,
  Bookmark,
  Send,
  XCircle,
  HelpCircle
} from 'lucide-react';

export default function MyApplications() {
  const [activeTab, setActiveTab] = useState('v3'); // 'v3' | 'legacy'

  // --- v3 State (Self-Reported Applications) ---
  const [v3Apps, setV3Apps] = useState([]);
  const [v3Loading, setV3Loading] = useState(true);
  const [v3Error, setV3Error] = useState(null);
  const [v3Page, setV3Page] = useState(1);
  const [v3TotalPages, setV3TotalPages] = useState(1);
  const [v3Total, setV3Total] = useState(0);
  const [v3StatusFilter, setV3StatusFilter] = useState('');

  // Status Update Modal (v3)
  const [isUpdateModalOpen, setIsUpdateModalOpen] = useState(false);
  const [appToUpdate, setAppToUpdate] = useState(null);
  const [modalStatus, setModalStatus] = useState('APPLIED');
  const [modalNotes, setModalNotes] = useState('');
  const [isSubmittingUpdate, setIsSubmittingUpdate] = useState(false);

  // Timeline Modal
  const [selectedTimelineApp, setSelectedTimelineApp] = useState(null);
  const [isTimelineOpen, setIsTimelineOpen] = useState(false);

  // --- Legacy v1 State ---
  const [legacyApps, setLegacyApps] = useState([]);
  const [legacyLoading, setLegacyLoading] = useState(false);
  const [legacyError, setLegacyError] = useState(null);
  const [legacyPage, setLegacyPage] = useState(1);
  const [legacyTotalPages, setLegacyTotalPages] = useState(1);
  const [legacyTotal, setLegacyTotal] = useState(0);

  // Legacy Withdraw Dialog
  const [appToWithdraw, setAppToWithdraw] = useState(null);
  const [isWithdrawOpen, setIsWithdrawOpen] = useState(false);
  const [withdrawing, setWithdrawing] = useState(false);

  // Fetch v3 applications
  const fetchV3Applications = async () => {
    setV3Loading(true);
    setV3Error(null);
    try {
      const res = await opportunityService.getStudentJobApplications({
        page: v3Page,
        limit: 10,
        status: v3StatusFilter || undefined
      });
      const data = res?.data?.data || res?.data || [];
      const pag = res?.data?.pagination || res?.pagination || {};
      setV3Apps(Array.isArray(data) ? data : []);
      setV3Total(pag.total || (Array.isArray(data) ? data.length : 0));
      setV3TotalPages(pag.totalPages || 1);
    } catch (err) {
      setV3Error(err?.response?.data?.message || err.message || 'Failed to load applications');
    } finally {
      setV3Loading(false);
    }
  };

  // Fetch legacy v1 applications
  const fetchLegacyApplications = async () => {
    setLegacyLoading(true);
    setLegacyError(null);
    try {
      const response = await applicationService.getMyApplications({ page: legacyPage, limit: 10 });
      if (response.success) {
        const appList = Array.isArray(response.data)
          ? response.data
          : response.data?.applications || [];
        const pag = response.pagination || response.data?.pagination || {};
        setLegacyApps(appList);
        setLegacyTotal(pag.total || appList.length);
        setLegacyTotalPages(pag.totalPages || 1);
      }
    } catch (err) {
      setLegacyError(err.message || 'Failed to load legacy applications');
    } finally {
      setLegacyLoading(false);
    }
  };

  useEffect(() => {
    if (activeTab === 'v3') {
      fetchV3Applications();
    } else {
      fetchLegacyApplications();
    }
  }, [activeTab, v3Page, v3StatusFilter, legacyPage]);

  // Handle saving status update from modal
  const handleSaveStatusModal = async () => {
    if (!appToUpdate) return;
    setIsSubmittingUpdate(true);
    try {
      const oppId = appToUpdate.jobOpportunityId?._id || appToUpdate.jobOpportunityId;
      await opportunityService.recordOpportunityApplicationStatus(oppId, {
        status: modalStatus,
        notes: modalNotes
      });
      setIsUpdateModalOpen(false);
      setAppToUpdate(null);
      fetchV3Applications();
    } catch (err) {
      alert(err?.response?.data?.message || err.message || 'Failed to update application status');
    } finally {
      setIsSubmittingUpdate(false);
    }
  };

  // Legacy Withdraw
  const handleWithdrawConfirm = async () => {
    if (!appToWithdraw) return;
    setWithdrawing(true);
    try {
      await applicationService.withdrawApplication(appToWithdraw.id || appToWithdraw._id);
      setIsWithdrawOpen(false);
      setAppToWithdraw(null);
      fetchLegacyApplications();
    } catch (err) {
      alert(err.message || 'Failed to withdraw application');
    } finally {
      setWithdrawing(false);
    }
  };

  // Columns for v3 Self-Reported Applications
  const v3Columns = [
    {
      header: 'Job Opportunity & Company',
      accessor: (row) => {
        const opp = row.jobOpportunityId || {};
        return (
          <div>
            <Link
              to={`/student/opportunities/${opp._id}`}
              className="font-bold text-slate-900 hover:text-indigo-600 transition-colors inline-flex items-center gap-1.5"
            >
              {opp.jobTitle || 'Opportunity'}
              <ExternalLink className="w-3.5 h-3.5 text-slate-400" />
            </Link>
            <div className="text-xs text-slate-500 flex items-center gap-1 mt-0.5">
              <Building2 className="w-3 h-3 text-slate-400" />
              <span>{opp.companyName || 'Company'}</span>
              {opp.location && <span className="text-slate-400">&bull; {opp.location}</span>}
            </div>
          </div>
        );
      }
    },
    {
      header: 'Self-Reported Status',
      accessor: (row) => (
        <div className="space-y-1">
          <StatusBadge status={row.status} size="sm" />
          {row.applicationDate && (
            <div className="text-[11px] text-slate-400">
              {new Date(row.applicationDate).toLocaleDateString()}
            </div>
          )}
        </div>
      )
    },
    {
      header: 'Verification Status',
      accessor: (row) => {
        const isVerified = row.verificationStatus === 'VERIFIED';
        return isVerified ? (
          <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
            <CheckCircle2 className="w-3 h-3 mr-1" />
            verified
          </span>
        ) : (
          <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-semibold bg-amber-50 text-amber-700 border border-amber-200">
            <Clock className="w-3 h-3 mr-1" />
            unverified (student-reported)
          </span>
        );
      }
    },
    {
      header: 'Latest Notes',
      accessor: (row) => (
        <div className="max-w-xs text-xs text-slate-600 truncate">
          {row.notes ? `"${row.notes}"` : <span className="text-slate-400 italic">No notes</span>}
        </div>
      )
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
              setSelectedTimelineApp(row);
              setIsTimelineOpen(true);
            }}
            icon={Eye}
          >
            Timeline
          </Button>
          <Button
            variant="ghost"
            size="sm"
            className="text-indigo-600 hover:bg-indigo-50"
            onClick={() => {
              setAppToUpdate(row);
              setModalStatus(row.status);
              setModalNotes(row.notes || '');
              setIsUpdateModalOpen(true);
            }}
            icon={Edit3}
          >
            Update
          </Button>
        </div>
      )
    }
  ];

  // Columns for Legacy v1 Applications
  const legacyColumns = [
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
              setSelectedTimelineApp(row);
              setIsTimelineOpen(true);
            }}
            icon={Eye}
          >
            History
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
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-slate-900">My Job Applications</h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Track stage progressions and update your application status for campus coordinators
          </p>
        </div>

        {/* Tab switch */}
        <div className="flex bg-slate-100 p-1 rounded-xl self-start sm:self-auto border border-slate-200">
          <button
            type="button"
            onClick={() => setActiveTab('v3')}
            className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-all ${
              activeTab === 'v3'
                ? 'bg-white text-indigo-700 shadow-sm'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Campus Opportunities (v3)
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('legacy')}
            className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-all ${
              activeTab === 'legacy'
                ? 'bg-white text-indigo-700 shadow-sm font-bold'
                : 'text-slate-500 hover:text-slate-700'
            }`}
          >
            Legacy Applications
          </button>
        </div>
      </div>

      {/* v3 Applications View */}
      {activeTab === 'v3' && (
        <div className="space-y-4">
          {/* Filter Bar */}
          <div className="flex items-center gap-2">
            <span className="text-xs font-medium text-slate-500">Filter status:</span>
            {['', 'APPLIED', 'INTERESTED', 'NOT_PROCEEDING', 'WITHDRAWN'].map((st) => (
              <button
                key={st}
                type="button"
                onClick={() => {
                  setV3StatusFilter(st);
                  setV3Page(1);
                }}
                className={`px-2.5 py-1 text-xs rounded-lg font-medium transition-colors ${
                  v3StatusFilter === st
                    ? 'bg-indigo-600 text-white shadow-sm'
                    : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-50'
                }`}
              >
                {st || 'All'}
              </button>
            ))}
          </div>

          <DataTable
            columns={v3Columns}
            data={v3Apps}
            loading={v3Loading}
            error={v3Error}
            onRetry={fetchV3Applications}
            emptyMessage="No campus opportunity applications recorded yet. Browse opportunities and record your progress!"
          />

          {!v3Loading && v3Apps.length > 0 && (
            <Pagination
              page={v3Page}
              totalPages={v3TotalPages}
              total={v3Total}
              limit={10}
              onPageChange={(p) => setV3Page(p)}
            />
          )}
        </div>
      )}

      {/* Legacy v1 Applications View */}
      {activeTab === 'legacy' && (
        <div className="space-y-4">
          <DataTable
            columns={legacyColumns}
            data={legacyApps}
            loading={legacyLoading}
            error={legacyError}
            onRetry={fetchLegacyApplications}
            emptyMessage="You haven't applied to any legacy recruiter portal openings."
          />

          {!legacyLoading && legacyApps.length > 0 && (
            <Pagination
              page={legacyPage}
              totalPages={legacyTotalPages}
              total={legacyTotal}
              limit={10}
              onPageChange={(p) => setLegacyPage(p)}
            />
          )}
        </div>
      )}

      {/* Application Timeline Modal */}
      <Modal
        isOpen={isTimelineOpen}
        onClose={() => setIsTimelineOpen(false)}
        title={
          selectedTimelineApp
            ? `${selectedTimelineApp.jobOpportunityId?.jobTitle || selectedTimelineApp.jobId?.title || 'Application'} - Status Timeline`
            : 'Application Timeline'
        }
        subtitle={
          selectedTimelineApp?.jobOpportunityId?.companyName ||
          selectedTimelineApp?.jobId?.companyName
        }
        maxWidth="max-w-md"
      >
        {selectedTimelineApp && (
          <div className="space-y-4">
            <div className="bg-slate-50 border border-slate-100 rounded-lg p-3 text-xs flex items-center justify-between">
              <span className="text-slate-500">Current Status:</span>
              <StatusBadge status={selectedTimelineApp.status} size="sm" />
            </div>

            {selectedTimelineApp.verificationStatus && (
              <div className="text-xs p-2.5 rounded-lg border flex items-center justify-between bg-slate-50 border-slate-200">
                <span className="text-slate-600 font-medium">Verification:</span>
                {selectedTimelineApp.verificationStatus === 'VERIFIED' ? (
                  <span className="text-emerald-700 font-bold flex items-center gap-1">
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    Verified by Staff
                  </span>
                ) : (
                  <span className="text-amber-700 font-medium flex items-center gap-1">
                    <Clock className="w-3.5 h-3.5" />
                    unverified (student-reported)
                  </span>
                )}
              </div>
            )}

            <ApplicationTimeline
              history={selectedTimelineApp.statusHistory || []}
              currentStatus={selectedTimelineApp.status}
            />
          </div>
        )}
      </Modal>

      {/* Update Application Status Modal (v3) */}
      <Modal
        isOpen={isUpdateModalOpen}
        onClose={() => setIsUpdateModalOpen(false)}
        title="Update Application Status"
        subtitle={
          appToUpdate?.jobOpportunityId?.jobTitle
            ? `${appToUpdate.jobOpportunityId.jobTitle} - ${appToUpdate.jobOpportunityId.companyName}`
            : 'Record External Progress'
        }
        maxWidth="max-w-md"
      >
        <div className="space-y-4 pt-2">
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-2">
              Select Status:
            </label>
            <div className="grid grid-cols-2 gap-2">
              {[
                { id: 'INTERESTED', label: 'Interested' },
                { id: 'APPLIED', label: 'Applied' },
                { id: 'NOT_PROCEEDING', label: 'Not Proceeding' },
                { id: 'WITHDRAWN', label: 'Withdrawn' }
              ].map((st) => (
                <button
                  key={st.id}
                  type="button"
                  onClick={() => setModalStatus(st.id)}
                  className={`p-2.5 text-xs font-bold rounded-xl border text-center transition-all ${
                    modalStatus === st.id
                      ? 'border-indigo-600 bg-indigo-50 text-indigo-700 ring-1 ring-indigo-500'
                      : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-50'
                  }`}
                >
                  {st.label}
                </button>
              ))}
            </div>
          </div>

          <div>
            <div className="flex justify-between items-center mb-1">
              <label className="text-xs font-medium text-slate-600">
                Notes (Max 500 characters)
              </label>
              <span className={`text-[11px] ${modalNotes.length >= 500 ? 'text-rose-600 font-bold' : 'text-slate-400'}`}>
                {modalNotes.length}/500
              </span>
            </div>
            <textarea
              rows={3}
              maxLength={500}
              value={modalNotes}
              onChange={(e) => setModalNotes(e.target.value)}
              placeholder="e.g. Completed initial coding assessment on HackerRank..."
              className="w-full text-xs rounded-xl border border-slate-200 p-2.5 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 outline-none"
            />
          </div>

          <div className="flex items-center justify-end space-x-2 pt-2 border-t border-slate-100">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setIsUpdateModalOpen(false)}
            >
              Cancel
            </Button>
            <Button
              variant="primary"
              size="sm"
              loading={isSubmittingUpdate}
              onClick={handleSaveStatusModal}
            >
              Save Update
            </Button>
          </div>
        </div>
      </Modal>

      {/* Legacy Withdraw Confirmation Dialog */}
      <ConfirmDialog
        isOpen={isWithdrawOpen}
        onClose={() => setIsWithdrawOpen(false)}
        onConfirm={handleWithdrawConfirm}
        loading={withdrawing}
        title="Withdraw Application?"
        message={`Are you sure you want to withdraw your application for "${appToWithdraw?.jobId?.title}"? This cannot be undone.`}
        confirmText="Yes, Withdraw"
        confirmVariant="danger"
      />
    </div>
  );
}
