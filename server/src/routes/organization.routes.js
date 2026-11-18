import { Router } from 'express';
import { protect } from '../middleware/auth.middleware.js';
import { attachOrganization } from '../middleware/org.middleware.js';
import { sendSuccess } from '../utils/response.js';
import { PERMISSION_MATRIX } from '../config/permissions.js';

const router = Router();

router.get('/current', protect, attachOrganization, (req, res) => {
  const capabilities = new Set();
  for (const role of req.membershipRoles) {
    const def = PERMISSION_MATRIX[role];
    if (def?.capabilities) {
      def.capabilities.forEach((c) => capabilities.add(c));
    }
  }

  return sendSuccess(res, {
    statusCode: 200,
    message: 'Current organization retrieved successfully',
    data: {
      organization: req.organization.toJSON(),
      memberships: req.memberships.map((m) => m.toJSON()),
      capabilities: Array.from(capabilities)
    }
  });
});

export default router;
