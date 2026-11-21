import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import {
  Bot,
  User,
  Send,
  Loader2,
  ArrowLeft,
  CheckCircle2,
  AlertCircle,
  ShieldCheck,
  Flag,
  HelpCircle
} from 'lucide-react';
import Button from '../../components/Button.jsx';
import * as aiInterviewService from '../../services/aiInterview.service.js';

export default function AiInterviewChat() {
  const { sessionId } = useParams();
  const navigate = useNavigate();

  const [session, setSession] = useState(null);
  const [turns, setTurns] = useState([]);
  const [inputValue, setInputValue] = useState('');
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState(null);
  const [showFinishModal, setShowFinishModal] = useState(false);

  const messagesEndRef = useRef(null);

  const scrollToBottom = () => {
    if (typeof messagesEndRef.current?.scrollIntoView === 'function') {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  };

  useEffect(() => {
    let mounted = true;

    const fetchSession = async () => {
      setLoading(true);
      setError(null);
      try {
        const res = await aiInterviewService.getSessionTranscript(sessionId);
        if (!mounted) return;

        const data = res.data?.data;
        if (!data || !data.session) {
          throw new Error('Interview session not found');
        }

        // If completed, redirect to feedback
        if (data.session.status === 'COMPLETED') {
          navigate(`/student/mock-interviews/ai/${sessionId}/feedback`, { replace: true });
          return;
        }

        setSession(data.session);
        setTurns(data.turns || []);
      } catch (err) {
        if (mounted) setError(err.message || 'Failed to load session');
      } finally {
        if (mounted) setLoading(false);
      }
    };

    fetchSession();
    return () => {
      mounted = false;
    };
  }, [sessionId, navigate]);

  useEffect(() => {
    scrollToBottom();
  }, [turns, sending]);

  const handleSendTurn = async (e) => {
    e?.preventDefault();
    const content = inputValue.trim();
    if (!content || sending) return;

    setSending(true);
    setError(null);

    // Optimistically add student turn
    const nextTurnNum = turns.length + 1;
    const optimisticTurn = {
      turnNumber: nextTurnNum,
      speaker: 'STUDENT',
      content,
      createdAt: new Date().toISOString()
    };
    setTurns((prev) => [...prev, optimisticTurn]);
    setInputValue('');

    try {
      const res = await aiInterviewService.submitTurn(sessionId, { content });
      const data = res.data?.data;

      if (data?.aiTurn) {
        setTurns((prev) => [...prev, data.aiTurn]);
      }

      if (data?.isConcluding) {
        // Concluded! Redirect to feedback report
        setTimeout(() => {
          navigate(`/student/mock-interviews/ai/${sessionId}/feedback`, { replace: true });
        }, 1200);
      }
    } catch (err) {
      setError(err.message || 'Failed to send response');
      // Revert optimistic turn on failure
      setTurns((prev) => prev.filter((t) => t.turnNumber !== nextTurnNum));
      setInputValue(content);
    } finally {
      setSending(false);
    }
  };

  const handleFinishEarly = async () => {
    setShowFinishModal(false);
    setSending(true);
    try {
      await aiInterviewService.completeSession(sessionId);
      navigate(`/student/mock-interviews/ai/${sessionId}/feedback`, { replace: true });
    } catch (err) {
      setError(err.message || 'Failed to complete interview session');
      setSending(false);
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] space-y-3">
        <Loader2 className="w-8 h-8 animate-spin text-indigo-600" />
        <p className="text-xs text-slate-500 font-medium">Connecting to AI Interviewer...</p>
      </div>
    );
  }

  if (error && !session) {
    return (
      <div className="max-w-xl mx-auto py-16 text-center space-y-4">
        <AlertCircle className="w-10 h-10 text-rose-500 mx-auto" />
        <h2 className="text-base font-bold text-slate-900">Session Error</h2>
        <p className="text-xs text-rose-700">{error}</p>
        <Link to="/student/mock-interviews">
          <Button variant="outline" size="sm">
            &larr; Back to Mock Interviews
          </Button>
        </Link>
      </div>
    );
  }

  const track = session?.track;
  const maxTurnChars = track?.questionConfig?.maxTurnChars || 1000;
  const maxQuestions = track?.questionConfig?.maxQuestions || 5;
  const currentQIndex = session?.currentQuestionIndex || 1;
  const isOverLimit = inputValue.length > maxTurnChars;

  return (
    <div className="max-w-4xl mx-auto flex flex-col h-[calc(100vh-140px)]">
      {/* Top Bar */}
      <div className="bg-white rounded-t-xl border border-slate-200 p-4 flex items-center justify-between gap-4 shrink-0 shadow-sm">
        <div className="flex items-center gap-3">
          <Link
            to="/student/mock-interviews"
            className="p-1 rounded-lg hover:bg-slate-100 text-slate-500"
            title="Back to tracks"
          >
            <ArrowLeft className="w-4 h-4" />
          </Link>
          <div>
            <h1 className="text-sm font-bold text-slate-900 flex items-center gap-2">
              <Bot className="w-4 h-4 text-indigo-600" />
              {track?.title || 'AI Mock Interview'}
            </h1>
            <p className="text-xs text-slate-400">
              Role: <strong>{track?.roleCategory}</strong> • Question {Math.min(currentQIndex, maxQuestions)} of {maxQuestions}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <span className="hidden sm:inline-flex items-center gap-1 text-[11px] text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200 font-medium">
            <ShieldCheck className="w-3 h-3" /> Zero PII Transmitted
          </span>

          <Button
            size="sm"
            variant="outline"
            onClick={() => setShowFinishModal(true)}
            className="text-xs text-slate-600"
          >
            Finish & Evaluate
          </Button>
        </div>
      </div>

      {/* Message Stream */}
      <div className="flex-1 bg-slate-50/70 border-x border-slate-200 p-4 sm:p-6 overflow-y-auto space-y-4">
        {turns.map((turn, idx) => {
          const isAI = turn.speaker === 'AI';

          return (
            <div
              key={turn.turnNumber || idx}
              className={`flex gap-3 max-w-2xl ${isAI ? 'mr-auto' : 'ml-auto flex-row-reverse'}`}
            >
              {/* Avatar */}
              <div
                className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 text-white ${
                  isAI ? 'bg-indigo-600' : 'bg-slate-700'
                }`}
              >
                {isAI ? <Bot className="w-4 h-4" /> : <User className="w-4 h-4" />}
              </div>

              {/* Message Bubble */}
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <span className="text-[11px] font-bold text-slate-500">
                    {isAI ? 'AI Interviewer' : 'You'}
                  </span>
                  {turn.isFollowUp && isAI && (
                    <span className="text-[10px] uppercase font-semibold px-1.5 py-0.2 rounded bg-amber-100 text-amber-800">
                      Follow-up
                    </span>
                  )}
                </div>

                <div
                  className={`p-3.5 rounded-2xl text-xs sm:text-sm leading-relaxed whitespace-pre-wrap ${
                    isAI
                      ? 'bg-white border border-slate-200 text-slate-800 shadow-sm rounded-tl-sm'
                      : 'bg-indigo-600 text-white shadow-sm rounded-tr-sm'
                  }`}
                >
                  {turn.content}
                </div>
              </div>
            </div>
          );
        })}

        {sending && (
          <div className="flex gap-3 max-w-xl mr-auto items-center text-slate-500 text-xs">
            <div className="w-8 h-8 rounded-full bg-indigo-600 text-white flex items-center justify-center shrink-0">
              <Bot className="w-4 h-4" />
            </div>
            <div className="bg-white border border-slate-200 px-4 py-2.5 rounded-2xl rounded-tl-sm shadow-sm flex items-center gap-2 text-indigo-600 font-medium">
              <Loader2 className="w-3.5 h-3.5 animate-spin" /> Interviewer is listening and preparing response...
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Input Area */}
      <div className="bg-white rounded-b-xl border border-slate-200 p-3 sm:p-4 shrink-0 shadow-sm space-y-2">
        {error && (
          <div className="p-2 bg-rose-50 border border-rose-200 rounded text-rose-800 text-xs flex items-center gap-1.5">
            <AlertCircle className="w-3.5 h-3.5 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSendTurn} className="space-y-2">
          <div className="relative">
            <textarea
              rows={3}
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  handleSendTurn();
                }
              }}
              placeholder="Type your response here... (Press Enter to send, Shift+Enter for new line)"
              disabled={sending}
              className="w-full resize-none p-3 text-xs sm:text-sm rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-indigo-500 disabled:bg-slate-50"
            />
          </div>

          <div className="flex items-center justify-between">
            <span
              className={`text-[11px] font-mono ${
                isOverLimit ? 'text-rose-600 font-bold' : 'text-slate-400'
              }`}
            >
              {inputValue.length} / {maxTurnChars} characters
            </span>

            <Button
              type="submit"
              size="sm"
              disabled={!inputValue.trim() || isOverLimit || sending}
              className="bg-indigo-600 hover:bg-indigo-700 text-white flex items-center gap-1.5"
            >
              {sending ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin" /> Sending...
                </>
              ) : (
                <>
                  Send Reply <Send className="w-3.5 h-3.5" />
                </>
              )}
            </Button>
          </div>
        </form>
      </div>

      {/* Finish Early Modal */}
      {showFinishModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-xl border border-slate-200 max-w-md w-full p-6 shadow-xl space-y-4">
            <h3 className="text-base font-bold text-slate-900">Finish Practice Interview?</h3>
            <p className="text-xs text-slate-600 leading-relaxed">
              Are you sure you want to conclude now? The AI evaluator will synthesize your responses so far and generate your structured feedback report.
            </p>
            <div className="flex justify-end gap-3 pt-2">
              <Button variant="outline" size="sm" onClick={() => setShowFinishModal(false)}>
                Continue Interview
              </Button>
              <Button
                size="sm"
                onClick={handleFinishEarly}
                className="bg-indigo-600 hover:bg-indigo-700 text-white"
              >
                Conclude & Evaluate
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
