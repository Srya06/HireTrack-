import React from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext.jsx';
import { useFeatureFlags } from '../../context/FeatureFlagsContext.jsx';
import Button from '../../components/Button.jsx';
import { ShieldAlert, ArrowLeft } from 'lucide-react';

export default function AccessDenied() {
  const { user, membershipRoles = [] } = useAuth();
  const { flags } = useFeatureFlags();

  const getSafeHomeRoute = () => {
    if (!user) return '/';
    if (
      membershipRoles.some((r) =>
        ['ORG_ADMIN', 'PLACEMENT_COORDINATOR', 'AMBASSADOR_COORDINATOR'].includes(r)
      ) ||
      user.role === 'admin'
    ) {
      return '/admin/dashboard';
    }
    if (membershipRoles.includes('INTERVIEWER')) {
      return '/interviewer/dashboard';
    }
    if (user.role === 'recruiter' && flags.LEGACY_RECRUITER_FLOW) {
      return '/recruiter/dashboard';
    }
    if (membershipRoles.includes('STUDENT') || user.role === 'student') {
      return '/student/dashboard';
    }
    return '/';
  };

  return (
    <div className="min-h-[calc(100vh-12rem)] flex items-center justify-center p-4">
      <div className="max-w-md w-full text-center space-y-4 bg-white p-8 rounded-xl border border-slate-200 shadow-sm">
        <div className="w-12 h-12 rounded-full bg-rose-50 text-rose-600 flex items-center justify-center mx-auto">
          <ShieldAlert className="w-6 h-6" />
        </div>
        <h2 className="text-xl font-bold text-slate-900">Access Denied (403)</h2>
        <p className="text-sm text-slate-600">
          You do not have permission to access this resource or workspace. Please verify your organization role or contact your organization administrator.
        </p>
        {membershipRoles.length > 0 && (
          <div className="flex flex-wrap justify-center gap-1.5 pt-1">
            {membershipRoles.map((role) => (
              <span
                key={role}
                className="text-[10px] font-semibold uppercase tracking-wider px-2.5 py-0.5 rounded-full bg-slate-100 text-slate-700 border border-slate-200"
              >
                {role}
              </span>
            ))}
          </div>
        )}
        <div className="pt-2">
          <Link to={getSafeHomeRoute()}>
            <Button variant="primary" size="sm" icon={ArrowLeft}>
              Return to My Workspace
            </Button>
          </Link>
        </div>
      </div>
    </div>
  );
}
