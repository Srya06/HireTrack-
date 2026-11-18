import request from 'supertest';
import app from '../src/app.js';
import {
  FEATURE_FLAG_DEFAULTS,
  parseBooleanFlag,
  getFeatureFlags,
  isFeatureEnabled
} from '../src/config/features.js';

describe('Feature Flags Config & Endpoint Suite (CHUNK V0)', () => {
  const originalEnv = { ...process.env };

  afterEach(() => {
    // Restore modified feature flag environment variables
    for (const key of Object.keys(FEATURE_FLAG_DEFAULTS)) {
      if (originalEnv[key] === undefined) {
        delete process.env[key];
      } else {
        process.env[key] = originalEnv[key];
      }
    }
  });

  describe('Unit: features config helpers', () => {
    it('parses truthy, falsy, empty, and invalid string values safely', () => {
      expect(parseBooleanFlag('true', false)).toBe(true);
      expect(parseBooleanFlag('TRUE', false)).toBe(true);
      expect(parseBooleanFlag('1', false)).toBe(true);
      expect(parseBooleanFlag('yes', false)).toBe(true);
      expect(parseBooleanFlag('false', true)).toBe(false);
      expect(parseBooleanFlag('FALSE', true)).toBe(false);
      expect(parseBooleanFlag('0', true)).toBe(false);
      expect(parseBooleanFlag('no', true)).toBe(false);
      expect(parseBooleanFlag(undefined, true)).toBe(true);
      expect(parseBooleanFlag('', false)).toBe(false);
      expect(parseBooleanFlag('unexpected', true)).toBe(true);
      expect(parseBooleanFlag('unexpected', false)).toBe(false);
    });

    it('returns non-breaking v1 defaults when env flags are unset', () => {
      const flags = getFeatureFlags({});
      expect(flags.LEGACY_RECRUITER_FLOW).toBe(true);
      expect(flags.ALLOW_PUBLIC_STUDENT_SIGNUP).toBe(true);
      expect(flags.REQUIRE_AI_PASS_FOR_HUMAN_INTERVIEW).toBe(false);
      expect(flags.V3_OPPORTUNITIES_ENABLED).toBe(false);
      expect(flags.V3_MOCK_TESTS_ENABLED).toBe(false);
      expect(flags.V3_AI_INTERVIEWS_ENABLED).toBe(false);
      expect(flags.V3_HUMAN_INTERVIEWS_ENABLED).toBe(false);
      expect(flags.V3_READINESS_ENABLED).toBe(false);
      expect(flags.V3_AMBASSADORS_ENABLED).toBe(false);
    });

    it('checks individual allowlisted flags and rejects unknown flags safely', () => {
      expect(isFeatureEnabled('LEGACY_RECRUITER_FLOW', { LEGACY_RECRUITER_FLOW: 'false' })).toBe(false);
      expect(isFeatureEnabled('V3_MOCK_TESTS_ENABLED', { V3_MOCK_TESTS_ENABLED: 'true' })).toBe(true);
      expect(isFeatureEnabled('UNKNOWN_FLAG', { UNKNOWN_FLAG: 'true' })).toBe(false);
    });
  });

  describe('API: GET /api/v1/config/features', () => {
    it('returns 200 with v1 envelope and non-breaking default flags', async () => {
      for (const key of Object.keys(FEATURE_FLAG_DEFAULTS)) {
        delete process.env[key];
      }

      const res = await request(app).get('/api/v1/config/features');

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(typeof res.body.message).toBe('string');
      expect(res.body.data).toEqual({
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
    });

    it('reflects env overrides without leaking any secrets or unrelated env vars', async () => {
      process.env.LEGACY_RECRUITER_FLOW = 'false';
      process.env.ALLOW_PUBLIC_STUDENT_SIGNUP = '0';
      process.env.V3_OPPORTUNITIES_ENABLED = 'true';

      const res = await request(app).get('/api/v1/config/features');

      expect(res.status).toBe(200);
      expect(res.body.data.LEGACY_RECRUITER_FLOW).toBe(false);
      expect(res.body.data.ALLOW_PUBLIC_STUDENT_SIGNUP).toBe(false);
      expect(res.body.data.V3_OPPORTUNITIES_ENABLED).toBe(true);

      // Ensure no secrets leak
      expect(res.body.data.JWT_SECRET).toBeUndefined();
      expect(res.body.data.MONGODB_URI).toBeUndefined();
      expect(res.body.data.CLOUDINARY_API_SECRET).toBeUndefined();
      expect(Object.keys(res.body.data).sort()).toEqual(Object.keys(FEATURE_FLAG_DEFAULTS).sort());
    });

    it('denies mutating requests to /api/v1/config/features with 404', async () => {
      const res = await request(app)
        .post('/api/v1/config/features')
        .send({ LEGACY_RECRUITER_FLOW: false });

      expect(res.status).toBe(404);
      expect(res.body.success).toBe(false);
    });
  });
});
