import React, { createContext, useContext, useState, useEffect } from 'react';
import { configService } from '../services/index.js';

export const DEFAULT_FEATURE_FLAGS = Object.freeze({
  LEGACY_RECRUITER_FLOW: true,
  ALLOW_PUBLIC_STUDENT_SIGNUP: true,
  V3_OPPORTUNITIES_ENABLED: false,
  V3_MOCK_TESTS_ENABLED: false,
  V3_AI_INTERVIEWS_ENABLED: false,
  V3_HUMAN_INTERVIEWS_ENABLED: false,
  V3_READINESS_ENABLED: false,
  V3_AMBASSADORS_ENABLED: false,
  REQUIRE_AI_PASS_FOR_HUMAN_INTERVIEW: false
});

const FeatureFlagsContext = createContext({
  flags: DEFAULT_FEATURE_FLAGS,
  loading: false,
  refreshFlags: async () => {}
});

export const FeatureFlagsProvider = ({ initialFlags = null, children }) => {
  const [flags, setFlags] = useState(() =>
    initialFlags ? { ...DEFAULT_FEATURE_FLAGS, ...initialFlags } : DEFAULT_FEATURE_FLAGS
  );
  const [loading, setLoading] = useState(!initialFlags);

  const refreshFlags = async () => {
    try {
      const response = await configService.getFeatureFlags();
      if (response?.success && response.data) {
        setFlags({ ...DEFAULT_FEATURE_FLAGS, ...response.data });
      }
    } catch (err) {
      // Fall back to safe non-breaking defaults on network error
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!initialFlags) {
      refreshFlags();
    }
  }, []);

  return (
    <FeatureFlagsContext.Provider value={{ flags, loading, refreshFlags }}>
      {children}
    </FeatureFlagsContext.Provider>
  );
};

export const useFeatureFlags = () => {
  return useContext(FeatureFlagsContext);
};

export default FeatureFlagsContext;
