import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import {
  Clock,
  HelpCircle,
  Award,
  AlertTriangle,
  CheckCircle,
  ArrowLeft,
  Play,
  ShieldAlert,
  Loader2,
  FileText
} from 'lucide-react';
import Card from '../../components/Card.jsx';
import Button from '../../components/Button.jsx';
import * as mockTestService from '../../services/mockTest.service.js';

export default function MockTestInstructions() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [test, setTest] = useState(null);
  const [loading, setLoading] = useState(true);
  const [starting, setStarting] = useState(false);
  const [error, setError] = useState(null);
  const [agreed, setAgreed] = useState(false);

  useEffect(() => {
    const fetchTestDetails = async () => {
      setLoading(true);
      setError(null);
      try {
        const res = await mockTestService.getStudentMockTestById(id);
        if (res.data?.data) {
          setTest(res.data.data);
        }
      } catch (err) {
        setError(err.message || 'Failed to load test details');
      } finally {
        setLoading(false);
      }
    };
    fetchTestDetails();
  }, [id]);

  const handleStartAttempt = async () => {
    setStarting(true);
    setError(null);
    try {
      const res = await mockTestService.startOrResumeAttempt(id);
      const attemptData = res.data?.data?.attempt || res.data?.data;
      if (attemptData?._id) {
        navigate(`/student/mock-tests/attempts/${attemptData._id}`);
      } else {
        throw new Error('Failed to start test session');
      }
    } catch (err) {
      setError(err.message || 'Unable to start assessment');
      setStarting(false);
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[50vh] space-y-3">
        <Loader2 className="w-8 h-8 animate-spin text-indigo-600" />
        <p className="text-xs text-slate-500 font-medium">Loading assessment instructions...</p>
      </div>
    );
  }

  if (error && !test) {
    return (
      <div className="max-w-2xl mx-auto py-12 text-center space-y-4">
        <div className="bg-rose-50 border border-rose-200 rounded-xl p-6">
          <ShieldAlert className="w-8 h-8 text-rose-600 mx-auto mb-2" />
          <h2 className="text-base font-semibold text-rose-900">Assessment Unavailable</h2>
          <p className="text-xs text-rose-700 mt-1">{error}</p>
        </div>
        <Link to="/student/mock-tests">
          <Button variant="outline" size="sm">
            &larr; Back to Mock Tests
          </Button>
        </Link>
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      {/* Back button */}
      <Link
        to="/student/mock-tests"
        className="inline-flex items-center text-xs font-semibold text-slate-500 hover:text-slate-900 gap-1.5"
      >
        <ArrowLeft className="w-4 h-4" /> Back to Catalogue
      </Link>

      {/* Main Container */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        {/* Banner */}
        <div className="bg-gradient-to-r from-indigo-700 to-indigo-900 px-6 py-6 text-white">
          <span className="text-xs font-medium px-2.5 py-1 rounded bg-indigo-800/80 text-indigo-200 inline-block mb-2">
            {test.categoryId?.name || 'Standard Mock Test'}
          </span>
          <h1 className="text-2xl font-bold">{test.title}</h1>
          <p className="text-xs text-indigo-200 mt-1">
            {test.description || 'Pre-placement assessment module'}
          </p>
        </div>

        <div className="p-6 space-y-6">
          {/* Key Metrics */}
          <div className="grid grid-cols-3 gap-4 bg-slate-50 rounded-lg p-4 border border-slate-100 text-center">
            <div>
              <span className="text-xs text-slate-500 block font-medium">TOTAL TIME</span>
              <span className="text-base font-bold text-slate-800 flex items-center justify-center gap-1.5 mt-0.5">
                <Clock className="w-4 h-4 text-indigo-600" />
                {test.durationMinutes} Minutes
              </span>
            </div>
            <div>
              <span className="text-xs text-slate-500 block font-medium">TOTAL QUESTIONS</span>
              <span className="text-base font-bold text-slate-800 flex items-center justify-center gap-1.5 mt-0.5">
                <HelpCircle className="w-4 h-4 text-indigo-600" />
                {test.totalQuestions || 'Dynamic'}
              </span>
            </div>
            <div>
              <span className="text-xs text-slate-500 block font-medium">TOTAL MARKS</span>
              <span className="text-base font-bold text-slate-800 flex items-center justify-center gap-1.5 mt-0.5">
                <Award className="w-4 h-4 text-indigo-600" />
                {test.totalMarks || '--'} Marks
              </span>
            </div>
          </div>

          {/* Test Instructions */}
          <div className="space-y-3">
            <h2 className="text-sm font-bold text-slate-900 uppercase tracking-wider flex items-center gap-1.5">
              <FileText className="w-4 h-4 text-slate-600" />
              General Guidelines & Test Instructions
            </h2>
            <div className="bg-slate-50 rounded-lg p-4 border border-slate-100 text-xs text-slate-700 leading-relaxed whitespace-pre-line font-mono">
              {test.instructions ||
                '1. The assessment is timed. The countdown will continue once started.\n2. Answers are automatically saved on every selection.\n3. In case of disconnection or page reload, your timer and saved answers will safely resume.\n4. Do not open other tabs or close the assessment window.'}
            </div>
          </div>

          {/* Important Rules Alert */}
          <div className="rounded-lg bg-amber-50 border border-amber-200 p-4 space-y-2">
            <h3 className="text-xs font-bold text-amber-900 flex items-center gap-1.5">
              <AlertTriangle className="w-4 h-4 text-amber-600" />
              Assessment Rules & Integrity Policy
            </h3>
            <ul className="text-xs text-amber-800 list-disc list-inside space-y-1">
              <li>
                <strong>Single Attempt Session:</strong> Starting the test consumes 1 attempt against your limit of {test.attemptLimit || 1}.
              </li>
              <li>
                <strong>Server-Side Auto-Save:</strong> Each answer is recorded on the server immediately upon selection.
              </li>
              <li>
                <strong>Automatic Submission:</strong> If the timer expires, the server automatically submits your saved responses.
              </li>
            </ul>
          </div>

          {error && (
            <div className="p-3 bg-rose-50 border border-rose-200 rounded text-rose-800 text-xs">
              {error}
            </div>
          )}

          {/* Agreement Checkbox */}
          <label className="flex items-start gap-2.5 cursor-pointer select-none pt-2">
            <input
              type="checkbox"
              checked={agreed}
              onChange={(e) => setAgreed(e.target.checked)}
              className="mt-0.5 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
            />
            <span className="text-xs text-slate-600">
              I have read the instructions and understand the time limit and attempt rules. I am ready to begin the assessment.
            </span>
          </label>

          {/* Start CTA */}
          <div className="pt-2 flex justify-end gap-3">
            <Link to="/student/mock-tests">
              <Button variant="outline" size="sm">
                Cancel
              </Button>
            </Link>
            <Button
              size="sm"
              disabled={!agreed || starting}
              onClick={handleStartAttempt}
              className="bg-indigo-600 hover:bg-indigo-700 text-white flex items-center gap-1.5 px-6"
            >
              {starting ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" /> Starting...
                </>
              ) : (
                <>
                  <Play className="w-4 h-4" /> Start Assessment Now
                </>
              )}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
