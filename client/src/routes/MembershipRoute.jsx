import React from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';
import { Loader2 } from 'lucide-react';

/**
 * Route guard driven strictly by active OrganizationMembership roles.
 * Redirects unauthorized users to /access-denied.
 */
export default function MembershipRoute({ allowedMemberships = [], children }) {
  const { user, membershipRoles = [], loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-indigo-600" />
      </div>
    );
  }

  const hasAccess =
    Boolean(user) && membershipRoles.some((role) => allowedMemberships.includes(role));

  if (!hasAccess) {
    return <Navigate to="/access-denied" replace />;
  }

  return children;
}
