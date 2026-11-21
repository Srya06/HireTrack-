import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  MessageSquare,
  Bot,
  UserCheck,
  Sparkles,
  Clock,
  HelpCircle,
  Award,
  ArrowRight,
  RotateCcw,
  Eye,
  History,
  ShieldCheck,
  AlertCircle,
  Loader2
} from 'lucide-react';
import Button from '../../components/Button.jsx';
import Card from '../../components/Card.jsx';
import StatusBadge from '../../components/StatusBadge.jsx';
import * as aiInterviewService from '../../services/aiInterview.service.js';

export default function MockInterviewsLanding() {
  const navigate = useNavigate();
  const [selectedPath, setSelectedPath] = useState('ai'); // 'ai' | 'human'
  const [activeTab, setActiveTab] = useState('tracks'); // 'tracks' | 'history'
  const [tracks, setTracks] = useState([]);
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [startingTrackId, setStartingTrackId] = useState(null);
  const [error, setError] = useState(null);

  const loadData = async () => {
    setLoading(true);
    setError(null);
    try {
      const [tracksRes, histRes] = await Promise.allSettled([
        aiInterviewService.getActiveAiTracks({ limit: 50 }),
        aiInterviewService.getStudentHistory({ limit: 50 })
      ]);

      if (tracksRes.status === 'fulfilled' && tracksRes.value?.data) {
        const items = Array.isArray(tracksRes.value.data.data)
          ? tracksRes.value.data.data
          : tracksRes.value.data.items || [];
        setTracks(items);
      }

      if (histRes.status === 'fulfilled' && histRes.value?.data) {
        const histData = Array.isArray(histRes.value.data.data)
          ? histRes.value.data.data
          : histRes.value.data.items || [];
        setHistory(histData);
      }
    } catch (err) {
      setError(err.message || 'Failed to load interview tracks');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleStartInterview = async (trackId) => {
    setStartingTrackId(trackId);
    setError(null);
    try {
      const res = await aiInterviewService.startAiSession(trackId);
      const sessionData = res.data?.data?.session || res.data?.data;
      if (sessionData?._id) {
        navigate(`/student/mock-interviews/ai/${sessionData._id}`);
      } else {
        throw new Error('Failed to start interview session');
      }
    } catch (err) {
      setError(err.message || 'Unable to start AI interview');
      setStartingTrackId(null);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
          <MessageSquare className="w-7 h-7 text-indigo-600" />
          Mock Interviews & Practice Sessions
        </h1>
        <p className="text-sm text-slate-500 mt-1">
          Role-specific mock interviews with safe AI interactive evaluation and structured practice guidance.
        </p>
      </div>

      {/* Two-Path Selection Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        {/* Path 1: AI Mock Interview (Active) */}
        <div
          onClick={() => setSelectedPath('ai')}
          className={`p-6 rounded-xl border-2 cursor-pointer transition flex flex-col justify-between ${
            selectedPath === 'ai'
              ? 'border-indigo-600 bg-indigo-50/40 shadow-sm'
              : 'border-slate-200 bg-white hover:border-slate-300'
          }`}
        >
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div className="w-10 h-10 rounded-lg bg-indigo-600 text-white flex items-center justify-center">
                <Bot className="w-5 h-5" />
              </div>
              <span className="text-xs font-bold px-2.5 py-1 rounded-full bg-indigo-100 text-indigo-800 flex items-center gap-1">
                <Sparkles className="w-3 h-3 text-indigo-600" /> Instant & On-Demand
              </span>
            </div>

            <div>
              <h3 className="text-lg font-bold text-slate-900">AI Mock Interview</h3>
              <p className="text-xs text-slate-600 mt-1 leading-relaxed">
                Practice technical, system design, and behavioral questions with an intelligent, role-aware AI interviewer. Instant structured feedback and rubric scoring.
              </p>
            </div>

            <div className="text-[11px] text-slate-500 space-y-1 pt-1">
              <span className="flex items-center gap-1.5">
                <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" /> Safe prompting • Zero personal data sent
              </span>
              <span className="flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5 text-indigo-600" /> Bounded turns & objective rubric evaluation
              </span>
            </div>
          </div>

          <div className="pt-4 mt-2 border-t border-slate-100">
            <Button
              size="sm"
              variant={selectedPath === 'ai' ? 'primary' : 'outline'}
              className="w-full"
            >
              Select AI Practice &rarr;
            </Button>
          </div>
        </div>

        {/* Path 2: Human Mock Interview (Coming in V9) */}
        <div className="p-6 rounded-xl border-2 border-slate-200 bg-slate-50/70 opacity-90 flex flex-col justify-between relative overflow-hidden">
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div className="w-10 h-10 rounded-lg bg-slate-200 text-slate-600 flex items-center justify-center">
                <UserCheck className="w-5 h-5" />
              </div>
              <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-amber-100 text-amber-800 border border-amber-200">
                Coming in V9
              </span>
            </div>

            <div>
              <h3 className="text-lg font-bold text-slate-700">Human Mock Interview</h3>
              <p className="text-xs text-slate-500 mt-1 leading-relaxed">
                Live 1:1 practice sessions scheduled with verified alumni, senior placement coordinators, and peer interviewers.
              </p>
            </div>

            <div className="rounded-lg bg-amber-50/80 border border-amber-200 p-3 text-xs text-amber-800">
              Peer and alumni scheduling, slots management, and human interviewer rubrics will be enabled in <strong>Chunk V9</strong>.
            </div>
          </div>

          <div className="pt-4 mt-2 border-t border-slate-200">
            <Button size="sm" variant="secondary" className="w-full" disabled>
              Available in Chunk V9
            </Button>
          </div>
        </div>
      </div>

      {/* Tabs: Available AI Tracks vs History */}
      <div className="flex items-center justify-between border-b border-slate-200 pb-3 pt-2">
        <div className="inline-flex rounded-lg border border-slate-200 bg-slate-50 p-1">
          <button
            type="button"
            onClick={() => setActiveTab('tracks')}
            className={`px-4 py-1.5 text-xs font-semibold rounded-md transition ${
              activeTab === 'tracks'
                ? 'bg-white text-indigo-600 shadow-sm'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Available Practice Tracks ({tracks.length})
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
            My AI History ({history.length})
          </button>
        </div>

        <span className="text-xs text-slate-400">
          Daily Limit: Max 5 sessions/day
        </span>
      </div>

      {error && (
        <div className="p-4 bg-rose-50 border border-rose-200 rounded-lg text-rose-800 text-xs flex items-center gap-2">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {loading ? (
        <div className="flex flex-col items-center justify-center py-16 space-y-3">
          <Loader2 className="w-8 h-8 animate-spin text-indigo-600" />
          <p className="text-xs text-slate-500 font-medium">Loading interview tracks & sessions...</p>
        </div>
      ) : activeTab === 'tracks' ? (
        /* Tracks Grid */
        tracks.length === 0 ? (
          <div className="text-center py-16 bg-white rounded-xl border border-dashed border-slate-200 p-8 space-y-3">
            <Bot className="w-10 h-10 text-slate-300 mx-auto" />
            <h3 className="text-sm font-semibold text-slate-900">No active AI tracks configured</h3>
            <p className="text-xs text-slate-500 max-w-sm mx-auto">
              Placement coordinators set up role-specific practice tracks with tailored rubrics. Check back shortly.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {tracks.map((track) => {
              const trackId = track._id || track.id;
              const isStarting = startingTrackId === trackId;
              const qConfig = track.questionConfig || {};

              return (
                <div
                  key={trackId}
                  className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm hover:shadow-md transition flex flex-col justify-between"
                >
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-semibold px-2 py-0.5 rounded bg-indigo-50 text-indigo-700">
                        {track.roleCategory}
                      </span>
                      <span className="text-[11px] text-slate-400 font-medium flex items-center gap-1">
                        <Clock className="w-3 h-3 text-slate-400" />
                        ~{qConfig.maxQuestions || 5} Questions
                      </span>
                    </div>

                    <div>
                      <h3 className="text-base font-bold text-slate-900 line-clamp-1">{track.title}</h3>
                      <p className="text-xs text-slate-500 mt-1 line-clamp-2">
                        {track.description || 'Practice your domain knowledge, structure, and communication skills.'}
                      </p>
                    </div>

                    {/* Rubric dimensions chips */}
                    <div className="pt-2 border-t border-slate-100">
                      <span className="text-[10px] uppercase font-bold text-slate-400 block mb-1.5">
                        EVALUATION RUBRIC
                      </span>
                      <div className="flex flex-wrap gap-1.5">
                        {(track.rubricConfig || []).map((r, i) => (
                          <span
                            key={i}
                            className="text-[11px] px-2 py-0.5 rounded bg-slate-100 text-slate-700 font-medium"
                          >
                            {r.dimension}
                          </span>
                        ))}
                      </div>
                    </div>
                  </div>

                  <div className="mt-5 pt-3">
                    <Button
                      size="sm"
                      disabled={isStarting}
                      onClick={() => handleStartInterview(trackId)}
                      className="w-full bg-indigo-600 hover:bg-indigo-700 text-white flex items-center justify-center gap-1.5"
                    >
                      {isStarting ? (
                        <>
                          <Loader2 className="w-4 h-4 animate-spin" /> Initializing...
                        </>
                      ) : (
                        <>
                          Start AI Interview <ArrowRight className="w-4 h-4" />
                        </>
                      )}
                    </Button>
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
            <h3 className="text-sm font-semibold text-slate-900">No interview history yet</h3>
            <p className="text-xs text-slate-500 max-w-sm mx-auto">
              Once you practice with AI interview tracks, your transcripts, scores, and practice feedback will appear here.
            </p>
          </div>
        ) : (
          <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-sm">
            <table className="min-w-full divide-y divide-slate-200 text-sm">
              <thead className="bg-slate-50 text-slate-600 text-xs uppercase font-medium">
                <tr>
                  <th className="px-6 py-3.5 text-left">Track / Role</th>
                  <th className="px-6 py-3.5 text-left">Date</th>
                  <th className="px-6 py-3.5 text-left">Status</th>
                  <th className="px-6 py-3.5 text-left">Score</th>
                  <th className="px-6 py-3.5 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {history.map((sess) => {
                  const sessId = sess._id || sess.id;
                  const isDone = sess.status === 'COMPLETED';
                  const isInProgress = sess.status === 'IN_PROGRESS';
                  const evalData = sess.evaluation;

                  return (
                    <tr key={sessId} className="hover:bg-slate-50/60 transition">
                      <td className="px-6 py-4 font-semibold text-slate-900">
                        {sess.trackId?.title || 'Practice Session'}
                        <span className="text-xs text-slate-400 block font-normal">
                          {sess.trackId?.roleCategory || 'AI Mock'}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-xs text-slate-500">
                        {new Date(sess.startedAt).toLocaleString([], {
                          dateStyle: 'medium',
                          timeStyle: 'short'
                        })}
                      </td>
                      <td className="px-6 py-4">
                        <span
                          className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold ${
                            isDone
                              ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                              : isInProgress
                              ? 'bg-amber-50 text-amber-700 border border-amber-200'
                              : 'bg-rose-50 text-rose-700 border border-rose-200'
                          }`}
                        >
                          {sess.status}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        {evalData ? (
                          <div className="flex items-baseline gap-1.5">
                            <span className="font-bold text-slate-900">{evalData.overallScore}</span>
                            <span className="text-xs text-slate-400">/ {evalData.maxScore}</span>
                            <span className="text-xs font-semibold text-indigo-600">
                              ({evalData.percentage}%)
                            </span>
                          </div>
                        ) : (
                          <span className="text-xs text-slate-400">--</span>
                        )}
                      </td>
                      <td className="px-6 py-4 text-right">
                        {isDone ? (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => navigate(`/student/mock-interviews/ai/${sessId}/feedback`)}
                            className="inline-flex items-center gap-1"
                          >
                            <Eye className="w-3.5 h-3.5" /> View Feedback
                          </Button>
                        ) : isInProgress ? (
                          <Button
                            size="sm"
                            onClick={() => navigate(`/student/mock-interviews/ai/${sessId}`)}
                            className="bg-amber-600 hover:bg-amber-700 text-white"
                          >
                            Resume &rarr;
                          </Button>
                        ) : (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => navigate(`/student/mock-interviews/ai/${sessId}/feedback`)}
                          >
                            View Error / Retry
                          </Button>
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
