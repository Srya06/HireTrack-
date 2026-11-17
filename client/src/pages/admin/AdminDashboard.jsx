import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { adminService } from '../../services/index.js';
import StatCard from '../../components/StatCard.jsx';
import Card from '../../components/Card.jsx';
import Button from '../../components/Button.jsx';
import {
  GraduationCap,
  Building2,
  Briefcase,
  FileText,
  Award,
  ShieldCheck,
  Users,
  Clock,
  ArrowRight,
  Loader2,
  TrendingUp
} from 'lucide-react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid
} from 'recharts';

export default function AdminDashboard() {
  const [overview, setOverview] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchOverview = async () => {
      setLoading(true);
      setError(null);
      try {
        const response = await adminService.getAdminOverview();
        if (response.success && response.data) {
          setOverview(response.data);
        }
      } catch (err) {
        setError(err.message || 'Failed to load administration metrics');
      } finally {
        setLoading(false);
      }
    };

    fetchOverview();
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[50vh]">
        <Loader2 className="w-8 h-8 animate-spin text-indigo-600" />
      </div>
    );
  }

  const data = overview || {
    students: 0,
    approvedRecruiters: 0,
    activeJobs: 0,
    applications: 0,
    selectedStudents: 0
  };

  const chartData = [
    { name: 'Students', count: data.students, fill: '#4f46e5' },
    { name: 'Active Jobs', count: data.activeJobs, fill: '#0ea5e9' },
    { name: 'Applications', count: data.applications, fill: '#8b5cf6' },
    { name: 'Selected (Offers)', count: data.selectedStudents, fill: '#10b981' }
  ];

  return (
    <div className="space-y-6">
      {/* Overview Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center space-x-2 text-xs font-semibold text-indigo-600 mb-1">
            <ShieldCheck className="w-4 h-4" />
            <span>Placement Cell Directorate</span>
          </div>
          <h2 className="text-2xl font-bold text-slate-900 tracking-tight">
            Institutional Placement Overview
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Real-time persisted analytics, recruiter approvals, and candidate funnel metrics
          </p>
        </div>

        <div className="flex items-center space-x-2">
          <Link to="/admin/recruiters">
            <Button variant="outline" size="sm" icon={Building2}>
              Pending Recruiters
            </Button>
          </Link>
          <Link to="/admin/users">
            <Button variant="primary" size="sm" icon={Users}>
              Manage Users
            </Button>
          </Link>
        </div>
      </div>

      {/* Primary Persisted DB Metrics Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
        <StatCard
          title="Registered Students"
          value={data.students}
          subtitle="Enrolled candidates"
          icon={GraduationCap}
          color="indigo"
        />
        <StatCard
          title="Approved Recruiters"
          value={data.approvedRecruiters}
          subtitle="Verified corporate partners"
          icon={Building2}
          color="sky"
        />
        <StatCard
          title="Active Jobs"
          value={data.activeJobs}
          subtitle="Open campus hiring drives"
          icon={Briefcase}
          color="amber"
        />
        <StatCard
          title="Applications"
          value={data.applications}
          subtitle="Submitted across all drives"
          icon={FileText}
          color="indigo"
        />
        <StatCard
          title="Selected Students"
          value={data.selectedStudents}
          subtitle="Confirmed offers issued"
          icon={Award}
          color="emerald"
        />
      </div>

      {/* Applications Pipeline Overview */}
      <Card
        title="Applications Funnel Overview"
        subtitle="Institutional breakdown of all student applications across placement lifecycle stages"
      >
        <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-3 pt-2">
          {Object.entries({
            applied: { label: 'Applied', color: 'indigo' },
            under_review: { label: 'Under Review', color: 'sky' },
            shortlisted: { label: 'Shortlisted', color: 'amber' },
            interview_scheduled: { label: 'Interview Scheduled', color: 'purple' },
            selected: { label: 'Selected / Offer', color: 'emerald' },
            rejected: { label: 'Rejected', color: 'rose' },
            withdrawn: { label: 'Withdrawn', color: 'slate' }
          }).map(([key, config]) => {
            const count = data.statusBreakdown?.[key] || 0;
            const percentage =
              data.applications > 0 ? Math.round((count / data.applications) * 100) : 0;
            return (
              <div
                key={key}
                className="p-3 bg-slate-50 border border-slate-200 rounded-xl text-center space-y-1"
              >
                <div className="text-[10px] font-bold text-slate-500 uppercase tracking-wider truncate">
                  {config.label}
                </div>
                <div className="text-xl font-bold text-slate-900">{count}</div>
                <div className="text-[10px] text-slate-400 font-medium">
                  {percentage}% of total
                </div>
              </div>
            );
          })}
        </div>
      </Card>

      {/* Visual Analytics Chart */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2">
          <Card
            title="Placement Activity Funnel"
            subtitle="Breakdown of candidate engagement and hiring conversions"
          >
            <div className="h-72 w-full pt-4">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={chartData} margin={{ top: 10, right: 20, left: 0, bottom: 20 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                  <XAxis dataKey="name" tick={{ fontSize: 12, fill: '#64748b' }} />
                  <YAxis tick={{ fontSize: 12, fill: '#64748b' }} allowDecimals={false} />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: '#ffffff',
                      borderRadius: '8px',
                      border: '1px solid #e2e8f0',
                      fontSize: '12px'
                    }}
                  />
                  <Bar dataKey="count" radius={[6, 6, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </Card>
        </div>

        {/* Quick Management Shortcuts */}
        <div className="space-y-4">
          <Card title="Administrative Actions" subtitle="Direct links to moderation modules">
            <div className="space-y-3">
              <Link
                to="/admin/recruiters"
                className="block p-3 rounded-xl bg-slate-50 hover:bg-indigo-50/50 border border-slate-200 transition-colors group"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <div className="p-2 rounded-lg bg-blue-100 text-blue-700">
                      <Building2 className="w-4 h-4" />
                    </div>
                    <div>
                      <h4 className="text-sm font-semibold text-slate-900 group-hover:text-indigo-600 transition-colors">
                        Pending Approvals
                      </h4>
                      <p className="text-xs text-slate-500">Review new corporate registrations</p>
                    </div>
                  </div>
                  <ArrowRight className="w-4 h-4 text-slate-400 group-hover:text-indigo-600 transition-colors" />
                </div>
              </Link>

              <Link
                to="/admin/users"
                className="block p-3 rounded-xl bg-slate-50 hover:bg-indigo-50/50 border border-slate-200 transition-colors group"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <div className="p-2 rounded-lg bg-purple-100 text-purple-700">
                      <Users className="w-4 h-4" />
                    </div>
                    <div>
                      <h4 className="text-sm font-semibold text-slate-900 group-hover:text-indigo-600 transition-colors">
                        User Directory
                      </h4>
                      <p className="text-xs text-slate-500">Search and moderate user accounts</p>
                    </div>
                  </div>
                  <ArrowRight className="w-4 h-4 text-slate-400 group-hover:text-indigo-600 transition-colors" />
                </div>
              </Link>

              <Link
                to="/admin/jobs"
                className="block p-3 rounded-xl bg-slate-50 hover:bg-indigo-50/50 border border-slate-200 transition-colors group"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <div className="p-2 rounded-lg bg-amber-100 text-amber-700">
                      <Briefcase className="w-4 h-4" />
                    </div>
                    <div>
                      <h4 className="text-sm font-semibold text-slate-900 group-hover:text-indigo-600 transition-colors">
                        Job Drive Moderation
                      </h4>
                      <p className="text-xs text-slate-500">Oversee campus recruitment postings</p>
                    </div>
                  </div>
                  <ArrowRight className="w-4 h-4 text-slate-400 group-hover:text-indigo-600 transition-colors" />
                </div>
              </Link>
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}

