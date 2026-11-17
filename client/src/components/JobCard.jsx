import React from 'react';
import { Building2, MapPin, Briefcase, Calendar, DollarSign, GraduationCap } from 'lucide-react';
import Button from './Button.jsx';
import StatusBadge from './StatusBadge.jsx';

export default function JobCard({ job, onViewDetails, onApply, isEligible, applied = false }) {
  const deadline = new Date(job.applicationDeadline);
  const isExpired = deadline < new Date();

  return (
    <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm hover:shadow-md transition-shadow flex flex-col justify-between space-y-4">
      <div className="space-y-3">
        {/* Header: Company & Title */}
        <div className="flex items-start justify-between gap-3">
          <div>
            <div className="flex items-center space-x-2 text-xs font-medium text-slate-500 mb-1">
              <Building2 className="w-3.5 h-3.5 text-indigo-600" />
              <span>{job.companyName}</span>
            </div>
            <h3 className="text-base font-bold text-slate-900 group-hover:text-indigo-600 transition-colors line-clamp-1">
              {job.title}
            </h3>
          </div>
          {job.status && <StatusBadge status={job.status} size="sm" />}
        </div>

        {/* Quick Meta Tags */}
        <div className="grid grid-cols-2 gap-2 text-xs text-slate-600 pt-1 border-t border-slate-100">
          <div className="flex items-center space-x-1.5">
            <MapPin className="w-3.5 h-3.5 text-slate-400 flex-shrink-0" />
            <span className="truncate">{job.location || 'Multiple'}</span>
          </div>
          <div className="flex items-center space-x-1.5">
            <Briefcase className="w-3.5 h-3.5 text-slate-400 flex-shrink-0" />
            <span className="capitalize">{job.employmentType?.replace('_', ' ') || 'Full Time'}</span>
          </div>
          {job.salaryRange && (
            <div className="flex items-center space-x-1.5">
              <DollarSign className="w-3.5 h-3.5 text-slate-400 flex-shrink-0" />
              <span className="truncate">{job.salaryRange}</span>
            </div>
          )}
          <div className="flex items-center space-x-1.5">
            <Calendar className="w-3.5 h-3.5 text-slate-400 flex-shrink-0" />
            <span className={isExpired ? 'text-rose-600 font-semibold' : ''}>
              {deadline.toLocaleDateString()}
            </span>
          </div>
        </div>

        {/* Eligibility Highlights */}
        <div className="flex flex-wrap gap-1.5 pt-1">
          {job.eligibilityCriteria?.minCgpa > 0 && (
            <span className="inline-flex items-center text-[11px] font-medium bg-slate-100 text-slate-700 px-2 py-0.5 rounded">
              Min CGPA: {job.eligibilityCriteria.minCgpa}
            </span>
          )}
          {job.eligibilityCriteria?.allowedBranches?.length > 0 && (
            <span className="inline-flex items-center text-[11px] font-medium bg-indigo-50 text-indigo-700 px-2 py-0.5 rounded">
              Branches: {job.eligibilityCriteria.allowedBranches.join(', ')}
            </span>
          )}
        </div>
      </div>

      {/* Card Actions */}
      <div className="pt-3 border-t border-slate-100 flex items-center justify-between gap-2">
        {applied ? (
          <span className="text-xs font-semibold text-emerald-600 bg-emerald-50 px-2.5 py-1 rounded-md border border-emerald-200">
            ✓ Applied
          </span>
        ) : (
          <span className="text-xs text-slate-400">
            {isExpired ? 'Closed' : 'Active Drive'}
          </span>
        )}

        <div className="flex items-center space-x-2">
          {onViewDetails && (
            <Button variant="outline" size="sm" onClick={() => onViewDetails(job)}>
              View Details
            </Button>
          )}
          {onApply && !applied && !isExpired && (
            <Button variant="primary" size="sm" onClick={() => onApply(job)}>
              Apply Now
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}

