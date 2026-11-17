import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { healthService } from '../../services/index.js';
import Button from '../../components/Button.jsx';
import Card from '../../components/Card.jsx';
import {
  GraduationCap,
  Building2,
  Shield,
  Activity,
  CheckCircle2,
  XCircle,
  RefreshCw,
  ArrowRight,
  Briefcase,
  FileCheck,
  TrendingUp
} from 'lucide-react';

export default function Landing() {
  const [healthData, setHealthData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchHealth = async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await healthService.getHealthStatus();
      setHealthData(response.data);
    } catch (err) {
      setError(err.message || 'Failed to connect to API');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchHealth();
  }, []);

  return (
    <div className="space-y-16 py-10 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto">
      {/* Hero Section */}
      <section className="text-center space-y-6 pt-6">
        <div className="inline-flex items-center space-x-2 bg-indigo-50 border border-indigo-200 text-indigo-700 px-3 py-1 rounded-full text-xs font-semibold uppercase tracking-wider">
          <span className="w-2 h-2 rounded-full bg-indigo-600 animate-pulse" />
          <span>Campus Placement Management System</span>
        </div>

        <h1 className="text-4xl sm:text-5xl font-extrabold text-slate-900 tracking-tight max-w-3xl mx-auto">
          One Integrated Platform for College Placements
        </h1>

        <p className="text-base sm:text-lg text-slate-600 max-w-2xl mx-auto leading-relaxed">
          HireTrack simplifies campus recruitment for students, visiting companies, and the placement cell. From eligibility checks to offer letters, all in one place.
        </p>

        <div className="flex flex-wrap items-center justify-center gap-4 pt-2">
          <Link to="/register">
            <Button variant="primary" size="lg" icon={ArrowRight}>
              Get Started Now
            </Button>
          </Link>
          <Link to="/login">
            <Button variant="outline" size="lg">
              Sign In to Portal
            </Button>
          </Link>
        </div>
      </section>

      {/* Role Portals Grid */}
      <section className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card className="hover:border-indigo-300 transition-all">
          <div className="space-y-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
              <GraduationCap className="w-5 h-5" />
            </div>
            <h3 className="text-lg font-bold text-slate-900">Student Portal</h3>
            <p className="text-sm text-slate-600">
              Build your placement profile, upload verified resumes, check instant job eligibility, and track multi-round application progress.
            </p>
            <div className="pt-2">
              <Link to="/login">
                <span className="text-xs font-semibold text-emerald-600 hover:text-emerald-700 inline-flex items-center">
                  Student Sign In &rarr;
                </span>
              </Link>
            </div>
          </div>
        </Card>

        <Card className="hover:border-indigo-300 transition-all">
          <div className="space-y-3">
            <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center">
              <Building2 className="w-5 h-5" />
            </div>
            <h3 className="text-lg font-bold text-slate-900">Recruiter Portal</h3>
            <p className="text-sm text-slate-600">
              Publish campus drives, review pre-screened student profiles, download resumes, and manage interview schedules with full status governance.
            </p>
            <div className="pt-2">
              <Link to="/login">
                <span className="text-xs font-semibold text-blue-600 hover:text-blue-700 inline-flex items-center">
                  Recruiter Sign In &rarr;
                </span>
              </Link>
            </div>
          </div>
        </Card>

        <Card className="hover:border-indigo-300 transition-all">
          <div className="space-y-3">
            <div className="w-10 h-10 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center">
              <Shield className="w-5 h-5" />
            </div>
            <h3 className="text-lg font-bold text-slate-900">Admin Portal</h3>
            <p className="text-sm text-slate-600">
              Placement cell moderation: approve recruiter registrations, oversee job drives, moderate user access, and view real-time placement statistics.
            </p>
            <div className="pt-2">
              <Link to="/login">
                <span className="text-xs font-semibold text-purple-600 hover:text-purple-700 inline-flex items-center">
                  Placement Officer Sign In &rarr;
                </span>
              </Link>
            </div>
          </div>
        </Card>
      </section>

      {/* Backend API Health Status Card (Maintains Smoke Test Compatibility) */}
      <section className="bg-white rounded-xl border border-slate-200 p-6 space-y-4 shadow-sm">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <Activity className="w-5 h-5 text-indigo-600" />
            <h2 className="text-base font-semibold text-slate-900">Backend API Health Status</h2>
          </div>
          <button
            onClick={fetchHealth}
            disabled={loading}
            className="inline-flex items-center space-x-1.5 px-3 py-1.5 text-xs font-medium rounded-md text-indigo-700 bg-indigo-50 hover:bg-indigo-100 transition-colors disabled:opacity-50"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
            <span>Refresh</span>
          </button>
        </div>

        {loading ? (
          <div data-testid="health-loading" className="flex items-center space-x-3 text-slate-500 py-3">
            <RefreshCw className="w-4 h-4 animate-spin text-indigo-600" />
            <span className="text-xs sm:text-sm">Connecting to /api/v1/health...</span>
          </div>
        ) : error ? (
          <div data-testid="health-error" className="bg-rose-50 border border-rose-200 rounded-lg p-4 flex items-start space-x-3">
            <XCircle className="w-5 h-5 text-rose-600 flex-shrink-0 mt-0.5" />
            <div>
              <h3 className="text-xs sm:text-sm font-semibold text-rose-900">API Connection Failed</h3>
              <p className="text-xs text-rose-700 mt-1">{error}</p>
            </div>
          </div>
        ) : (
          <div data-testid="health-success" className="bg-emerald-50 border border-emerald-200 rounded-lg p-4 space-y-3">
            <div className="flex items-center space-x-2 text-emerald-800 font-medium text-xs sm:text-sm">
              <CheckCircle2 className="w-4 h-4 text-emerald-600" />
              <span>API Status: {healthData?.status?.toUpperCase()}</span>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2 border-t border-emerald-200 text-xs text-emerald-900">
              <div>
                <span className="text-slate-500 block">Database Status:</span>
                <span className="font-semibold uppercase">{healthData?.database?.state}</span>
              </div>
              <div>
                <span className="text-slate-500 block">Server Uptime:</span>
                <span className="font-semibold">{Math.floor(healthData?.uptime || 0)}s</span>
              </div>
              <div>
                <span className="text-slate-500 block">Database Host:</span>
                <span className="font-mono text-[11px] truncate block">{healthData?.database?.host || 'atlas'}</span>
              </div>
            </div>
          </div>
        )}
      </section>
    </div>
  );
}

