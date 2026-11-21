import React from 'react';
import StatusBadge from './StatusBadge.jsx';
import { Clock, CheckCircle2, AlertCircle } from 'lucide-react';

export default function ApplicationTimeline({ history = [], currentStatus = 'applied' }) {
  if (!history || history.length === 0) {
    return (
      <div className="py-4 text-center text-slate-500 text-xs">
        No status history recorded yet.
      </div>
    );
  }

  // Sort chronological
  const sorted = [...history].sort((a, b) => new Date(a.changedAt) - new Date(b.changedAt));

  return (
    <div className="flow-root py-2">
      <ul className="-mb-8">
        {sorted.map((item, itemIdx) => {
          const isLast = itemIdx === sorted.length - 1;
          const isTerminalNeg = ['rejected', 'withdrawn'].includes(item.status);
          const isSelected = item.status === 'selected';

          return (
            <li key={item._id || itemIdx}>
              <div className="relative pb-8">
                {!isLast && (
                  <span
                    className="absolute top-4 left-4 -ml-px h-full w-0.5 bg-slate-200"
                    aria-hidden="true"
                  />
                )}
                <div className="relative flex space-x-3 items-start">
                  <div>
                    <span
                      className={`h-8 w-8 rounded-full flex items-center justify-center ring-8 ring-white ${
                        isSelected
                          ? 'bg-emerald-500 text-white'
                          : isTerminalNeg
                          ? 'bg-rose-500 text-white'
                          : 'bg-indigo-600 text-white'
                      }`}
                    >
                      {isSelected ? (
                        <CheckCircle2 className="w-4 h-4" />
                      ) : isTerminalNeg ? (
                        <AlertCircle className="w-4 h-4" />
                      ) : (
                        <Clock className="w-4 h-4" />
                      )}
                    </span>
                  </div>
                  <div className="flex-1 min-w-0 pt-0.5">
                    <div className="flex items-center justify-between gap-2">
                      <StatusBadge status={item.status} size="sm" />
                      <span className="text-xs text-slate-400">
                        {new Date(item.changedAt).toLocaleString()}
                      </span>
                    </div>
                    {(item.notes || item.note) && (
                      <p className="mt-1.5 text-xs text-slate-600 bg-slate-50 border border-slate-100 rounded-md p-2">
                        {item.notes || item.note}
                      </p>
                    )}
                  </div>
                </div>
              </div>
            </li>
          );
        })}
      </ul>
    </div>
  );
}

