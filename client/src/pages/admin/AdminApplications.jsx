import React, { useState, useEffect } from 'react';
import { opportunityService } from '../../services/index.js';
import DataTable from '../../components/DataTable.jsx';
import Pagination from '../../components/Pagination.jsx';
import StatusBadge from '../../components/StatusBadge.jsx';
import ApplicationTimeline from '../../components/ApplicationTimeline.jsx';
import Modal from '../../components/Modal.jsx';
import Button from '../../components/Button.jsx';
import {
  FileText,
  Building2,
  CheckCircle2,
  Clock,
  ShieldCheck,
  Eye,
  Filter,
  UserCheck,
  Search,
  ExternalLink,
  GraduationCap
} from 'lucide-react';

export default function AdminApplications() {
  const [applications, setApplications] = useState([]);
  const [summary, setSummary] = useState({
    totalApplications: 0,
    appliedCount: 0,
    interestedCount: 0,
    notProceedingCount: 0,
    withdrawnCount: 0,
    verifiedCount: 0,
    unverifiedCount: 0
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Pagination & Filtering
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);
  const [statusFilter, setStatusFilter] = useState('');
  const [verificationFilter, setVerificationFilter] = useState('');
  const [searchQuery, setSearchQuery] = useState('');

  // Verification Modal State
  const [isVerifyModalOpen, setIsVerifyModalOpen] = useState(false);
  const [selectedAppForVerify, setSelectedAppForVerify] = useState(null);
  const [targetVerificationStatus, setTargetVerificationStatus] = useState('VERIFIED');
  const [verificationReason, setVerificationReason] = useState('');
  const [isSubmittingVerify, setIsSubmittingVerify] = useState(false);
  const [verifyError, setVerifyError] = useState('');

  // Timeline Modal State
  const [selectedTimelineApp, setSelectedTimelineApp] = useState(null);
  const [isTimelineOpen, setIsTimelineOpen] = useState(false);

  const fetchApplications = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await opportunityService.getAdminApplicationsReport({
        page,
        limit: 15,
        status: statusFilter || undefined,
        verificationStatus: verificationFilter || undefined,
        q: searchQuery || undefined
      });

      const items = res?.data?.data || res?.data || [];
      const meta = res?.data?.metadata || res?.metadata || {};
      const pag = res?.data?.pagination || res?.pagination || {};

      setApplications(Array.isArray(items) ? items : []);
      if (meta.summary) {
        setSummary(meta.summary);
      }
      setTotal(pag.total || (Array.isArray(items) ? items.length : 0));
      setTotalPages(pag.totalPages || 1);
    } catch (err) {
      setError(err?.response?.data?.message || err.message || 'Failed to load applications report');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchApplications();
  }, [page, statusFilter, verificationFilter]);

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    setPage(1);
    fetchApplications();
  };

  const handleOpenVerifyModal = (app) => {
    setSelectedAppForVerify(app);
    setTargetVerificationStatus(
      app.verificationStatus === 'VERIFIED' ? 'UNVERIFIED' : 'VERIFIED'
    );
    setVerificationReason('');
    setVerifyError('');
    setIsVerifyModalOpen(true);
  };

  const handleConfirmVerification = async () => {
    if (!verificationReason.trim()) {
      setVerifyError('A verification reason is required for audit compliance.');
      return;
    }

    setIsSubmittingVerify(true);
    setVerifyError('');
    try {
      await opportunityService.verifyApplicationStaff(selectedAppForVerify._id, {
        verificationStatus: targetVerificationStatus,
        reason: verificationReason.trim()
      });

      setIsVerifyModalOpen(false);
      setSelectedAppForVerify(null);
      fetchApplications();
    } catch (err) {
      setVerifyError(
        err?.response?.data?.message || err.message || 'Failed to update verification status'
      );
    } finally {
      setIsSubmittingVerify(false);
    }
  };

  const columns = [
    {
      header: 'Student',
      accessor: (row) => {
        const student = row.studentId || {};
        const profile = row.studentProfileId || {};
        return (
          <div>
            <div className="font-bold text-slate-900 flex items-center gap-1.5">
              <span>{profile.fullName || student.name || 'Candidate'}</span>
              {profile.studentCode && (
                <span className="text-[11px] font-mono px-1.5 py-0.2 bg-slate-100 text-slate-600 rounded">
                  {profile.studentCode}
                </span>
              )}
            </div>
            <div className="text-xs text-slate-500 mt-0.5">
              {student.email || 'No email'}
              {profile.branch && (
                <span className="text-slate-400"> &bull; {profile.branch}</span>
              )}
              {profile.cgpa !== undefined && profile.cgpa !== null && (
                <span className="text-slate-400"> (CGPA: {profile.cgpa})</span>
              )}
            </div>
          </div>
        );
      }
    },
    {
      header: 'Job Opportunity',
      accessor: (row) => {
        const opp = row.jobOpportunityId || {};
        return (
          <div>
            <div className="font-semibold text-slate-900">{opp.jobTitle || 'Opportunity'}</div>
            <div className="text-xs text-slate-500 flex items-center gap-1 mt-0.5">
              <Building2 className="w-3.5 h-3.5 text-slate-400" />
              <span>{opp.companyName || 'Company'}</span>
            </div>
          </div>
        );
      }
    },
    {
      header: 'Status',
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
      header: 'Verification',
      accessor: (row) => {
        const isVerified = row.verificationStatus === 'VERIFIED';
        return isVerified ? (
          <div className="space-y-0.5">
            <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
              <CheckCircle2 className="w-3 h-3 mr-1" />
              Verified
            </span>
            {row.verifiedBy && (
              <div className="text-[11px] text-slate-400">
                by {row.verifiedBy.name || 'Staff'}
              </div>
            )}
          </div>
        ) : (
          <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-semibold bg-amber-50 text-amber-700 border border-amber-200">
            <Clock className="w-3 h-3 mr-1" />
            unverified (student-reported)
          </span>
        );
      }
    },
    {
      header: 'Student Notes',
      accessor: (row) => (
        <div className="max-w-xs text-xs text-slate-600 truncate" title={row.notes}>
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
            onClick={() => handleOpenVerifyModal(row)}
            icon={ShieldCheck}
          >
            {row.verificationStatus === 'VERIFIED' ? 'Re-verify' : 'Verify'}
          </Button>
        </div>
      )
    }
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-xl font-bold text-slate-900">Student Applications Report</h2>
        <p className="text-xs text-slate-500 mt-0.5">
          Review student-reported external applications, verify applicant milestones, and export placement progress
        </p>
      </div>

      {/* Summary KPI Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
        <div className="p-4 rounded-xl border border-slate-200 bg-white shadow-sm">
          <div className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
            Total Records
          </div>
          <div className="text-2xl font-black text-slate-900 mt-1">
            {summary.totalApplications}
          </div>
          <div className="text-[11px] text-slate-400 mt-0.5">All student interactions</div>
        </div>

        <div className="p-4 rounded-xl border border-sky-100 bg-sky-50/50 shadow-sm">
          <div className="text-xs font-semibold text-sky-700 uppercase tracking-wider">
            Applied
          </div>
          <div className="text-2xl font-black text-sky-900 mt-1">
            {summary.appliedCount}
          </div>
          <div className="text-[11px] text-sky-600/80 mt-0.5">Submitted externally</div>
        </div>

        <div className="p-4 rounded-xl border border-blue-100 bg-blue-50/50 shadow-sm">
          <div className="text-xs font-semibold text-blue-700 uppercase tracking-wider">
            Interested
          </div>
          <div className="text-2xl font-black text-blue-900 mt-1">
            {summary.interestedCount}
          </div>
          <div className="text-[11px] text-blue-600/80 mt-0.5">Link clicks / bookmarks</div>
        </div>

        <div className="p-4 rounded-xl border border-emerald-100 bg-emerald-50/50 shadow-sm">
          <div className="text-xs font-semibold text-emerald-700 uppercase tracking-wider flex items-center gap-1">
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
            Verified
          </div>
          <div className="text-2xl font-black text-emerald-900 mt-1">
            {summary.verifiedCount}
          </div>
          <div className="text-[11px] text-emerald-700 mt-0.5">Staff audit confirmed</div>
        </div>

        <div className="p-4 rounded-xl border border-amber-100 bg-amber-50/50 shadow-sm">
          <div className="text-xs font-semibold text-amber-700 uppercase tracking-wider flex items-center gap-1">
            <Clock className="w-3.5 h-3.5 text-amber-600" />
            Unverified
          </div>
          <div className="text-2xl font-black text-amber-900 mt-1">
            {summary.unverifiedCount}
          </div>
          <div className="text-[11px] text-amber-700 mt-0.5">Self-reported by student</div>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="p-4 bg-white rounded-xl border border-slate-200 shadow-sm flex flex-col md:flex-row items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-2 w-full md:w-auto">
          <div className="flex items-center gap-1 text-xs font-medium text-slate-500 mr-1">
            <Filter className="w-3.5 h-3.5" />
            <span>Filters:</span>
          </div>

          {/* Status Filter */}
          <select
            value={statusFilter}
            onChange={(e) => {
              setStatusFilter(e.target.value);
              setPage(1);
            }}
            className="text-xs rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-slate-700 focus:outline-none focus:ring-1 focus:ring-indigo-500"
          >
            <option value="">All Statuses</option>
            <option value="APPLIED">Applied</option>
            <option value="INTERESTED">Interested</option>
            <option value="NOT_PROCEEDING">Not Proceeding</option>
            <option value="WITHDRAWN">Withdrawn</option>
          </select>

          {/* Verification Status Filter */}
          <select
            value={verificationFilter}
            onChange={(e) => {
              setVerificationFilter(e.target.value);
              setPage(1);
            }}
            className="text-xs rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-slate-700 focus:outline-none focus:ring-1 focus:ring-indigo-500"
          >
            <option value="">All Verification</option>
            <option value="UNVERIFIED">Unverified Only</option>
            <option value="VERIFIED">Verified Only</option>
          </select>
        </div>

        {/* Search */}
        <form onSubmit={handleSearchSubmit} className="flex items-center gap-2 w-full md:w-auto">
          <div className="relative flex-1 md:w-64">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search student or job..."
              className="w-full text-xs rounded-lg border border-slate-200 pl-8 pr-3 py-1.5 focus:outline-none focus:ring-1 focus:ring-indigo-500"
            />
          </div>
          <Button variant="outline" size="sm" type="submit">
            Filter
          </Button>
        </form>
      </div>

      {/* Applications Table */}
      <DataTable
        columns={columns}
        data={applications}
        loading={loading}
        error={error}
        onRetry={fetchApplications}
        emptyMessage="No student applications match the selected filter criteria."
      />

      {!loading && applications.length > 0 && (
        <Pagination
          page={page}
          totalPages={totalPages}
          total={total}
          limit={15}
          onPageChange={(p) => setPage(p)}
        />
      )}

      {/* Staff Verification Action Modal */}
      <Modal
        isOpen={isVerifyModalOpen}
        onClose={() => setIsVerifyModalOpen(false)}
        title="Verify Student Application"
        subtitle={
          selectedAppForVerify
            ? `${selectedAppForVerify.studentProfileId?.fullName || selectedAppForVerify.studentId?.name} - ${selectedAppForVerify.jobOpportunityId?.companyName}`
            : 'Audit Verification'
        }
        maxWidth="max-w-md"
      >
        <div className="space-y-4 pt-2">
          {selectedAppForVerify && (
            <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 text-xs space-y-1">
              <div>
                <strong>Job:</strong> {selectedAppForVerify.jobOpportunityId?.jobTitle} (
                {selectedAppForVerify.jobOpportunityId?.companyName})
              </div>
              <div>
                <strong>Current Status:</strong> {selectedAppForVerify.status}
              </div>
              {selectedAppForVerify.notes && (
                <div className="text-slate-600 italic">
                  <strong>Student Notes:</strong> "{selectedAppForVerify.notes}"
                </div>
              )}
            </div>
          )}

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-2">
              Set Verification Status:
            </label>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setTargetVerificationStatus('VERIFIED')}
                className={`p-2.5 text-xs font-bold rounded-xl border text-center transition-all ${
                  targetVerificationStatus === 'VERIFIED'
                    ? 'border-emerald-600 bg-emerald-50 text-emerald-800 ring-1 ring-emerald-500'
                    : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-50'
                }`}
              >
                Mark as Verified
              </button>
              <button
                type="button"
                onClick={() => setTargetVerificationStatus('UNVERIFIED')}
                className={`p-2.5 text-xs font-bold rounded-xl border text-center transition-all ${
                  targetVerificationStatus === 'UNVERIFIED'
                    ? 'border-amber-600 bg-amber-50 text-amber-800 ring-1 ring-amber-500'
                    : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-50'
                }`}
              >
                Mark as Unverified
              </button>
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-700 mb-1">
              Verification Reason / Proof Summary <span className="text-rose-500">*</span>
            </label>
            <textarea
              rows={3}
              value={verificationReason}
              onChange={(e) => setVerificationReason(e.target.value)}
              placeholder="e.g. Confirmed with employer HR representative via official campus email exchange."
              className="w-full text-xs rounded-xl border border-slate-200 p-2.5 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 outline-none"
            />
            <p className="text-[11px] text-slate-400 mt-1">
              Audit requirement: Documenting a clear reason is recorded in the immutable audit log.
            </p>
          </div>

          {verifyError && (
            <div className="text-xs text-rose-600 font-medium bg-rose-50 p-2 rounded-lg border border-rose-200">
              {verifyError}
            </div>
          )}

          <div className="flex items-center justify-end space-x-2 pt-2 border-t border-slate-100">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setIsVerifyModalOpen(false)}
            >
              Cancel
            </Button>
            <Button
              variant="primary"
              size="sm"
              loading={isSubmittingVerify}
              onClick={handleConfirmVerification}
            >
              Save Verification
            </Button>
          </div>
        </div>
      </Modal>

      {/* Application Timeline Modal */}
      <Modal
        isOpen={isTimelineOpen}
        onClose={() => setIsTimelineOpen(false)}
        title={
          selectedTimelineApp
            ? `${selectedTimelineApp.studentProfileId?.fullName || selectedTimelineApp.studentId?.name} - Status Timeline`
            : 'Application Timeline'
        }
        subtitle={
          selectedTimelineApp?.jobOpportunityId?.jobTitle
            ? `${selectedTimelineApp.jobOpportunityId.jobTitle} (${selectedTimelineApp.jobOpportunityId.companyName})`
            : ''
        }
        maxWidth="max-w-md"
      >
        {selectedTimelineApp && (
          <div className="space-y-4">
            <div className="bg-slate-50 border border-slate-100 rounded-lg p-3 text-xs flex items-center justify-between">
              <span className="text-slate-500">Current Status:</span>
              <StatusBadge status={selectedTimelineApp.status} size="sm" />
            </div>

            {selectedTimelineApp.verificationReason && (
              <div className="p-3 bg-emerald-50 rounded-lg border border-emerald-100 text-xs text-emerald-900">
                <strong>Staff Verification Note:</strong> {selectedTimelineApp.verificationReason}
              </div>
            )}

            <ApplicationTimeline
              history={selectedTimelineApp.statusHistory || []}
              currentStatus={selectedTimelineApp.status}
            />
          </div>
        )}
      </Modal>
    </div>
  );
}
