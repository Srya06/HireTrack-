import { asyncHandler } from '../utils/asyncHandler.js';
import { sendSuccess } from '../utils/response.js';
import * as auditService from '../services/audit.service.js';

/**
 * GET /api/v1/admin/audit-logs
 * ORG_ADMIN only. Returns paginated audit trail for this organization.
 */
export const getAuditLogs = asyncHandler(async (req, res) => {
  const result = await auditService.getAuditLogs(req.organizationId, req.query);

  return sendSuccess(res, {
    statusCode: 200,
    message: 'Audit logs retrieved successfully',
    data: result.logs,
    pagination: result.pagination
  });
});

