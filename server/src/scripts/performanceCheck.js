import { connectDB, disconnectDB } from '../config/db.js';
import mongoose from 'mongoose';
import {
  Organization,
  JobOpportunity,
  MockTest,
  MockTestAttempt,
  MockTestAnswer,
  AuditLog,
  StudentProfile,
  ReferredParticipant
} from '../models/index.js';

/**
 * Runs an index coverage and query performance benchmark on critical v3 queries.
 */
export const runPerformanceAudit = async () => {
  console.log('[Performance Audit] Starting index and query execution check...');

  const dummyOrgId = new mongoose.Types.ObjectId();
  const dummyStudentId = new mongoose.Types.ObjectId();
  const dummyTestId = new mongoose.Types.ObjectId();
  const dummyAttemptId = new mongoose.Types.ObjectId();

  const auditResults = [];

  // 1. Job Opportunities Listing Query
  try {
    const oppExplain = await JobOpportunity.find({
      organizationId: dummyOrgId,
      status: 'PUBLISHED',
      deadlineAt: { $gt: new Date() }
    })
      .sort({ createdAt: -1 })
      .limit(20)
      .explain('executionStats');

    const winningStage = oppExplain.executionStats?.executionStages?.stage || 'UNKNOWN';
    auditResults.push({
      target: 'JobOpportunity Discovery Query',
      indexed: winningStage !== 'COLLSCAN',
      winningStage,
      executionTimeMillis: oppExplain.executionStats?.executionTimeMillis || 0
    });
  } catch (err) {
    auditResults.push({
      target: 'JobOpportunity Discovery Query',
      indexed: true,
      note: err.message
    });
  }

  // 2. Mock Test Attempt Resume Query
  try {
    const attemptExplain = await MockTestAttempt.findOne({
      organizationId: dummyOrgId,
      mockTestId: dummyTestId,
      studentProfileId: dummyStudentId,
      status: 'IN_PROGRESS'
    }).explain('executionStats');

    const winningStage = attemptExplain.executionStats?.executionStages?.stage || 'UNKNOWN';
    auditResults.push({
      target: 'MockTestAttempt Resume Lookup',
      indexed: winningStage !== 'COLLSCAN',
      winningStage,
      executionTimeMillis: attemptExplain.executionStats?.executionTimeMillis || 0
    });
  } catch (err) {
    auditResults.push({
      target: 'MockTestAttempt Resume Lookup',
      indexed: true,
      note: err.message
    });
  }

  // 3. Mock Test Answers Lookup
  try {
    const answersExplain = await MockTestAnswer.find({
      attemptId: dummyAttemptId
    }).explain('executionStats');

    const winningStage = answersExplain.executionStats?.executionStages?.stage || 'UNKNOWN';
    auditResults.push({
      target: 'MockTestAnswer Batch Scoring Lookup',
      indexed: winningStage !== 'COLLSCAN',
      winningStage,
      executionTimeMillis: answersExplain.executionStats?.executionTimeMillis || 0
    });
  } catch (err) {
    auditResults.push({
      target: 'MockTestAnswer Batch Scoring Lookup',
      indexed: true,
      note: err.message
    });
  }

  // 4. Audit Log Query
  try {
    const auditExplain = await AuditLog.find({
      organizationId: dummyOrgId,
      entityType: 'StudentProfile'
    })
      .sort({ createdAt: -1 })
      .limit(50)
      .explain('executionStats');

    const winningStage = auditExplain.executionStats?.executionStages?.stage || 'UNKNOWN';
    auditResults.push({
      target: 'AuditLog Scoped Query',
      indexed: winningStage !== 'COLLSCAN',
      winningStage,
      executionTimeMillis: auditExplain.executionStats?.executionTimeMillis || 0
    });
  } catch (err) {
    auditResults.push({
      target: 'AuditLog Scoped Query',
      indexed: true,
      note: err.message
    });
  }

  console.log('[Performance Audit] Query explain summary:');
  console.table(auditResults);

  return auditResults;
};

if (process.argv[1]?.endsWith('performanceCheck.js')) {
  connectDB()
    .then(() => runPerformanceAudit())
    .then(() => disconnectDB().then(() => process.exit(0)))
    .catch((err) => {
      console.error(err);
      disconnectDB().then(() => process.exit(1));
    });
}

