import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext.jsx';
import { staffService } from '../../services/index.js';
import DataTable from '../../components/DataTable.jsx';
import Pagination from '../../components/Pagination.jsx';
import StatusBadge from '../../components/StatusBadge.jsx';
import Button from '../../components/Button.jsx';
import Modal from '../../components/Modal.jsx';
import ConfirmDialog from '../../components/ConfirmDialog.jsx';
import FormField from '../../components/FormField.jsx';
import {
  ShieldCheck,
  UserPlus,
  Search,
  UserX,
  UserCheck,
  Ban,
  AlertCircle,
  CheckCircle2,
  ShieldAlert
} from 'lucide-react';

const STAFF_ROLE_OPTIONS = [
  {
    value: 'ORG_ADMIN',
    label: 'Organization Admin (ORG_ADMIN)',
    summary: 'Staff, roles, imports, institute policies, and audit logs.'
  },
  {
    value: 'PLACEMENT_COORDINATOR',
    label: 'Placement Coordinator (PLACEMENT_COORDINATOR)',
    summary: 'Job opportunities, advisory eligibility, application reporting, and readiness.'
  },
  {
    value: 'AMBASSADOR_COORDINATOR',
    label: 'Ambassador Coordinator (AMBASSADOR_COORDINATOR)',
    summary: 'Campus ambassador verification, campaigns, and certificates.'
  },
  {
    value: 'INTERVIEWER',
    label: 'Interviewer (INTERVIEWER)',
    summary: 'Interview availability slots and assigned mock interview sessions only.'
  }
];

const ROLE_BADGE_STYLES = {
  ORG_ADMIN: 'bg-purple-100 text-purple-800 border-purple-200',
  PLACEMENT_COORDINATOR: 'bg-indigo-100 text-indigo-800 border-indigo-200',
  AMBASSADOR_COORDINATOR: 'bg-teal-100 text-teal-800 border-teal-200',
  INTERVIEWER: 'bg-amber-100 text-amber-800 border-amber-200'
};

