import { Router } from 'express';
import { protect } from '../middleware/auth.middleware.js';
import { attachOrganization, authorizeMemberships } from '../middleware/org.middleware.js';
import { MEMBERSHIP_ROLES } from '../utils/constants.js';
import * as ambassadorAdminController from '../controllers/ambassadorAdmin.controller.js';

const router = Router();

const AMBASSADOR_STAFF_ROLES = [
  MEMBERSHIP_ROLES.ORG_ADMIN,
  MEMBERSHIP_ROLES.AMBASSADOR_COORDINATOR
];

// All routes require auth, organization context, and ORG_ADMIN or AMBASSADOR_COORDINATOR membership
router.use(protect, attachOrganization, authorizeMemberships(...AMBASSADOR_STAFF_ROLES));

// Ambassador Profile Approvals
router.get('/profiles', ambassadorAdminController.getAmbassadorProfiles);
router.patch('/profiles/:id/status', ambassadorAdminController.updateAmbassadorStatus);

// Campaign Management
router.post('/campaigns', ambassadorAdminController.createCampaign);
router.get('/campaigns', ambassadorAdminController.getCampaigns);
router.patch('/campaigns/:id', ambassadorAdminController.updateCampaign);

// Referral Verification Queue
router.get('/referrals', ambassadorAdminController.getReferrals);
router.patch('/referrals/:id/verify', ambassadorAdminController.verifyReferral);

// Certificate Review & Issuance Queue
router.get('/certificates', ambassadorAdminController.getCertificates);
router.patch('/certificates/:id/status', ambassadorAdminController.updateCertificateStatus);

// Reports
router.get('/reports', ambassadorAdminController.getAmbassadorReports);

export default router;

