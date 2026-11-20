import React, { useState } from 'react';
import { useSearchParams, useNavigate, Link } from 'react-router-dom';
import { authService } from '../../services/index.js';
import { useAuth } from '../../context/AuthContext.jsx';
import Card from '../../components/Card.jsx';
import Button from '../../components/Button.jsx';
import FormField from '../../components/FormField.jsx';
import {
  KeyRound,
  CheckCircle2,
  AlertCircle,
  ArrowRight,
  ShieldCheck,
  Lock
} from 'lucide-react';

export default function AcceptInvitation() {
  const [searchParams] = useSearchParams();
  const tokenFromUrl = searchParams.get('token') || '';
  const navigate = useNavigate();
  const { login } = useAuth();

  const [token, setToken] = useState(tokenFromUrl);
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [feedback, setFeedback] = useState({ type: '', message: '' });

  const handleSubmit = async (e) => {
    e.preventDefault();
    setFeedback({ type: '', message: '' });

    if (!token.trim()) {
      setFeedback({
        type: 'error',
        message: 'Invitation token is missing. Please use the link sent in your invitation email.'
      });
      return;
    }

    if (password.length < 8 || !/(?=.*[A-Za-z])(?=.*\d)/.test(password)) {
      setFeedback({
        type: 'error',
        message: 'Password must be at least 8 characters long and contain both letters and numbers.'
      });
      return;
    }

    if (password !== confirmPassword) {
      setFeedback({
        type: 'error',
        message: 'Passwords do not match. Please verify your new password.'
      });
      return;
    }

    setLoading(true);

    try {
      const res = await authService.acceptInvitation({
        token: token.trim(),
        password,
        confirmPassword
      });

      if (res && res.success) {
        setFeedback({
          type: 'success',
          message: 'Account activated successfully! Redirecting to your student dashboard...'
        });

        // If response returned auth credentials, update session
        const tokenVal = res.data?.token || res.data?.accessToken;
        const userVal = res.data?.user;
        if (tokenVal && userVal) {
          localStorage.setItem('hiretrack_token', tokenVal);
          localStorage.setItem('hiretrack_user', JSON.stringify(userVal));
          setTimeout(() => {
            window.location.href = '/student/dashboard';
          }, 1200);
        } else {
          setTimeout(() => {
            navigate('/login');
          }, 1500);
        }
      }
    } catch (err) {
      setFeedback({
        type: 'error',
        message: err.message || 'Invalid or expired invitation token. Please contact your placement administrator.'
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col justify-center py-12 sm:px-6 lg:px-8">
      <div className="sm:mx-auto sm:w-full sm:max-w-md text-center mb-6">
        <div className="inline-flex items-center justify-center w-12 h-12 rounded-xl bg-indigo-600 text-white shadow-md mb-3">
          <KeyRound className="w-6 h-6" />
        </div>
        <h2 className="text-2xl font-extrabold text-slate-900 tracking-tight">
          Activate Your Student Account
        </h2>
        <p className="mt-1 text-xs text-slate-500 max-w-sm mx-auto">
          Welcome to HireTrack! Set your account password to claim your placement record.
        </p>
      </div>

      <div className="sm:mx-auto sm:w-full sm:max-w-md px-4 sm:px-0">
        <Card>
          {feedback.message && (
            <div
              className={`p-3.5 mb-4 rounded-xl text-xs font-semibold flex items-center space-x-2 border ${
                feedback.type === 'success'
                  ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                  : 'bg-rose-50 text-rose-800 border-rose-200'
              }`}
            >
              {feedback.type === 'success' ? (
                <CheckCircle2 className="w-4 h-4 text-emerald-600 flex-shrink-0" />
              ) : (
                <AlertCircle className="w-4 h-4 text-rose-600 flex-shrink-0" />
              )}
              <span>{feedback.message}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            {!tokenFromUrl && (
              <FormField
                label="Invitation Token"
                id="inv-token"
                value={token}
                onChange={(e) => setToken(e.target.value)}
                placeholder="Paste your 64-character token"
                required
              />
            )}

            <FormField
              label="New Password"
              id="inv-password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              helperText="Minimum 8 characters with at least one letter and one number"
              required
            />

            <FormField
              label="Confirm New Password"
              id="inv-confirmPassword"
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              placeholder="••••••••"
              required
            />

            <div className="pt-2">
              <Button
                type="submit"
                variant="primary"
                size="md"
                loading={loading}
                icon={ShieldCheck}
                className="w-full justify-center"
              >
                Set Password & Activate Account
              </Button>
            </div>
          </form>

          <div className="mt-6 pt-4 border-t border-slate-100 text-center">
            <Link
              to="/login"
              className="text-xs font-semibold text-indigo-600 hover:text-indigo-800 transition-colors inline-flex items-center space-x-1"
            >
              <span>Already active? Sign in to your account</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>
        </Card>
      </div>
    </div>
  );
}
