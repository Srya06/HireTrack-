import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  Clock,
  CheckCircle2,
  AlertCircle,
  HelpCircle,
  ChevronLeft,
  ChevronRight,
  Send,
  Loader2,
  ShieldAlert,
  RotateCcw
} from 'lucide-react';
import Button from '../../components/Button.jsx';
import * as mockTestService from '../../services/mockTest.service.js';

export default function MockTestPlayer() {
  const { attemptId } = useParams();
  const navigate = useNavigate();

  const [attempt, setAttempt] = useState(null);
  const [questions, setQuestions] = useState([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [answers, setAnswers] = useState({}); // { [questionId]: { selectedOptions: [], textAnswer: '' } }
  const [saveStatus, setSaveStatus] = useState('idle'); // 'idle' | 'saving' | 'saved' | 'error'
  const [lastSavedAt, setLastSavedAt] = useState(null);

  const [remainingSeconds, setRemainingSeconds] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showSubmitModal, setShowSubmitModal] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const timerRef = useRef(null);

  // 1. Fetch Attempt & Initialize State
  useEffect(() => {
    let mounted = true;
    const fetchAttempt = async () => {
      setLoading(true);
      setError(null);
      try {
        const res = await mockTestService.getAttemptDetails(attemptId);
        if (!mounted) return;

        const data = res.data?.data;
        if (!data || !data.attempt) {
          throw new Error('Attempt data not found');
        }

        // If already evaluated or submitted, redirect straight to result!
        if (['SUBMITTED', 'TIMED_OUT', 'EVALUATED'].includes(data.attempt.status)) {
          navigate(`/student/mock-tests/attempts/${attemptId}/result`, { replace: true });
          return;
        }

        setAttempt(data.attempt);
        setQuestions(data.questions || []);
        setRemainingSeconds(data.remainingSeconds || 0);

        // Rehydrate saved answers
        if (data.savedAnswers) {
          setAnswers(data.savedAnswers);
        }
      } catch (err) {
        if (mounted) setError(err.message || 'Failed to load test session');
      } finally {
        if (mounted) setLoading(false);
      }
    };

    fetchAttempt();
    return () => {
      mounted = false;
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [attemptId, navigate]);

  // 2. Server-driven Countdown Timer
  useEffect(() => {
    if (loading || remainingSeconds <= 0) return;

    timerRef.current = setInterval(() => {
      setRemainingSeconds((prev) => {
        if (prev <= 1) {
          clearInterval(timerRef.current);
          handleAutoSubmit();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [loading, remainingSeconds]);

  // 3. Format seconds -> MM:SS or HH:MM:SS
  const formatTime = (secs) => {
    const hours = Math.floor(secs / 3600);
    const mins = Math.floor((secs % 3600) / 60);
    const s = secs % 60;
    if (hours > 0) {
      return `${hours}:${String(mins).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
    }
    return `${String(mins).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
  };

  // 4. Autosave handler
  const saveAnswerToServer = async (qId, answerPayload) => {
    setSaveStatus('saving');
    try {
      await mockTestService.saveAnswer(attemptId, qId, answerPayload);
      setSaveStatus('saved');
      setLastSavedAt(new Date().toLocaleTimeString());
    } catch (err) {
      setSaveStatus('error');
    }
  };

  // 5. User answer mutations
  const handleSingleChoiceSelect = (qId, optionId) => {
    const updated = {
      ...(answers[qId] || {}),
      selectedOptions: [optionId],
      textAnswer: ''
    };
    setAnswers((prev) => ({ ...prev, [qId]: updated }));
    saveAnswerToServer(qId, updated);
  };

  const handleMultiChoiceToggle = (qId, optionId) => {
    const currentSelected = answers[qId]?.selectedOptions || [];
    const exists = currentSelected.includes(optionId);
    const newSelected = exists
      ? currentSelected.filter((id) => id !== optionId)
      : [...currentSelected, optionId];

    const updated = {
      ...(answers[qId] || {}),
      selectedOptions: newSelected,
      textAnswer: ''
    };
    setAnswers((prev) => ({ ...prev, [qId]: updated }));
    saveAnswerToServer(qId, updated);
  };

  const handleTextAnswerChange = (qId, text) => {
    const updated = {
      ...(answers[qId] || {}),
      selectedOptions: [],
      textAnswer: text
    };
    setAnswers((prev) => ({ ...prev, [qId]: updated }));
  };

  const handleTextAnswerBlur = (qId) => {
    if (answers[qId]) {
      saveAnswerToServer(qId, answers[qId]);
    }
  };

  // 6. Submit handling
  const handleAutoSubmit = async () => {
    if (isSubmitting) return;
    setIsSubmitting(true);
    try {
      await mockTestService.submitAttempt(attemptId, {});
      navigate(`/student/mock-tests/attempts/${attemptId}/result`, { replace: true });
    } catch (err) {
      setError(err.message || 'Auto-submit failed. Redirecting to result...');
      setTimeout(() => navigate(`/student/mock-tests/attempts/${attemptId}/result`), 2000);
    }
  };

  const handleManualSubmit = async () => {
    setIsSubmitting(true);
    try {
      await mockTestService.submitAttempt(attemptId, {}, { 'idempotency-key': `sub-${attemptId}` });
      setShowSubmitModal(false);
      navigate(`/student/mock-tests/attempts/${attemptId}/result`, { replace: true });
    } catch (err) {
      setError(err.message || 'Failed to submit test');
      setIsSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] space-y-3">
        <Loader2 className="w-8 h-8 animate-spin text-indigo-600" />
        <p className="text-xs text-slate-500 font-medium">Preparing test session & timer...</p>
      </div>
    );
  }

  if (error && !attempt) {
    return (
      <div className="max-w-xl mx-auto py-16 text-center space-y-4">
        <ShieldAlert className="w-10 h-10 text-rose-500 mx-auto" />
        <h2 className="text-base font-bold text-slate-900">Session Error</h2>
        <p className="text-xs text-rose-700">{error}</p>
        <Button size="sm" onClick={() => window.location.reload()}>
          Retry Reconnect
        </Button>
      </div>
    );
  }

  const currentQ = questions[currentIndex];
  const qId = currentQ?._id || currentQ?.id;
  const currentAnswer = answers[qId] || { selectedOptions: [], textAnswer: '' };

  const isQuestionAnswered = (id) => {
    const a = answers[id];
    if (!a) return false;
    return (a.selectedOptions && a.selectedOptions.length > 0) || (a.textAnswer && a.textAnswer.trim().length > 0);
  };

  const totalAnsweredCount = questions.filter((q) => isQuestionAnswered(q._id || q.id)).length;
  const unansweredCount = questions.length - totalAnsweredCount;
  const isTimeCritical = remainingSeconds <= 300; // < 5 minutes

  return (
    <div className="space-y-4 max-w-5xl mx-auto">
      {/* Top Header Bar */}
      <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-sm flex items-center justify-between gap-4">
        <div>
          <h1 className="text-base font-bold text-slate-900 line-clamp-1">
            {attempt?.mockTestId?.title || 'Mock Assessment'}
          </h1>
          <div className="flex items-center gap-3 mt-1 text-xs text-slate-500">
            <span>
              Question <strong>{currentIndex + 1}</strong> of <strong>{questions.length}</strong>
            </span>
            <span>•</span>
            <span className="flex items-center gap-1">
              {saveStatus === 'saving' && (
                <span className="text-amber-600 flex items-center gap-1 font-medium">
                  <RotateCcw className="w-3 h-3 animate-spin" /> Saving...
                </span>
              )}
              {saveStatus === 'saved' && (
                <span className="text-emerald-600 flex items-center gap-1 font-medium">
                  <CheckCircle2 className="w-3 h-3" /> Saved {lastSavedAt ? `at ${lastSavedAt}` : ''}
                </span>
              )}
              {saveStatus === 'error' && (
                <span className="text-rose-600 flex items-center gap-1 font-medium">
                  <AlertCircle className="w-3 h-3" /> Auto-save failed
                </span>
              )}
              {saveStatus === 'idle' && (
                <span className="text-slate-400">Autosave active</span>
              )}
            </span>
          </div>
        </div>

        {/* Countdown Timer & Submit CTA */}
        <div className="flex items-center gap-4">
          <div
            className={`px-4 py-2 rounded-lg border font-mono font-bold text-base flex items-center gap-2 ${
              isTimeCritical
                ? 'bg-rose-50 border-rose-300 text-rose-700 animate-pulse'
                : 'bg-slate-50 border-slate-200 text-slate-800'
            }`}
          >
            <Clock className="w-4 h-4 text-indigo-600" />
            {formatTime(remainingSeconds)}
          </div>

          <Button
            size="sm"
            onClick={() => setShowSubmitModal(true)}
            className="bg-emerald-600 hover:bg-emerald-700 text-white flex items-center gap-1.5"
          >
            <Send className="w-3.5 h-3.5" /> Submit Test
          </Button>
        </div>
      </div>

      {/* Main Test Player Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Left / Center: Question Panel (3 cols) */}
        <div className="lg:col-span-3 space-y-4">
          <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-sm min-h-[420px] flex flex-col justify-between">
            {currentQ ? (
              <div className="space-y-6">
                {/* Question Header */}
                <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                  <span className="text-xs font-semibold px-2 py-0.5 rounded bg-slate-100 text-slate-700 uppercase">
                    {currentQ.type?.replace('_', ' ')}
                  </span>
                  <span className="text-xs text-slate-400 font-medium">
                    Question {currentIndex + 1}
                  </span>
                </div>

                {/* Prompt */}
                <div className="text-base font-medium text-slate-900 leading-relaxed">
                  {currentQ.prompt}
                </div>

                {/* Options / Input based on question type */}
                <div className="space-y-3 pt-2">
                  {currentQ.type === 'SINGLE_CHOICE' && (
                    <div className="space-y-2.5">
                      {(currentQ.options || []).map((opt) => {
                        const isSelected = currentAnswer.selectedOptions?.includes(opt.optionId);
                        return (
                          <label
                            key={opt.optionId}
                            onClick={() => handleSingleChoiceSelect(qId, opt.optionId)}
                            className={`flex items-center gap-3 p-3.5 rounded-lg border cursor-pointer transition select-none ${
                              isSelected
                                ? 'bg-indigo-50/70 border-indigo-500 text-indigo-900 shadow-sm'
                                : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50'
                            }`}
                          >
                            <input
                              type="radio"
                              name={`q_${qId}`}
                              checked={isSelected}
                              onChange={() => {}}
                              className="text-indigo-600 focus:ring-indigo-500"
                            />
                            <span className="text-sm font-medium">{opt.text}</span>
                          </label>
                        );
                      })}
                    </div>
                  )}

                  {currentQ.type === 'MULTI_SELECT' && (
                    <div className="space-y-2.5">
                      <p className="text-xs text-slate-400 mb-1 italic">
                        Select all options that apply:
                      </p>
                      {(currentQ.options || []).map((opt) => {
                        const isSelected = currentAnswer.selectedOptions?.includes(opt.optionId);
                        return (
                          <label
                            key={opt.optionId}
                            onClick={() => handleMultiChoiceToggle(qId, opt.optionId)}
                            className={`flex items-center gap-3 p-3.5 rounded-lg border cursor-pointer transition select-none ${
                              isSelected
                                ? 'bg-indigo-50/70 border-indigo-500 text-indigo-900 shadow-sm'
                                : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50'
                            }`}
                          >
                            <input
                              type="checkbox"
                              checked={isSelected}
                              onChange={() => {}}
                              className="rounded text-indigo-600 focus:ring-indigo-500"
                            />
                            <span className="text-sm font-medium">{opt.text}</span>
                          </label>
                        );
                      })}
                    </div>
                  )}

                  {currentQ.type === 'SHORT_ANSWER' && (
                    <div className="space-y-2">
                      <p className="text-xs text-slate-400 italic">
                        Type your concise answer below:
                      </p>
                      <input
                        type="text"
                        placeholder="Type answer here..."
                        value={currentAnswer.textAnswer || ''}
                        onChange={(e) => handleTextAnswerChange(qId, e.target.value)}
                        onBlur={() => handleTextAnswerBlur(qId)}
                        className="w-full px-4 py-3 rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-indigo-500 text-sm font-mono"
                      />
                    </div>
                  )}
                </div>
              </div>
            ) : (
              <div className="text-center py-16 text-slate-400">Question not found</div>
            )}

            {/* Prev / Next controls */}
            <div className="flex items-center justify-between pt-6 border-t border-slate-100 mt-6">
              <Button
                variant="outline"
                size="sm"
                disabled={currentIndex === 0}
                onClick={() => setCurrentIndex((prev) => Math.max(0, prev - 1))}
                className="flex items-center gap-1"
              >
                <ChevronLeft className="w-4 h-4" /> Previous
              </Button>

              <Button
                size="sm"
                disabled={currentIndex === questions.length - 1}
                onClick={() => setCurrentIndex((prev) => Math.min(questions.length - 1, prev + 1))}
                className="flex items-center gap-1"
              >
                Next <ChevronRight className="w-4 h-4" />
              </Button>
            </div>
          </div>
        </div>

        {/* Right: Question Navigator Palette (1 col) */}
        <div className="space-y-4">
          <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm space-y-4">
            <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
              Question Navigator
            </h3>

            {/* Answered progress bar */}
            <div>
              <div className="flex justify-between text-xs text-slate-500 mb-1">
                <span>Progress</span>
                <span className="font-semibold text-slate-900">
                  {totalAnsweredCount} / {questions.length} answered
                </span>
              </div>
              <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden">
                <div
                  className="h-full bg-indigo-600 transition-all duration-300"
                  style={{
                    width: `${questions.length > 0 ? (totalAnsweredCount / questions.length) * 100 : 0}%`
                  }}
                />
              </div>
            </div>

            {/* Grid of question buttons */}
            <div className="grid grid-cols-5 gap-2 pt-2">
              {questions.map((q, idx) => {
                const isAnswered = isQuestionAnswered(q._id || q.id);
                const isCurrent = idx === currentIndex;

                return (
                  <button
                    key={q._id || q.id}
                    type="button"
                    onClick={() => setCurrentIndex(idx)}
                    className={`h-9 w-full rounded-lg text-xs font-bold transition flex items-center justify-center border ${
                      isCurrent
                        ? 'border-indigo-600 ring-2 ring-indigo-200 bg-indigo-600 text-white'
                        : isAnswered
                        ? 'bg-emerald-50 border-emerald-300 text-emerald-800'
                        : 'bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100'
                    }`}
                  >
                    {idx + 1}
                  </button>
                );
              })}
            </div>

            {/* Legend */}
            <div className="pt-3 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-500">
              <span className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 inline-block" /> Answered
              </span>
              <span className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full bg-slate-200 inline-block" /> Unanswered
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Submit Confirmation Modal */}
      {showSubmitModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-xl border border-slate-200 max-w-md w-full p-6 shadow-xl space-y-4">
            <h3 className="text-base font-bold text-slate-900">Submit Assessment?</h3>

            <div className="bg-slate-50 rounded-lg p-3 text-xs text-slate-600 space-y-1">
              <p>
                <strong>Answered Questions:</strong> {totalAnsweredCount}
              </p>
              <p>
                <strong>Unanswered Questions:</strong> {unansweredCount}
              </p>
              {unansweredCount > 0 && (
                <p className="text-amber-700 font-semibold pt-1">
                  Notice: You have {unansweredCount} unanswered questions. Unanswered questions will receive 0 marks.
                </p>
              )}
            </div>

            <p className="text-xs text-slate-500">
              Are you sure you want to finalize your submission? You cannot alter your answers after submitting.
            </p>

            <div className="flex justify-end gap-3 pt-2">
              <Button
                variant="outline"
                size="sm"
                disabled={isSubmitting}
                onClick={() => setShowSubmitModal(false)}
              >
                Continue Assessment
              </Button>
              <Button
                size="sm"
                disabled={isSubmitting}
                onClick={handleManualSubmit}
                className="bg-emerald-600 hover:bg-emerald-700 text-white flex items-center gap-1.5"
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin" /> Evaluating...
                  </>
                ) : (
                  'Confirm & Submit'
                )}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

