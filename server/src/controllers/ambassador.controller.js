import { asyncHandler } from '../utils/asyncHandler.js';
import { sendSuccess } from '../utils/response.js';
import * as ambassadorService from '../services/ambassador.service.js';

/**
 * POST /api/v1/ambassadors/apply
 * or POST /api/v1/students/me/ambassador/apply
 * Student applies to become an ambassador
 */
export const applyForAmbassador = asyncHandler(async (req, res) => {
  const { applicationNotes } = req.body;
  const reqMeta = {
    ipAddress: req.ip || req.connection?.remoteAddress,
    userAgent: req.headers['user-agent']
  };

  const profile = await ambassadorService.applyForAmbassador(
    req.organizationId,
    req.user._id,
    applicationNotes,
    reqMeta
  );

  return sendSuccess(res, {
    statusCode: 201,
    message: 'Ambassador application submitted successfully',
    data: profile
  });
});

/**
 * GET /api/v1/ambassadors/me
 * or GET /api/v1/students/me/ambassador
 * Student checks their ambassador status, active campaigns, code, and progress
 */
export const getMyAmbassadorStatus = asyncHandler(async (req, res) => {
  const result = await ambassadorService.getMyAmbassadorStatus(
    req.organizationId,
    req.user._id
  );

  return sendSuccess(res, {
    statusCode: 200,
    message: 'Ambassador profile and campaign details retrieved',
    data: result
  });
});

/**
 * GET /api/v1/ambassadors/me/referrals
 * or GET /api/v1/students/me/ambassador/referrals
 * Ambassador views captured referrals with masked contact information
 */
export const getMyReferrals = asyncHandler(async (req, res) => {
  const result = await ambassadorService.getMyReferrals(
    req.organizationId,
    req.user._id,
    req.query
  );

  return sendSuccess(res, {
    statusCode: 200,
    message: 'Ambassador referrals retrieved successfully',
    data: result
  });
});

/**
 * POST /api/v1/ambassadors/me/certificate/request
 * Ambassador requests certificate review upon hitting verified target
 */
export const requestCertificateReview = asyncHandler(async (req, res) => {
  const { campaignId } = req.body;
  const reqMeta = {
    ipAddress: req.ip || req.connection?.remoteAddress,
    userAgent: req.headers['user-agent']
  };

  const certificate = await ambassadorService.requestCertificateReview(
    req.organizationId,
    req.user._id,
    campaignId,
    reqMeta
  );

  return sendSuccess(res, {
    statusCode: 200,
    message: 'Ambassador certificate review requested successfully',
    data: certificate
  });
});

/**
 * POST /api/v1/referrals/capture
 * Public endpoint to submit a referral
 */
export const capturePublicReferral = asyncHandler(async (req, res) => {
  const reqMeta = {
    ipAddress: req.ip || req.connection?.remoteAddress,
    userAgent: req.headers['user-agent']
  };

  const result = await ambassadorService.capturePublicReferral(req.body, reqMeta);

  return sendSuccess(res, {
    statusCode: 201,
    message: result.message,
    data: result
  });
});

