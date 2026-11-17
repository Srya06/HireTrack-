import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { jobService, applicationService } from '../../services/index.js';
import JobCard from '../../components/JobCard.jsx';
import Pagination from '../../components/Pagination.jsx';
import FormField from '../../components/FormField.jsx';
import Button from '../../components/Button.jsx';
import { Search, Filter, Loader2, Briefcase, RefreshCw } from 'lucide-react';

const BRANCH_OPTIONS = [
  { value: '', label: 'All Branches' },
  { value: 'CSE', label: 'Computer Science (CSE)' },
  { value: 'ISE', label: 'Information Science (ISE)' },
  { value: 'ECE', label: 'Electronics & Comm (ECE)' },
  { value: 'EEE', label: 'Electrical & Electronics (EEE)' },
  { value: 'MECH', label: 'Mechanical (MECH)' },
  { value: 'CIVIL', label: 'Civil Engineering (CIVIL)' },
  { value: 'AIML', label: 'AI & Machine Learning (AIML)' },
  { value: 'DATA_SCIENCE', label: 'Data Science' }
];

const TYPE_OPTIONS = [
  { value: '', label: 'All Employment Types' },
  { value: 'full_time', label: 'Full Time' },
  { value: 'internship', label: 'Internship' },
  { value: 'internship_to_full_time', label: 'Internship to Full Time' }
];

export default function JobsBrowse() {
  const navigate = useNavigate();
  const [jobs, setJobs] = useState([]);
  const [appliedJobIds, setAppliedJobIds] = useState(new Set());
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Filters & Pagination
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedBranch, setSelectedBranch] = useState('');
  const [selectedType, setSelectedType] = useState('');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);

  const fetchJobs = async () => {
    setLoading(true);
    setError(null);
    try {
      const params = {
        page,
        limit: 9,
        ...(searchTerm.trim() && { q: searchTerm.trim() }),
        ...(selectedBranch && { branch: selectedBranch }),
        ...(selectedType && { employmentType: selectedType })
      };

      const [jobsRes, appsRes] = await Promise.allSettled([
        jobService.getJobs(params),
        applicationService.getMyApplications({ limit: 100 })
      ]);

      if (jobsRes.status === 'fulfilled' && jobsRes.value.data) {
        setJobs(jobsRes.value.data.jobs || []);
        setTotal(jobsRes.value.data.pagination?.total || 0);
        setTotalPages(jobsRes.value.data.pagination?.totalPages || 1);
      } else if (jobsRes.status === 'rejected') {
        throw new Error(jobsRes.reason?.message || 'Failed to load jobs');
      }

      if (appsRes.status === 'fulfilled' && appsRes.value.data) {
        const ids = new Set((appsRes.value.data.applications || []).map((a) => a.jobId?._id || a.jobId));
        setAppliedJobIds(ids);
      }
    } catch (err) {
      setError(err.message || 'Unable to fetch placement drives');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchJobs();
  }, [page, selectedBranch, selectedType]);

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    setPage(1);
    fetchJobs();
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-xl font-bold text-slate-900">Campus Placement Drives</h2>
        <p className="text-xs text-slate-500 mt-0.5">
          Explore verified hiring drives published by visiting recruiters
        </p>
      </div>

      {/* Search & Filter Toolbar */}
      <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-sm space-y-4">
        <form onSubmit={handleSearchSubmit} className="flex gap-2">
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search by job title, company, skills or keywords..."
              className="w-full pl-9 pr-3 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 text-slate-900 bg-white"
            />
          </div>
          <Button type="submit" variant="primary" size="md">
            Search
          </Button>
        </form>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2 border-t border-slate-100">
          <FormField
            id="filter-branch"
            type="select"
            value={selectedBranch}
            onChange={(e) => {
              setSelectedBranch(e.target.value);
              setPage(1);
            }}
            options={BRANCH_OPTIONS}
          />

          <FormField
            id="filter-type"
            type="select"
            value={selectedType}
            onChange={(e) => {
              setSelectedType(e.target.value);
              setPage(1);
            }}
            options={TYPE_OPTIONS}
          />
        </div>
      </div>

      {/* Job Cards Grid */}
      {loading ? (
        <div className="flex flex-col items-center justify-center py-16 space-y-3">
          <Loader2 className="w-8 h-8 animate-spin text-indigo-600" />
          <p className="text-xs text-slate-500 font-medium">Finding opportunities...</p>
        </div>
      ) : error ? (
        <div className="bg-white rounded-xl border border-rose-200 p-8 text-center space-y-3">
          <p className="text-sm text-rose-600 font-semibold">{error}</p>
          <Button variant="outline" size="sm" onClick={fetchJobs} icon={RefreshCw}>
            Retry
          </Button>
        </div>
      ) : jobs.length === 0 ? (
        <div className="bg-white rounded-xl border border-slate-200 p-12 text-center space-y-3">
          <Briefcase className="w-10 h-10 text-slate-300 mx-auto" />
          <h3 className="text-sm font-bold text-slate-800">No opportunities found</h3>
          <p className="text-xs text-slate-500 max-w-sm mx-auto">
            No active jobs match your search filters. Try clearing branch or employment type filters.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {jobs.map((job) => (
            <JobCard
              key={job._id}
              job={job}
              applied={appliedJobIds.has(job._id)}
              onViewDetails={(j) => navigate(`/student/jobs/${j._id}`)}
              onApply={(j) => navigate(`/student/jobs/${j._id}`)}
            />
          ))}
        </div>
      )}

      {/* Pagination */}
      {!loading && jobs.length > 0 && (
        <Pagination
          page={page}
          totalPages={totalPages}
          total={total}
          limit={9}
          onPageChange={(p) => setPage(p)}
        />
      )}
    </div>
  );
}

