import { connectDB, disconnectDB } from '../config/db.js';
import { env } from '../config/env.js';
import { Organization } from '../models/organization.model.js';
import { ORGANIZATION_STATUSES } from '../utils/constants.js';

/**
 * Idempotently creates or retrieves the default Organization from environment config.
 * Safe to invoke from seed scripts, migration scripts, or tests.
 *
 * @param {{ dryRun?: boolean, sourceEnv?: Record<string, string> }} [options={}]
 * @returns {Promise<{ organization: any, created: boolean }>}
 */
export const ensureDefaultOrganization = async ({ dryRun = false, sourceEnv = null } = {}) => {
  const name = (sourceEnv?.DEFAULT_ORG_NAME || env.DEFAULT_ORG_NAME || 'HireTrack Campus Organization').trim();
  const slug = (sourceEnv?.DEFAULT_ORG_SLUG || env.DEFAULT_ORG_SLUG || 'default-org').toLowerCase().trim();
  const timezone = (sourceEnv?.DEFAULT_ORG_TIMEZONE || env.DEFAULT_ORG_TIMEZONE || 'Asia/Kolkata').trim();
  const rawStatus = (sourceEnv?.DEFAULT_ORG_STATUS || env.DEFAULT_ORG_STATUS || ORGANIZATION_STATUSES.ACTIVE)
    .toLowerCase()
    .trim();
  const status = Object.values(ORGANIZATION_STATUSES).includes(rawStatus)
    ? rawStatus
    : ORGANIZATION_STATUSES.ACTIVE;

  const existing = await Organization.findOne({ slug });
  if (existing) {
    return { organization: existing, created: false };
  }

  if (dryRun) {
    return {
      organization: { _id: null, name, slug, timezone, status },
      created: true
    };
  }

  const createdOrg = await Organization.create({ name, slug, timezone, status });
  return { organization: createdOrg, created: true };
};

const runCli = async () => {
  try {
    const conn = await connectDB();
    if (!conn) {
      throw new Error('Database connection failed');
    }
    const { organization, created } = await ensureDefaultOrganization();
    console.log(
      `[Seed Org] ${created ? 'Created' : 'Found existing'} default organization (slug=${organization.slug}, timezone=${organization.timezone}, status=${organization.status})`
    );
    await disconnectDB();
    process.exit(0);
  } catch (err) {
    console.error('[Seed Org] Error:', err.message);
    await disconnectDB().catch(() => {});
    process.exit(1);
  }
};

if (process.argv[1] && process.argv[1].endsWith('seedDefaultOrg.js')) {
  runCli();
}
