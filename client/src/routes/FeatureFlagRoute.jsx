import React from 'react';
import { Navigate } from 'react-router-dom';
import { useFeatureFlags } from '../context/FeatureFlagsContext.jsx';

/**
 * Guards a route behind an allowlisted feature flag (e.g. LEGACY_RECRUITER_FLOW).
 */
export default function FeatureFlagRoute({ flag, redirectTo = '/access-denied', children }) {
  const { flags } = useFeatureFlags();

  if (!flags?.[flag]) {
    return <Navigate to={redirectTo} replace />;
  }

  return children;
}
