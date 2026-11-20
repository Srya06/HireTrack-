import path from 'path';
import { fileURLToPath } from 'url';
import { connectDB, disconnectDB } from '../config/db.js';
import { StudentProfile, User, Organization, FileAsset } from '../models/index.js';
import { ensureDefaultOrganization } from './seedDefaultOrg.js';

/**
 * Idempotent v3 Resume to FileAsset migration script.
 * - Inspects existing StudentProfile records that have legacy resume metadata but lack fileAssetId.
 * - Creates private FileAsset records and links them to the student profiles.
 * - Supports --dry-run (performs zero DB writes and reports projected counts).
 * - Logs aggregate counts ONLY (zero PII).
 *
 * @param {{ dryRun?: boolean, logger?: Function }} [options={}]
 */
export const runResumeMigration = async ({ dryRun = false, logger = console.log } = {}) => {
  const { organization } = await ensureDefaultOrganization({ dryRun });
  const defaultOrgId = organization?._id || null;

  // Find profiles with resume object
  const profilesWithResume = await StudentProfile.find({
    resume: { $ne: null }
  }).lean();

  let totalWithResume = profilesWithResume.length;
  let alreadyMigrated = 0;
  let candidatesToMigrate = [];

  for (const profile of profilesWithResume) {
    if (profile.fileAssetId && profile.resumeObjectKey) {
      alreadyMigrated++;
    } else {
      candidatesToMigrate.push(profile);
    }
  }

  logger(`[V3 Resume Migration] Found ${totalWithResume} profiles with resume data.`);
  logger(`[V3 Resume Migration] ${alreadyMigrated} already linked to FileAssets (idempotent skip).`);
  logger(`[V3 Resume Migration] ${candidatesToMigrate.length} candidate profiles to migrate.`);

  let migratedCount = 0;

  if (dryRun) {
    logger(`[DRY-RUN] No database writes performed.`);
    logger(`[DRY-RUN] Projected FileAsset records to create: ${candidatesToMigrate.length}`);
    return {
      dryRun: true,
      totalWithResume,
      alreadyMigrated,
      migratedCount: candidatesToMigrate.length
    };
  }

  for (const profile of candidatesToMigrate) {
    let orgId = profile.organizationId;
    if (!orgId) {
      const user = await User.findById(profile.userId).select('organizationId').lean();
      orgId = user?.organizationId || defaultOrgId;
    }

    const legacyResume = profile.resume || {};
    const storageKey =
      legacyResume.publicId ||
      (legacyResume.url ? path.basename(legacyResume.url) : `resume_${profile.userId}`);
    const originalName = legacyResume.originalName || legacyResume.fileName || 'resume.pdf';
    const isCloudinary = legacyResume.url && legacyResume.url.includes('cloudinary');

    const fileAsset = await FileAsset.create({
      organizationId: orgId,
      ownerId: profile.userId,
      purpose: 'resume',
      originalName,
      fileName: originalName,
      mimeType: 'application/pdf',
      size: legacyResume.size || 0,
      storageProvider: isCloudinary ? 'cloudinary' : 'local',
      storageKey,
      isPrivate: true
    });

    await StudentProfile.updateOne(
      { _id: profile._id },
      {
        $set: {
          fileAssetId: fileAsset._id,
          resumeObjectKey: fileAsset.storageKey
        }
      }
    );

    migratedCount++;
  }

  logger(`[V3 Resume Migration] Successfully migrated ${migratedCount} resumes to FileAssets.`);
  return {
    dryRun: false,
    totalWithResume,
    alreadyMigrated,
    migratedCount
  };
};

const __filename = fileURLToPath(import.meta.url);
if (process.argv[1] === __filename) {
  const dryRun = process.argv.includes('--dry-run');
  (async () => {
    try {
      await connectDB();
      await runResumeMigration({ dryRun });
      await disconnectDB();
      process.exit(0);
    } catch (err) {
      console.error('[V3 Resume Migration Error]', err.message);
      process.exit(1);
    }
  })();
}
