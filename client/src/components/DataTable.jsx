import React from 'react';
import { AlertCircle, RefreshCw, Inbox } from 'lucide-react';
import Button from './Button.jsx';

export default function DataTable({
  columns = [],
  data = [],
  loading = false,
  error = null,
  onRetry,
  emptyMessage = 'No records found.',
  className = ''
}) {
  if (error) {
    return (
      <div className="p-8 text-center bg-white rounded-xl border border-rose-200 space-y-3">
        <div className="inline-flex p-3 rounded-full bg-rose-50 text-rose-600">
          <AlertCircle className="w-6 h-6" />
        </div>
        <h4 className="text-sm font-semibold text-rose-900">Failed to load data</h4>
        <p className="text-xs text-rose-600 max-w-sm mx-auto">{error}</p>
        {onRetry && (
          <Button variant="outline" size="sm" onClick={onRetry} icon={RefreshCw}>
            Try again
          </Button>
        )}
      </div>
    );
  }

  return (
    <div className={`overflow-hidden bg-white border border-slate-200 rounded-xl shadow-sm ${className}`}>
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-slate-200 text-left text-sm">
          <thead className="bg-slate-50">
            <tr>
              {columns.map((col, idx) => (
                <th
                  key={idx}
                  scope="col"
                  className={`px-6 py-3 text-xs font-semibold uppercase tracking-wider text-slate-500 ${col.className || ''}`}
                >
                  {col.header}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-200 bg-white">
            {loading ? (
              // Loading Skeleton Rows
              Array.from({ length: 4 }).map((_, rIdx) => (
                <tr key={rIdx} className="animate-pulse">
                  {columns.map((_, cIdx) => (
                    <td key={cIdx} className="px-6 py-4 whitespace-nowrap">
                      <div className="h-4 bg-slate-200 rounded w-3/4" />
                    </td>
                  ))}
                </tr>
              ))
            ) : data.length === 0 ? (
              // Empty State
              <tr>
                <td colSpan={columns.length} className="px-6 py-12 text-center text-slate-500">
                  <div className="flex flex-col items-center justify-center space-y-2">
                    <Inbox className="w-8 h-8 text-slate-300" />
                    <p className="text-sm font-medium text-slate-600">{emptyMessage}</p>
                  </div>
                </td>
              </tr>
            ) : (
              // Data Rows
              data.map((row, rowIdx) => (
                <tr key={row._id || rowIdx} className="hover:bg-slate-50/75 transition-colors">
                  {columns.map((col, colIdx) => (
                    <td
                      key={colIdx}
                      className={`px-6 py-4 whitespace-nowrap text-slate-700 ${col.className || ''}`}
                    >
                      {col.render
                        ? col.render(row, rowIdx)
                        : typeof col.accessor === 'function'
                        ? col.accessor(row)
                        : row[col.accessor] ?? '-'}
                    </td>
                  ))}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

