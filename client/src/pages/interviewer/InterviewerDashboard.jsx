import React from 'react';
import { useAuth } from '../../context/AuthContext.jsx';
import { useFeatureFlags } from '../../context/FeatureFlagsContext.jsx';
import Card from '../../components/Card.jsx';
import StatCard from '../../components/StatCard.jsx';
import { Calendar, ClipboardCheck, ShieldCheck, Clock } from 'lucide-react';

export default function InterviewerDashboard() {
  const { user, organization } = useAuth();
  const { flags } = useFeatureFlags();

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
        <div>
          <h2 className="text-xl font-bold text-slate-900">Interviewer Workspace</h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Signed in as <strong className="text-slate-700">{user?.name}</strong> •{' '}
            {organization?.name || 'Organization Workspace'} ({organization?.timezone || 'UTC'})
          </p>
        </div>
        <span className="inline-flex items-center space-x-1.5 text-xs font-semibold bg-amber-50 text-amber-800 border border-amber-200 px-3 py-1 rounded-full self-start sm:self-auto">
          <ShieldCheck className="w-3.5 h-3.5" />
          <span>Assigned Sessions Scope Only</span>
        </span>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <StatCard
          title="Assigned Sessions"
          value={0}
          subtitle="Sessions assigned directly to you"
          icon={Calendar}
          color="indigo"
        />
        <StatCard
          title="Pending Evaluations"
          value={0}
          subtitle="Feedback awaiting release"
          icon={ClipboardCheck}
          color="amber"
        />
        <StatCard
          title="Open Slots"
          value={0}
          subtitle="Upcoming bookable availability"
          icon={Clock}
          color="emerald"
        />
      </div>

      <Card
        title="Assigned Human Mock Interview Sessions"
        subtitle="Least-privilege view: interviewers only access sessions booked to their slots"
      >
        <div className="py-10 text-center space-y-2">
          <Calendar className="w-9 h-9 text-slate-300 mx-auto" />
          <p className="text-sm font-semibold text-slate-700">No assigned sessions yet</p>
          <p className="text-xs text-slate-500 max-w-md mx-auto">
            {flags.V3_HUMAN_INTERVIEWS_ENABLED
              ? 'Once students book your published availability slots, assigned sessions and evaluation forms will appear here.'
              : 'Human Mock Interview scheduling and evaluation workflows will appear here when enabled for your organization.'}
          </p>
        </div>
      </Card>
    </div>
  );
}
