import { AuditLog } from '../models/auditLog.model.js';

/**
 * Creates an immutable audit log entry for administrative actions.
 * Only non-sensitive, allowlisted metadata is persisted.
 *
 * @param {object} params
 * @param {string|import('mongoose').Types.ObjectId} params.actorId
 * @param {string} params.action
 * @param {string} params.resourceType
 * @param {string|import('mongoose').Types.ObjectId} [params.resourceId=null]
 * @param {object} [params.metadata={}]
 */
export const logAdminAction = async ({
  actorId,
  action,
  resourceType,
  resourceId = null,
  metadata = {}
}) => {
  try {
    // Strip any sensitive properties if accidentally passed
    const sanitizedMetadata = { ...metadata };
    delete sanitizedMetadata.password;
    delete sanitizedMetadata.passwordHash;
    delete sanitizedMetadata.token;
    delete sanitizedMetadata.accessToken;
    delete sanitizedMetadata.resume;

    await AuditLog.create({
      actorId,
      action,
      resourceType,
      resourceId,
      metadata: sanitizedMetadata
    });
  } catch (err) {
    // Logging errors should not block critical operations but should be reported
    console.error('[AuditLog] Failed to record audit log:', err.message);
  }
};

