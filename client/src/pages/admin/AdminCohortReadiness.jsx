import React, { useState, useEffect } from 'react';
import {
  Users,
  Search,
  Filter,
  CheckCircle2,
  XCircle,
  Eye,
  Award,
  Bot,
  UserCheck,
  RotateCcw,
  AlertCircle,
  ChevronLeft,
  ChevronRight,
  TrendingUp,
  FileText
} from 'lucide-react';
import Card from '../../components/Card.jsx';
import Button from '../../components/Button.jsx';
import readinessService from '../../services/readiness.service.js';

export default function AdminCohortReadiness() {
  const [cohortData, setCohortData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Filters
  const [graduationYear, setGraduationYear] = useState('');
  const [degree, setDegree] = useState('');
  const [branch, setBranch] = useState('');
  const [page, setPage] = useState(1);

  // Student Drilldown Modal
  const [selectedStudentId, setSelectedStudentId] = useState(null);
  const [drilldownData, setDrilldownData] = useState(null);
  const [drilldownLoading, setDrilldownLoading] = useState(false);

  const fetchCohort = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await readinessService.getCohortReadiness({
        page,
        limit: 20,
        graduationYear: graduationYear || undefined,
        degree: degree || undefined,
        branch: branch || undefined
      });
      setCohortData(res.data || res);
    } catch (err) {
      setError(err.response?.data?.message || err.message || 'Failed to load cohort readiness');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCohort();
  }, [page]);

  const handleApplyFilter = (e) => {
    e.preventDefault();
    setPage(1);
    fetchCohort();
  };

  const handleOpenDrilldown = async (studentId) => {
    setSelectedStudentId(studentId);
    setDrilldownLoading(true);
    try {
      const res = await readinessService.getStudentReadinessAdmin(studentId);
      setDrilldownData(res.data || res);
    } catch (err) {
      setError('Failed to fetch detailed student readiness');
    } finally {
      setDrilldownLoading(false);
    }
  };

  const students = cohortData?.students || [];
  const cohort = cohortData?.cohort || cohortData?.summary || {};
  const pagination = cohortData?.pagination || {};

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
            <Users className="w-7 h-7 text-indigo-600" />
            Cohort Placement Readiness
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            Aggregate student preparation benchmarks, test participation, and mock interview completion by cohort.
          </p>
        </div>
        <Button size="sm" variant="outline" onClick={fetchCohort} className="self-start sm:self-auto flex items-center gap-1.5">
          <RotateCcw className="w-3.5 h-3.5" /> Refresh Cohort
        </Button>
      </div>

      {/* Cohort KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="p-4 flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center font-bold">
            <Users className="w-5 h-5" />
          </div>
          <div>
            <span className="text-xs text-slate-500 block">Total Cohort Size</span>
            <span className="text-xl font-bold text-slate-900">{cohort.totalStudents || 0}</span>
          </div>
        </Card>

        <Card className="p-4 flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center font-bold">
            <TrendingUp className="w-5 h-5" />
          </div>
          <div>
            <span className="text-xs text-slate-500 block">Avg Profile Completeness</span>
            <span className="text-xl font-bold text-emerald-700">{cohort.averageProfileCompleteness || 0}%</span>
          </div>
        </Card>

        <Card className="p-4 flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center font-bold">
            <CheckCircle2 className="w-5 h-5" />
          </div>
          <div>
            <span className="text-xs text-slate-500 block">Fully Verified Profiles</span>
            <span className="text-xl font-bold text-blue-700">{cohort.completeProfilesCount || 0}</span>
          </div>
        </Card>

        <Card className="p-4 flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-purple-50 text-purple-600 flex items-center justify-center font-bold">
            <Award className="w-5 h-5" />
          </div>
          <div>
            <span className="text-xs text-slate-500 block">Active Filters</span>
            <span className="text-xs font-semibold text-slate-700 truncate block">
              {graduationYear ? `Year ${graduationYear}` : 'All Years'}{' '}
              {branch ? `• ${branch}` : ''}
            </span>
          </div>
        </Card>
      </div>

      {/* Filter Bar */}
      <Card className="p-4">
        <form onSubmit={handleApplyFilter} className="grid grid-cols-1 sm:grid-cols-4 gap-3 items-end">
          <div>
            <label className="block text-xs font-semibold text-slate-600 mb-1">Graduation Year</label>
            <input
              type="number"
              placeholder="e.g. 2025"
              value={graduationYear}
              onChange={(e) => setGraduationYear(e.target.value)}
              className="w-full text-xs rounded-lg border border-slate-300 px-3 py-2 focus:ring-1 focus:ring-indigo-500"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-600 mb-1">Degree</label>
            <input
              type="text"
              placeholder="e.g. B.Tech"
              value={degree}
              onChange={(e) => setDegree(e.target.value)}
              className="w-full text-xs rounded-lg border border-slate-300 px-3 py-2 focus:ring-1 focus:ring-indigo-500"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-600 mb-1">Branch</label>
            <input
              type="text"
              placeholder="e.g. Computer Science"
              value={branch}
              onChange={(e) => setBranch(e.target.value)}
              className="w-full text-xs rounded-lg border border-slate-300 px-3 py-2 focus:ring-1 focus:ring-indigo-500"
            />
          </div>
          <div className="flex gap-2">
            <Button type="submit" size="sm" variant="primary" className="flex-1 flex items-center justify-center gap-1">
              <Filter className="w-3.5 h-3.5" /> Filter Cohort
            </Button>
            <Button
              type="button"
              size="sm"
              variant="outline"
              onClick={() => {
                setGraduationYear('');
                setDegree('');
                setBranch('');
                setPage(1);
                fetchCohort();
              }}
            >
              Reset
            </Button>
          </div>
        </form>
      </Card>

      {/* Cohort Table */}
      <Card className="overflow-hidden">
        {loading ? (
          <div className="p-12 text-center text-slate-400">Loading cohort metrics...</div>
        ) : students.length === 0 ? (
          <div className="p-12 text-center text-slate-500">
            <Users className="w-10 h-10 text-slate-300 mx-auto mb-2" />
            <p className="text-sm font-semibold">No students found matching filters</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-slate-200 text-xs">
              <thead className="bg-slate-50 text-slate-600 uppercase font-semibold">
                <tr>
                  <th className="px-4 py-3 text-left">Roll Number</th>
                  <th className="px-4 py-3 text-left">Name</th>
                  <th className="px-4 py-3 text-left">Branch & Year</th>
                  <th className="px-4 py-3 text-center">Completeness</th>
                  <th className="px-4 py-3 text-center">Mock Tests</th>
                  <th className="px-4 py-3 text-center">AI Sessions</th>
                  <th className="px-4 py-3 text-center">1:1 Sessions</th>
                  <th className="px-4 py-3 text-center">Applications</th>
                  <th className="px-4 py-3 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 bg-white">
                {students.map((s) => (
                  <tr key={s.studentId || s._id} className="hover:bg-slate-50/60 transition">
                    <td className="px-4 py-3.5 font-mono font-semibold text-slate-800">{s.rollNumber || s.rollNo || 'N/A'}</td>
                    <td className="px-4 py-3.5 font-medium text-slate-900">{s.fullName || s.name}</td>
                    <td className="px-4 py-3.5 text-slate-600">
                      {s.branch || s.degree} • {s.graduationYear || 'N/A'}
                    </td>
                    <td className="px-4 py-3.5 text-center">
                      <span
                        className={`font-semibold px-2 py-0.5 rounded-full ${
                          s.profileCompleteness === 100
                            ? 'bg-emerald-100 text-emerald-800'
                            : 'bg-amber-100 text-amber-800'
                        }`}
                      >
                        {s.profileCompleteness}%
                      </span>
                    </td>
                    <td className="px-4 py-3.5 text-center font-semibold text-slate-800">{s.mockTestsCompleted}</td>
                    <td className="px-4 py-3.5 text-center font-semibold text-slate-800">{s.aiSessionsCompleted}</td>
                    <td className="px-4 py-3.5 text-center font-semibold text-slate-800">{s.humanSessionsCompleted}</td>
                    <td className="px-4 py-3.5 text-center font-semibold text-slate-800">{s.applicationsCount}</td>
                    <td className="px-4 py-3.5 text-right">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleOpenDrilldown(s.studentId)}
                        className="inline-flex items-center gap-1 text-xs"
                      >
                        <Eye className="w-3.5 h-3.5" /> View Readiness
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
              Page {pagination.page} of {pagination.totalPages} ({pagination.total} students)
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

      {/* Student Readiness Drilldown Modal */}
      {selectedStudentId && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-2xl max-h-[85vh] flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-200">
            <div className="p-5 border-b border-slate-200 flex items-center justify-between bg-slate-50">
              <div>
                <h3 className="font-bold text-slate-900 text-base">Student Readiness Drilldown</h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Pure unmerged records for candidate: {drilldownData?.student?.fullName || 'Loading...'}
                </p>
              </div>
              <button
                onClick={() => {
                  setSelectedStudentId(null);
                  setDrilldownData(null);
                }}
                className="text-slate-400 hover:text-slate-700 font-bold text-lg"
              >
                &times;
              </button>
            </div>

            <div className="p-6 overflow-y-auto space-y-4 text-xs">
              {drilldownLoading || !drilldownData ? (
                <div className="py-12 text-center text-slate-400">Loading candidate breakdown...</div>
              ) : (
                <>
                  <div className="grid grid-cols-2 gap-3 p-3 bg-slate-50 rounded-xl">
                    <div>
                      <span className="text-slate-500 block">Roll Number:</span>
                      <span className="font-mono font-bold text-slate-800">{drilldownData.student?.rollNumber}</span>
                    </div>
                    <div>
                      <span className="text-slate-500 block">Degree & Branch:</span>
                      <span className="font-semibold text-slate-800">
                        {drilldownData.student?.degree} ({drilldownData.student?.branch})
                      </span>
                    </div>
                  </div>

                  <div className="space-y-3">
                    <h4 className="font-bold text-slate-900 text-sm">Domain Verification Benchmarks</h4>
                    <div className="grid grid-cols-2 gap-3">
                      <div className="p-3 border rounded-lg">
                        <span className="text-slate-500 block">Profile Completeness</span>
                        <span className="text-base font-bold text-slate-900">
                          {drilldownData.components?.profileCompleteness?.value?.percentage}%
                        </span>
                      </div>
                      <div className="p-3 border rounded-lg">
                        <span className="text-slate-500 block">Mock Tests Avg</span>
                        <span className="text-base font-bold text-purple-700">
                          {drilldownData.components?.mockTests?.value?.averagePercentage}%
                        </span>
                      </div>
                      <div className="p-3 border rounded-lg">
                        <span className="text-slate-500 block">AI Interview Score</span>
                        <span className="text-base font-bold text-indigo-700">
                          {drilldownData.components?.aiInterviews?.value?.averagePercentage}%
                        </span>
                      </div>
                      <div className="p-3 border rounded-lg">
                        <span className="text-slate-500 block">Human 1:1 Score</span>
                        <span className="text-base font-bold text-teal-700">
                          {drilldownData.components?.humanInterviews?.value?.averageReleasedScore}%
                        </span>
                      </div>
                    </div>
                  </div>

                  {drilldownData.nextActions?.length > 0 && (
                    <div className="space-y-2 pt-2">
                      <h4 className="font-bold text-slate-900 text-sm">Current Gaps & Next Steps</h4>
                      <ul className="list-disc list-inside space-y-1 text-slate-600">
                        {drilldownData.nextActions.map((a) => (
                          <li key={a.id}>
                            <span className="font-semibold text-slate-800">{a.title}:</span> {a.description}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                </>
              )}
            </div>

            <div className="p-4 bg-slate-50 border-t border-slate-200 text-right">
              <Button
                size="sm"
                variant="outline"
                onClick={() => {
                  setSelectedStudentId(null);
                  setDrilldownData(null);
                }}
              >
                Close
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

