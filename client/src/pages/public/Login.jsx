import React, { useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext.jsx';
import Button from '../../components/Button.jsx';
import FormField from '../../components/FormField.jsx';
import Card from '../../components/Card.jsx';
import { LogIn, AlertCircle, Sparkles } from 'lucide-react';

export default function Login() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  const from = location.state?.from?.pathname;

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErrorMessage('');
    setLoading(true);

    try {
      const loggedInUser = await login({ email, password });
      if (from) {
        navigate(from, { replace: true });
      } else if (loggedInUser.role === 'admin') {
        navigate('/admin/dashboard', { replace: true });
      } else if (loggedInUser.role === 'recruiter') {
        navigate('/recruiter/dashboard', { replace: true });
      } else {
        navigate('/student/dashboard', { replace: true });
      }
    } catch (err) {
      setErrorMessage(err.message || 'Invalid credentials or account issue');
    } finally {
      setLoading(false);
    }
  };

  const fillCredentials = (userEmail, userPass) => {
    setEmail(userEmail);
    setPassword(userPass);
    setErrorMessage('');
  };

  return (
    <div className="min-h-[calc(100vh-8rem)] flex items-center justify-center p-4">
      <div className="w-full max-w-md space-y-6">
        <div className="text-center space-y-1">
          <h2 className="text-2xl font-bold text-slate-900">Sign in to HireTrack</h2>
          <p className="text-sm text-slate-500">Access your placement account</p>
        </div>

        {/* Demo Fast-Fill helper pill */}
        <div className="bg-indigo-50/70 border border-indigo-100 rounded-xl p-3 space-y-2">
          <div className="flex items-center space-x-1.5 text-xs font-semibold text-indigo-900">
            <Sparkles className="w-3.5 h-3.5 text-indigo-600" />
            <span>Quick Demo Credentials</span>
          </div>
          <div className="flex flex-wrap gap-1.5">
            <button
              type="button"
              onClick={() => fillCredentials('admin@hiretrack.edu', 'Admin@HireTrack2026!')}
              className="text-xs bg-white text-indigo-700 px-2.5 py-1 rounded-md border border-indigo-200 hover:bg-indigo-50 font-medium"
            >
              Demo Admin
            </button>
            <button
              type="button"
              onClick={() => fillCredentials('recruiter@google.com', 'Recruiter123!')}
              className="text-xs bg-white text-slate-700 px-2.5 py-1 rounded-md border border-slate-200 hover:bg-slate-50 font-medium"
            >
              Demo Recruiter
            </button>
            <button
              type="button"
              onClick={() => fillCredentials('student@hiretrack.edu', 'Student123!')}
              className="text-xs bg-white text-slate-700 px-2.5 py-1 rounded-md border border-slate-200 hover:bg-slate-50 font-medium"
            >
              Demo Student
            </button>
          </div>
        </div>

        <Card>
          <form onSubmit={handleSubmit} className="space-y-4">
            {errorMessage && (
              <div className="p-3 rounded-lg bg-rose-50 border border-rose-200 text-rose-700 text-xs flex items-start space-x-2">
                <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
                <span>{errorMessage}</span>
              </div>
            )}

            <FormField
              label="Email address"
              id="login-email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@college.edu or company@domain.com"
              required
            />

            <FormField
              label="Password"
              id="login-password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Enter your password"
              required
            />

            <Button
              type="submit"
              variant="primary"
              className="w-full mt-2"
              loading={loading}
              icon={LogIn}
            >
              Sign In
            </Button>
          </form>

          <div className="mt-6 text-center text-xs text-slate-500">
            Don't have an account yet?{' '}
            <Link to="/register" className="font-semibold text-indigo-600 hover:text-indigo-500">
              Register here
            </Link>
          </div>
        </Card>
      </div>
    </div>
  );
}

