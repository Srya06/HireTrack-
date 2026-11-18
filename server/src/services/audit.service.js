import { AuditLog } from '../models/auditLog.model.js';

const FORBIDDEN_METADATA_KEYS = new Set([
  'password',
  'passwordhash',
  'token',
  'accesstoken',
  'refreshtoken',
  'authorization',
  'secret',
  'resume',
  'transcript',
  'answerkey',
  'correctoption',
  'correctanswer'
]);

/**
 * Sanitizes audit metadata by allowlisting shallow non-sensitive keys and
 * stripping any secret, credential, resume, transcript, or answer-key fields.
 *
 * @param {object} metadata
 * @param {string[]|null} [allowedKeys=null]
 * @returns {object}
 */
export const sanitizeAuditMetadata = (metadata = {}, allowedKeys = null) => {
  if (!metadata || typeof metadata !== 'object' || Array.isArray(metadata)) {
    return {};
  }

  const allowSet = Array.isArray(allowedKeys) ? new Set(allowedKeys) : null;
  const sanitized = {};

  for (const [key, value] of Object.entries(metadata)) {
    if (FORBIDDEN_METADATA_KEYS.has(key.toLowerCase())) {
      continue;
    }
    if (allowSet && !allowSet.has(key)) {
      continue;
    }
    if (value !== undefined) {
      sanitized[key] = value;
    }
  }

  return sanitized;
};

/**
 * Single centralized audit writer for both v1 and v3 domain actions.
 *
 * @param {object} params
 * @param {string|import('mongoose').Types.ObjectId|null} [params.organizationId=null]
 * @param {string|import('mongoose').Types.ObjectId} params.actorId
 * @param {string} params.action
 * @param {string} [params.entityType]
 * @param {string|import('mongoose').Types.ObjectId|null} [params.entityId=null]
 * @param {string} [params.resourceType] - Legacy v1 alias for entityType
 * @param {string|import('mongoose').Types.ObjectId|null} [params.resourceId=null] - Legacy v1 alias for entityId
 * @param {object} [params.metadata={}]
 * @param {string[]|null} [params.allowedMetadataKeys=null]
 */
export const recordAuditEvent = async ({
  organizationId = null,
  actorId,
  action,
  entityType,
  entityId = null,
  resourceType,
  resourceId = null,
  metadata = {},
  allowedMetadataKeys = null
}) => {
  try {
    const resolvedEntityType = entityType || resourceType;
    const resolvedEntityId = entityId ?? resourceId ?? null;
    const sanitizedMetadata = sanitizeAuditMetadata(metadata, allowedMetadataKeys);

    const entry = await AuditLog.create({
      organizationId: organizationId || null,
      actorId,
      action,
      entityType: resolvedEntityType,
      entityId: resolvedEntityId,
      resourceType: resolvedEntityType,
      resourceId: resolvedEntityId,
      metadata: sanitizedMetadata
    });

    return entry.toJSON();
  } catch (err) {
    console.error('[AuditService] Failed to record audit log:', err.message);
    return null;
  }
};
