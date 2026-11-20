import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import {
  Briefcase,
  Search,
  MapPin,
  Calendar,
  DollarSign,
  ExternalLink,
  Building,
  CheckCircle2,
  AlertCircle,
  Clock,
  ArrowRight,
  Filter,
  Check
} from 'lucide-react';
import { opportunityService } from '../../services/index.js';

const WORK_MODE_OPTIONS = [
  { value: '', label: 'All Work Modes' },
  { value: 'ON_SITE', label: 'On-site' },
  { value: 'HYBRID', label: 'Hybrid' },
  { value: 'REMOTE', label: 'Remote' }
];

export default function OpportunitiesBrowse() {
  const [opportunities, setOpportunities] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Filters
  const [searchTerm, setSearchTerm] = useState('');
  const [workMode, setWorkMode] = useState('');
  const [company, setCompany] = useState('');
  const [locationFilter, setLocationFilter] = useState('');
  const [pagination, setPagination] = useState({ page: 1, limit: 15, total: 0, totalPages: 1 });

  const fetchOpportunities = async (page = 1) => {
    setLoading(true);
    setError('');
    try {
      const params = { page, limit: 15 };
      if (searchTerm) params.q = searchTerm;
      if (workMode) params.workMode = workMode;
      if (company) params.company = company;
      if (locationFilter) params.location = locationFilter;

      const res = await opportunityService.getStudentOpportunities(params);
      if (res?.data?.success || res?.success) {
        setOpportunities(res.data?.data || res.data || []);
        if (res.data?.pagination) {
          setPagination(res.data.pagination);
        }
      }
    } catch (err) {
      setError(err?.response?.data?.message || err.message || 'Failed to load opportunities');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchOpportunities(1);
  }, [workMode]);

  const handleSearch = (e) => {
    e.preventDefault();
    fetchOpportunities(1);
  };

  const getStatusBadge = (opp) => {
    const status = opp.effectiveStatus || opp.status;
    if (status === 'EXPIRED') {
      return (
        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-rose-100 text-rose-800 border border-rose-200">
          <Clock className="w-3 h-3 mr-1" />
          Expired
        </span>
      );
    }
    if (status === 'CLOSED') {
      return (
        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-amber-100 text-amber-800 border border-amber-200">
          <AlertCircle className="w-3 h-3 mr-1" />
          Closed
        </span>
      );
    }
    return (
      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-100 text-emerald-800 border border-emerald-200">
        <CheckCircle2 className="w-3 h-3 mr-1" />
        Open
      </span>
    );
  };

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div>
        <h1 className="text-2xl font-bold text-slate-900 tracking-tight flex items-center gap-2">
          <Briefcase className="w-7 h-7 text-indigo-600" />
          Placement Opportunities
        </h1>
        <p className="text-sm text-slate-500 mt-1">
          Explore campus hiring opportunities, review qualifications, and open official job applications.
        </p>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-4 space-y-3">
        <form onSubmit={handleSearch} className="flex flex-col md:flex-row gap-2">
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search by job title or company name..."
              className="w-full pl-9 pr-4 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>

          <div className="flex gap-2">
            <select
              value={workMode}
              onChange={(e) => setWorkMode(e.target.value)}
              className="px-3 py-2 text-sm border border-slate-200 rounded-lg bg-slate-50 text-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-500"
            >
              {WORK_MODE_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>{opt.label}</option>
              ))}
            </select>

            <button
              type="submit"
              className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-semibold rounded-lg shadow-sm transition-colors"
            >
              Search
            </button>
          </div>
        </form>
      </div>

      {/* Error Alert */}
      {error && (
        <div className="p-4 rounded-lg bg-rose-50 border border-rose-200 text-rose-700 text-sm flex items-center gap-2">
          <AlertCircle className="w-5 h-5 flex-shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Opportunities Card Grid / List */}
      {loading ? (
        <div className="py-20 text-center text-slate-500 text-sm">
          <div className="inline-block animate-spin w-6 h-6 border-2 border-indigo-600 border-t-transparent rounded-full mb-2" />
          <p>Loading active opportunities...</p>
        </div>
      ) : opportunities.length === 0 ? (
        <div className="py-20 text-center bg-white rounded-xl border border-slate-200 p-8">
          <Briefcase className="w-12 h-12 text-slate-300 mx-auto mb-3" />
          <h3 className="text-base font-semibold text-slate-800">No matching opportunities found</h3>
          <p className="text-sm text-slate-500 mt-1 max-w-sm mx-auto">
            Check back soon for new drives posted by the placement cell or try clearing your search filters.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {opportunities.map((opp) => {
            const isClosedOrExpired =
              opp.effectiveStatus === 'CLOSED' ||
              opp.effectiveStatus === 'EXPIRED' ||
              opp.status === 'CLOSED' ||
              opp.status === 'EXPIRED';

            return (
              <div
                key={opp._id}
                className="bg-white rounded-xl border border-slate-200 shadow-sm hover:shadow-md transition-shadow p-5 flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <span className="text-xs font-semibold text-indigo-600 tracking-wide uppercase">
                        {opp.companyName}
                      </span>
                      <h3 className="text-base font-bold text-slate-900 mt-0.5">
                        {opp.jobTitle}
                      </h3>
                    </div>
                    {getStatusBadge(opp)}
                  </div>

                  <div className="flex flex-wrap items-center gap-3 text-xs text-slate-500 mt-3">
                    <span className="flex items-center gap-1">
                      <MapPin className="w-3.5 h-3.5 text-slate-400" />
                      {opp.location || 'Multiple / Remote'}
                    </span>
                    <span className="px-2 py-0.5 rounded bg-slate-100 text-slate-700 font-medium">
                      {opp.workMode}
                    </span>
                    {opp.compensationText && (
                      <span className="flex items-center gap-1 text-emerald-700 font-medium">
                        <DollarSign className="w-3.5 h-3.5" />
                        {opp.compensationText}
                      </span>
                    )}
                  </div>

                  {/* Criteria Tags */}
                  {(opp.requiredCriteria?.length > 0 || opp.preferredCriteria?.length > 0) && (
                    <div className="mt-4 pt-3 border-t border-slate-100 space-y-1.5">
                      <div className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
                        Key Requirements
                      </div>
                      <div className="flex flex-wrap gap-1.5">
                        {opp.requiredCriteria?.slice(0, 3).map((c, i) => (
                          <span
                            key={i}
                            className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-medium bg-rose-50 text-rose-700 border border-rose-200"
                          >
                            {c.displayLabel || `${c.type}: ${c.value}`}
                          </span>
                        ))}
                        {opp.preferredCriteria?.slice(0, 2).map((c, i) => (
                          <span
                            key={i}
                            className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-medium bg-slate-100 text-slate-700 border border-slate-200"
                          >
                            {c.displayLabel || `${c.type}: ${c.value}`}
                          </span>
                        ))}
                        {(opp.requiredCriteria?.length || 0) + (opp.preferredCriteria?.length || 0) > 5 && (
                          <span className="text-[11px] text-slate-400 self-center">
                            +{(opp.requiredCriteria?.length || 0) + (opp.preferredCriteria?.length || 0) - 5} more
                          </span>
                        )}
                      </div>
                    </div>
                  )}

                  {/* Deadline Notice */}
                  <div className="text-xs text-slate-500 mt-4 flex items-center gap-1.5">
                    <Calendar className="w-3.5 h-3.5 text-slate-400" />
                    <span>
                      {opp.effectiveStatus === 'EXPIRED'
                        ? `Expired on ${opp.deadline ? new Date(opp.deadline).toLocaleDateString() : 'N/A'}`
                        : `Deadline: ${opp.deadline ? new Date(opp.deadline).toLocaleDateString() : 'N/A'}`}
                    </span>
                  </div>
                </div>

                {/* Card Actions & ALWAYS-VISIBLE Application CTA */}
                <div className="mt-5 pt-4 border-t border-slate-100 flex items-center justify-between gap-2">
                  <Link
                    to={`/student/opportunities/${opp._id}`}
                    className="inline-flex items-center text-xs font-semibold text-indigo-600 hover:text-indigo-800 transition-colors"
                  >
                    View Details
                    <ArrowRight className="w-3.5 h-3.5 ml-1" />
                  </Link>

                  {/* Open Application CTA - Always visible; disabled only when closed/expired */}
                  {isClosedOrExpired ? (
                    <button
                      type="button"
                      disabled
                      aria-disabled="true"
                      className="px-3.5 py-1.5 rounded-lg text-xs font-semibold bg-slate-100 text-slate-400 border border-slate-200 cursor-not-allowed"
                    >
                      {opp.effectiveStatus === 'EXPIRED' ? 'Deadline Expired' : 'Application Closed'}
                    </button>
                  ) : opp.applicationUrl ? (
                    <a
                      href={opp.applicationUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center px-3.5 py-1.5 rounded-lg text-xs font-semibold text-white bg-emerald-600 hover:bg-emerald-700 shadow-sm transition-colors"
                    >
                      Open Application
                      <ExternalLink className="w-3.5 h-3.5 ml-1.5" />
                    </a>
                  ) : (
                    <Link
                      to={`/student/opportunities/${opp._id}`}
                      className="inline-flex items-center px-3.5 py-1.5 rounded-lg text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-700 shadow-sm transition-colors"
                    >
                      View Instructions
                    </Link>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
