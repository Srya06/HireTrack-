import React, { useEffect, useState } from 'react';
import { getHealthStatus } from './services/health.service.js';
import { Activity, CheckCircle2, XCircle, RefreshCw, Shield, GraduationCap, Building2 } from 'lucide-react';

export default function App() {
  const [healthData, setHealthData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchHealth = async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await getHealthStatus();
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
    <div className="min-h-screen bg-slate-50 text-slate-900 flex flex-col">
      {/* Top Navigation */}
      <header className="bg-white border-b border-slate-200 sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="bg-indigo-600 text-white p-2 rounded-lg font-bold">
              HT
            </div>
            <span className="text-xl font-bold tracking-tight text-slate-900">HireTrack</span>
            <span className="text-xs bg-indigo-100 text-indigo-700 px-2 py-0.5 rounded-full font-medium">MVP</span>
          </div>

          <div className="flex items-center space-x-4">
            <span className="text-sm text-slate-500">Placement Management System</span>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
          <h1 className="text-2xl font-bold text-slate-900 mb-2">Foundation Initialized</h1>
          <p className="text-slate-600 text-sm">
            HireTrack single-college placement management system foundation is ready with modular Express API and React+Vite client.
          </p>
        </div>

        {/* System Health Card */}
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6 space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <Activity className="w-5 h-5 text-indigo-600" />
              <h2 className="text-lg font-semibold text-slate-900">Backend API Health Status</h2>
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
            <div data-testid="health-loading" className="flex items-center space-x-3 text-slate-500 py-4">
              <RefreshCw className="w-5 h-5 animate-spin text-indigo-600" />
              <span className="text-sm">Connecting to /api/v1/health...</span>
            </div>
          ) : error ? (
            <div data-testid="health-error" className="bg-rose-50 border border-rose-200 rounded-lg p-4 flex items-start space-x-3">
              <XCircle className="w-5 h-5 text-rose-600 flex-shrink-0 mt-0.5" />
              <div>
                <h3 className="text-sm font-semibold text-rose-900">API Connection Failed</h3>
                <p className="text-xs text-rose-700 mt-1">{error}</p>
                <p className="text-xs text-slate-500 mt-2">
                  Ensure backend server is running on <code className="bg-rose-100 px-1 py-0.5 rounded">http://localhost:5000</code>.
                </p>
              </div>
            </div>
          ) : (
            <div data-testid="health-success" className="bg-emerald-50 border border-emerald-200 rounded-lg p-4 space-y-3">
              <div className="flex items-center space-x-2 text-emerald-800 font-medium">
                <CheckCircle2 className="w-5 h-5 text-emerald-600" />
                <span>API Status: {healthData?.status?.toUpperCase()}</span>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2 border-t border-emerald-200 text-xs text-emerald-900">
                <div>
                  <span className="text-slate-500 block">Database Status:</span>
                  <span className="font-semibold uppercase">{healthData?.database?.state}</span>
                </div>
                <div>
                  <span className="text-slate-500 block">Server Uptime:</span>
                  <span className="font-mono">{Math.floor(healthData?.uptime || 0)}s</span>
                </div>
                <div>
                  <span className="text-slate-500 block">Reported At:</span>
                  <span className="font-mono">{healthData?.timestamp}</span>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* System Roles Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6 space-y-2">
            <div className="w-10 h-10 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center mb-4">
              <GraduationCap className="w-5 h-5" />
            </div>
            <h3 className="text-base font-semibold text-slate-900">Student Portal</h3>
            <p className="text-xs text-slate-500">
              Complete profile, upload resume, browse published eligible jobs, and track application progress.
            </p>
          </div>

          <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6 space-y-2">
            <div className="w-10 h-10 rounded-lg bg-sky-50 text-sky-600 flex items-center justify-center mb-4">
              <Building2 className="w-5 h-5" />
            </div>
            <h3 className="text-base font-semibold text-slate-900">Recruiter Portal</h3>
            <p className="text-xs text-slate-500">
              Admin approval required. Post campus drives, review eligible applicants, and update candidate stages.
            </p>
          </div>

          <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6 space-y-2">
            <div className="w-10 h-10 rounded-lg bg-purple-50 text-purple-600 flex items-center justify-center mb-4">
              <Shield className="w-5 h-5" />
            </div>
            <h3 className="text-base font-semibold text-slate-900">Admin Portal</h3>
            <p className="text-xs text-slate-500">
              Seeded administrator. Approve recruiters, monitor live placement metrics, and oversee placement drives.
            </p>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="bg-white border-t border-slate-200 py-4 text-center text-xs text-slate-500">
        HireTrack Single-College Placement System &bull; Demonstration MVP
      </footer>
    </div>
  );
}

