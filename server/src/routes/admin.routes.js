import { Router } from 'express';
import { protect, authorizeRoles } from '../middleware/auth.middleware.js';
import { ROLES } from '../utils/constants.js';
import { sendSuccess } from '../utils/response.js';

const router = Router();

// Admin-only verification endpoint (used for RBAC verification)
router.get('/ping', protect, authorizeRoles(ROLES.ADMIN), (req, res) => {
  return sendSuccess(res, {
    message: 'Admin access verified',
    data: { role: req.user.role, adminId: req.user._id }
  });
});

export default router;
