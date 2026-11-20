import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import {
  ShieldCheck,
  CheckCircle2,
  AlertCircle,
  HelpCircle,
  XCircle,
  Briefcase,
  Building,
  Calendar,
  ArrowRight,
  ExternalLink,
  RotateCw
} from 'lucide-react';
import { opportunityService } from '../../services/index.js';

export default function StudentEligibility() {
  const [evaluations, setEvaluations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [pagination, setPagination] = useState({ page: 1, limit: 20, total: 0, totalPages: 1 });

  const fetchEvaluations = async (page = 1) => {
    setLoading(true);
    setError('');
    try {
      const res = await opportunityService.getMyEligibilityHistory({ page, limit: 20 });
      if (res?.data?.success || res?.success) {
        setEvaluations(res.data?.data || res.data || []);
        if (res.data?.pagination) {
          setPagination(res.data.pagination);
        }
      }
    } catch (err) {
      setError(err?.response?.data?.message || err.message || 'Failed to load eligibility evaluations');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchEvaluations(1);
  }, []);

  const likelyCount = evaluations.filter(
    (e) => (e.override?.isOverridden ? e.override.overrideStatus : e.status) === 'LIKELY_ELIGIBLE'
  ).length;

  const potentiallyCount = evaluations.filter(
    (e) => (e.override?.isOverridden ? e.override.overrideStatus : e.status) === 'POTENTIALLY_ELIGIBLE'
  ).length;

  const doesNotMeetCount = evaluations.filter(
    (e) => (e.override?.isOverridden ? e.override.overrideStatus : e.status) === 'DOES_NOT_MEET'
  ).length;

  const renderStatusBadge = (evalItem) => {
    const status = evalItem.override?.isOverridden
      ? evalItem.override.overrideStatus
      : evalItem.status;

    switch (status) {
      case 'LIKELY_ELIGIBLE':
        return (
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-100 text-emerald-800 border border-emerald-200">
            <CheckCircle2 className="w-3 h-3 mr-1" />
            Likely Eligible
          </span>
        );
      case 'POTENTIALLY_ELIGIBLE':
        return (
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-amber-100 text-amber-800 border border-amber-200">
            <HelpCircle className="w-3 h-3 mr-1" />
            Potentially Eligible
          </span>
        );
      case 'DOES_NOT_MEET':
        return (
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-rose-100 text-rose-800 border border-rose-200">
            <XCircle className="w-3 h-3 mr-1" />
            Does Not Meet
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-slate-100 text-slate-700">
            {status}
          </span>
        );
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight flex items-center gap-2">
            <ShieldCheck className="w-7 h-7 text-indigo-600" />
            Placement Eligibility History
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            Review your advisory qualification evaluations and criteria breakdowns across all campus opportunities.
          </p>
        </div>

        <Link
          to="/student/opportunities"
          className="inline-flex items-center px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold rounded-lg shadow-sm transition-colors"
        >
          <Briefcase className="w-4 h-4 mr-1.5" />
          Browse Opportunities
        </Link>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center font-bold text-lg">
            {likelyCount}
          </div>
          <div>
            <div className="text-xs font-medium text-slate-500">Likely Eligible</div>
            <div className="text-sm font-bold text-slate-800">Meets All Hard Criteria</div>
          </div>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-amber-50 text-amber-600 flex items-center justify-center font-bold text-lg">
            {potentiallyCount}
          </div>
          <div>
            <div className="text-xs font-medium text-slate-500">Potentially Eligible</div>
            <div className="text-sm font-bold text-slate-800">Missing Profile Fields</div>
          </div>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-rose-50 text-rose-600 flex items-center justify-center font-bold text-lg">
            {doesNotMeetCount}
          </div>
          <div>
            <div className="text-xs font-medium text-slate-500">Does Not Meet</div>
            <div className="text-sm font-bold text-slate-800">Advisory Criteria Gap</div>
          </div>
        </div>
      </div>

      {/* Evaluations Table */}
      <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
        {loading ? (
          <div className="py-16 text-center text-slate-500 text-sm">
            <div className="inline-block animate-spin w-6 h-6 border-2 border-indigo-600 border-t-transparent rounded-full mb-2" />
            <p>Loading eligibility records...</p>
          </div>
        ) : error ? (
          <div className="p-6 text-center text-rose-600 text-sm">
            <AlertCircle className="w-8 h-8 mx-auto mb-2 text-rose-500" />
            <p>{error}</p>
          </div>
        ) : evaluations.length === 0 ? (
          <div className="py-16 text-center text-slate-500">
            <ShieldCheck className="w-10 h-10 text-slate-300 mx-auto mb-2" />
            <p className="text-base font-medium text-slate-700">No eligibility evaluations yet</p>
            <p className="text-sm text-slate-400 mt-1">
              Browse campus opportunities and view job details to automatically evaluate your fit.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-slate-200 text-left text-sm">
              <thead className="bg-slate-50 text-slate-600 font-medium text-xs uppercase tracking-wider">
                <tr>
                  <th className="px-6 py-3">Opportunity</th>
                  <th className="px-6 py-3">Status</th>
                  <th className="px-6 py-3">Criteria Breakdown</th>
                  <th className="px-6 py-3">Evaluated On</th>
                  <th className="px-6 py-3 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-700">
                {evaluations.map((evalItem) => {
                  const opp = evalItem.opportunityId || {};
                  const isOverridden = evalItem.override?.isOverridden;

                  return (
                    <tr key={evalItem._id} className="hover:bg-slate-50/75 transition-colors">
                      <td className="px-6 py-4">
                        <div className="font-semibold text-slate-900">
                          {opp.jobTitle || 'Job Opportunity'}
                        </div>
                        <div className="text-xs text-slate-500 flex items-center gap-1 mt-0.5">
                          <Building className="w-3 h-3 text-slate-400" />
                          <span>{opp.companyName || 'Campus Partner'}</span>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div>{renderStatusBadge(evalItem)}</div>
                        {isOverridden && (
                          <div className="text-[11px] text-purple-700 font-medium mt-1">
                            Staff Reviewed
                          </div>
                        )}
                      </td>
                      <td className="px-6 py-4 text-xs">
                        <div className="text-emerald-700 font-medium">
                          ✓ {evalItem.snapshot?.matched?.length || 0} satisfied
                        </div>
                        {(evalItem.snapshot?.unmet?.length || 0) > 0 && (
                          <div className="text-rose-600">
                            ✕ {evalItem.snapshot.unmet.length} unmet
                          </div>
                        )}
                        {(evalItem.snapshot?.missing?.length || 0) > 0 && (
                          <div className="text-amber-600">
                            ? {evalItem.snapshot.missing.length} missing data
                          </div>
                        )}
                      </td>
                      <td className="px-6 py-4 text-xs text-slate-500">
                        {evalItem.evaluatedAt
                          ? new Date(evalItem.evaluatedAt).toLocaleDateString()
                          : 'N/A'}
                      </td>
                      <td className="px-6 py-4 text-right">
                        <Link
                          to={`/student/opportunities/${opp._id || evalItem.opportunityId}`}
                          className="inline-flex items-center text-xs font-semibold text-indigo-600 hover:text-indigo-800"
                        >
                          View Details
                          <ArrowRight className="w-3.5 h-3.5 ml-1" />
                        </Link>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
