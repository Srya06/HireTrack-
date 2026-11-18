import { recordAuditEvent } from '../services/audit.service.js';

/**
 * Legacy v1 helper for recording administrative audit entries.
 * Delegates to the single v3 audit service so v1 writes keep working unchanged.
 */
export const logAdminAction = async ({
  organizationId = null,
  actorId,
  action,
  resourceType,
  resourceId = null,
  entityType,
  entityId = null,
  metadata = {}
}) => {
  return recordAuditEvent({
    organizationId,
    actorId,
    action,
    entityType: entityType || resourceType,
    entityId: entityId ?? resourceId,
    resourceType: resourceType || entityType,
    resourceId: resourceId ?? entityId,
    metadata
  });
};
