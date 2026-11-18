import { connectDB, disconnectDB } from '../config/db.js';
import { User, StudentProfile, OrganizationMembership } from '../models/index.js';
import { ensureDefaultOrganization } from './seedDefaultOrg.js';
import { ROLES, MEMBERSHIP_ROLES, MEMBERSHIP_STATUSES } from '../utils/constants.js';

const ROLE_BACKFILL_MAP = Object.freeze({
  [ROLES.STUDENT]: MEMBERSHIP_ROLES.STUDENT,
  [ROLES.ADMIN]: MEMBERSHIP_ROLES.ORG_ADMIN
});

/**
 * Idempotent v3 organization & membership backfill migration.
 * - Assigns default organizationId to Users and StudentProfiles lacking one.
 * - Creates active OrganizationMemberships (student -> STUDENT, admin -> ORG_ADMIN).
 * - Supports --dry-run (performs zero writes and returns projected counts).
 * - Logs aggregate counts ONLY (zero PII).
 *
 * @param {{ dryRun?: boolean, logger?: Function }} [options={}]
 */
export const runOrgBackfill = async ({ dryRun = false, logger = console.log } = {}) => {
  const { organization, created: orgCreated } = await ensureDefaultOrganization({ dryRun });
  const defaultOrgId = organization?._id || null;

  const missingOrgFilter = {
    $or: [{ organizationId: { $exists: false } }, { organizationId: null }]
  };

  // 1. Users needing organizationId
  const usersNeedingOrgCount = await User.countDocuments(missingOrgFilter);
  let usersUpdated = 0;
  if (!dryRun && usersNeedingOrgCount > 0 && defaultOrgId) {
    const res = await User.updateMany(missingOrgFilter, { $set: { organizationId: defaultOrgId } });
    usersUpdated = res.modifiedCount || 0;
  } else if (dryRun) {
    usersUpdated = usersNeedingOrgCount;
  }

  // 2. StudentProfiles needing organizationId
  const profilesNeedingOrgCount = await StudentProfile.countDocuments(missingOrgFilter);
  let studentProfilesUpdated = 0;
  if (!dryRun && profilesNeedingOrgCount > 0 && defaultOrgId) {
    const res = await StudentProfile.updateMany(missingOrgFilter, {
      $set: { organizationId: defaultOrgId }
    });
    studentProfilesUpdated = res.modifiedCount || 0;
  } else if (dryRun) {
    studentProfilesUpdated = profilesNeedingOrgCount;
  }

  // 3. OrganizationMemberships for student -> STUDENT and admin -> ORG_ADMIN
  const eligibleUsers = await User.find(
    { role: { $in: [ROLES.STUDENT, ROLES.ADMIN] } },
    { _id: 1, role: 1, organizationId: 1 }
  ).lean();

  let membershipsCreated = 0;
  let membershipsSkipped = 0;

  for (const user of eligibleUsers) {
    const targetOrgId = user.organizationId || defaultOrgId;
    const targetRole = ROLE_BACKFILL_MAP[user.role];
    if (!targetRole) continue;

    // In dry-run when default org does not exist yet, every user without an org would get a new membership
    if (!targetOrgId) {
      membershipsCreated += 1;
      continue;
    }

    const exists = await OrganizationMembership.exists({
      organizationId: targetOrgId,
      userId: user._id,
      role: targetRole
    });

    if (exists) {
      membershipsSkipped += 1;
      continue;
    }

    if (!dryRun) {
      try {
        await OrganizationMembership.create({
          organizationId: targetOrgId,
          userId: user._id,
          role: targetRole,
          status: MEMBERSHIP_STATUSES.ACTIVE
        });
        membershipsCreated += 1;
      } catch (err) {
        if (err.code === 11000) {
          membershipsSkipped += 1;
        } else {
          throw err;
        }
      }
    } else {
      membershipsCreated += 1;
    }
  }

  const summary = {
    dryRun,
    defaultOrgCreated: orgCreated ? 1 : 0,
    usersUpdated,
    studentProfilesUpdated,
    membershipsCreated,
    membershipsSkipped
  };

  if (logger) {
    logger(
      `[Migrate v3-org-backfill] mode=${dryRun ? 'DRY_RUN' : 'APPLY'} defaultOrgCreated=${summary.defaultOrgCreated} usersUpdated=${summary.usersUpdated} studentProfilesUpdated=${summary.studentProfilesUpdated} membershipsCreated=${summary.membershipsCreated} membershipsSkipped=${summary.membershipsSkipped}`
    );
  }

  return summary;
};

const runCli = async () => {
  const dryRun = process.argv.includes('--dry-run');
  try {
    const conn = await connectDB();
    if (!conn) {
      throw new Error('Database connection failed');
    }
    await runOrgBackfill({ dryRun });
    await disconnectDB();
    process.exit(0);
  } catch (err) {
    console.error('[Migrate v3-org-backfill] Failed:', err.message);
    await disconnectDB().catch(() => {});
    process.exit(1);
  }
};

if (process.argv[1] && process.argv[1].endsWith('migrateOrgBackfill.js')) {
  runCli();
}
