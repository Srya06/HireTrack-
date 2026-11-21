import { asyncHandler } from '../utils/asyncHandler.js';
import { sendSuccess } from '../utils/response.js';
import * as ambassadorService from '../services/ambassador.service.js';

/**
 * GET /api/v1/admin/ambassadors/profiles
 * List ambassador applications
 */
export const getAmbassadorProfiles = asyncHandler(async (req, res) => {
  const result = await ambassadorService.getAmbassadorProfilesAdmin(req.organizationId, req.query);

  return sendSuccess(res, {
    statusCode: 200,
    message: 'Ambassador profiles retrieved successfully',
    data: result
  });
});

/**
 * PATCH /api/v1/admin/ambassadors/profiles/:id/status
 * Approve, reject, or suspend an ambassador profile
 */
export const updateAmbassadorStatus = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { status, reason } = req.body;
  const reqMeta = {
    ipAddress: req.ip || req.connection?.remoteAddress,
    userAgent: req.headers['user-agent']
  };

  const profile = await ambassadorService.updateAmbassadorStatusAdmin(
    req.organizationId,
    id,
    { status, reason },
    req.user,
    reqMeta
  );

  return sendSuccess(res, {
    statusCode: 200,
    message: `Ambassador status updated to ${status}`,
    data: profile
  });
});

/**
 * POST /api/v1/admin/ambassadors/campaigns
 * Create a new campaign
 */
export const createCampaign = asyncHandler(async (req, res) => {
  const reqMeta = {
    ipAddress: req.ip || req.connection?.remoteAddress,
    userAgent: req.headers['user-agent']
  };

  const campaign = await ambassadorService.createCampaignAdmin(
    req.organizationId,
    req.body,
    req.user,
    reqMeta
  );

  return sendSuccess(res, {
    statusCode: 201,
    message: 'Ambassador campaign created successfully',
    data: campaign
  });
});

/**
 * GET /api/v1/admin/ambassadors/campaigns
 * List campaigns
 */
export const getCampaigns = asyncHandler(async (req, res) => {
  const campaigns = await ambassadorService.getCampaignsAdmin(req.organizationId, req.query);

  return sendSuccess(res, {
    statusCode: 200,
    message: 'Ambassador campaigns retrieved successfully',
    data: campaigns
  });
});

/**
 * PATCH /api/v1/admin/ambassadors/campaigns/:id
 * Update campaign details
 */
export const updateCampaign = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const reqMeta = {
    ipAddress: req.ip || req.connection?.remoteAddress,
    userAgent: req.headers['user-agent']
  };

  const campaign = await ambassadorService.updateCampaignAdmin(
    req.organizationId,
    id,
    req.body,
    req.user,
    reqMeta
  );

  return sendSuccess(res, {
    statusCode: 200,
    message: 'Ambassador campaign updated successfully',
    data: campaign
  });
});

/**
 * GET /api/v1/admin/ambassadors/referrals
 * Verification queue of captured referrals
 */
export const getReferrals = asyncHandler(async (req, res) => {
  const result = await ambassadorService.getReferralsAdmin(req.organizationId, req.query);

  return sendSuccess(res, {
    statusCode: 200,
    message: 'Referred participants retrieved for verification',
    data: result
  });
});

/**
 * PATCH /api/v1/admin/ambassadors/referrals/:id/verify
 * Coordinator verifies, rejects, or flags duplicate referral
 */
export const verifyReferral = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { verificationStatus, reason, notes } = req.body;
  const reqMeta = {
    ipAddress: req.ip || req.connection?.remoteAddress,
    userAgent: req.headers['user-agent']
  };

  const referral = await ambassadorService.verifyReferralAdmin(
    req.organizationId,
    id,
    { verificationStatus, reason, notes },
    req.user,
    reqMeta
  );

  return sendSuccess(res, {
    statusCode: 200,
    message: `Referral status updated to ${verificationStatus}`,
    data: referral
  });
});

/**
 * GET /api/v1/admin/ambassadors/certificates
 * Certificate issuance review queue
 */
export const getCertificates = asyncHandler(async (req, res) => {
  const result = await ambassadorService.getCertificatesAdmin(req.organizationId, req.query);

  return sendSuccess(res, {
    statusCode: 200,
    message: 'Ambassador certificates retrieved successfully',
    data: result
  });
});

/**
 * PATCH /api/v1/admin/ambassadors/certificates/:id/status
 * Approve, issue, or reject certificate
 */
export const updateCertificateStatus = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { status, reason } = req.body;
  const reqMeta = {
    ipAddress: req.ip || req.connection?.remoteAddress,
    userAgent: req.headers['user-agent']
  };

  const certificate = await ambassadorService.updateCertificateStatusAdmin(
    req.organizationId,
    id,
    { status, reason },
    req.user,
    reqMeta
  );

  return sendSuccess(res, {
    statusCode: 200,
    message: `Certificate status updated to ${status}`,
    data: certificate
  });
});

/**
 * GET /api/v1/admin/ambassadors/reports
 * Ambassador program overview and metrics report
 */
export const getAmbassadorReports = asyncHandler(async (req, res) => {
  const report = await ambassadorService.getAmbassadorReportsAdmin(req.organizationId);

  return sendSuccess(res, {
    statusCode: 200,
    message: 'Ambassador program reports retrieved successfully',
    data: report
  });
});

