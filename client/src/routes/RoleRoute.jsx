import React from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';
import { Loader2 } from 'lucide-react';

export default function RoleRoute({ allowedRoles = [], allowedMemberships = [], children }) {
  const { user, membershipRoles = [], loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-indigo-600" />
      </div>
    );
  }

  const matchesRole = user && allowedRoles.includes(user.role);
  const matchesMembership =
    user &&
    allowedMemberships.length > 0 &&
    membershipRoles.some((m) => allowedMemberships.includes(m));

  if (!matchesRole && !matchesMembership) {
    return <Navigate to="/access-denied" replace />;
  }

  return children;
}