export default function StaffRoles() {
  const { user: currentUser, membershipRoles = [], organization } = useAuth();
  const isOrgAdmin = membershipRoles.includes('ORG_ADMIN');

  const [staff, setStaff] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [successMessage, setSuccessMessage] = useState('');

  // Filters & Pagination
  const [searchTerm, setSearchTerm] = useState('');
  const [roleFilter, setRoleFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);

  // Grant Role Modal
  const [isGrantModalOpen, setIsGrantModalOpen] = useState(false);
  const [grantEmail, setGrantEmail] = useState('');
  const [grantRole, setGrantRole] = useState('PLACEMENT_COORDINATOR');
  const [grantLoading, setGrantLoading] = useState(false);
  const [grantError, setGrantError] = useState('');

  // Status Change ConfirmDialog
  const [targetMembership, setTargetMembership] = useState(null);
  const [targetStatus, setTargetStatus] = useState('');
  const [actionLoading, setActionLoading] = useState(false);

  const fetchStaff = async () => {
    if (!isOrgAdmin) {
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const params = {
        page,
        limit: 10,
        ...(searchTerm.trim() && { q: searchTerm.trim() }),
        ...(roleFilter && { role: roleFilter }),
        ...(statusFilter && { status: statusFilter })
      };
      const response = await staffService.getStaff(params);
      if (response.success) {
        const list = Array.isArray(response.data) ? response.data : response.data?.staff || [];
        const pag = response.pagination || response.data?.pagination || {};
        setStaff(list);
        setTotal(pag.total ?? list.length);
        setTotalPages(pag.totalPages || 1);
      }
    } catch (err) {
      setError(err.message || 'Failed to load staff memberships');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStaff();
  }, [page, roleFilter, statusFilter, isOrgAdmin]);

  if (!isOrgAdmin) {
    return (
      <div className="bg-white rounded-xl border border-slate-200 p-8 text-center max-w-lg mx-auto space-y-4">
        <div className="w-12 h-12 rounded-full bg-rose-50 text-rose-600 flex items-center justify-center mx-auto">
          <ShieldAlert className="w-6 h-6" />
        </div>
        <h2 className="text-lg font-bold text-slate-900">Permission Required</h2>
        <p className="text-sm text-slate-600">
          Only users with an active <strong>Organization Admin (ORG_ADMIN)</strong> membership can manage staff roles.
        </p>
        <Link to="/access-denied">
          <Button variant="outline" size="sm">
            View Access Details
          </Button>
        </Link>
      </div>
    );
  }

  const handleSearch = (e) => {
    e.preventDefault();
    setPage(1);
    fetchStaff();
  };

  const handleGrantSubmit = async (e) => {
    e.preventDefault();
    setGrantError('');
    if (!grantEmail.trim()) {
      setGrantError('Please enter the user email address.');
      return;
    }

    setGrantLoading(true);
    try {
      const res = await staffService.grantStaffRole({
        email: grantEmail.trim(),
        role: grantRole
      });
      if (res.success) {
        setIsGrantModalOpen(false);
        setGrantEmail('');
        setGrantRole('PLACEMENT_COORDINATOR');
        setSuccessMessage(`Granted ${grantRole} role successfully. Action recorded in audit log.`);
        fetchStaff();
      }
    } catch (err) {
      setGrantError(err.message || 'Failed to grant staff role');
    } finally {
      setGrantLoading(false);
    }
  };

  const handleStatusConfirm = async () => {
    if (!targetMembership || !targetStatus) return;
    setActionLoading(true);
    setError(null);
    try {
      const membershipId = targetMembership.id || targetMembership._id;
      await staffService.updateStaffMembership(membershipId, { status: targetStatus });
      setSuccessMessage(
        `Updated ${targetMembership.role} membership to '${targetStatus}'. Action recorded in audit log.`
      );
      setTargetMembership(null);
      setTargetStatus('');
      fetchStaff();
    } catch (err) {
      setError(err.message || 'Failed to update staff membership');
      setTargetMembership(null);
    } finally {
      setActionLoading(false);
    }
  };

  const columns = [
    {
      header: 'Staff Member',
      accessor: (row) => (
        <div>
          <div className="font-semibold text-slate-900">{row.userId?.name || 'Organization User'}</div>
          <div className="text-xs text-slate-500">{row.userId?.email || '—'}</div>
        </div>
      )
    },
    {
      header: 'Membership Role',
      accessor: (row) => (
        <span
          className={`text-[10px] font-bold px-2.5 py-0.5 rounded-full border uppercase tracking-wider ${
            ROLE_BADGE_STYLES[row.role] || 'bg-slate-100 text-slate-700 border-slate-200'
          }`}
        >
          {row.role}
        </span>
      )
    },
    {
      header: 'Status',
      accessor: (row) => <StatusBadge status={row.status} size="sm" />
    },
    {
      header: 'Granted',
      accessor: (row) => (
        <div className="text-xs text-slate-600">
          <div>{row.grantedAt ? new Date(row.grantedAt).toLocaleDateString() : '—'}</div>
          {row.grantedBy?.name && (
            <div className="text-[11px] text-slate-400">by {row.grantedBy.name}</div>
          )}
        </div>
      )
    },
    {
      header: 'Actions',
      className: 'text-right',
      accessor: (row) => {
        const memberUserId = row.userId?.id || row.userId?._id || row.userId;
        const currentUserId = currentUser?.id || currentUser?._id;
        const isSelfOrgAdmin =
          memberUserId && currentUserId && String(memberUserId) === String(currentUserId) && row.role === 'ORG_ADMIN';

        if (isSelfOrgAdmin) {
          return <span className="text-xs text-slate-400 italic">Current Session</span>;
        }

        return (
          <div className="flex items-center justify-end space-x-2">
            {row.status === 'active' ? (
              <>
                <Button
                  variant="outline"
                  size="sm"
                  className="text-amber-700 hover:bg-amber-50"
                  onClick={() => {
                    setTargetMembership(row);
                    setTargetStatus('suspended');
                  }}
                  icon={Ban}
                >
                  Suspend
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  className="text-rose-600 hover:bg-rose-50"
                  onClick={() => {
                    setTargetMembership(row);
                    setTargetStatus('revoked');
                  }}
                  icon={UserX}
                >
                  Revoke
                </Button>
              </>
            ) : (
              <Button
                variant="outline"
                size="sm"
                className="text-emerald-700 hover:bg-emerald-50"
                onClick={() => {
                  setTargetMembership(row);
                  setTargetStatus('active');
                }}
                icon={UserCheck}
              >
                Reactivate
              </Button>
            )}
          </div>
        );
      }
    }
  ];

  const selectedRoleInfo = STAFF_ROLE_OPTIONS.find((r) => r.value === grantRole);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center space-x-2">
            <ShieldCheck className="w-5 h-5 text-indigo-600" />
            <h2 className="text-xl font-bold text-slate-900">Staff & Roles</h2>
          </div>
          <p className="text-xs text-slate-500 mt-0.5">
            Manage least-privilege organization memberships for{' '}
            <strong className="text-slate-700">{organization?.name || 'your organization'}</strong>. All changes are audited.
          </p>
        </div>

        <Button
          variant="primary"
          size="md"
          icon={UserPlus}
          onClick={() => {
            setGrantError('');
            setIsGrantModalOpen(true);
          }}
        >
          Grant Staff Role
        </Button>
      </div>

      {/* Success Feedback Banner */}
      {successMessage && (
        <div
          role="status"
          className="bg-emerald-50 border border-emerald-200 rounded-xl p-3.5 text-xs text-emerald-800 flex items-center justify-between"
        >
          <div className="flex items-center space-x-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 flex-shrink-0" />
            <span className="font-medium">{successMessage}</span>
          </div>
          <button
            type="button"
            onClick={() => setSuccessMessage('')}
            className="text-emerald-700 hover:text-emerald-900 font-semibold px-2"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* Role Permission Matrix Reference */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
        {STAFF_ROLE_OPTIONS.map((r) => (
          <div key={r.value} className="bg-white border border-slate-200 rounded-xl p-3.5 shadow-sm">
            <span
              className={`inline-block text-[10px] font-bold px-2 py-0.5 rounded-full border uppercase tracking-wider ${
                ROLE_BADGE_STYLES[r.value]
              }`}
            >
              {r.value}
            </span>
            <p className="text-xs text-slate-600 mt-2 leading-relaxed">{r.summary}</p>
          </div>
        ))}
      </div>

      {/* Filters Toolbar */}
      <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-sm flex flex-col md:flex-row gap-3">
        <form onSubmit={handleSearch} className="flex-1 flex gap-2">
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
            <input
              type="text"
              aria-label="Search staff by name or email"
              placeholder="Search staff by name or email..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-9 pr-4 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>
          <Button type="submit" variant="primary" size="md">
            Search
          </Button>
        </form>

        <div className="flex flex-wrap gap-2">
          <select
            aria-label="Filter by role"
            value={roleFilter}
            onChange={(e) => {
              setRoleFilter(e.target.value);
              setPage(1);
            }}
            className="px-3 py-2 text-xs font-medium text-slate-700 bg-slate-50 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
          >
            <option value="">All Staff Roles</option>
            {STAFF_ROLE_OPTIONS.map((r) => (
              <option key={r.value} value={r.value}>
                {r.value}
              </option>
            ))}
          </select>

          <select
            aria-label="Filter by status"
            value={statusFilter}
            onChange={(e) => {
              setStatusFilter(e.target.value);
              setPage(1);
            }}
            className="px-3 py-2 text-xs font-medium text-slate-700 bg-slate-50 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
          >
            <option value="">All Statuses</option>
            <option value="active">Active</option>
            <option value="suspended">Suspended</option>
            <option value="revoked">Revoked</option>
          </select>
        </div>
      </div>

      {/* Staff Memberships Table */}
      <DataTable
        columns={columns}
        data={staff}
        loading={loading}
        error={error}
        onRetry={fetchStaff}
        emptyMessage="No staff memberships match the current filter."
      />

      {!loading && staff.length > 0 && (
        <Pagination
          page={page}
          totalPages={totalPages}
          total={total}
          limit={10}
          onPageChange={(p) => setPage(p)}
        />
      )}

      {/* Grant Staff Role Modal */}
      <Modal
        isOpen={isGrantModalOpen}
        onClose={() => setIsGrantModalOpen(false)}
        title="Grant Organization Staff Role"
      >
        <form onSubmit={handleGrantSubmit} className="space-y-4">
          {grantError && (
            <div className="p-3 rounded-lg bg-rose-50 border border-rose-200 text-rose-700 text-xs flex items-start space-x-2">
              <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
              <span>{grantError}</span>
            </div>
          )}

          <FormField
            label="Existing Organization User Email"
            id="grant-staff-email"
            type="email"
            placeholder="coordinator@campus.edu"
            value={grantEmail}
            onChange={(e) => setGrantEmail(e.target.value)}
            required
          />

          <FormField
            label="Staff Role"
            id="grant-staff-role"
            type="select"
            value={grantRole}
            onChange={(e) => setGrantRole(e.target.value)}
            options={STAFF_ROLE_OPTIONS.map((r) => ({ value: r.value, label: r.label }))}
            required
          />

          {selectedRoleInfo && (
            <div className="bg-slate-50 border border-slate-200 rounded-lg p-3 text-xs text-slate-600">
              <strong className="text-slate-800 block mb-0.5">Role Scope:</strong>
              {selectedRoleInfo.summary}
            </div>
          )}

          <div className="flex justify-end space-x-2 pt-2">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => setIsGrantModalOpen(false)}
              disabled={grantLoading}
            >
              Cancel
            </Button>
            <Button type="submit" variant="primary" size="sm" loading={grantLoading}>
              Grant Role
            </Button>
          </div>
        </form>
      </Modal>

      {/* Confirm Status Mutation Dialog */}
      <ConfirmDialog
        isOpen={!!targetMembership}
        onClose={() => {
          setTargetMembership(null);
          setTargetStatus('');
        }}
        onConfirm={handleStatusConfirm}
        title={
          targetStatus === 'revoked'
            ? 'Revoke Staff Role'
            : targetStatus === 'suspended'
            ? 'Suspend Staff Role'
            : 'Reactivate Staff Role'
        }
        message={`Are you sure you want to set ${targetMembership?.userId?.name || 'this user'}'s ${
          targetMembership?.role
        } membership to '${targetStatus}'? This action is recorded in the organization audit log.`}
        confirmText={
          targetStatus === 'revoked'
            ? 'Revoke Role'
            : targetStatus === 'suspended'
            ? 'Suspend Role'
            : 'Reactivate Role'
        }
        variant={targetStatus === 'active' ? 'primary' : 'danger'}
        loading={actionLoading}
      />
    </div>
  );
}
