import React, { useState, useEffect } from 'react';
import { adminService } from '../../services/index.js';
import { useAuth } from '../../context/AuthContext.jsx';
import DataTable from '../../components/DataTable.jsx';
import Pagination from '../../components/Pagination.jsx';
import StatusBadge from '../../components/StatusBadge.jsx';
import Button from '../../components/Button.jsx';
import ConfirmDialog from '../../components/ConfirmDialog.jsx';
import FormField from '../../components/FormField.jsx';
import { Search, UserX, UserCheck, Shield, Users } from 'lucide-react';

export default function UserManagement() {
  const { user: currentAdmin } = useAuth();
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Search & Filters
  const [searchTerm, setSearchTerm] = useState('');
  const [roleFilter, setRoleFilter] = useState('');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);

  // Moderation action
  const [targetUser, setTargetUser] = useState(null);
  const [newStatus, setNewStatus] = useState('');
  const [actionLoading, setActionLoading] = useState(false);

  const fetchUsers = async () => {
    setLoading(true);
    setError(null);
    try {
      const params = {
        page,
        limit: 10,
        ...(searchTerm.trim() && { q: searchTerm.trim() }),
        ...(roleFilter && { role: roleFilter })
      };
      const response = await adminService.getUsers(params);
      if (response.success && response.data) {
        setUsers(response.data.users || []);
        setTotal(response.data.pagination?.total || 0);
        setTotalPages(response.data.pagination?.totalPages || 1);
      }
    } catch (err) {
      setError(err.message || 'Failed to load user directory');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, [page, roleFilter]);

  const handleSearch = (e) => {
    e.preventDefault();
    setPage(1);
    fetchUsers();
  };

  const openStatusAction = (user, status) => {
    setTargetUser(user);
    setNewStatus(status);
  };

  const handleStatusConfirm = async () => {
    if (!targetUser || !newStatus) return;

    setActionLoading(true);
    try {
      await adminService.updateUserStatus(targetUser._id, {
        accountStatus: newStatus,
        reason: `Administrative ${newStatus} applied by ${currentAdmin?.email}`
      });
      setTargetUser(null);
      fetchUsers();
    } catch (err) {
      alert(err.message || 'Status change failed');
    } finally {
      setActionLoading(false);
    }
  };

  const columns = [
    {
      header: 'User Name & Email',
      accessor: (row) => (
        <div>
          <div className="font-semibold text-slate-900">{row.name}</div>
          <div className="text-xs text-slate-500">{row.email}</div>
        </div>
      )
    },
    {
      header: 'System Role',
      accessor: (row) => (
        <span
          className={`inline-flex items-center text-xs font-semibold px-2 py-0.5 rounded-full uppercase tracking-wider ${
            row.role === 'admin'
              ? 'bg-purple-100 text-purple-800'
              : row.role === 'recruiter'
              ? 'bg-blue-100 text-blue-800'
              : 'bg-emerald-100 text-emerald-800'
          }`}
        >
          {row.role}
        </span>
      )
    },
    {
      header: 'Account Status',
      accessor: (row) => <StatusBadge status={row.accountStatus} size="sm" />
    },
    {
      header: 'Joined Date',
      accessor: (row) => new Date(row.createdAt).toLocaleDateString()
    },
    {
      header: 'Actions',
      className: 'text-right',
      accessor: (row) => {
        const isSelf = row._id === currentAdmin?._id || row._id === currentAdmin?.id;
        const isAdmin = row.role === 'admin';

        // Cannot suspend self or other admins
        if (isSelf || isAdmin) {
          return (
            <span className="text-xs text-slate-400 italic">
              {isSelf ? 'Current Session' : 'Admin Protected'}
            </span>
          );
        }

        return (
          <div className="flex items-center justify-end space-x-2">
            {row.accountStatus === 'active' ? (
              <Button
                variant="outline"
                size="sm"
                className="text-rose-600 hover:bg-rose-50"
                onClick={() => openStatusAction(row, 'suspended')}
                icon={UserX}
              >
                Suspend
              </Button>
            ) : (
              <Button
                variant="outline"
                size="sm"
                className="text-emerald-600 hover:bg-emerald-50"
                onClick={() => openStatusAction(row, 'active')}
                icon={UserCheck}
              >
                Activate
              </Button>
            )}
          </div>
        );
      }
    }
  ];

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-bold text-slate-900">User Directory & Governance</h2>
        <p className="text-xs text-slate-500 mt-0.5">
          View all registered students, corporate partners, and system administrators
        </p>
      </div>

      {/* Search & Filter */}
      <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-sm flex flex-col sm:flex-row gap-3">
        <form onSubmit={handleSearch} className="flex-1 flex gap-2">
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search by name or email..."
              className="w-full pl-9 pr-3 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 text-slate-900 bg-white"
            />
          </div>
          <Button type="submit" variant="primary" size="md">
            Search
          </Button>
        </form>

        <div className="w-full sm:w-48">
          <FormField
            id="user-role-filter"
            type="select"
            value={roleFilter}
            onChange={(e) => {
              setRoleFilter(e.target.value);
              setPage(1);
            }}
            options={[
              { value: '', label: 'All Roles' },
              { value: 'student', label: 'Students' },
              { value: 'recruiter', label: 'Recruiters' },
              { value: 'admin', label: 'Administrators' }
            ]}
          />
        </div>
      </div>

      <DataTable
        columns={columns}
        data={users}
        loading={loading}
        error={error}
        onRetry={fetchUsers}
        emptyMessage="No users found matching query."
      />

      {!loading && users.length > 0 && (
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
        isOpen={!!targetUser}
        onClose={() => setTargetUser(null)}
        onConfirm={handleStatusConfirm}
        title={newStatus === 'suspended' ? 'Suspend User Account' : 'Activate User Account'}
        message={
          newStatus === 'suspended'
            ? `Are you sure you want to suspend "${targetUser?.name}" (${targetUser?.email})? They will be prevented from logging in.`
            : `Are you sure you want to restore active status for "${targetUser?.name}"?`
        }
        confirmText={newStatus === 'suspended' ? 'Suspend Account' : 'Reactivate'}
        variant={newStatus === 'suspended' ? 'danger' : 'primary'}
        loading={actionLoading}
      />
    </div>
  );
}

