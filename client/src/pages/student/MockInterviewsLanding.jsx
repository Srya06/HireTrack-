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
  Loader2,
  Calendar,
  Video,
  XCircle,
  CheckCircle2
} from 'lucide-react';
import Button from '../../components/Button.jsx';
import Card from '../../components/Card.jsx';
import StatusBadge from '../../components/StatusBadge.jsx';
import { useFeatureFlags } from '../../context/FeatureFlagsContext.jsx';
import * as aiInterviewService from '../../services/aiInterview.service.js';
import humanInterviewService from '../../services/humanInterview.service.js';

export default function MockInterviewsLanding() {
  const navigate = useNavigate();
  const { flags } = useFeatureFlags();
  const isHumanEnabled = Boolean(flags?.V3_HUMAN_INTERVIEWS_ENABLED);

  const [selectedPath, setSelectedPath] = useState('ai'); // 'ai' | 'human'
  const [activeTab, setActiveTab] = useState('items'); // 'items' | 'history'

  // AI State
  const [tracks, setTracks] = useState([]);
  const [aiHistory, setAiHistory] = useState([]);
  const [startingTrackId, setStartingTrackId] = useState(null);

  // Human State
  const [slots, setSlots] = useState([]);
  const [humanHistory, setHumanHistory] = useState([]);
  const [bookingSlot, setBookingSlot] = useState(null);
  const [bookingNotes, setBookingNotes] = useState('');
  const [submittingBooking, setSubmittingBooking] = useState(false);
  const [selectedFeedback, setSelectedFeedback] = useState(null);
  const [loadingFeedback, setLoadingFeedback] = useState(false);
  const [cancellingBookingId, setCancellingBookingId] = useState(null);
  const [cancellationReason, setCancellationReason] = useState('');

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [successMessage, setSuccessMessage] = useState(null);

  const loadData = async () => {
    setLoading(true);
    setError(null);
    try {
      const promises = [
        aiInterviewService.getActiveAiTracks({ limit: 50 }),
        aiInterviewService.getStudentHistory({ limit: 50 })
      ];

      if (isHumanEnabled) {
        promises.push(
          humanInterviewService.getAvailableSlots({ limit: 50 }),
          humanInterviewService.getMyBookings({ limit: 50 })
        );
      }

      const results = await Promise.allSettled(promises);
      const tracksRes = results[0];
      const aiHistRes = results[1];
      const slotsRes = isHumanEnabled ? results[2] : null;
      const humanHistRes = isHumanEnabled ? results[3] : null;

      if (tracksRes && tracksRes.status === 'fulfilled' && tracksRes.value) {
        const val = tracksRes.value;
        const items = Array.isArray(val?.data?.items)
          ? val.data.items
          : Array.isArray(val?.data?.data)
          ? val.data.data
          : Array.isArray(val?.data)
          ? val.data
          : Array.isArray(val?.items)
          ? val.items
          : [];
        setTracks(items);
      }

      if (aiHistRes && aiHistRes.status === 'fulfilled' && aiHistRes.value) {
        const val = aiHistRes.value;
        const histData = Array.isArray(val?.data?.items)
          ? val.data.items
          : Array.isArray(val?.data?.data)
          ? val.data.data
          : Array.isArray(val?.data)
          ? val.data
          : Array.isArray(val?.items)
          ? val.items
          : [];
        setAiHistory(histData);
      }

      if (slotsRes && slotsRes.status === 'fulfilled' && slotsRes.value) {
        const val = slotsRes.value;
        const sData = Array.isArray(val?.data?.items)
          ? val.data.items
          : Array.isArray(val?.data?.data)
          ? val.data.data
          : Array.isArray(val?.data)
          ? val.data
          : Array.isArray(val?.items)
          ? val.items
          : [];
        setSlots(sData);
      }

      if (humanHistRes && humanHistRes.status === 'fulfilled' && humanHistRes.value) {
        const val = humanHistRes.value;
        const hData = Array.isArray(val?.data?.items)
          ? val.data.items
          : Array.isArray(val?.data?.data)
          ? val.data.data
          : Array.isArray(val?.data)
          ? val.data
          : Array.isArray(val?.items)
          ? val.items
          : [];
        setHumanHistory(hData);
      }
    } catch (err) {
      setError(err.message || 'Failed to load interview tracks and slots');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleStartAiInterview = async (trackId) => {
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

  const handleConfirmBooking = async () => {
    if (!bookingSlot) return;
    setSubmittingBooking(true);
    setError(null);
    setSuccessMessage(null);
    try {
      await humanInterviewService.bookSlot({
        slotId: bookingSlot._id || bookingSlot.id,
        notes: bookingNotes
      });
      setSuccessMessage('Interview slot booked successfully! View your session details under "My Sessions".');
      setBookingSlot(null);
      setBookingNotes('');
      await loadData();
    } catch (err) {
      setError(err.response?.data?.message || err.message || 'Failed to book slot');
    } finally {
      setSubmittingBooking(false);
    }
  };

  const handleCancelBooking = async () => {
    if (!cancellingBookingId) return;
    try {
      await humanInterviewService.cancelBooking(cancellingBookingId, {
        reason: cancellationReason || 'Cancelled by student'
      });
      setSuccessMessage('Interview booking cancelled successfully. The slot has been released.');
      setCancellingBookingId(null);
      setCancellationReason('');
      await loadData();
    } catch (err) {
      setError(err.response?.data?.message || err.message || 'Unable to cancel booking');
    }
  };

  const handleViewFeedback = async (bookingId) => {
    setLoadingFeedback(true);
    setError(null);
    try {
      const res = await humanInterviewService.getBookingFeedback(bookingId);
      setSelectedFeedback(res.data?.data || res.data);
    } catch (err) {
      setError(err.response?.data?.message || err.message || 'Feedback is not yet released by staff.');
    } finally {
      setLoadingFeedback(false);
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
          Prepare with intelligent AI role simulations or schedule 1:1 live practice sessions with verified experts.
        </p>
      </div>

      {/* Global Alerts */}
      {error && (
        <div className="p-4 rounded-lg bg-rose-50 border border-rose-200 text-rose-800 text-sm flex items-start gap-2.5">
          <AlertCircle className="w-5 h-5 text-rose-600 flex-shrink-0 mt-0.5" />
          <div className="flex-1">
            <p className="font-semibold">Notice</p>
            <p className="text-xs mt-0.5 text-rose-700">{error}</p>
          </div>
          <button onClick={() => setError(null)} className="text-rose-500 hover:text-rose-800 text-sm font-bold">
            &times;
          </button>
        </div>
      )}

      {successMessage && (
        <div className="p-4 rounded-lg bg-emerald-50 border border-emerald-200 text-emerald-800 text-sm flex items-center justify-between">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-5 h-5 text-emerald-600" />
            <span>{successMessage}</span>
          </div>
          <button onClick={() => setSuccessMessage(null)} className="text-emerald-700 hover:text-emerald-900 font-bold">
            &times;
          </button>
        </div>
      )}

      {/* Two-Path Selection Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        {/* Path 1: AI Mock Interview (Active) */}
        <div
          onClick={() => {
            setSelectedPath('ai');
            setActiveTab('items');
          }}
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

        {/* Path 2: Human Mock Interview (Chunk V9 Active when enabled) */}
        <div
          onClick={() => {
            if (!isHumanEnabled) return;
            setSelectedPath('human');
            setActiveTab('items');
          }}
          className={`p-6 rounded-xl border-2 transition flex flex-col justify-between ${
            !isHumanEnabled
              ? 'border-slate-200 bg-slate-50/60 opacity-80 cursor-not-allowed'
              : selectedPath === 'human'
              ? 'border-emerald-600 bg-emerald-50/40 shadow-sm cursor-pointer'
              : 'border-slate-200 bg-white hover:border-slate-300 cursor-pointer'
          }`}
        >
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div className="w-10 h-10 rounded-lg bg-emerald-600 text-white flex items-center justify-center">
                <UserCheck className="w-5 h-5" />
              </div>
              {!isHumanEnabled ? (
                <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-amber-100 text-amber-800 flex items-center gap-1">
                  Coming in V9
                </span>
              ) : (
                <span className="text-xs font-bold px-2.5 py-1 rounded-full bg-emerald-100 text-emerald-800 flex items-center gap-1">
                  <UserCheck className="w-3 h-3 text-emerald-600" /> 1:1 Live Expert
                </span>
              )}
            </div>

            <div>
              <h3 className="text-lg font-bold text-slate-900">Human Mock Interview</h3>
              <p className="text-xs text-slate-600 mt-1 leading-relaxed">
                Schedule live 1:1 practice sessions with verified alumni, placement coordinators, and peer interviewers. Real-time feedback and staff-released rubrics.
              </p>
            </div>

            <div className="text-[11px] text-slate-500 space-y-1 pt-1">
              <span className="flex items-center gap-1.5">
                <Calendar className="w-3.5 h-3.5 text-emerald-600" /> Concurrency-safe slot scheduling
              </span>
              <span className="flex items-center gap-1.5">
                <Award className="w-3.5 h-3.5 text-amber-600" /> Verified rubric scoring & staff evaluation release
              </span>
            </div>
          </div>

          <div className="pt-4 mt-2 border-t border-slate-100">
            <Button
              size="sm"
              variant={selectedPath === 'human' ? 'primary' : 'outline'}
              disabled={!isHumanEnabled}
              className="w-full"
            >
              {!isHumanEnabled ? 'Coming Soon' : 'Select Human 1:1 Practice \u2192'}
            </Button>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex items-center justify-between border-b border-slate-200 pb-3 pt-2">
        <div className="inline-flex rounded-lg border border-slate-200 bg-slate-50 p-1">
          <button
            type="button"
            onClick={() => setActiveTab('items')}
            className={`px-4 py-1.5 text-xs font-semibold rounded-md transition ${
              activeTab === 'items'
                ? 'bg-white text-indigo-600 shadow-sm'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            {selectedPath === 'ai' ? `Available Practice Tracks (${tracks.length})` : `Available Interview Slots (${slots.length})`}
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
            {selectedPath === 'ai' ? `My AI History (${aiHistory.length})` : `My Human Sessions (${humanHistory.length})`}
          </button>
        </div>

        <button
          type="button"
          onClick={loadData}
          disabled={loading}
          className="text-xs font-medium text-slate-500 hover:text-slate-800 flex items-center gap-1"
        >
          <RotateCcw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
          Refresh
        </button>
      </div>

      {/* PATH 1: AI MOCK INTERVIEW VIEW */}
      {selectedPath === 'ai' && (
        <>
          {activeTab === 'items' ? (
            <div>
              {loading && tracks.length === 0 ? (
                <div className="py-12 text-center text-slate-400 flex flex-col items-center justify-center gap-2">
                  <Loader2 className="w-8 h-8 animate-spin text-indigo-500" />
                  <p className="text-xs">Loading available practice tracks...</p>
                </div>
              ) : tracks.length === 0 ? (
                <Card className="text-center py-12">
                  <Bot className="w-12 h-12 text-slate-300 mx-auto mb-3" />
                  <h3 className="text-sm font-semibold text-slate-700">No practice tracks published yet</h3>
                  <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">
                    Placement staff haven't published any active interview tracks for your campus yet. Check back soon.
                  </p>
                </Card>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                  {tracks.map((track) => (
                    <Card key={track._id || track.id} className="flex flex-col justify-between hover:shadow-md transition">
                      <div className="space-y-3">
                        <div className="flex items-start justify-between gap-2">
                          <div>
                            <span className="text-[10px] font-bold uppercase tracking-wider text-indigo-700 bg-indigo-50 px-2 py-0.5 rounded">
                              {track.roleCategory || 'General'}
                            </span>
                            <h3 className="text-base font-bold text-slate-900 mt-1">{track.title}</h3>
                          </div>
                        </div>

                        <p className="text-xs text-slate-600 line-clamp-3">
                          {track.description || 'Practice role-specific interview questions with instant evaluation.'}
                        </p>

                        <div className="text-[11px] text-slate-500 flex items-center gap-3 pt-1 border-t border-slate-100">
                          <span className="flex items-center gap-1">
                            <HelpCircle className="w-3.5 h-3.5 text-slate-400" />
                            {track.questionConfig?.maxQuestions || 5} Questions
                          </span>
                          <span className="flex items-center gap-1">
                            <Clock className="w-3.5 h-3.5 text-slate-400" />
                            ~15 mins
                          </span>
                        </div>
                      </div>

                      <div className="pt-4 mt-2">
                        <Button
                          size="sm"
                          variant="primary"
                          className="w-full flex items-center justify-center gap-1.5"
                          disabled={startingTrackId === (track._id || track.id)}
                          onClick={() => handleStartAiInterview(track._id || track.id)}
                        >
                          {startingTrackId === (track._id || track.id) ? (
                            <>
                              <Loader2 className="w-4 h-4 animate-spin" /> Preparing AI Session...
                            </>
                          ) : (
                            <>
                              Start AI Interview <ArrowRight className="w-4 h-4" />
                            </>
                          )}
                        </Button>
                      </div>
                    </Card>
                  ))}
                </div>
              )}
            </div>
          ) : (
            <div>
              {aiHistory.length === 0 ? (
                <Card className="text-center py-12">
                  <History className="w-12 h-12 text-slate-300 mx-auto mb-3" />
                  <h3 className="text-sm font-semibold text-slate-700">No AI interview history</h3>
                  <p className="text-xs text-slate-500 mt-1">
                    You haven't completed any AI mock interviews yet. Start one from the available practice tracks.
                  </p>
                </Card>
              ) : (
                <div className="space-y-3">
                  {aiHistory.map((item) => (
                    <Card key={item._id || item.id} className="p-4 flex items-center justify-between">
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <h4 className="text-sm font-bold text-slate-900">{item.trackTitle || item.trackId?.title || 'AI Mock Interview'}</h4>
                          <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200">
                            {item.status}
                          </span>
                        </div>
                        <p className="text-xs text-slate-500">
                          Started: {new Date(item.startedAt).toLocaleString()} • {item.turnCount || 0} turns
                        </p>
                      </div>
                      <div className="flex items-center gap-3">
                        {item.evaluation?.overallScore !== undefined && (
                          <div className="text-right">
                            <span className="text-xs text-slate-500 block">Score</span>
                            <span className="text-base font-bold text-indigo-600">
                              {item.evaluation.overallScore}{' '}
                              {item.evaluation.percentage !== undefined && (
                                <span className="text-xs text-slate-500 font-normal">
                                  ({item.evaluation.percentage}%)
                                </span>
                              )}
                            </span>
                          </div>
                        )}
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => {
                            if (item.status === 'COMPLETED') {
                              navigate(`/student/mock-interviews/ai/${item._id || item.id}/feedback`);
                            } else {
                              navigate(`/student/mock-interviews/ai/${item._id || item.id}`);
                            }
                          }}
                        >
                          {item.status === 'COMPLETED' ? 'View Feedback' : 'Resume'}
                        </Button>
                      </div>
                    </Card>
                  ))}
                </div>
              )}
            </div>
          )}
        </>
      )}

      {/* PATH 2: HUMAN 1:1 MOCK INTERVIEW VIEW (Chunk V9) */}
      {selectedPath === 'human' && (
        <>
          {activeTab === 'items' ? (
            <div>
              {loading && slots.length === 0 ? (
                <div className="py-12 text-center text-slate-400 flex flex-col items-center justify-center gap-2">
                  <Loader2 className="w-8 h-8 animate-spin text-emerald-500" />
                  <p className="text-xs">Loading available interview slots...</p>
                </div>
              ) : slots.length === 0 ? (
                <Card className="text-center py-12">
                  <Calendar className="w-12 h-12 text-slate-300 mx-auto mb-3" />
                  <h3 className="text-sm font-semibold text-slate-700">No open interview slots</h3>
                  <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">
                    Interviewers haven't posted any available slots right now. Check back soon or contact your placement coordinator.
                  </p>
                </Card>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                  {slots.map((slot) => {
                    const start = new Date(slot.startsAt);
                    const end = new Date(slot.endsAt);
                    return (
                      <Card key={slot.id || slot._id} className="flex flex-col justify-between hover:shadow-md transition">
                        <div className="space-y-3">
                          <div className="flex items-start justify-between">
                            <div>
                              <h4 className="text-sm font-bold text-slate-900">{slot.interviewer?.name || 'Verified Interviewer'}</h4>
                              <p className="text-[11px] text-slate-500 mt-0.5">{slot.interviewer?.bio || 'Alumni / Placement Interviewer'}</p>
                            </div>
                            <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-emerald-100 text-emerald-800">
                              Available
                            </span>
                          </div>

                          <div className="rounded-lg bg-slate-50 p-2.5 space-y-1 text-xs text-slate-600 border border-slate-100">
                            <div className="flex items-center gap-1.5">
                              <Calendar className="w-3.5 h-3.5 text-slate-400" />
                              <span>{start.toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' })}</span>
                            </div>
                            <div className="flex items-center gap-1.5">
                              <Clock className="w-3.5 h-3.5 text-slate-400" />
                              <span>
                                {start.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} - {end.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                              </span>
                            </div>
                          </div>

                          {slot.interviewer?.expertise?.length > 0 && (
                            <div className="flex flex-wrap gap-1">
                              {slot.interviewer.expertise.map((exp, idx) => (
                                <span key={idx} className="text-[10px] font-medium bg-slate-100 text-slate-700 px-2 py-0.5 rounded">
                                  {exp}
                                </span>
                              ))}
                            </div>
                          )}
                        </div>

                        <div className="pt-4 mt-2">
                          <Button
                            size="sm"
                            variant="primary"
                            className="w-full flex items-center justify-center gap-1.5 bg-emerald-600 hover:bg-emerald-700 text-white"
                            onClick={() => setBookingSlot(slot)}
                          >
                            <Calendar className="w-3.5 h-3.5" /> Book Interview Slot
                          </Button>
                        </div>
                      </Card>
                    );
                  })}
                </div>
              )}
            </div>
          ) : (
            <div>
              {humanHistory.length === 0 ? (
                <Card className="text-center py-12">
                  <Calendar className="w-12 h-12 text-slate-300 mx-auto mb-3" />
                  <h3 className="text-sm font-semibold text-slate-700">No human mock interview bookings</h3>
                  <p className="text-xs text-slate-500 mt-1">
                    You haven't scheduled any 1:1 human mock interviews yet.
                  </p>
                </Card>
              ) : (
                <div className="space-y-3">
                  {humanHistory.map((item) => {
                    const sessionDate = item.slot?.startsAt ? new Date(item.slot.startsAt) : null;
                    const isUpcoming = item.status === 'SCHEDULED' || item.status === 'REQUESTED';
                    const hasReleasedFeedback = item.feedback?.isReleased;

                    return (
                      <Card key={item.id || item._id} className="p-4 flex flex-col md:flex-row md:items-center justify-between gap-4">
                        <div className="space-y-1">
                          <div className="flex items-center gap-2">
                            <h4 className="text-sm font-bold text-slate-900">
                              Mock Interview with {item.slot?.interviewerName || 'Interviewer'}
                            </h4>
                            <StatusBadge status={item.status} />
                          </div>
                          <p className="text-xs text-slate-500">
                            {sessionDate ? sessionDate.toLocaleString() : 'Date pending'} • Booked {new Date(item.bookedAt).toLocaleDateString()}
                          </p>
                          {item.meetingUrl && (
                            <p className="text-xs text-indigo-600 flex items-center gap-1 pt-0.5">
                              <Video className="w-3.5 h-3.5" />
                              <a href={item.meetingUrl} target="_blank" rel="noopener noreferrer" className="underline hover:text-indigo-800">
                                Join Meeting Link
                              </a>
                            </p>
                          )}
                        </div>

                        <div className="flex items-center gap-2.5">
                          {hasReleasedFeedback ? (
                            <Button
                              size="sm"
                              variant="primary"
                              className="flex items-center gap-1.5"
                              onClick={() => handleViewFeedback(item.id || item._id)}
                            >
                              <Award className="w-3.5 h-3.5" /> View Released Evaluation
                            </Button>
                          ) : item.status === 'COMPLETED' ? (
                            <span className="text-xs text-amber-700 bg-amber-50 px-2.5 py-1 rounded border border-amber-200">
                              Evaluation Pending Staff Release
                            </span>
                          ) : null}

                          {isUpcoming && (
                            <Button
                              size="sm"
                              variant="outline"
                              className="text-rose-600 border-rose-200 hover:bg-rose-50"
                              onClick={() => setCancellingBookingId(item.id || item._id)}
                            >
                              Cancel Booking
                            </Button>
                          )}
                        </div>
                      </Card>
                    );
                  })}
                </div>
              )}
            </div>
          )}
        </>
      )}

      {/* Booking Confirmation Modal */}
      {bookingSlot && (
        <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4">
          <Card className="max-w-md w-full p-6 space-y-4">
            <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
              <Calendar className="w-5 h-5 text-emerald-600" /> Confirm Mock Interview Booking
            </h3>

            <div className="bg-slate-50 rounded-lg p-3 text-xs text-slate-600 space-y-1 border border-slate-100">
              <p><strong>Interviewer:</strong> {bookingSlot.interviewer?.name}</p>
              <p><strong>Date:</strong> {new Date(bookingSlot.startsAt).toLocaleString()}</p>
              <p><strong>Meeting:</strong> Online video link provided upon confirmation</p>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Preparation Notes or Focus Areas (Optional)
              </label>
              <textarea
                value={bookingNotes}
                onChange={(e) => setBookingNotes(e.target.value)}
                placeholder="e.g. Would like feedback on system design and React performance optimization"
                className="w-full text-xs p-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 outline-none"
                rows={3}
              />
            </div>

            <div className="flex items-center justify-end gap-2.5 pt-2">
              <Button size="sm" variant="outline" onClick={() => setBookingSlot(null)} disabled={submittingBooking}>
                Cancel
              </Button>
              <Button
                size="sm"
                variant="primary"
                className="bg-emerald-600 hover:bg-emerald-700 text-white"
                onClick={handleConfirmBooking}
                disabled={submittingBooking}
              >
                {submittingBooking ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Confirm & Book'}
              </Button>
            </div>
          </Card>
        </div>
      )}

      {/* Cancellation Confirmation Modal */}
      {cancellingBookingId && (
        <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4">
          <Card className="max-w-md w-full p-6 space-y-4">
            <h3 className="text-base font-bold text-rose-700 flex items-center gap-2">
              <XCircle className="w-5 h-5 text-rose-600" /> Cancel Interview Booking
            </h3>
            <p className="text-xs text-slate-600">
              Are you sure you want to cancel this interview booking? The slot will be freed back to the interviewer's schedule. Please note institute cancellation policies apply.
            </p>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Reason for Cancellation
              </label>
              <input
                type="text"
                value={cancellationReason}
                onChange={(e) => setCancellationReason(e.target.value)}
                placeholder="e.g. Schedule conflict"
                className="w-full text-xs p-2 border border-slate-300 rounded-lg outline-none"
              />
            </div>

            <div className="flex items-center justify-end gap-2.5 pt-2">
              <Button size="sm" variant="outline" onClick={() => setCancellingBookingId(null)}>
                Keep Booking
              </Button>
              <Button size="sm" variant="danger" onClick={handleCancelBooking}>
                Yes, Cancel Booking
              </Button>
            </div>
          </Card>
        </div>
      )}

      {/* Released Evaluation Modal */}
      {selectedFeedback && (
        <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4 overflow-y-auto">
          <Card className="max-w-2xl w-full p-6 space-y-5 my-8">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div>
                <h3 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                  <Award className="w-5 h-5 text-indigo-600" /> Human Mock Interview Evaluation
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Conducted by {selectedFeedback.booking?.interviewerName} • Released on {new Date(selectedFeedback.evaluation?.releasedAt).toLocaleDateString()}
                </p>
              </div>
              <div className="text-right">
                <span className="text-xs text-slate-500 block">Overall Score</span>
                <span className="text-2xl font-extrabold text-indigo-600">
                  {selectedFeedback.evaluation?.overallScore}%
                </span>
              </div>
            </div>

            {/* Required Practice Disclaimer */}
            <div className="p-3 rounded-lg bg-amber-50 border border-amber-200 text-xs text-amber-900 flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 text-amber-700 flex-shrink-0" />
              <span>{selectedFeedback.evaluation?.disclaimer || 'Human-evaluated practice guidance, not an employer decision'}</span>
            </div>

            {/* Rubric Breakdown */}
            {selectedFeedback.evaluation?.rubricScores?.length > 0 && (
              <div className="space-y-3">
                <h4 className="text-xs font-bold uppercase tracking-wider text-slate-700">Rubric Dimensions</h4>
                <div className="space-y-2.5">
                  {selectedFeedback.evaluation.rubricScores.map((r, idx) => (
                    <div key={idx} className="p-3 rounded-lg bg-slate-50 border border-slate-200 space-y-1">
                      <div className="flex items-center justify-between text-xs">
                        <span className="font-semibold text-slate-800">{r.dimension}</span>
                        <span className="font-bold text-indigo-600">{r.score} / {r.maxScore}</span>
                      </div>
                      {r.feedback && <p className="text-xs text-slate-600">{r.feedback}</p>}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Strengths & Improvements */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {selectedFeedback.evaluation?.strengths?.length > 0 && (
                <div className="p-3 rounded-lg bg-emerald-50/60 border border-emerald-200 space-y-1">
                  <h5 className="text-xs font-bold text-emerald-900">Key Strengths</h5>
                  <ul className="list-disc list-inside text-xs text-emerald-800 space-y-0.5">
                    {selectedFeedback.evaluation.strengths.map((s, idx) => (
                      <li key={idx}>{s}</li>
                    ))}
                  </ul>
                </div>
              )}

              {selectedFeedback.evaluation?.improvementAreas?.length > 0 && (
                <div className="p-3 rounded-lg bg-amber-50/60 border border-amber-200 space-y-1">
                  <h5 className="text-xs font-bold text-amber-900">Areas for Improvement</h5>
                  <ul className="list-disc list-inside text-xs text-amber-800 space-y-0.5">
                    {selectedFeedback.evaluation.improvementAreas.map((imp, idx) => (
                      <li key={idx}>{imp}</li>
                    ))}
                  </ul>
                </div>
              )}
            </div>

            {/* Overall Feedback */}
            {selectedFeedback.evaluation?.overallFeedback && (
              <div className="space-y-1">
                <h4 className="text-xs font-bold text-slate-700">Overall Comments</h4>
                <p className="text-xs text-slate-600 bg-slate-50 p-3 rounded-lg border border-slate-200 leading-relaxed">
                  {selectedFeedback.evaluation.overallFeedback}
                </p>
              </div>
            )}

            <div className="pt-2 flex justify-end">
              <Button size="sm" variant="outline" onClick={() => setSelectedFeedback(null)}>
                Close
              </Button>
            </div>
          </Card>
        </div>
      )}
    </div>
  );
}
