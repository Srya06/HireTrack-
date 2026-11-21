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

const SENSITIVE_KEY_PATTERNS = [
  /password/i,
  /token/i,
  /secret/i,
  /transcript/i,
  /resume/i,
  /answerkey/i,
  /correctoption/i,
  /correctanswer/i
];

export const isSensitiveAuditKey = (key = '') => {
  const lower = String(key).toLowerCase();
  if (FORBIDDEN_METADATA_KEYS.has(lower)) return true;
  return SENSITIVE_KEY_PATTERNS.some((pat) => pat.test(lower));
};

/**
 * Sanitizes audit metadata by recursively stripping any secret,
 * credential, resume, transcript, or answer-key fields.
 *
 * @param {object} metadata
 * @param {string[]|null} [allowedKeys=null]
 * @returns {object}
 */
export const sanitizeAuditMetadata = (metadata = {}, allowedKeys = null) => {
  if (!metadata || typeof metadata !== 'object') {
    return {};
  }
  if (Array.isArray(metadata)) {
    return metadata
      .map((item) => (typeof item === 'object' && item !== null ? sanitizeAuditMetadata(item) : item))
      .filter((item) => item !== undefined);
  }

  const allowSet = Array.isArray(allowedKeys) ? new Set(allowedKeys) : null;
  const sanitized = {};

  for (const [key, value] of Object.entries(metadata)) {
    if (isSensitiveAuditKey(key)) {
      continue;
    }
    if (allowSet && !allowSet.has(key)) {
      continue;
    }
    if (value !== undefined) {
      if (value && typeof value === 'object') {
        sanitized[key] = sanitizeAuditMetadata(value);
      } else {
        sanitized[key] = value;
      }
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
  actor,
  action,
  entityType,
  entityId = null,
  resourceType,
  resourceId = null,
  metadata = {},
  allowedMetadataKeys = null,
  ipAddress = null,
  userAgent = null
}) => {
  try {
    const resolvedActorId = actorId || actor?._id || actor?.id;
    const resolvedEntityType = entityType || resourceType;
    const resolvedEntityId = entityId ?? resourceId ?? null;
    const sanitizedMetadata = sanitizeAuditMetadata(metadata, allowedMetadataKeys);

    const entry = await AuditLog.create({
      organizationId: organizationId || null,
      actorId: resolvedActorId,
      action,
      entityType: resolvedEntityType,
      entityId: resolvedEntityId,
      resourceType: resolvedEntityType,
      resourceId: resolvedEntityId,
      metadata: sanitizedMetadata,
      ipAddress: ipAddress || null,
      userAgent: userAgent || null
    });

    return entry.toJSON();
  } catch (err) {
    console.error('[AuditService] Failed to record audit log:', err.message);
    return null;
  }
};

export const recordAuditLog = recordAuditEvent;

/**
 * Retrieves paginated audit logs for ORG_ADMIN with filters.
 * Scoped strictly to the caller's organization.
 */
export const getAuditLogs = async (organizationId, {
  page = 1,
  limit = 20,
  action,
  resourceType,
  actorId,
  startDate,
  endDate
} = {}) => {
  const pageNum = Math.max(1, parseInt(page, 10) || 1);
  const limitNum = Math.min(100, Math.max(1, parseInt(limit, 10) || 20));
  const skip = (pageNum - 1) * limitNum;

  const query = { organizationId };

  if (action) {
    query.action = action;
  }
  if (resourceType) {
    query.$or = [{ resourceType }, { entityType: resourceType }];
  }
  if (actorId) {
    query.actorId = actorId;
  }
  if (startDate || endDate) {
    query.createdAt = {};
    if (startDate) query.createdAt.$gte = new Date(startDate);
    if (endDate) query.createdAt.$lte = new Date(endDate);
  }

  const [total, logs] = await Promise.all([
    AuditLog.countDocuments(query),
    AuditLog.find(query)
      .populate('actorId', 'name email role')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limitNum)
      .lean()
  ]);

  const totalPages = Math.ceil(total / limitNum) || 1;

  return {
    logs: logs.map((log) => ({
      id: log._id,
      organizationId: log.organizationId,
      actor: log.actorId
        ? {
            id: log.actorId._id,
            name: log.actorId.name,
            email: log.actorId.email,
            role: log.actorId.role
          }
        : null,
      action: log.action,
      resourceType: log.resourceType || log.entityType,
      resourceId: log.resourceId || log.entityId,
      metadata: log.metadata || {},
      createdAt: log.createdAt
    })),
    pagination: {
      page: pageNum,
      limit: limitNum,
      total,
      totalPages,
      hasNextPage: pageNum < totalPages,
      hasPrevPage: pageNum > 1
    }
  };
};
