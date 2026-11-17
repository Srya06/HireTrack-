import React from 'react';

const STATUS_CONFIGS = {
  // Application Statuses
  applied: { label: 'Applied', bg: 'bg-sky-50', text: 'text-sky-700', border: 'border-sky-200' },
  under_review: { label: 'Under Review', bg: 'bg-amber-50', text: 'text-amber-700', border: 'border-amber-200' },
  shortlisted: { label: 'Shortlisted', bg: 'bg-indigo-50', text: 'text-indigo-700', border: 'border-indigo-200' },
  interview_scheduled: { label: 'Interview Scheduled', bg: 'bg-purple-50', text: 'text-purple-700', border: 'border-purple-200' },
  selected: { label: 'Selected', bg: 'bg-emerald-50', text: 'text-emerald-700', border: 'border-emerald-200' },
  rejected: { label: 'Rejected', bg: 'bg-rose-50', text: 'text-rose-700', border: 'border-rose-200' },
  withdrawn: { label: 'Withdrawn', bg: 'bg-slate-100', text: 'text-slate-600', border: 'border-slate-300' },

  // Recruiter / User Statuses
  pending: { label: 'Pending Approval', bg: 'bg-amber-50', text: 'text-amber-700', border: 'border-amber-200' },
  approved: { label: 'Approved', bg: 'bg-emerald-50', text: 'text-emerald-700', border: 'border-emerald-200' },
  active: { label: 'Active', bg: 'bg-emerald-50', text: 'text-emerald-700', border: 'border-emerald-200' },
  suspended: { label: 'Suspended', bg: 'bg-rose-50', text: 'text-rose-700', border: 'border-rose-200' },

  // Job Statuses
  draft: { label: 'Draft', bg: 'bg-slate-100', text: 'text-slate-700', border: 'border-slate-300' },
  published: { label: 'Published', bg: 'bg-emerald-50', text: 'text-emerald-700', border: 'border-emerald-200' },
  closed: { label: 'Closed', bg: 'bg-slate-100', text: 'text-slate-700', border: 'border-slate-300' },
  archived: { label: 'Archived', bg: 'bg-slate-100', text: 'text-slate-500', border: 'border-slate-300' },

  // Interview Statuses
  scheduled: { label: 'Scheduled', bg: 'bg-purple-50', text: 'text-purple-700', border: 'border-purple-200' },
  completed: { label: 'Completed', bg: 'bg-emerald-50', text: 'text-emerald-700', border: 'border-emerald-200' },
  cancelled: { label: 'Cancelled', bg: 'bg-rose-50', text: 'text-rose-700', border: 'border-rose-200' }
};

export default function StatusBadge({ status, size = 'sm', className = '' }) {
  const normalized = String(status || '').toLowerCase().trim();
  const config = STATUS_CONFIGS[normalized] || {
    label: status || 'Unknown',
    bg: 'bg-slate-100',
    text: 'text-slate-700',
    border: 'border-slate-300'
  };

  const sizeClasses = {
    sm: 'px-2 py-0.5 text-xs',
    md: 'px-2.5 py-1 text-sm'
  };

  return (
    <span
      className={`inline-flex items-center font-medium rounded-full border ${config.bg} ${config.text} ${config.border} ${sizeClasses[size] || sizeClasses.sm} ${className}`}
    >
      <span className="w-1.5 h-1.5 rounded-full mr-1.5 bg-current opacity-70" />
      {config.label}
    </span>
  );
}

