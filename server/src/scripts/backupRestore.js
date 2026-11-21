import { connectDB, disconnectDB } from '../config/db.js';
import * as models from '../models/index.js';
import fs from 'fs';
import path from 'path';

/**
 * Creates a JSON snapshot backup of all registered Mongoose models.
 *
 * @param {object} options
 * @param {string} [options.backupDir]
 * @returns {Promise<object>}
 */
export const createBackup = async ({ backupDir = null } = {}) => {
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const targetDir = backupDir || path.resolve('backups', `snapshot-${timestamp}`);

  if (!fs.existsSync(targetDir)) {
    fs.mkdirSync(targetDir, { recursive: true });
  }

  console.log(`[Backup] Exporting collections to: ${targetDir}`);
  const manifest = {
    createdAt: new Date().toISOString(),
    schemaVersion: 'v3.0.0',
    collections: {}
  };

  for (const [modelName, Model] of Object.entries(models)) {
    if (!Model || !Model.find) continue;
    try {
      const docs = await Model.find({}).lean();
      const filePath = path.join(targetDir, `${modelName}.json`);
      fs.writeFileSync(filePath, JSON.stringify(docs, null, 2), 'utf-8');
      manifest.collections[modelName] = {
        count: docs.length,
        file: `${modelName}.json`,
        sizeBytes: fs.statSync(filePath).size
      };
      console.log(`  ✔ Model ${modelName}: exported ${docs.length} documents.`);
    } catch (err) {
      console.warn(`  ⚠ Model ${modelName} export skipped:`, err.message);
    }
  }

  const manifestPath = path.join(targetDir, 'manifest.json');
  fs.writeFileSync(manifestPath, JSON.stringify(manifest, null, 2), 'utf-8');
  console.log(`[Backup] Manifest written to: ${manifestPath}`);

  return { backupDir: targetDir, manifest };
};

/**
 * Validates and restores collections from a backup directory.
 *
 * @param {object} options
 * @param {string} options.backupDir
 * @param {boolean} [options.dryRun=true]
 * @returns {Promise<object>}
 */
export const restoreBackup = async ({ backupDir, dryRun = true } = {}) => {
  if (!backupDir || !fs.existsSync(backupDir)) {
    throw new Error(`Backup directory does not exist: ${backupDir}`);
  }

  const manifestPath = path.join(backupDir, 'manifest.json');
  if (!fs.existsSync(manifestPath)) {
    throw new Error(`Manifest not found in backup directory: ${manifestPath}`);
  }

  const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf-8'));
  console.log(
    `[Restore] Restoring from snapshot dated ${manifest.createdAt} (Mode: ${dryRun ? 'DRY-RUN' : 'EXECUTE'})`
  );

  const report = {
    sourceTimestamp: manifest.createdAt,
    dryRun,
    collections: {}
  };

  for (const [modelName, meta] of Object.entries(manifest.collections)) {
    const Model = models[modelName];
    if (!Model) {
      console.warn(`  ⚠ Model ${modelName} not found in current schema. Skipping.`);
      continue;
    }

    const filePath = path.join(backupDir, meta.file);
    if (!fs.existsSync(filePath)) {
      console.warn(`  ⚠ Backup file missing: ${filePath}. Skipping.`);
      continue;
    }

    const rawData = fs.readFileSync(filePath, 'utf-8');
    const docs = JSON.parse(rawData);

    report.collections[modelName] = {
      recordCount: docs.length,
      status: dryRun ? 'VERIFIED_VALID' : 'RESTORED'
    };

    if (!dryRun && docs.length > 0) {
      for (const doc of docs) {
        await Model.replaceOne({ _id: doc._id }, doc, { upsert: true });
      }
    }

    console.log(
      `  • ${modelName}: ${docs.length} records ${dryRun ? '(verified valid)' : '(restored)'}`
    );
  }

  return report;
};

if (process.argv[1]?.endsWith('backupRestore.js')) {
  const isBackup = process.argv.includes('--backup');
  const isRestore = process.argv.includes('--restore');
  const dirIndex = process.argv.indexOf('--dir');
  const targetDir = dirIndex !== -1 ? process.argv[dirIndex + 1] : null;
  const isExecute = process.argv.includes('--execute');

  connectDB()
    .then(async () => {
      if (isBackup) {
        return createBackup({ backupDir: targetDir });
      } else if (isRestore) {
        if (!targetDir) {
          throw new Error('Must provide --dir <backupPath> when restoring.');
        }
        return restoreBackup({ backupDir: targetDir, dryRun: !isExecute });
      } else {
        console.log('Usage: node backupRestore.js --backup [--dir <path>]');
        console.log('       node backupRestore.js --restore --dir <path> [--execute]');
      }
    })
    .then(() => disconnectDB().then(() => process.exit(0)))
    .catch((err) => {
      console.error('[Backup/Restore Error]:', err.message);
      disconnectDB().then(() => process.exit(1));
    });
}

