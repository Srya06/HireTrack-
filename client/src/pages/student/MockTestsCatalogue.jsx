import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  ClipboardList,
  Clock,
  HelpCircle,
  Award,
  CheckCircle,
  AlertCircle,
  Search,
  ArrowRight,
  History,
  RotateCcw,
  Eye,
  Loader2
} from 'lucide-react';
import Card from '../../components/Card.jsx';
import Button from '../../components/Button.jsx';
import StatusBadge from '../../components/StatusBadge.jsx';
import * as mockTestService from '../../services/mockTest.service.js';

export default function MockTestsCatalogue() {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('tests'); // 'tests' | 'history'
  const [tests, setTests] = useState([]);
  const [history, setHistory] = useState([]);
  const [categories, setCategories] = useState([]);
  const [selectedCategory, setSelectedCategory] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const loadData = async () => {
    setLoading(true);
    setError(null);
    try {
      const [testsRes, histRes] = await Promise.allSettled([
        mockTestService.getStudentMockTests({
          categoryId: selectedCategory || undefined,
          q: searchQuery || undefined
        }),
        mockTestService.getStudentMockTestHistory({ limit: 50 })
      ]);

      if (testsRes.status === 'fulfilled' && testsRes.value?.data) {
        const items = testsRes.value.data.data || testsRes.value.data.items || [];
        setTests(items);
      }

      if (histRes.status === 'fulfilled' && histRes.value?.data) {
        const histData = histRes.value.data.data || histRes.value.data.items || [];
        setHistory(histData);
      }
    } catch (err) {
      setError(err.message || 'Failed to load assessments');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [selectedCategory]);

  const handleSearch = (e) => {
    e.preventDefault();
    loadData();
  };

  // Find active attempt for a given test ID
  const getActiveAttemptForTest = (testId) => {
    return history.find(
      (h) =>
        (h.mockTestId?._id === testId || h.mockTestId === testId) &&
        h.status === 'IN_PROGRESS'
    );
  };

  // Get completed attempts count for a given test ID
  const getAttemptCountForTest = (testId) => {
    return history.filter(
      (h) =>
        (h.mockTestId?._id === testId || h.mockTestId === testId) &&
        ['SUBMITTED', 'TIMED_OUT', 'EVALUATED'].includes(h.status)
    ).length;
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
            <ClipboardList className="w-7 h-7 text-indigo-600" />
            Mock Tests & Practice Assessments
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            Standardized company-specific and topic-wise mock tests with instant scoring and performance analytics.
          </p>
        </div>

        {/* Tab switch */}
        <div className="inline-flex rounded-lg border border-slate-200 bg-slate-50 p-1">
          <button
            type="button"
            onClick={() => setActiveTab('tests')}
            className={`px-4 py-1.5 text-xs font-semibold rounded-md transition ${
              activeTab === 'tests'
                ? 'bg-white text-indigo-600 shadow-sm'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Available Tests ({tests.length})
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('history')}
            className={`px-4 py-1.5 text-xs font-semibold rounded-md transition flex items-center gap-1.5 ${
              activeTab === 'history'
                ? 'bg-white text-indigo-600 shadow-sm'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <History className="w-3.5 h-3.5" />
            My Test History ({history.length})
          </button>
        </div>
      </div>

      {/* Search & Filters */}
      {activeTab === 'tests' && (
        <div className="flex flex-col sm:flex-row gap-3">
          <form onSubmit={handleSearch} className="relative flex-1">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
            <input
              type="text"
              placeholder="Search mock tests by title..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-4 py-2 text-sm rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </form>
          <Button variant="outline" size="sm" onClick={loadData}>
            Refresh
          </Button>
        </div>
      )}

      {error && (
        <div className="p-4 bg-rose-50 border border-rose-200 rounded-lg text-rose-800 text-sm flex items-center gap-2">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {loading ? (
        <div className="flex flex-col items-center justify-center py-16 space-y-3">
          <Loader2 className="w-8 h-8 animate-spin text-indigo-600" />
          <p className="text-xs text-slate-500 font-medium">Loading mock assessments...</p>
        </div>
      ) : activeTab === 'tests' ? (
        /* Available Tests Grid */
        tests.length === 0 ? (
          <div className="text-center py-16 bg-white rounded-xl border border-dashed border-slate-200 p-8 space-y-3">
            <ClipboardList className="w-10 h-10 text-slate-300 mx-auto" />
            <h3 className="text-sm font-semibold text-slate-900">No mock tests published yet</h3>
            <p className="text-xs text-slate-500 max-w-sm mx-auto">
              Check back soon! Placement coordinators publish mock assessments regularly before campus drives.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {tests.map((test) => {
              const testId = test._id || test.id;
              const activeAttempt = getActiveAttemptForTest(testId);
              const pastCount = getAttemptCountForTest(testId);
              const limit = test.attemptLimit || 1;
              const hasReachedLimit = pastCount >= limit && !activeAttempt;

              return (
                <div
                  key={testId}
                  className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm hover:shadow-md transition flex flex-col justify-between"
                >
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-semibold px-2 py-0.5 rounded bg-indigo-50 text-indigo-700">
                        {test.categoryId?.name || 'Assessment'}
                      </span>
                      {activeAttempt ? (
                        <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-amber-50 text-amber-700 border border-amber-200 flex items-center gap-1">
                          <RotateCcw className="w-3 h-3 animate-spin" /> In Progress
                        </span>
                      ) : (
                        <span className="text-xs text-slate-400">
                          Attempts: {pastCount} / {limit}
                        </span>
                      )}
                    </div>

                    <div>
                      <h3 className="text-base font-semibold text-slate-900 line-clamp-1">{test.title}</h3>
                      <p className="text-xs text-slate-500 mt-1 line-clamp-2">
                        {test.description || 'Comprehensive evaluation to assess role readiness and core competencies.'}
                      </p>
                    </div>

                    {/* Metadata chips */}
                    <div className="grid grid-cols-3 gap-2 py-2 border-y border-slate-100 text-center">
                      <div>
                        <span className="text-[10px] text-slate-400 block font-medium">DURATION</span>
                        <span className="text-xs font-semibold text-slate-800 flex items-center justify-center gap-1 mt-0.5">
                          <Clock className="w-3 h-3 text-slate-400" />
                          {test.durationMinutes}m
                        </span>
                      </div>
                      <div>
                        <span className="text-[10px] text-slate-400 block font-medium">QUESTIONS</span>
                        <span className="text-xs font-semibold text-slate-800 flex items-center justify-center gap-1 mt-0.5">
                          <HelpCircle className="w-3 h-3 text-slate-400" />
                          {test.totalQuestions || 'Varies'}
                        </span>
                      </div>
                      <div>
                        <span className="text-[10px] text-slate-400 block font-medium">TOTAL MARKS</span>
                        <span className="text-xs font-semibold text-slate-800 flex items-center justify-center gap-1 mt-0.5">
                          <Award className="w-3 h-3 text-slate-400" />
                          {test.totalMarks || '--'}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Action CTA */}
                  <div className="mt-5 pt-3">
                    {activeAttempt ? (
                      <Button
                        className="w-full bg-amber-600 hover:bg-amber-700 text-white flex items-center justify-center gap-1.5"
                        size="sm"
                        onClick={() => navigate(`/student/mock-tests/attempts/${activeAttempt._id}`)}
                      >
                        Resume Assessment &rarr;
                      </Button>
                    ) : hasReachedLimit ? (
                      <Button
                        className="w-full"
                        variant="secondary"
                        size="sm"
                        disabled
                      >
                        Attempt Limit Reached ({limit}/{limit})
                      </Button>
                    ) : (
                      <Button
                        className="w-full"
                        size="sm"
                        onClick={() => navigate(`/student/mock-tests/${testId}`)}
                      >
                        View & Start Test &rarr;
                      </Button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )
      ) : (
        /* History View */
        history.length === 0 ? (
          <div className="text-center py-16 bg-white rounded-xl border border-dashed border-slate-200 p-8 space-y-3">
            <History className="w-10 h-10 text-slate-300 mx-auto" />
            <h3 className="text-sm font-semibold text-slate-900">No past attempts yet</h3>
            <p className="text-xs text-slate-500 max-w-sm mx-auto">
              Once you start and complete mock assessments, your score cards, topic analytics, and answer reviews will be listed here.
            </p>
          </div>
        ) : (
          <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-sm">
            <table className="min-w-full divide-y divide-slate-200 text-sm">
              <thead className="bg-slate-50 text-slate-600 text-xs uppercase font-medium">
                <tr>
                  <th className="px-6 py-3.5 text-left">Test Title</th>
                  <th className="px-6 py-3.5 text-left">Date & Time</th>
                  <th className="px-6 py-3.5 text-left">Attempt #</th>
                  <th className="px-6 py-3.5 text-left">Score</th>
                  <th className="px-6 py-3.5 text-left">Result</th>
                  <th className="px-6 py-3.5 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {history.map((att) => {
                  const attId = att._id || att.id;
                  const isEval = ['SUBMITTED', 'TIMED_OUT', 'EVALUATED'].includes(att.status);
                  const isPassed = att.passed;

                  return (
                    <tr key={attId} className="hover:bg-slate-50/60 transition">
                      <td className="px-6 py-4 font-semibold text-slate-900">
                        {att.mockTestId?.title || 'Assessment'}
                      </td>
                      <td className="px-6 py-4 text-xs text-slate-500">
                        {new Date(att.startedAt).toLocaleString([], {
                          dateStyle: 'medium',
                          timeStyle: 'short'
                        })}
                      </td>
                      <td className="px-6 py-4 text-xs text-slate-600 font-medium">
                        Attempt {att.attemptNumber || 1}
                      </td>
                      <td className="px-6 py-4">
                        {isEval ? (
                          <div className="flex items-baseline gap-1.5">
                            <span className="font-bold text-slate-900">{att.score ?? '--'}</span>
                            <span className="text-xs text-slate-400">/ {att.maxScore ?? '--'}</span>
                            <span className="text-xs font-semibold text-indigo-600">
                              ({att.percentage ?? 0}%)
                            </span>
                          </div>
                        ) : (
                          <span className="text-xs text-amber-600 font-medium">In Progress</span>
                        )}
                      </td>
                      <td className="px-6 py-4">
                        {isEval ? (
                          <span
                            className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold ${
                              isPassed
                                ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                                : 'bg-rose-50 text-rose-700 border border-rose-200'
                            }`}
                          >
                            {isPassed ? 'Passed' : 'Needs Practice'}
                          </span>
                        ) : (
                          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-amber-50 text-amber-700 border border-amber-200">
                            Active
                          </span>
                        )}
                      </td>
                      <td className="px-6 py-4 text-right">
                        {isEval ? (
                          <Link to={`/student/mock-tests/attempts/${attId}/result`}>
                            <Button variant="outline" size="sm" className="inline-flex items-center gap-1">
                              <Eye className="w-3 h-3" /> View Result
                            </Button>
                          </Link>
                        ) : (
                          <Link to={`/student/mock-tests/attempts/${attId}`}>
                            <Button size="sm" className="bg-amber-600 hover:bg-amber-700 text-white">
                              Resume &rarr;
                            </Button>
                          </Link>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )
      )}
    </div>
  );
}
