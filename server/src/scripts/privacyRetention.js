import { connectDB, disconnectDB } from '../config/db.js';
import {
  Organization,
  InstitutePolicy,
  AiInterviewTurn,
  AiMockInterviewSession,
  MockTestAnswer,
  AuditLog,
  StudentProfile,
  User
} from '../models/index.js';
import { DEFAULT_RETENTION_POLICY } from '../controllers/policyAdmin.controller.js';
import { recordAuditEvent } from '../services/audit.service.js';
import { exportStudentData } from '../services/student.service.js';
import fs from 'fs';
import path from 'path';

/**
 * Executes a data retention scan and purge across organizations.
 *
 * @param {object} options
 * @param {boolean} [options.dryRun=true]
 * @param {string|null} [options.orgId=null]
 * @param {string|null} [options.exportStudentId=null]
 */
export const runRetentionMaintenance = async ({
  dryRun = true,
  orgId = null,
  exportStudentId = null
} = {}) => {
  console.log(`[Retention Maintenance] Starting run (Mode: ${dryRun ? 'DRY-RUN' : 'EXECUTE'})...`);

  if (exportStudentId) {
    console.log(`[Privacy Export] Exporting student data for User/Profile ID: ${exportStudentId}`);
    const data = await exportStudentData(exportStudentId);
    const outPath = path.resolve(`student-export-${exportStudentId}-${Date.now()}.json`);
    fs.writeFileSync(outPath, JSON.stringify(data, null, 2), 'utf-8');
    console.log(`[Privacy Export] Export written to: ${outPath}`);
    return { exported: true, path: outPath };
  }

  const orgQuery = orgId ? { _id: orgId } : {};
  const orgs = await Organization.find(orgQuery);

  const report = {
    executedAt: new Date().toISOString(),
    dryRun,
    organizationsScanned: orgs.length,
    results: []
  };

  for (const org of orgs) {
    const policyDoc = await InstitutePolicy.findOne({
      organizationId: org._id,
      policyKey: 'dataRetention'
    });
    const policy = policyDoc?.value || DEFAULT_RETENTION_POLICY;

    const now = new Date();
    const transcriptCutoff = new Date(
      now.getTime() - policy.interviewTranscriptRetentionDays * 24 * 60 * 60 * 1000
    );
    const attemptCutoff = new Date(
      now.getTime() - policy.assessmentAttemptRetentionDays * 24 * 60 * 60 * 1000
    );
    const auditCutoff = new Date(
      now.getTime() - policy.auditLogRetentionDays * 24 * 60 * 60 * 1000
    );

    // 1. Identify expired AI interview turns
    const expiredSessions = await AiMockInterviewSession.find({
      organizationId: org._id,
      createdAt: { $lt: transcriptCutoff }
    }).select('_id');
    const expiredSessionIds = expiredSessions.map((s) => s._id);

    const expiredTurnsCount = await AiInterviewTurn.countDocuments({
      organizationId: org._id,
      $or: [
        { sessionId: { $in: expiredSessionIds } },
        { createdAt: { $lt: transcriptCutoff } }
      ]
    });

    // 2. Identify expired mock test answers
    const expiredAnswersCount = await MockTestAnswer.countDocuments({
      organizationId: org._id,
      createdAt: { $lt: attemptCutoff }
    });

    // 3. Identify expired audit logs
    const expiredAuditLogsCount = await AuditLog.countDocuments({
      organizationId: org._id,
      createdAt: { $lt: auditCutoff }
    });

    const orgSummary = {
      organizationId: org._id.toString(),
      organizationName: org.name,
      policy,
      cutoffs: {
        transcriptCutoff: transcriptCutoff.toISOString(),
        attemptCutoff: attemptCutoff.toISOString(),
        auditCutoff: auditCutoff.toISOString()
      },
      counts: {
        expiredTurns: expiredTurnsCount,
        expiredAnswers: expiredAnswersCount,
        expiredAuditLogs: expiredAuditLogsCount
      },
      purged: !dryRun
    };

    if (!dryRun) {
      if (expiredTurnsCount > 0) {
        await AiInterviewTurn.deleteMany({
          organizationId: org._id,
          $or: [
            { sessionId: { $in: expiredSessionIds } },
            { createdAt: { $lt: transcriptCutoff } }
          ]
        });
      }

      if (expiredAnswersCount > 0) {
        await MockTestAnswer.deleteMany({
          organizationId: org._id,
          createdAt: { $lt: attemptCutoff }
        });
      }

      if (expiredAuditLogsCount > 0) {
        await AuditLog.deleteMany({
          organizationId: org._id,
          createdAt: { $lt: auditCutoff }
        });
      }

      await recordAuditEvent({
        organizationId: org._id,
        actorId: null,
        action: 'RETENTION_PURGE_EXECUTED',
        entityType: 'Organization',
        entityId: org._id,
        metadata: {
          purgedCounts: orgSummary.counts,
          cutoffs: orgSummary.cutoffs
        }
      });
    }

    report.results.push(orgSummary);
    console.log(
      `  • Org "${org.name}": Expired Turns: ${expiredTurnsCount}, Answers: ${expiredAnswersCount}, Logs: ${expiredAuditLogsCount} ${
        dryRun ? '(Scanned)' : '(PURGED)'
      }`
    );
  }

  return report;
};

// Standalone execution
if (process.argv[1]?.endsWith('privacyRetention.js')) {
  const isExecute = process.argv.includes('--execute');
  const exportArgIndex = process.argv.indexOf('--export-student');
  const exportStudentId = exportArgIndex !== -1 ? process.argv[exportArgIndex + 1] : null;

  connectDB()
    .then(() =>
      runRetentionMaintenance({
        dryRun: !isExecute,
        exportStudentId
      })
    )
    .then((result) => {
      console.log('[Retention Maintenance] Run completed successfully.');
      disconnectDB().then(() => process.exit(0));
    })
    .catch((err) => {
      console.error('[Retention Maintenance] Execution error:', err);
      disconnectDB().then(() => process.exit(1));
    });
}

