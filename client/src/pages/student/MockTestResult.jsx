import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import {
  Award,
  Clock,
  CheckCircle,
  XCircle,
  AlertTriangle,
  ArrowLeft,
  ChevronDown,
  ChevronUp,
  BarChart3,
  Loader2,
  FileQuestion,
  HelpCircle
} from 'lucide-react';
import Button from '../../components/Button.jsx';
import Card from '../../components/Card.jsx';
import * as mockTestService from '../../services/mockTest.service.js';

export default function MockTestResult() {
  const { attemptId } = useParams();
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [expandedQuestions, setExpandedQuestions] = useState({});

  useEffect(() => {
    const fetchResult = async () => {
      setLoading(true);
      setError(null);
      try {
        const res = await mockTestService.getAttemptResult(attemptId);
        if (res.data?.data) {
          setResult(res.data.data);
        }
      } catch (err) {
        setError(err.message || 'Failed to load test evaluation results');
      } finally {
        setLoading(false);
      }
    };
    fetchResult();
  }, [attemptId]);

  const toggleQuestionExpand = (qId) => {
    setExpandedQuestions((prev) => ({ ...prev, [qId]: !prev[qId] }));
  };

  const formatSeconds = (totalSecs) => {
    if (!totalSecs) return '0s';
    const mins = Math.floor(totalSecs / 60);
    const secs = totalSecs % 60;
    if (mins > 0) return `${mins}m ${secs}s`;
    return `${secs}s`;
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[50vh] space-y-3">
        <Loader2 className="w-8 h-8 animate-spin text-indigo-600" />
        <p className="text-xs text-slate-500 font-medium">Computing scores and generating analytics...</p>
      </div>
    );
  }

  if (error || !result) {
    return (
      <div className="max-w-xl mx-auto py-12 text-center space-y-4">
        <div className="bg-rose-50 border border-rose-200 rounded-xl p-6">
          <AlertTriangle className="w-8 h-8 text-rose-500 mx-auto mb-2" />
          <h2 className="text-base font-semibold text-rose-900">Result Unavailable</h2>
          <p className="text-xs text-rose-700 mt-1">{error || 'Test results not found'}</p>
        </div>
        <Link to="/student/mock-tests">
          <Button variant="outline" size="sm">
            &larr; Back to Catalogue
          </Button>
        </Link>
      </div>
    );
  }

  const {
    mockTest,
    score,
    maxScore,
    percentage,
    passed,
    timeTakenSeconds,
    attemptNumber,
    topicAnalytics = [],
    questionBreakdown,
    reviewPolicy
  } = result;

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Top Navigation */}
      <div className="flex items-center justify-between">
        <Link
          to="/student/mock-tests"
          className="inline-flex items-center text-xs font-semibold text-slate-500 hover:text-slate-900 gap-1.5"
        >
          <ArrowLeft className="w-4 h-4" /> Back to Mock Tests
        </Link>
        <span className="text-xs text-slate-400 font-medium">
          Attempt #{attemptNumber || 1}
        </span>
      </div>

      {/* Main Scorecard Header */}
      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-sm">
        <div
          className={`p-6 text-white ${
            passed
              ? 'bg-gradient-to-r from-emerald-600 to-teal-700'
              : 'bg-gradient-to-r from-slate-700 to-slate-900'
          }`}
        >
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-white/20 text-white inline-block mb-2">
                {passed ? 'Passed Standard' : 'Evaluation Completed'}
              </span>
              <h1 className="text-2xl font-bold">{mockTest?.title || 'Mock Assessment'}</h1>
              <p className="text-xs text-white/80 mt-1">
                Completed on {new Date().toLocaleDateString([], { dateStyle: 'long' })}
              </p>
            </div>

            {/* Score circle / pill */}
            <div className="bg-white/10 backdrop-blur-md rounded-xl p-4 border border-white/20 text-center min-w-[140px]">
              <span className="text-[11px] uppercase tracking-wider text-white/80 block">
                Final Score
              </span>
              <div className="text-3xl font-extrabold mt-0.5">
                {score} <span className="text-lg font-normal text-white/70">/ {maxScore}</span>
              </div>
              <span className="text-xs font-bold text-white/90 block mt-1">
                {percentage}% Accuracy
              </span>
            </div>
          </div>
        </div>

        {/* Stats strip */}
        <div className="grid grid-cols-3 divide-x divide-slate-100 bg-slate-50 text-center py-3.5 border-b border-slate-100 text-xs text-slate-600">
          <div>
            <span className="text-slate-400 block text-[10px] font-semibold uppercase">TIME TAKEN</span>
            <span className="font-bold text-slate-800 flex items-center justify-center gap-1 mt-0.5">
              <Clock className="w-3.5 h-3.5 text-slate-400" />
              {formatSeconds(timeTakenSeconds)}
            </span>
          </div>
          <div>
            <span className="text-slate-400 block text-[10px] font-semibold uppercase">RESULT STATUS</span>
            <span
              className={`font-bold mt-0.5 inline-block ${
                passed ? 'text-emerald-700' : 'text-slate-700'
              }`}
            >
              {passed ? 'Qualified' : 'Attempt Recorded'}
            </span>
          </div>
          <div>
            <span className="text-slate-400 block text-[10px] font-semibold uppercase">REVIEW POLICY</span>
            <span className="font-bold text-slate-800 mt-0.5 inline-block">
              {reviewPolicy === 'IMMEDIATE' ? 'Explanations Visible' : 'Summary Only'}
            </span>
          </div>
        </div>
      </div>

      {/* Topic-Wise Breakdown */}
      {topicAnalytics.length > 0 && (
        <Card
          title="Topic-Wise Performance Analytics"
          subtitle="Detailed breakdown of your strengths and focus areas"
        >
          <div className="space-y-4 pt-1">
            {topicAnalytics.map((topic) => {
              const topicPct =
                topic.maxScore > 0
                  ? Math.round((Math.max(0, topic.score) / topic.maxScore) * 100)
                  : 0;

              return (
                <div key={topic.topicTag} className="space-y-1.5">
                  <div className="flex justify-between items-center text-xs">
                    <span className="font-semibold text-slate-900">{topic.topicTag}</span>
                    <span className="text-slate-500">
                      <strong>{topic.score}</strong> / {topic.maxScore} marks ({topicPct}%)
                      • <span className="text-emerald-600">{topic.correct} correct</span>
                      {topic.incorrect > 0 && (
                        <span className="text-rose-600">, {topic.incorrect} incorrect</span>
                      )}
                    </span>
                  </div>
                  <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden">
                    <div
                      className={`h-full transition-all duration-300 ${
                        topicPct >= 70
                          ? 'bg-emerald-500'
                          : topicPct >= 40
                          ? 'bg-amber-500'
                          : 'bg-rose-500'
                      }`}
                      style={{ width: `${Math.min(100, Math.max(0, topicPct))}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </Card>
      )}

      {/* Question-By-Question Detailed Breakdown */}
      {questionBreakdown ? (
        <div className="space-y-4">
          <h2 className="text-sm font-bold text-slate-900 uppercase tracking-wider flex items-center gap-2">
            <FileQuestion className="w-4 h-4 text-indigo-600" />
            Detailed Question Review ({questionBreakdown.length})
          </h2>

          <div className="space-y-3">
            {questionBreakdown.map((q, idx) => {
              const isExpanded = expandedQuestions[q.questionId] ?? true; // expanded by default
              const isCorrect = q.isCorrect;

              return (
                <div
                  key={q.questionId}
                  className={`bg-white rounded-xl border transition shadow-sm overflow-hidden ${
                    isCorrect ? 'border-emerald-200' : 'border-rose-200'
                  }`}
                >
                  {/* Collapsible Question Bar */}
                  <div
                    onClick={() => toggleQuestionExpand(q.questionId)}
                    className="p-4 cursor-pointer flex items-center justify-between hover:bg-slate-50/50"
                  >
                    <div className="flex items-center gap-3">
                      {isCorrect ? (
                        <CheckCircle className="w-5 h-5 text-emerald-600 shrink-0" />
                      ) : (
                        <XCircle className="w-5 h-5 text-rose-500 shrink-0" />
                      )}
                      <div>
                        <span className="text-xs font-bold text-slate-500 mr-2">Q{idx + 1}.</span>
                        <span className="text-sm font-medium text-slate-900 line-clamp-1">
                          {q.prompt}
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center gap-3">
                      <span
                        className={`text-xs font-bold px-2 py-0.5 rounded ${
                          isCorrect
                            ? 'bg-emerald-50 text-emerald-700'
                            : 'bg-rose-50 text-rose-700'
                        }`}
                      >
                        {q.marksAwarded > 0 ? `+${q.marksAwarded}` : q.marksAwarded} Marks
                      </span>
                      {isExpanded ? (
                        <ChevronUp className="w-4 h-4 text-slate-400" />
                      ) : (
                        <ChevronDown className="w-4 h-4 text-slate-400" />
                      )}
                    </div>
                  </div>

                  {/* Expanded Explanation & Answers */}
                  {isExpanded && (
                    <div className="px-6 pb-6 pt-2 border-t border-slate-100 space-y-4 text-xs">
                      {/* Options Review for MCQ */}
                      {q.options && q.options.length > 0 && (
                        <div className="space-y-2">
                          <span className="text-[11px] font-semibold text-slate-400 block uppercase">
                            Options
                          </span>
                          <div className="space-y-1.5">
                            {q.options.map((opt) => {
                              const wasSelected = q.studentSelectedOptions?.includes(opt.optionId);
                              const isTargetCorrect = Array.isArray(q.correctAnswerKey)
                                ? q.correctAnswerKey.includes(opt.optionId)
                                : q.correctAnswerKey === opt.optionId;

                              return (
                                <div
                                  key={opt.optionId}
                                  className={`p-2.5 rounded-lg border text-xs flex items-center justify-between ${
                                    isTargetCorrect
                                      ? 'bg-emerald-50 border-emerald-300 text-emerald-900 font-semibold'
                                      : wasSelected
                                      ? 'bg-rose-50 border-rose-300 text-rose-900'
                                      : 'bg-slate-50 border-slate-200 text-slate-600'
                                  }`}
                                >
                                  <span>{opt.text}</span>
                                  <div className="flex items-center gap-2">
                                    {wasSelected && (
                                      <span className="text-[10px] uppercase font-bold text-slate-500">
                                        Your Choice
                                      </span>
                                    )}
                                    {isTargetCorrect && (
                                      <span className="text-[10px] uppercase font-bold text-emerald-700">
                                        Correct
                                      </span>
                                    )}
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      )}

                      {/* Short Answer Review */}
                      {q.type === 'SHORT_ANSWER' && (
                        <div className="grid grid-cols-2 gap-4 bg-slate-50 p-3 rounded-lg border border-slate-200">
                          <div>
                            <span className="text-[10px] text-slate-400 block uppercase font-semibold">
                              Your Answer
                            </span>
                            <span className="font-mono text-xs font-semibold text-slate-800">
                              {q.studentTextAnswer || '(Unanswered)'}
                            </span>
                          </div>
                          <div>
                            <span className="text-[10px] text-slate-400 block uppercase font-semibold">
                              Expected Answer
                            </span>
                            <span className="font-mono text-xs font-semibold text-emerald-700">
                              {q.correctAnswerKey}
                            </span>
                          </div>
                        </div>
                      )}

                      {/* Explanation */}
                      {q.explanation && (
                        <div className="bg-indigo-50/60 rounded-lg p-3.5 border border-indigo-100 space-y-1">
                          <span className="text-[11px] font-bold text-indigo-900 uppercase block">
                            Explanation
                          </span>
                          <p className="text-slate-700 leading-relaxed font-sans">{q.explanation}</p>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      ) : (
        /* Explanations Protected Alert */
        <div className="bg-slate-50 border border-slate-200 rounded-xl p-6 text-center space-y-2">
          <HelpCircle className="w-8 h-8 text-slate-400 mx-auto" />
          <h3 className="text-sm font-semibold text-slate-900">Detailed Answer Review Hidden</h3>
          <p className="text-xs text-slate-500 max-w-md mx-auto">
            Per the assessment policy established by placement coordinators, detailed question keys and explanations are not visible for this test.
          </p>
        </div>
      )}
    </div>
  );
}
