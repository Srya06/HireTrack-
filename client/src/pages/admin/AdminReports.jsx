import React, { useState, useEffect } from 'react';
import {
  BarChart3,
  Download,
  Calendar,
  Briefcase,
  Award,
  Bot,
  UserCheck,
  TrendingUp,
  RotateCcw,
  AlertCircle,
  FileSpreadsheet,
  CheckCircle2
} from 'lucide-react';
import Card from '../../components/Card.jsx';
import Button from '../../components/Button.jsx';
import readinessService from '../../services/readiness.service.js';

export default function AdminReports() {
  const [activeTab, setActiveTab] = useState('overview'); // 'overview' | 'jobs' | 'mock-tests' | 'mock-interviews'
  const [reportData, setReportData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [exporting, setExporting] = useState(false);
  const [auditSuccess, setAuditSuccess] = useState(null);

  // Filters
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  const fetchReport = async () => {
    setLoading(true);
    setError(null);
    setAuditSuccess(null);
    try {
      let res;
      const params = {
        startDate: startDate || undefined,
        endDate: endDate || undefined
      };

      if (activeTab === 'overview') {
        res = await readinessService.getOverviewReport(params);
      } else if (activeTab === 'jobs') {
        res = await readinessService.getJobsReport(params);
      } else if (activeTab === 'mock-tests') {
        res = await readinessService.getMockTestsReport(params);
      } else if (activeTab === 'mock-interviews') {
        res = await readinessService.getMockInterviewsReport(params);
      }
      setReportData(res?.data || res);
    } catch (err) {
      setError(err.response?.data?.message || err.message || 'Failed to generate report');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchReport();
  }, [activeTab]);

  const handleExportCsv = async () => {
    setExporting(true);
    setError(null);
    try {
      const blob = await readinessService.exportReportCsv(activeTab, {
        startDate: startDate || undefined,
        endDate: endDate || undefined
      });

      // Trigger browser download
      const url = window.URL.createObjectURL(new Blob([blob], { type: 'text/csv' }));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `${activeTab}-report-${Date.now()}.csv`);
      document.body.appendChild(link);
      link.click();
      link.parentNode.removeChild(link);
      window.URL.revokeObjectURL(url);

      setAuditSuccess('Report exported successfully and logged to audit trail.');
    } catch (err) {
      setError(err.response?.data?.message || err.message || 'Failed to export CSV report');
    } finally {
      setExporting(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
            <BarChart3 className="w-7 h-7 text-indigo-600" />
            Placement Intelligence & Analytics Reports
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            Aggregated institutional reporting across jobs, assessments, and mock interviews with audited CSV exports.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            size="sm"
            variant="outline"
            onClick={fetchReport}
            className="flex items-center gap-1.5"
          >
            <RotateCcw className="w-3.5 h-3.5" /> Refresh
          </Button>
          <Button
            size="sm"
            variant="primary"
            onClick={handleExportCsv}
            disabled={exporting || loading}
            className="flex items-center gap-1.5 bg-emerald-600 hover:bg-emerald-700 text-white"
          >
            <Download className="w-3.5 h-3.5" /> {exporting ? 'Exporting...' : 'Export CSV'}
          </Button>
        </div>
      </div>

      {/* Audit Confirmation Alert */}
      {auditSuccess && (
        <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-lg text-emerald-800 text-xs flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 text-emerald-600 flex-shrink-0" />
          <span>{auditSuccess}</span>
        </div>
      )}

      {/* Error Alert */}
      {error && (
        <div className="p-3 bg-rose-50 border border-rose-200 rounded-lg text-rose-800 text-xs flex items-center gap-2">
          <AlertCircle className="w-4 h-4 text-rose-600 flex-shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Tabs */}
      <div className="flex items-center justify-between border-b border-slate-200 pb-2">
        <div className="inline-flex rounded-lg border border-slate-200 bg-slate-50 p-1">
          <button
            onClick={() => setActiveTab('overview')}
            className={`px-4 py-1.5 text-xs font-semibold rounded-md transition ${
              activeTab === 'overview'
                ? 'bg-white text-indigo-600 shadow-sm'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Overview
          </button>
          <button
            onClick={() => setActiveTab('jobs')}
            className={`px-4 py-1.5 text-xs font-semibold rounded-md transition ${
              activeTab === 'jobs'
                ? 'bg-white text-indigo-600 shadow-sm'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Job Opportunities
          </button>
          <button
            onClick={() => setActiveTab('mock-tests')}
            className={`px-4 py-1.5 text-xs font-semibold rounded-md transition ${
              activeTab === 'mock-tests'
                ? 'bg-white text-indigo-600 shadow-sm'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Mock Tests
          </button>
          <button
            onClick={() => setActiveTab('mock-interviews')}
            className={`px-4 py-1.5 text-xs font-semibold rounded-md transition ${
              activeTab === 'mock-interviews'
                ? 'bg-white text-indigo-600 shadow-sm'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Mock Interviews (AI vs Human)
          </button>
        </div>

        {/* Date Filter */}
        <div className="flex items-center gap-2 text-xs">
          <input
            type="date"
            value={startDate}
            onChange={(e) => setStartDate(e.target.value)}
            className="rounded border border-slate-300 px-2 py-1 text-xs"
          />
          <span className="text-slate-400">to</span>
          <input
            type="date"
            value={endDate}
            onChange={(e) => setEndDate(e.target.value)}
            className="rounded border border-slate-300 px-2 py-1 text-xs"
          />
          <Button size="sm" variant="outline" onClick={fetchReport}>
            Filter
          </Button>
        </div>
      </div>

      {/* Tab 1: OVERVIEW */}
      {activeTab === 'overview' && (
        <div className="space-y-4">
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
            <Card className="p-4 text-center">
              <span className="text-xs text-slate-500 block">Total Students</span>
              <span className="text-2xl font-bold text-slate-900">{reportData?.metrics?.totalStudents || 0}</span>
            </Card>
            <Card className="p-4 text-center">
              <span className="text-xs text-slate-500 block">Total Jobs</span>
              <span className="text-2xl font-bold text-slate-900">{reportData?.metrics?.totalJobs || 0}</span>
            </Card>
            <Card className="p-4 text-center">
              <span className="text-xs text-slate-500 block">Applications</span>
              <span className="text-2xl font-bold text-sky-700">{reportData?.metrics?.totalApplications || 0}</span>
            </Card>
            <Card className="p-4 text-center">
              <span className="text-xs text-slate-500 block">Mock Test Attempts</span>
              <span className="text-2xl font-bold text-purple-700">{reportData?.metrics?.totalMockAttempts || 0}</span>
            </Card>
            <Card className="p-4 text-center">
              <span className="text-xs text-slate-500 block">AI Interviews</span>
              <span className="text-2xl font-bold text-indigo-700">{reportData?.metrics?.totalAiSessions || 0}</span>
            </Card>
            <Card className="p-4 text-center">
              <span className="text-xs text-slate-500 block">Human 1:1 Bookings</span>
              <span className="text-2xl font-bold text-teal-700">{reportData?.metrics?.totalHumanBookings || 0}</span>
            </Card>
          </div>
        </div>
      )}

      {/* Tab 2: JOBS */}
      {activeTab === 'jobs' && (
        <Card className="overflow-hidden">
          <div className="p-4 bg-slate-50 border-b border-slate-200 flex items-center justify-between text-xs">
            <span className="font-semibold text-slate-700">
              Total Opportunities: {reportData?.summary?.totalJobs || 0} • Total Applications: {reportData?.summary?.totalApplications || 0}
            </span>
            <span className="text-slate-500">
              Avg Applicants: {reportData?.summary?.averageApplicationsPerJob || 0} / job
            </span>
          </div>
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-slate-200 text-xs">
              <thead className="bg-slate-50 text-slate-600 font-semibold uppercase">
                <tr>
                  <th className="px-4 py-3 text-left">Company</th>
                  <th className="px-4 py-3 text-left">Job Title</th>
                  <th className="px-4 py-3 text-left">Work Mode</th>
                  <th className="px-4 py-3 text-left">Status</th>
                  <th className="px-4 py-3 text-center">Total Applicants</th>
                  <th className="px-4 py-3 text-center">Verified</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 bg-white">
                {(reportData?.items || []).map((j) => (
                  <tr key={j.jobId} className="hover:bg-slate-50/60">
                    <td className="px-4 py-3 font-semibold text-slate-900">{j.companyName}</td>
                    <td className="px-4 py-3 text-slate-800">{j.jobTitle}</td>
                    <td className="px-4 py-3 text-slate-500 uppercase font-mono text-[11px]">{j.workMode}</td>
                    <td className="px-4 py-3">
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-50 text-emerald-800 border border-emerald-200">
                        {j.status}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-center font-bold text-slate-900">{j.totalApplications}</td>
                    <td className="px-4 py-3 text-center font-semibold text-emerald-700">{j.verifiedApplications}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      {/* Tab 3: MOCK TESTS */}
      {activeTab === 'mock-tests' && (
        <Card className="overflow-hidden">
          <div className="p-4 bg-slate-50 border-b border-slate-200 flex items-center justify-between text-xs">
            <span className="font-semibold text-slate-700">
              Published Tests: {reportData?.summary?.totalTests || 0} • Total Attempts: {reportData?.summary?.totalAttempts || 0}
            </span>
            <span className="text-slate-500">
              Pass Rate: {reportData?.summary?.passRate || 0}%
            </span>
          </div>
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-slate-200 text-xs">
              <thead className="bg-slate-50 text-slate-600 font-semibold uppercase">
                <tr>
                  <th className="px-4 py-3 text-left">Test Title</th>
                  <th className="px-4 py-3 text-left">Status</th>
                  <th className="px-4 py-3 text-center">Duration</th>
                  <th className="px-4 py-3 text-center">Total Attempts</th>
                  <th className="px-4 py-3 text-center">Completed</th>
                  <th className="px-4 py-3 text-center">Average %</th>
                  <th className="px-4 py-3 text-center">Highest %</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 bg-white">
                {(reportData?.items || []).map((t) => (
                  <tr key={t.testId} className="hover:bg-slate-50/60">
                    <td className="px-4 py-3 font-semibold text-slate-900">{t.title}</td>
                    <td className="px-4 py-3">
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-indigo-50 text-indigo-800 border border-indigo-200">
                        {t.status}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-center text-slate-600">{t.durationMinutes} min</td>
                    <td className="px-4 py-3 text-center font-bold text-slate-900">{t.totalAttempts}</td>
                    <td className="px-4 py-3 text-center font-semibold text-purple-700">{t.completedAttempts}</td>
                    <td className="px-4 py-3 text-center font-bold text-slate-900">{t.averagePercentage}%</td>
                    <td className="px-4 py-3 text-center font-semibold text-emerald-700">{t.highestPercentage}%</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      {/* Tab 4: MOCK INTERVIEWS (AI VS HUMAN) */}
      {activeTab === 'mock-interviews' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          {/* AI Metrics Card */}
          <Card className="p-5 space-y-4 border-indigo-100 bg-indigo-50/20">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-indigo-600 text-white flex items-center justify-center">
                  <Bot className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="font-bold text-slate-900 text-sm">AI Mock Interview Metrics</h3>
                  <span className="text-[10px] text-slate-500">Source: {reportData?.aiMetrics?.source}</span>
                </div>
              </div>
              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-indigo-100 text-indigo-800">
                Automated AI
              </span>
            </div>

            <div className="grid grid-cols-2 gap-3 text-center pt-2">
              <div className="p-3 bg-white rounded-xl border border-slate-100">
                <span className="text-xs text-slate-500 block">Total Sessions</span>
                <span className="text-xl font-bold text-slate-900">{reportData?.aiMetrics?.totalSessions || 0}</span>
              </div>
              <div className="p-3 bg-white rounded-xl border border-slate-100">
                <span className="text-xs text-slate-500 block">Completed Sessions</span>
                <span className="text-xl font-bold text-indigo-700">{reportData?.aiMetrics?.completedSessions || 0}</span>
              </div>
              <div className="p-3 bg-white rounded-xl border border-slate-100">
                <span className="text-xs text-slate-500 block">Passed Benchmark</span>
                <span className="text-xl font-bold text-emerald-700">{reportData?.aiMetrics?.passedSessions || 0}</span>
              </div>
              <div className="p-3 bg-white rounded-xl border border-slate-100">
                <span className="text-xs text-slate-500 block">Average Score %</span>
                <span className="text-xl font-bold text-indigo-900">{reportData?.aiMetrics?.averageScorePercentage || 0}%</span>
              </div>
            </div>
          </Card>

          {/* Human Metrics Card */}
          <Card className="p-5 space-y-4 border-teal-100 bg-teal-50/20">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-teal-600 text-white flex items-center justify-center">
                  <UserCheck className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="font-bold text-slate-900 text-sm">Human 1:1 Live Practice Metrics</h3>
                  <span className="text-[10px] text-slate-500">Source: {reportData?.humanMetrics?.source}</span>
                </div>
              </div>
              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-teal-100 text-teal-800">
                Expert Verified
              </span>
            </div>

            <div className="grid grid-cols-2 gap-3 text-center pt-2">
              <div className="p-3 bg-white rounded-xl border border-slate-100">
                <span className="text-xs text-slate-500 block">Total Available Slots</span>
                <span className="text-xl font-bold text-slate-900">{reportData?.humanMetrics?.totalSlots || 0}</span>
              </div>
              <div className="p-3 bg-white rounded-xl border border-slate-100">
                <span className="text-xs text-slate-500 block">Total Bookings</span>
                <span className="text-xl font-bold text-teal-700">{reportData?.humanMetrics?.totalBookings || 0}</span>
              </div>
              <div className="p-3 bg-white rounded-xl border border-slate-100">
                <span className="text-xs text-slate-500 block">Completed Sessions</span>
                <span className="text-xl font-bold text-slate-900">{reportData?.humanMetrics?.completedBookings || 0}</span>
              </div>
              <div className="p-3 bg-white rounded-xl border border-slate-100">
                <span className="text-xs text-slate-500 block">Avg Released Score</span>
                <span className="text-xl font-bold text-teal-900">{reportData?.humanMetrics?.averageReleasedScore || 0}%</span>
              </div>
            </div>
          </Card>
        </div>
      )}
    </div>
  );
}

