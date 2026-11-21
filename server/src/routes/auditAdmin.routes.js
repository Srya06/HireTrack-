import { Router } from 'express';
import * as auditController from '../controllers/audit.controller.js';
import { protect } from '../middleware/auth.middleware.js';
import { attachOrganization, authorizeMemberships } from '../middleware/org.middleware.js';
import { MEMBERSHIP_ROLES } from '../utils/constants.js';

const router = Router();

// Restricted strictly to ORG_ADMIN
router.use(protect, attachOrganization, authorizeMemberships(MEMBERSHIP_ROLES.ORG_ADMIN));

// GET /admin/audit-logs
router.get('/', auditController.getAuditLogs);

export default router;

