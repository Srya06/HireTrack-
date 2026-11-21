import React, { useState, useEffect } from 'react';
import {
  Calendar,
  Clock,
  UserCheck,
  Award,
  Video,
  Plus,
  Trash2,
  Lock,
  Unlock,
  FileText,
  CheckCircle2,
  AlertCircle,
  Loader2,
  RotateCcw,
  Sparkles,
  ExternalLink
} from 'lucide-react';
import Button from '../../components/Button.jsx';
import Card from '../../components/Card.jsx';
import StatusBadge from '../../components/StatusBadge.jsx';
import humanInterviewService from '../../services/humanInterview.service.js';

export default function InterviewerWorkspace() {
  const [activeTab, setActiveTab] = useState('slots'); // 'slots' | 'sessions'
  const [profile, setProfile] = useState(null);
  const [slots, setSlots] = useState([]);
  const [sessions, setSessions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);

  // Profile modal
  const [editingProfile, setEditingProfile] = useState(false);
  const [expertiseInput, setExpertiseInput] = useState('');
  const [bioInput, setBioInput] = useState('');
  const [weeklyHoursInput, setWeeklyHoursInput] = useState(5);

  // Slot creation modal
  const [showAddSlotModal, setShowAddSlotModal] = useState(false);
  const [slotDate, setSlotDate] = useState('');
  const [slotTime, setSlotTime] = useState('');
  const [durationMinutes, setDurationMinutes] = useState(45);
  const [meetingUrlInput, setMeetingUrlInput] = useState('');
  const [creatingSlot, setCreatingSlot] = useState(false);

  // Student context modal
  const [selectedStudentContext, setSelectedStudentContext] = useState(null);
  const [loadingContext, setLoadingContext] = useState(false);

  // Evaluation modal
  const [evaluatingSession, setEvaluatingSession] = useState(null);
  const [rubricScores, setRubricScores] = useState([
    { dimension: 'Domain Knowledge & Technical Depth', score: 8, maxScore: 10, feedback: '' },
    { dimension: 'Problem Solving & Critical Thinking', score: 8, maxScore: 10, feedback: '' },
    { dimension: 'Communication & Structural Clarity', score: 8, maxScore: 10, feedback: '' }
  ]);
  const [strengthsText, setStrengthsText] = useState('');
  const [improvementText, setImprovementText] = useState('');
  const [overallFeedbackText, setOverallFeedbackText] = useState('');
  const [submittingEval, setSubmittingEval] = useState(false);

  const loadAll = async () => {
    setLoading(true);
    setError(null);
    try {
      const [profRes, slotsRes, sessionsRes] = await Promise.allSettled([
        humanInterviewService.getInterviewerProfile(),
        humanInterviewService.getInterviewerSlots({ limit: 100 }),
        humanInterviewService.getAssignedSessions({ limit: 100 })
      ]);

      if (profRes.status === 'fulfilled' && profRes.value) {
        const val = profRes.value;
        const pData = val.data?.data || val.data || val;
        setProfile(pData);
        setExpertiseInput((pData.expertise || []).join(', '));
        setBioInput(pData.bio || '');
        setWeeklyHoursInput(pData.availability?.weeklyHours || 5);
      }

      if (slotsRes.status === 'fulfilled' && slotsRes.value) {
        const val = slotsRes.value;
        const sData = Array.isArray(val?.data?.items)
          ? val.data.items
          : Array.isArray(val?.data)
          ? val.data
          : Array.isArray(val?.items)
          ? val.items
          : [];
        setSlots(sData);
      }

      if (sessionsRes.status === 'fulfilled' && sessionsRes.value) {
        const val = sessionsRes.value;
        const sessData = Array.isArray(val?.data?.items)
          ? val.data.items
          : Array.isArray(val?.data)
          ? val.data
          : Array.isArray(val?.items)
          ? val.items
          : [];
        setSessions(sessData);
      }
    } catch (err) {
      setError(err.message || 'Failed to load interviewer workspace');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAll();
  }, []);

  const handleSaveProfile = async () => {
    setError(null);
    try {
      const expertiseList = expertiseInput
        .split(',')
        .map((s) => s.trim())
        .filter(Boolean);

      const res = await humanInterviewService.updateInterviewerProfile({
        expertise: expertiseList,
        bio: bioInput,
        availability: { weeklyHours: Number(weeklyHoursInput) || 5 }
      });
      setProfile(res.data?.data || res.data);
      setEditingProfile(false);
      setSuccess('Profile updated successfully');
    } catch (err) {
      setError(err.response?.data?.message || err.message || 'Failed to update profile');
    }
  };

  const handleCreateSlot = async () => {
    if (!slotDate || !slotTime) {
      setError('Please provide both slot date and start time');
      return;
    }
    setCreatingSlot(true);
    setError(null);
    try {
      const startsAt = new Date(`${slotDate}T${slotTime}`);
      const endsAt = new Date(startsAt.getTime() + durationMinutes * 60 * 1000);

      await humanInterviewService.createSlots({
        slots: [
          {
            startsAt: startsAt.toISOString(),
            endsAt: endsAt.toISOString(),
            meetingUrl: meetingUrlInput.trim()
          }
        ]
      });

      setShowAddSlotModal(false);
      setSlotDate('');
      setSlotTime('');
      setMeetingUrlInput('');
      setSuccess('Interview slot posted successfully');
      await loadAll();
    } catch (err) {
      setError(err.response?.data?.message || err.message || 'Failed to create slot');
    } finally {
      setCreatingSlot(false);
    }
  };

  const handleDeleteSlot = async (slotId) => {
    if (!window.confirm('Delete this available slot?')) return;
    try {
      await humanInterviewService.deleteSlot(slotId);
      setSuccess('Slot removed successfully');
      await loadAll();
    } catch (err) {
      setError(err.response?.data?.message || err.message || 'Failed to delete slot');
    }
  };

  const handleToggleBlockSlot = async (slotId, currentStatus) => {
    const isBlocked = currentStatus === 'BLOCKED';
    try {
      await humanInterviewService.toggleSlotBlock(slotId, !isBlocked);
      setSuccess(`Slot ${isBlocked ? 'unblocked' : 'blocked'} successfully`);
      await loadAll();
    } catch (err) {
      setError(err.response?.data?.message || err.message || 'Failed to toggle block status');
    }
  };

  const handleOpenStudentContext = async (bookingId) => {
    setLoadingContext(true);
    setError(null);
    try {
      const res = await humanInterviewService.getStudentContext(bookingId);
      setSelectedStudentContext(res.data?.data || res.data);
    } catch (err) {
      setError(err.response?.data?.message || err.message || 'Failed to fetch student context');
    } finally {
      setLoadingContext(false);
    }
  };

  const handleOpenEvaluationModal = async (session) => {
    setEvaluatingSession(session);
    setError(null);
    // Attempt to load existing evaluation if present
    try {
      const existing = await humanInterviewService.getEvaluation(session._id || session.id);
      const evalData = existing.data?.data || existing.data;
      if (evalData) {
        if (evalData.rubricScores?.length) setRubricScores(evalData.rubricScores);
        setStrengthsText((evalData.strengths || []).join('\n'));
        setImprovementText((evalData.improvementAreas || []).join('\n'));
        setOverallFeedbackText(evalData.overallFeedback || '');
      }
    } catch {
      // fresh evaluation
      setStrengthsText('');
      setImprovementText('');
      setOverallFeedbackText('');
    }
  };

  const handleSubmitEvaluation = async (status = 'SUBMITTED') => {
    if (!evaluatingSession) return;
    setSubmittingEval(true);
    setError(null);
    try {
      const strengths = strengthsText
        .split('\n')
        .map((s) => s.trim())
        .filter(Boolean);

      const improvementAreas = improvementText
        .split('\n')
        .map((s) => s.trim())
        .filter(Boolean);

      await humanInterviewService.submitEvaluation(evaluatingSession._id || evaluatingSession.id, {
        rubricScores,
        strengths,
        improvementAreas,
        overallFeedback: overallFeedbackText,
        status
      });

      setSuccess(`Evaluation ${status === 'DRAFT' ? 'saved as draft' : 'submitted for placement staff release'}!`);
      setEvaluatingSession(null);
      await loadAll();
    } catch (err) {
      setError(err.response?.data?.message || err.message || 'Failed to save evaluation');
    } finally {
      setSubmittingEval(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
            <UserCheck className="w-7 h-7 text-emerald-600" />
            Interviewer Workspace
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            Manage your practice availability slots, review candidate profiles, and evaluate mock interview sessions.
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <Button size="sm" variant="outline" onClick={() => setEditingProfile(true)}>
            Edit Expertise & Bio
          </Button>
          <Button
            size="sm"
            variant="primary"
            className="bg-emerald-600 hover:bg-emerald-700 text-white flex items-center gap-1.5"
            onClick={() => setShowAddSlotModal(true)}
          >
            <Plus className="w-4 h-4" /> Add Interview Slots
          </Button>
        </div>
      </div>

      {/* Global Alerts */}
      {error && (
        <div className="p-4 rounded-lg bg-rose-50 border border-rose-200 text-rose-800 text-sm flex items-center justify-between">
          <div className="flex items-center gap-2">
            <AlertCircle className="w-5 h-5 text-rose-600 flex-shrink-0" />
            <span>{error}</span>
          </div>
          <button onClick={() => setError(null)} className="text-rose-700 font-bold">&times;</button>
        </div>
      )}

      {success && (
        <div className="p-4 rounded-lg bg-emerald-50 border border-emerald-200 text-emerald-800 text-sm flex items-center justify-between">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-5 h-5 text-emerald-600 flex-shrink-0" />
            <span>{success}</span>
          </div>
          <button onClick={() => setSuccess(null)} className="text-emerald-700 font-bold">&times;</button>
        </div>
      )}

      {/* Profile Overview Card */}
      {profile && (
        <Card className="p-4 bg-slate-50/70 border border-slate-200">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
            <div className="space-y-1">
              <span className="font-bold text-slate-800 text-sm">Interviewer Profile</span>
              <p className="text-slate-600">{profile.bio || 'No bio specified. Add your technical background and experience.'}</p>
              <div className="flex flex-wrap gap-1 pt-1">
                {(profile.expertise || []).map((exp, idx) => (
                  <span key={idx} className="bg-white border border-slate-200 text-slate-700 px-2 py-0.5 rounded font-medium text-[11px]">
                    {exp}
                  </span>
                ))}
              </div>
            </div>
            <div className="sm:text-right text-slate-500 space-y-0.5">
              <span className="block font-semibold text-slate-700">Weekly Target: {profile.availability?.weeklyHours || 5} hrs</span>
              <span className="block text-[11px]">Total Slots: {slots.length}</span>
            </div>
          </div>
        </Card>
      )}

      {/* Navigation Tabs */}
      <div className="flex items-center justify-between border-b border-slate-200 pb-3">
        <div className="inline-flex rounded-lg border border-slate-200 bg-slate-50 p-1">
          <button
            type="button"
            onClick={() => setActiveTab('slots')}
            className={`px-4 py-1.5 text-xs font-semibold rounded-md transition flex items-center gap-1.5 ${
              activeTab === 'slots'
                ? 'bg-white text-emerald-700 shadow-sm'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <Calendar className="w-3.5 h-3.5" />
            My Slots ({slots.length})
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('sessions')}
            className={`px-4 py-1.5 text-xs font-semibold rounded-md transition flex items-center gap-1.5 ${
              activeTab === 'sessions'
                ? 'bg-white text-emerald-700 shadow-sm'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <UserCheck className="w-3.5 h-3.5" />
            Assigned Sessions & Evaluations ({sessions.length})
          </button>
        </div>

        <button
          type="button"
          onClick={loadAll}
          disabled={loading}
          className="text-xs font-medium text-slate-500 hover:text-slate-800 flex items-center gap-1"
        >
          <RotateCcw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
          Refresh
        </button>
      </div>

      {/* TAB 1: SLOTS */}
      {activeTab === 'slots' && (
        <div className="space-y-4">
          {slots.length === 0 ? (
            <Card className="text-center py-12">
              <Calendar className="w-12 h-12 text-slate-300 mx-auto mb-3" />
              <h3 className="text-sm font-semibold text-slate-700">No interview slots scheduled</h3>
              <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">
                Add open time slots to allow students to schedule live mock interview sessions with you.
              </p>
              <div className="pt-4">
                <Button size="sm" variant="primary" onClick={() => setShowAddSlotModal(true)}>
                  <Plus className="w-4 h-4 mr-1" /> Add Open Slots
                </Button>
              </div>
            </Card>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {slots.map((slot) => {
                const startsAt = new Date(slot.startsAt);
                const endsAt = new Date(slot.endsAt);
                const isBooked = slot.status === 'BOOKED';
                const isBlocked = slot.status === 'BLOCKED';

                return (
                  <Card key={slot._id || slot.id} className="p-4 flex flex-col justify-between space-y-3">
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold text-slate-800">
                          {startsAt.toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' })}
                        </span>
                        <StatusBadge status={slot.status} />
                      </div>

                      <div className="text-xs text-slate-600 flex items-center gap-1.5">
                        <Clock className="w-3.5 h-3.5 text-slate-400" />
                        <span>
                          {startsAt.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} - {endsAt.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </span>
                      </div>

                      {slot.meetingUrl && (
                        <div className="text-xs text-slate-500 truncate">
                          Meeting: <a href={slot.meetingUrl} target="_blank" rel="noopener noreferrer" className="text-indigo-600 underline">{slot.meetingUrl}</a>
                        </div>
                      )}
                    </div>

                    <div className="pt-2 border-t border-slate-100 flex items-center justify-between gap-2">
                      {!isBooked && (
                        <button
                          type="button"
                          onClick={() => handleToggleBlockSlot(slot._id || slot.id, slot.status)}
                          className="text-xs text-slate-600 hover:text-slate-900 flex items-center gap-1"
                        >
                          {isBlocked ? <Unlock className="w-3.5 h-3.5" /> : <Lock className="w-3.5 h-3.5" />}
                          {isBlocked ? 'Unblock' : 'Block'}
                        </button>
                      )}

                      {!isBooked && (
                        <button
                          type="button"
                          onClick={() => handleDeleteSlot(slot._id || slot.id)}
                          className="text-xs text-rose-600 hover:text-rose-800 flex items-center gap-1 ml-auto"
                        >
                          <Trash2 className="w-3.5 h-3.5" /> Delete
                        </button>
                      )}

                      {isBooked && (
                        <span className="text-xs text-indigo-600 font-semibold">Booked by Student</span>
                      )}
                    </div>
                  </Card>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* TAB 2: ASSIGNED SESSIONS & EVALUATION */}
      {activeTab === 'sessions' && (
        <div className="space-y-4">
          {sessions.length === 0 ? (
            <Card className="text-center py-12">
              <UserCheck className="w-12 h-12 text-slate-300 mx-auto mb-3" />
              <h3 className="text-sm font-semibold text-slate-700">No assigned sessions yet</h3>
              <p className="text-xs text-slate-500 mt-1">
                When students book your available slots, their session details will appear here.
              </p>
            </Card>
          ) : (
            <div className="space-y-3">
              {sessions.map((sess) => {
                const sessionDate = sess.slotId?.startsAt ? new Date(sess.slotId.startsAt) : null;
                const evalStatus = sess.evaluationSummary?.status;

                return (
                  <Card key={sess._id || sess.id} className="p-4 flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <h4 className="text-sm font-bold text-slate-900">
                          {sess.studentUserId?.name || 'Student Candidate'}
                        </h4>
                        <StatusBadge status={sess.status} />
                        {evalStatus && (
                          <span className={`text-[10px] font-bold px-2 py-0.5 rounded ${
                            evalStatus === 'RELEASED'
                              ? 'bg-emerald-100 text-emerald-800'
                              : evalStatus === 'SUBMITTED'
                              ? 'bg-amber-100 text-amber-800'
                              : 'bg-slate-100 text-slate-700'
                          }`}>
                            Evaluation: {evalStatus}
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-slate-500">
                        {sessionDate ? sessionDate.toLocaleString() : 'Date pending'} • {sess.studentProfileId?.degree || ''} {sess.studentProfileId?.branch || ''}
                      </p>
                      {sess.notes && (
                        <p className="text-xs text-slate-600 italic bg-slate-50 p-1.5 rounded border border-slate-100 mt-1">
                          Candidate Notes: "{sess.notes}"
                        </p>
                      )}
                      {sess.meetingUrl && (
                        <p className="text-xs text-indigo-600 flex items-center gap-1 pt-0.5">
                          <Video className="w-3.5 h-3.5" />
                          <a href={sess.meetingUrl} target="_blank" rel="noopener noreferrer" className="underline hover:text-indigo-800">
                            Launch Meeting
                          </a>
                        </p>
                      )}
                    </div>

                    <div className="flex items-center gap-2.5">
                      <Button
                        size="sm"
                        variant="outline"
                        className="flex items-center gap-1.5"
                        onClick={() => handleOpenStudentContext(sess._id || sess.id)}
                      >
                        <FileText className="w-3.5 h-3.5" /> Student Profile
                      </Button>

                      {sess.status !== 'CANCELLED' && (
                        <Button
                          size="sm"
                          variant="primary"
                          className="bg-emerald-600 hover:bg-emerald-700 text-white flex items-center gap-1.5"
                          onClick={() => handleOpenEvaluationModal(sess)}
                        >
                          <Award className="w-3.5 h-3.5" />
                          {evalStatus === 'RELEASED' ? 'View Evaluation' : evalStatus ? 'Edit Evaluation' : 'Evaluate'}
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

      {/* Profile Edit Modal */}
      {editingProfile && (
        <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4">
          <Card className="max-w-md w-full p-6 space-y-4">
            <h3 className="text-base font-bold text-slate-900">Edit Interviewer Profile</h3>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Expertise & Domains (Comma separated)
              </label>
              <input
                type="text"
                value={expertiseInput}
                onChange={(e) => setExpertiseInput(e.target.value)}
                placeholder="e.g. System Design, React, Algorithms, Java"
                className="w-full text-xs p-2 border border-slate-300 rounded-lg outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Bio / Background</label>
              <textarea
                value={bioInput}
                onChange={(e) => setBioInput(e.target.value)}
                placeholder="Brief summary of your industry experience and focus areas"
                className="w-full text-xs p-2 border border-slate-300 rounded-lg outline-none"
                rows={3}
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Weekly Target Hours</label>
              <input
                type="number"
                value={weeklyHoursInput}
                onChange={(e) => setWeeklyHoursInput(e.target.value)}
                min={1}
                max={40}
                className="w-full text-xs p-2 border border-slate-300 rounded-lg outline-none"
              />
            </div>

            <div className="flex items-center justify-end gap-2 pt-2">
              <Button size="sm" variant="outline" onClick={() => setEditingProfile(false)}>Cancel</Button>
              <Button size="sm" variant="primary" onClick={handleSaveProfile}>Save Profile</Button>
            </div>
          </Card>
        </div>
      )}

      {/* Add Slot Modal */}
      {showAddSlotModal && (
        <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4">
          <Card className="max-w-md w-full p-6 space-y-4">
            <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
              <Plus className="w-5 h-5 text-emerald-600" /> Add Available Interview Slot
            </h3>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Date</label>
                <input
                  type="date"
                  value={slotDate}
                  onChange={(e) => setSlotDate(e.target.value)}
                  className="w-full text-xs p-2 border border-slate-300 rounded-lg outline-none"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Start Time</label>
                <input
                  type="time"
                  value={slotTime}
                  onChange={(e) => setSlotTime(e.target.value)}
                  className="w-full text-xs p-2 border border-slate-300 rounded-lg outline-none"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Duration (Minutes)</label>
              <select
                value={durationMinutes}
                onChange={(e) => setDurationMinutes(Number(e.target.value))}
                className="w-full text-xs p-2 border border-slate-300 rounded-lg outline-none"
              >
                <option value={30}>30 minutes</option>
                <option value={45}>45 minutes</option>
                <option value={60}>60 minutes</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Meeting URL (Google Meet / Zoom)</label>
              <input
                type="url"
                value={meetingUrlInput}
                onChange={(e) => setMeetingUrlInput(e.target.value)}
                placeholder="https://meet.google.com/..."
                className="w-full text-xs p-2 border border-slate-300 rounded-lg outline-none"
              />
            </div>

            <div className="flex items-center justify-end gap-2 pt-2">
              <Button size="sm" variant="outline" onClick={() => setShowAddSlotModal(false)} disabled={creatingSlot}>
                Cancel
              </Button>
              <Button
                size="sm"
                variant="primary"
                className="bg-emerald-600 hover:bg-emerald-700 text-white"
                onClick={handleCreateSlot}
                disabled={creatingSlot}
              >
                {creatingSlot ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Post Slot'}
              </Button>
            </div>
          </Card>
        </div>
      )}

      {/* Student Context DTO Modal */}
      {selectedStudentContext && (
        <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4">
          <Card className="max-w-lg w-full p-6 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div>
                <h3 className="text-base font-bold text-slate-900">Student Candidate Profile</h3>
                <p className="text-xs text-slate-500">Allowlisted context for interview preparation</p>
              </div>
              <button
                onClick={() => setSelectedStudentContext(null)}
                className="text-slate-400 hover:text-slate-700 font-bold"
              >
                &times;
              </button>
            </div>

            {loadingContext ? (
              <div className="py-8 text-center text-slate-400">
                <Loader2 className="w-6 h-6 animate-spin mx-auto" />
              </div>
            ) : (
              <div className="space-y-3 text-xs">
                <div>
                  <span className="font-semibold text-slate-700 block">Candidate Name</span>
                  <span className="text-slate-900 font-medium text-sm">{selectedStudentContext.studentContext?.name}</span>
                </div>

                <div className="grid grid-cols-2 gap-3 bg-slate-50 p-2.5 rounded-lg border border-slate-100">
                  <div>
                    <span className="font-semibold text-slate-500 block">Degree & Branch</span>
                    <span className="text-slate-800">
                      {selectedStudentContext.studentContext?.degree} - {selectedStudentContext.studentContext?.branch}
                    </span>
                  </div>
                  <div>
                    <span className="font-semibold text-slate-500 block">Graduation Year</span>
                    <span className="text-slate-800">{selectedStudentContext.studentContext?.graduationYear || 'N/A'}</span>
                  </div>
                </div>

                {selectedStudentContext.studentContext?.skills?.length > 0 && (
                  <div>
                    <span className="font-semibold text-slate-700 block mb-1">Key Skills</span>
                    <div className="flex flex-wrap gap-1">
                      {selectedStudentContext.studentContext.skills.map((s, idx) => (
                        <span key={idx} className="bg-indigo-50 text-indigo-700 px-2 py-0.5 rounded font-medium text-[11px]">
                          {s}
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                {selectedStudentContext.studentContext?.bio && (
                  <div>
                    <span className="font-semibold text-slate-700 block mb-1">Student Bio</span>
                    <p className="text-slate-600 bg-slate-50 p-2 rounded border border-slate-100">{selectedStudentContext.studentContext.bio}</p>
                  </div>
                )}

                {/* Secure Signed Resume Delivery */}
                <div className="pt-2 border-t border-slate-100">
                  {selectedStudentContext.studentContext?.resumeUrl ? (
                    <a
                      href={selectedStudentContext.studentContext.resumeUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1.5 text-indigo-600 hover:text-indigo-800 font-semibold"
                    >
                      <ExternalLink className="w-4 h-4" /> Open Student Resume (Signed Download)
                    </a>
                  ) : (
                    <span className="text-slate-400 italic">Resume view disabled by institute policy or not uploaded</span>
                  )}
                </div>
              </div>
            )}

            <div className="pt-2 flex justify-end">
              <Button size="sm" variant="outline" onClick={() => setSelectedStudentContext(null)}>Close</Button>
            </div>
          </Card>
        </div>
      )}

      {/* Rubric Evaluation Modal */}
      {evaluatingSession && (
        <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4 overflow-y-auto">
          <Card className="max-w-2xl w-full p-6 space-y-5 my-8">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div>
                <h3 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                  <Award className="w-5 h-5 text-emerald-600" />
                  Evaluate Candidate: {evaluatingSession.studentUserId?.name}
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Complete rubric dimensions, note key strengths, and provide actionable feedback.
                </p>
              </div>
              <button
                onClick={() => setEvaluatingSession(null)}
                className="text-slate-400 hover:text-slate-700 font-bold"
              >
                &times;
              </button>
            </div>

            {/* Rubric Dimensions */}
            <div className="space-y-3">
              <h4 className="text-xs font-bold uppercase tracking-wider text-slate-700">Rubric Dimensions</h4>
              <div className="space-y-3">
                {rubricScores.map((r, idx) => (
                  <div key={idx} className="p-3 rounded-lg bg-slate-50 border border-slate-200 space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-slate-800">{r.dimension}</span>
                      <div className="flex items-center gap-1">
                        <input
                          type="number"
                          min={0}
                          max={r.maxScore}
                          value={r.score}
                          onChange={(e) => {
                            const newScores = [...rubricScores];
                            newScores[idx].score = Number(e.target.value);
                            setRubricScores(newScores);
                          }}
                          className="w-14 text-center text-xs p-1 border border-slate-300 rounded font-bold"
                        />
                        <span className="text-xs text-slate-500">/ {r.maxScore}</span>
                      </div>
                    </div>
                    <input
                      type="text"
                      value={r.feedback}
                      onChange={(e) => {
                        const newScores = [...rubricScores];
                        newScores[idx].feedback = e.target.value;
                        setRubricScores(newScores);
                      }}
                      placeholder={`Observations for ${r.dimension}...`}
                      className="w-full text-xs p-2 border border-slate-300 rounded bg-white outline-none"
                    />
                  </div>
                ))}
              </div>
            </div>

            {/* Strengths & Improvement Areas */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Key Strengths (One per line)
                </label>
                <textarea
                  value={strengthsText}
                  onChange={(e) => setStrengthsText(e.target.value)}
                  placeholder="Strong architectural problem decomposition&#10;Clear verbal communication"
                  className="w-full text-xs p-2.5 border border-slate-300 rounded-lg outline-none"
                  rows={3}
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Areas for Improvement (One per line)
                </label>
                <textarea
                  value={improvementText}
                  onChange={(e) => setImprovementText(e.target.value)}
                  placeholder="Need practice with concurrency edge cases&#10;Pace answers more concisely"
                  className="w-full text-xs p-2.5 border border-slate-300 rounded-lg outline-none"
                  rows={3}
                />
              </div>
            </div>

            {/* Overall Feedback */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Overall Guidance & Summary</label>
              <textarea
                value={overallFeedbackText}
                onChange={(e) => setOverallFeedbackText(e.target.value)}
                placeholder="Comprehensive feedback to guide candidate's interview preparation..."
                className="w-full text-xs p-2.5 border border-slate-300 rounded-lg outline-none"
                rows={3}
              />
            </div>

            <div className="flex items-center justify-between pt-2 border-t border-slate-100">
              <Button size="sm" variant="outline" onClick={() => setEvaluatingSession(null)}>Cancel</Button>

              <div className="flex items-center gap-2">
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => handleSubmitEvaluation('DRAFT')}
                  disabled={submittingEval}
                >
                  Save as Draft
                </Button>
                <Button
                  size="sm"
                  variant="primary"
                  className="bg-emerald-600 hover:bg-emerald-700 text-white"
                  onClick={() => handleSubmitEvaluation('SUBMITTED')}
                  disabled={submittingEval}
                >
                  {submittingEval ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Submit Evaluation'}
                </Button>
              </div>
            </div>
          </Card>
        </div>
      )}
    </div>
  );
}
