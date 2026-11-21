import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import {
  Award,
  CheckCircle2,
  AlertTriangle,
  ArrowLeft,
  ChevronDown,
  ChevronUp,
  RotateCcw,
  Bot,
  User,
  Sparkles,
  HelpCircle,
  ShieldAlert,
  Loader2,
  FileText
} from 'lucide-react';
import Button from '../../components/Button.jsx';
import Card from '../../components/Card.jsx';
import * as aiInterviewService from '../../services/aiInterview.service.js';

export default function AiInterviewFeedback() {
  const { sessionId } = useParams();

  const [session, setSession] = useState(null);
  const [evaluation, setEvaluation] = useState(null);
  const [turns, setTurns] = useState([]);
  const [showTranscript, setShowTranscript] = useState(false);
  const [loading, setLoading] = useState(true);
  const [retrying, setRetrying] = useState(false);
  const [error, setError] = useState(null);

  const loadFeedbackData = async () => {
    setLoading(true);
    setError(null);
    try {
      const [feedbackRes, transcriptRes] = await Promise.allSettled([
        aiInterviewService.getSessionFeedback(sessionId),
        aiInterviewService.getSessionTranscript(sessionId)
      ]);

      if (feedbackRes.status === 'fulfilled' && feedbackRes.value?.data) {
        const data = feedbackRes.value.data.data;
        setSession(data);
        setEvaluation(data.evaluation);
      } else if (feedbackRes.status === 'rejected') {
        setError(feedbackRes.reason?.message || 'Failed to load feedback');
      }

      if (transcriptRes.status === 'fulfilled' && transcriptRes.value?.data) {
        setTurns(transcriptRes.value.data.data?.turns || []);
      }
    } catch (err) {
      setError(err.message || 'Error loading interview evaluation');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadFeedbackData();
  }, [sessionId]);

  const handleRetryEvaluation = async () => {
    setRetrying(true);
    setError(null);
    try {
      const res = await aiInterviewService.retryEvaluation(sessionId);
      if (res.data?.data) {
        setEvaluation(res.data.data);
        if (session) {
          setSession({ ...session, status: 'COMPLETED', evaluation: res.data.data });
        }
      }
    } catch (err) {
      setError(err.message || 'Retry evaluation failed. Please try again later.');
    } finally {
      setRetrying(false);
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[50vh] space-y-3">
        <Loader2 className="w-8 h-8 animate-spin text-indigo-600" />
        <p className="text-xs text-slate-500 font-medium">Generating structured feedback & rubric scoring...</p>
      </div>
    );
  }

  const isFailed = session?.status === 'FAILED' || session?.status === 'INTERRUPTED';

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Navigation header */}
      <div className="flex items-center justify-between">
        <Link
          to="/student/mock-interviews"
          className="inline-flex items-center text-xs font-semibold text-slate-500 hover:text-slate-900 gap-1.5"
        >
          <ArrowLeft className="w-4 h-4" /> Back to Mock Interviews
        </Link>

        <span className="text-xs text-slate-400">
          Session ID: <code className="font-mono text-[11px]">{sessionId}</code>
        </span>
      </div>

      {/* Outage / Failure Banner with Controlled Retry */}
      {isFailed && !evaluation && (
        <div className="bg-rose-50 border border-rose-200 rounded-xl p-6 text-center space-y-3">
          <ShieldAlert className="w-10 h-10 text-rose-500 mx-auto" />
          <h2 className="text-base font-bold text-rose-900">Evaluation Interrupted</h2>
          <p className="text-xs text-rose-700 max-w-md mx-auto">
            {session?.errorDetails || 'The AI evaluation service encountered a temporary issue. Your interview transcript is preserved intact.'}
          </p>
          <div className="pt-2 flex justify-center gap-3">
            <Button
              size="sm"
              disabled={retrying}
              onClick={handleRetryEvaluation}
              className="bg-rose-600 hover:bg-rose-700 text-white flex items-center gap-1.5"
            >
              {retrying ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" /> Retrying Evaluation...
                </>
              ) : (
                <>
                  <RotateCcw className="w-4 h-4" /> Retry Evaluation
                </>
              )}
            </Button>
          </div>
        </div>
      )}

      {/* Main Scorecard Header */}
      {evaluation && (
        <>
          <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-sm">
            <div
              className={`p-6 text-white ${evaluation.passed
                ? 'bg-gradient-to-r from-emerald-600 to-teal-700'
                : 'bg-gradient-to-r from-slate-700 to-slate-900'
                }`}
            >
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                  <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-white/20 text-white inline-block mb-2">
                    {evaluation.passed ? 'Ready for Campus Drives' : 'Practice Recommended'}
                  </span>
                  <h1 className="text-2xl font-bold">{session?.track?.title || 'AI Mock Interview'}</h1>
                  <p className="text-xs text-white/80 mt-1">
                    Role Category: <strong>{session?.track?.roleCategory}</strong> • Practice Evaluation Complete
                  </p>
                </div>

                <div className="bg-white/10 backdrop-blur-md rounded-xl p-4 border border-white/20 text-center min-w-[140px]">
                  <span className="text-[11px] uppercase tracking-wider text-white/80 block">
                    Rubric Score
                  </span>
                  <div className="text-3xl font-extrabold mt-0.5">
                    {evaluation.overallScore}{' '}
                    <span className="text-lg font-normal text-white/70">/ {evaluation.maxScore}</span>
                  </div>
                  <span className="text-xs font-bold text-white/90 block mt-1">
                    {evaluation.percentage}% Overall Rating
                  </span>
                </div>
              </div>
            </div>

            {/* Mandatory Practice Disclaimer Alert */}
            <div className="bg-amber-50 border-t border-amber-200 px-6 py-3 flex items-center gap-2 text-xs text-amber-900 font-medium">
              <Sparkles className="w-4 h-4 text-amber-600 shrink-0" />
              <span>
                <strong>Official Practice Notice:</strong> {evaluation.disclaimer || 'AI-generated practice guidance, not an employer decision.'}
              </span>
            </div>
          </div>

          {/* Feedback Summary Card */}
          <Card title="Interviewer Performance Summary">
            <p className="text-xs sm:text-sm text-slate-700 leading-relaxed font-sans">
              {evaluation.feedbackSummary}
            </p>
          </Card>

          {/* Rubric Dimensions Breakdown */}
          {evaluation.dimensionScores && evaluation.dimensionScores.length > 0 && (
            <div className="space-y-4">
              <h2 className="text-sm font-bold text-slate-900 uppercase tracking-wider">
                Rubric Dimension Breakdown
              </h2>

              <div className="grid grid-cols-1 gap-4">
                {evaluation.dimensionScores.map((dim, idx) => {
                  const dimPct =
                    dim.maxScore > 0 ? Math.round((dim.score / dim.maxScore) * 100) : 0;

                  return (
                    <div
                      key={idx}
                      className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm space-y-3"
                    >
                      <div className="flex items-center justify-between">
                        <h3 className="text-sm font-bold text-slate-900">{dim.dimension}</h3>
                        <span className="text-xs font-bold px-2.5 py-0.5 rounded bg-indigo-50 text-indigo-700">
                          {dim.score} / {dim.maxScore} marks ({dimPct}%)
                        </span>
                      </div>

                      {/* Progress bar */}
                      <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden">
                        <div
                          className={`h-full transition-all duration-300 ${dimPct >= 70
                            ? 'bg-emerald-500'
                            : dimPct >= 50
                              ? 'bg-amber-500'
                              : 'bg-rose-500'
                            }`}
                          style={{ width: `${Math.min(100, Math.max(0, dimPct))}%` }}
                        />
                      </div>

                      {/* Strengths & Improvements */}
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2 text-xs">
                        {dim.strengths?.length > 0 && (
                          <div className="bg-emerald-50/50 rounded-lg p-3 border border-emerald-100 space-y-1">
                            <span className="font-bold text-emerald-900 block flex items-center gap-1">
                              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" /> Key Strengths
                            </span>
                            <ul className="list-disc list-inside text-emerald-800 space-y-0.5">
                              {dim.strengths.map((s, i) => (
                                <li key={i}>{s}</li>
                              ))}
                            </ul>
                          </div>
                        )}

                        {dim.improvements?.length > 0 && (
                          <div className="bg-amber-50/50 rounded-lg p-3 border border-amber-100 space-y-1">
                            <span className="font-bold text-amber-900 block flex items-center gap-1">
                              <AlertTriangle className="w-3.5 h-3.5 text-amber-600" /> Focus Areas
                            </span>
                            <ul className="list-disc list-inside text-amber-800 space-y-0.5">
                              {dim.improvements.map((imp, i) => (
                                <li key={i}>{imp}</li>
                              ))}
                            </ul>
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Actionable Recommendations */}
          {evaluation.recommendations && evaluation.recommendations.length > 0 && (
            <Card title="Actionable Practice Recommendations">
              <ul className="space-y-2 text-xs text-slate-700">
                {evaluation.recommendations.map((rec, i) => (
                  <li key={i} className="flex items-start gap-2">
                    <Sparkles className="w-3.5 h-3.5 text-indigo-600 shrink-0 mt-0.5" />
                    <span>{rec}</span>
                  </li>
                ))}
              </ul>
            </Card>
          )}
        </>
      )}

      {/* Collapsible Transcript Viewer */}
      {turns.length > 0 && (
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
          <button
            type="button"
            onClick={() => setShowTranscript((prev) => !prev)}
            className="w-full p-4 flex items-center justify-between hover:bg-slate-50 transition text-left"
          >
            <div className="flex items-center gap-2">
              <FileText className="w-4 h-4 text-indigo-600" />
              <span className="text-xs font-bold text-slate-900 uppercase tracking-wider">
                Interview Transcript ({turns.length} turns)
              </span>
            </div>
            {showTranscript ? (
              <ChevronUp className="w-4 h-4 text-slate-400" />
            ) : (
              <ChevronDown className="w-4 h-4 text-slate-400" />
            )}
          </button>

          {showTranscript && (
            <div className="p-4 border-t border-slate-100 bg-slate-50/50 space-y-3">
              {turns.map((t, i) => (
                <div key={i} className="text-xs p-3 rounded-lg bg-white border border-slate-200 space-y-1">
                  <div className="flex items-center justify-between font-bold text-[11px] text-slate-500">
                    <span className="flex items-center gap-1.5">
                      {t.speaker === 'AI' ? (
                        <Bot className="w-3.5 h-3.5 text-indigo-600" />
                      ) : (
                        <User className="w-3.5 h-3.5 text-slate-600" />
                      )}
                      {t.speaker === 'AI' ? 'Interviewer' : 'Candidate'}
                    </span>
                    <span>Turn {t.turnNumber}</span>
                  </div>
                  <p className="text-slate-800 whitespace-pre-wrap">{t.content}</p>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

