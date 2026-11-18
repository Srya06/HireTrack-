/**
 * Centralized Feature Flag configuration for HireTrack v1 -> v3 incremental migration.
 *
 * All flags default to non-breaking v1-compatible values:
 * - LEGACY_RECRUITER_FLOW: true (keeps v1 recruiter/jobs/applications/interviews active)
 * - ALLOW_PUBLIC_STUDENT_SIGNUP: true (keeps v1 open student registration active)
 * - REQUIRE_AI_PASS_FOR_HUMAN_INTERVIEW: false (product truth: default OFF)
 * - V3_* module flags: false until each respective v3 chunk is enabled
 */

export const FEATURE_FLAG_DEFAULTS = Object.freeze({
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

/**
 * Parses an environment variable string into a boolean with a safe default fallback.
 * Recognizes 'true'/'1'/'yes' and 'false'/'0'/'no' (case-insensitive).
 *
 * @param {string|undefined} rawValue
 * @param {boolean} defaultValue
 * @returns {boolean}
 */
export const parseBooleanFlag = (rawValue, defaultValue) => {
  if (rawValue === undefined || rawValue === null || String(rawValue).trim() === '') {
    return defaultValue;
  }
  const normalized = String(rawValue).trim().toLowerCase();
  if (['true', '1', 'yes', 'on'].includes(normalized)) {
    return true;
  }
  if (['false', '0', 'no', 'off'].includes(normalized)) {
    return false;
  }
  return defaultValue;
};

/**
 * Resolves the allowlisted feature flags from process.env with safe defaults.
 * Never exposes arbitrary environment variables or secrets.
 *
 * @param {NodeJS.ProcessEnv} [sourceEnv=process.env]
 * @returns {Readonly<typeof FEATURE_FLAG_DEFAULTS>}
 */
export const getFeatureFlags = (sourceEnv = process.env) => {
  const resolved = {};
  for (const [key, defaultValue] of Object.entries(FEATURE_FLAG_DEFAULTS)) {
    resolved[key] = parseBooleanFlag(sourceEnv[key], defaultValue);
  }
  return Object.freeze(resolved);
};

/**
 * Helper to check a single allowlisted flag by name.
 *
 * @param {keyof typeof FEATURE_FLAG_DEFAULTS} flagName
 * @param {NodeJS.ProcessEnv} [sourceEnv=process.env]
 * @returns {boolean}
 */
export const isFeatureEnabled = (flagName, sourceEnv = process.env) => {
  if (!(flagName in FEATURE_FLAG_DEFAULTS)) {
    return false;
  }
  return parseBooleanFlag(sourceEnv[flagName], FEATURE_FLAG_DEFAULTS[flagName]);
};
