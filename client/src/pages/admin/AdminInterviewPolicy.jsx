import React, { useState, useEffect } from 'react';
import {
  ShieldCheck,
  Award,
  Settings,
  Calendar,
  CheckCircle2,
  AlertCircle,
  Loader2,
  RotateCcw,
  UserCheck,
  Send
} from 'lucide-react';
import Button from '../../components/Button.jsx';
import Card from '../../components/Card.jsx';
import StatusBadge from '../../components/StatusBadge.jsx';
import humanInterviewService from '../../services/humanInterview.service.js';

export default function AdminInterviewPolicy() {
  const [policy, setPolicy] = useState({
    requireAiPassForHumanMock: false,
    minOverallScore: 70,
    cancelBeforeHours: 24,
    allowResumeView: true
  });
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [savingPolicy, setSavingPolicy] = useState(false);
  const [releasingId, setReleasingId] = useState(null);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);

  const loadData = async () => {
    setLoading(true);
    setError(null);
    try {
      const [polRes, bookRes] = await Promise.allSettled([
        humanInterviewService.getPolicy(),
        humanInterviewService.getAllBookings({ limit: 100 })
      ]);

      if (polRes.status === 'fulfilled' && polRes.value) {
        const val = polRes.value;
        const p = val.data?.data || val.data || val;
        setPolicy({
          requireAiPassForHumanMock: Boolean(p.requireAiPassForHumanMock),
          minOverallScore: p.minOverallScore ?? 70,
          cancelBeforeHours: p.cancelBeforeHours ?? 24,
          allowResumeView: p.allowResumeView !== false
        });
      }

      if (bookRes.status === 'fulfilled' && bookRes.value) {
        const val = bookRes.value;
        const b = Array.isArray(val?.data?.items)
          ? val.data.items
          : Array.isArray(val?.data)
          ? val.data
          : Array.isArray(val?.items)
          ? val.items
          : [];
        setBookings(b);
      }
    } catch (err) {
      setError(err.message || 'Failed to load policy and bookings');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleSavePolicy = async () => {
    setSavingPolicy(true);
    setError(null);
    setSuccess(null);
    try {
      const res = await humanInterviewService.updatePolicy(policy);
      setSuccess('Institute mock interview policy updated and audited successfully.');
      const updated = res.data?.data || res.data;
      if (updated) {
        setPolicy({
          requireAiPassForHumanMock: Boolean(updated.requireAiPassForHumanMock),
          minOverallScore: updated.minOverallScore ?? 70,
          cancelBeforeHours: updated.cancelBeforeHours ?? 24,
          allowResumeView: updated.allowResumeView !== false
        });
      }
    } catch (err) {
      setError(err.response?.data?.message || err.message || 'Failed to update policy');
    } finally {
      setSavingPolicy(false);
    }
  };

  const handleReleaseEvaluation = async (evaluationId) => {
    if (!evaluationId) return;
    setReleasingId(evaluationId);
    setError(null);
    try {
      await humanInterviewService.releaseEvaluation(evaluationId);
      setSuccess('Evaluation released to candidate! Student can now view structured feedback.');
      await loadData();
    } catch (err) {
      setError(err.response?.data?.message || err.message || 'Failed to release evaluation');
    } finally {
      setReleasingId(null);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
            <Settings className="w-7 h-7 text-indigo-600" />
            Mock Interview Policies & Evaluation Moderation
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            Configure candidate prerequisites, cancellation windows, and release interviewer evaluations to students.
          </p>
        </div>

        <button
          type="button"
          onClick={loadData}
          disabled={loading}
          className="text-xs font-medium text-slate-500 hover:text-slate-800 flex items-center gap-1 self-start md:self-auto"
        >
          <RotateCcw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
          Refresh
        </button>
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

      {/* Policy Configuration Card */}
      <Card className="p-6 space-y-5">
        <div className="flex items-center justify-between border-b border-slate-100 pb-3">
          <div>
            <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
              <ShieldCheck className="w-5 h-5 text-indigo-600" /> Institute Mock Interview Policy
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">
              Governs booking prerequisites, resume sharing, and student cancellation rules.
            </p>
          </div>
          <Button
            size="sm"
            variant="primary"
            onClick={handleSavePolicy}
            disabled={savingPolicy}
          >
            {savingPolicy ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Save Policy Changes'}
          </Button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-xs">
          {/* Prerequisite: Require AI Pass */}
          <div className="p-4 rounded-lg bg-slate-50 border border-slate-200 space-y-2">
            <div className="flex items-center justify-between">
              <label htmlFor="requireAiPass" className="font-bold text-slate-900 cursor-pointer">
                Require AI Mock Pass Before Human Interview
              </label>
              <input
                id="requireAiPass"
                type="checkbox"
                checked={policy.requireAiPassForHumanMock}
                onChange={(e) => setPolicy({ ...policy, requireAiPassForHumanMock: e.target.checked })}
                className="w-4 h-4 text-indigo-600 rounded border-slate-300 focus:ring-indigo-500 cursor-pointer"
              />
            </div>
            <p className="text-slate-500 text-[11px] leading-relaxed">
              When enabled, students must complete and pass an AI Mock Interview with the required score before they can schedule a live human mock interview.
            </p>

            {policy.requireAiPassForHumanMock && (
              <div className="pt-2">
                <label className="block font-semibold text-slate-700 mb-1">
                  Minimum AI Mock Score Required (%)
                </label>
                <input
                  type="number"
                  min={0}
                  max={100}
                  value={policy.minOverallScore}
                  onChange={(e) => setPolicy({ ...policy, minOverallScore: Number(e.target.value) })}
                  className="w-24 text-xs p-1.5 border border-slate-300 rounded font-bold"
                />
              </div>
            )}
          </div>

          {/* Cancellation Window & Resume Sharing */}
          <div className="p-4 rounded-lg bg-slate-50 border border-slate-200 space-y-4">
            <div>
              <label className="block font-bold text-slate-900 mb-1">
                Student Cancellation Window (Hours prior to session)
              </label>
              <p className="text-slate-500 text-[11px] mb-2 leading-relaxed">
                Prevents last-minute student cancellations. Students cannot cancel once the session is within this window.
              </p>
              <input
                type="number"
                min={0}
                max={168}
                value={policy.cancelBeforeHours}
                onChange={(e) => setPolicy({ ...policy, cancelBeforeHours: Number(e.target.value) })}
                className="w-24 text-xs p-1.5 border border-slate-300 rounded font-bold"
              />
              <span className="text-slate-500 text-xs ml-2">hours</span>
            </div>

            <div className="pt-2 border-t border-slate-200 flex items-center justify-between">
              <div>
                <label htmlFor="allowResume" className="font-bold text-slate-900 block cursor-pointer">
                  Allow Interviewers to View Resumes
                </label>
                <p className="text-slate-500 text-[11px]">
                  Delivers secure, short-lived signed resume download links to assigned interviewers.
                </p>
              </div>
              <input
                id="allowResume"
                type="checkbox"
                checked={policy.allowResumeView}
                onChange={(e) => setPolicy({ ...policy, allowResumeView: e.target.checked })}
                className="w-4 h-4 text-indigo-600 rounded border-slate-300 focus:ring-indigo-500 cursor-pointer"
              />
            </div>
          </div>
        </div>
      </Card>

      {/* Human Interview Bookings & Evaluation Release Section */}
      <Card className="p-6 space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
              <Award className="w-5 h-5 text-indigo-600" /> Human Mock Interview Sessions & Feedback Moderation
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">
              Review submitted interviewer evaluations and release them to candidates.
            </p>
          </div>
          <span className="text-xs font-semibold text-slate-500">
            Total Sessions: {bookings.length}
          </span>
        </div>

        {bookings.length === 0 ? (
          <div className="py-12 text-center text-slate-400">
            <UserCheck className="w-10 h-10 mx-auto mb-2 text-slate-300" />
            <p className="text-xs">No human mock interview bookings recorded yet.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="border-b border-slate-200 text-slate-500 font-semibold">
                  <th className="py-2.5 px-3">Student</th>
                  <th className="py-2.5 px-3">Academic Info</th>
                  <th className="py-2.5 px-3">Session Date</th>
                  <th className="py-2.5 px-3">Booking Status</th>
                  <th className="py-2.5 px-3">Evaluation Status</th>
                  <th className="py-2.5 px-3 text-right">Staff Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {bookings.map((b) => {
                  const ev = b.evaluation;
                  const canRelease = ev && ev.status === 'SUBMITTED';
                  const isReleased = ev && ev.status === 'RELEASED';

                  return (
                    <tr key={b._id || b.id} className="hover:bg-slate-50/60">
                      <td className="py-3 px-3 font-semibold text-slate-900">
                        {b.studentUserId?.name || 'Student'}
                      </td>
                      <td className="py-3 px-3 text-slate-600">
                        {b.studentProfileId?.degree || ''} {b.studentProfileId?.branch || ''}
                      </td>
                      <td className="py-3 px-3 text-slate-600">
                        {b.slotId?.startsAt ? new Date(b.slotId.startsAt).toLocaleString() : 'Date pending'}
                      </td>
                      <td className="py-3 px-3">
                        <StatusBadge status={b.status} />
                      </td>
                      <td className="py-3 px-3">
                        {ev ? (
                          <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                            isReleased
                              ? 'bg-emerald-100 text-emerald-800'
                              : canRelease
                              ? 'bg-amber-100 text-amber-800'
                              : 'bg-slate-100 text-slate-700'
                          }`}>
                            {ev.status} ({ev.overallScore}%)
                          </span>
                        ) : (
                          <span className="text-slate-400 italic">Not evaluated</span>
                        )}
                      </td>
                      <td className="py-3 px-3 text-right">
                        {canRelease ? (
                          <Button
                            size="sm"
                            variant="primary"
                            className="bg-indigo-600 hover:bg-indigo-700 text-white flex items-center gap-1 ml-auto"
                            onClick={() => handleReleaseEvaluation(ev._id || ev.id)}
                            disabled={releasingId === (ev._id || ev.id)}
                          >
                            {releasingId === (ev._id || ev.id) ? (
                              <Loader2 className="w-3.5 h-3.5 animate-spin" />
                            ) : (
                              <Send className="w-3.5 h-3.5" />
                            )}
                            Release to Student
                          </Button>
                        ) : isReleased ? (
                          <span className="text-[11px] text-emerald-700 font-semibold flex items-center justify-end gap-1">
                            <CheckCircle2 className="w-3.5 h-3.5" /> Released
                          </span>
                        ) : (
                          <span className="text-slate-400 text-[11px]">-</span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </div>
  );
}
