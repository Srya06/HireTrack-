import React, { useState, useEffect } from 'react';
import {
  ShieldAlert,
  Search,
  Filter,
  Calendar,
  RotateCcw,
  AlertCircle,
  ChevronLeft,
  ChevronRight,
  Info,
  User,
  Clock
} from 'lucide-react';
import Card from '../../components/Card.jsx';
import Button from '../../components/Button.jsx';
import readinessService from '../../services/readiness.service.js';

export default function AdminAuditLogs() {
  const [logs, setLogs] = useState([]);
  const [pagination, setPagination] = useState({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Filters
  const [action, setAction] = useState('');
  const [resourceType, setResourceType] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [page, setPage] = useState(1);

  // Expanded metadata modal / viewer
  const [selectedLog, setSelectedLog] = useState(null);

  const fetchLogs = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await readinessService.getAuditLogs({
        page,
        limit: 20,
        action: action || undefined,
        resourceType: resourceType || undefined,
        startDate: startDate || undefined,
        endDate: endDate || undefined
      });
      setLogs(res.data?.logs || res.data || []);
      setPagination(res.data?.pagination || res.pagination || {});
    } catch (err) {
      setError(err.response?.data?.message || err.message || 'Failed to load audit logs');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLogs();
  }, [page]);

  const handleFilter = (e) => {
    e.preventDefault();
    setPage(1);
    fetchLogs();
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
            <ShieldAlert className="w-7 h-7 text-indigo-600" />
            Institutional Audit Trail
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            Immutable, organization-scoped security and compliance log of all critical administrator and placement actions.
          </p>
        </div>
        <Button size="sm" variant="outline" onClick={fetchLogs} className="self-start sm:self-auto flex items-center gap-1.5">
          <RotateCcw className="w-3.5 h-3.5" /> Refresh Trail
        </Button>
      </div>

      {error && (
        <div className="p-3 bg-rose-50 border border-rose-200 rounded-lg text-rose-800 text-xs flex items-center gap-2">
          <AlertCircle className="w-4 h-4 text-rose-600 flex-shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Filter Bar */}
      <Card className="p-4">
        <form onSubmit={handleFilter} className="grid grid-cols-1 sm:grid-cols-5 gap-3 items-end text-xs">
          <div>
            <label className="block font-semibold text-slate-600 mb-1">Action</label>
            <input
              type="text"
              placeholder="e.g. EXPORT_REPORT"
              value={action}
              onChange={(e) => setAction(e.target.value)}
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-xs"
            />
          </div>
          <div>
            <label className="block font-semibold text-slate-600 mb-1">Resource Type</label>
            <input
              type="text"
              placeholder="e.g. Report, JobOpportunity"
              value={resourceType}
              onChange={(e) => setResourceType(e.target.value)}
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-xs"
            />
          </div>
          <div>
            <label className="block font-semibold text-slate-600 mb-1">Start Date</label>
            <input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-xs"
            />
          </div>
          <div>
            <label className="block font-semibold text-slate-600 mb-1">End Date</label>
            <input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-xs"
            />
          </div>
          <div className="flex gap-2">
            <Button type="submit" size="sm" variant="primary" className="flex-1 flex items-center justify-center gap-1">
              <Filter className="w-3.5 h-3.5" /> Filter
            </Button>
            <Button
              type="button"
              size="sm"
              variant="outline"
              onClick={() => {
                setAction('');
                setResourceType('');
                setStartDate('');
                setEndDate('');
                setPage(1);
                fetchLogs();
              }}
            >
              Reset
            </Button>
          </div>
        </form>
      </Card>

      {/* Audit Log Table */}
      <Card className="overflow-hidden">
        {loading ? (
          <div className="p-12 text-center text-slate-400">Loading audit records...</div>
        ) : logs.length === 0 ? (
          <div className="p-12 text-center text-slate-500">
            <ShieldAlert className="w-10 h-10 text-slate-300 mx-auto mb-2" />
            <p className="text-sm font-semibold">No audit logs found matching criteria</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-slate-200 text-xs">
              <thead className="bg-slate-50 text-slate-600 font-semibold uppercase">
                <tr>
                  <th className="px-4 py-3 text-left">Timestamp</th>
                  <th className="px-4 py-3 text-left">Actor</th>
                  <th className="px-4 py-3 text-left">Action</th>
                  <th className="px-4 py-3 text-left">Resource</th>
                  <th className="px-4 py-3 text-left">Metadata</th>
                  <th className="px-4 py-3 text-right">Details</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 bg-white">
                {logs.map((log, idx) => (
                  <tr key={log._id || log.id || idx} className="hover:bg-slate-50/60 transition">
                    <td className="px-4 py-3 font-mono text-slate-500 whitespace-nowrap">
                      {new Date(log.createdAt).toLocaleString()}
                    </td>
                    <td className="px-4 py-3 font-medium text-slate-900 whitespace-nowrap">
                      {log.actor?.name || 'System / Unknown'}
                      <span className="text-[10px] text-slate-400 block font-normal">{log.actor?.email}</span>
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-mono font-semibold bg-indigo-50 text-indigo-700 border border-indigo-200">
                        {log.action}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-slate-700 whitespace-nowrap">
                      <span className="font-semibold">{log.resourceType}</span>
                      {log.resourceId && (
                        <span className="text-[10px] text-slate-400 font-mono block">ID: {log.resourceId}</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-slate-500 max-w-xs truncate font-mono text-[11px]">
                      {JSON.stringify(log.metadata || {})}
                    </td>
                    <td className="px-4 py-3 text-right whitespace-nowrap">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => setSelectedLog(log)}
                        className="text-xs"
                      >
                        Inspect
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Pagination */}
        {pagination.totalPages > 1 && (
          <div className="p-3 bg-slate-50 border-t border-slate-200 flex items-center justify-between text-xs text-slate-600">
            <span>
              Page {pagination.page} of {pagination.totalPages} ({pagination.total} events recorded)
            </span>
            <div className="flex gap-2">
              <Button
                size="sm"
                variant="outline"
                disabled={pagination.page <= 1}
                onClick={() => setPage((p) => Math.max(1, p - 1))}
              >
                <ChevronLeft className="w-3.5 h-3.5" /> Previous
              </Button>
              <Button
                size="sm"
                variant="outline"
                disabled={pagination.page >= pagination.totalPages}
                onClick={() => setPage((p) => p + 1)}
              >
                Next <ChevronRight className="w-3.5 h-3.5" />
              </Button>
            </div>
          </div>
        )}
      </Card>

      {/* Log Detail Modal */}
      {selectedLog && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-xl max-h-[85vh] flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-200">
            <div className="p-5 border-b border-slate-200 flex items-center justify-between bg-slate-50">
              <div>
                <h3 className="font-bold text-slate-900 text-sm">Audit Record Inspection</h3>
                <span className="text-xs text-slate-500 font-mono">Event ID: {selectedLog._id || selectedLog.id}</span>
              </div>
              <button
                onClick={() => setSelectedLog(null)}
                className="text-slate-400 hover:text-slate-700 font-bold text-lg"
              >
                &times;
              </button>
            </div>

            <div className="p-6 overflow-y-auto space-y-4 text-xs font-mono">
              <div className="space-y-1 p-3 bg-slate-50 rounded-lg">
                <div><span className="text-slate-400">Timestamp: </span>{new Date(selectedLog.createdAt).toISOString()}</div>
                <div><span className="text-slate-400">Action: </span><span className="text-indigo-600 font-bold">{selectedLog.action}</span></div>
                <div><span className="text-slate-400">Resource: </span>{selectedLog.resourceType} ({selectedLog.resourceId || 'N/A'})</div>
                <div><span className="text-slate-400">Actor: </span>{selectedLog.actor?.name} &lt;{selectedLog.actor?.email}&gt; ({selectedLog.actor?.role})</div>
                {selectedLog.ipAddress && <div><span className="text-slate-400">IP Address: </span>{selectedLog.ipAddress}</div>}
              </div>

              <div>
                <h4 className="font-sans font-bold text-slate-900 text-xs mb-1.5">Sanitized Metadata Payload:</h4>
                <pre className="p-3 bg-slate-900 text-emerald-400 rounded-lg overflow-x-auto text-[11px]">
                  {JSON.stringify(selectedLog.metadata, null, 2)}
                </pre>
              </div>
            </div>

            <div className="p-4 bg-slate-50 border-t border-slate-200 text-right">
              <Button size="sm" variant="outline" onClick={() => setSelectedLog(null)}>
                Close
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

