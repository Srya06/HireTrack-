import { asyncHandler } from '../utils/asyncHandler.js';
import { sendSuccess } from '../utils/response.js';
import * as opportunityEligibilityService from '../services/opportunityEligibility.service.js';

// --- Student Endpoints ---

export const getEligibilityForOpportunity = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const result = await opportunityEligibilityService.getOrEvaluateOpportunityEligibility(
    req.organizationId,
    id,
    req.user._id,
    false
  );

  return sendSuccess(res, {
    statusCode: 200,
    message: 'Opportunity eligibility retrieved successfully',
    data: result
  });
});

export const evaluateEligibilityForOpportunity = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const result = await opportunityEligibilityService.getOrEvaluateOpportunityEligibility(
    req.organizationId,
    id,
    req.user._id,
    true
  );

  return sendSuccess(res, {
    statusCode: 200,
    message: 'Opportunity eligibility evaluated successfully',
    data: result
  });
});

export const getMyEligibilityHistory = asyncHandler(async (req, res) => {
  const { page, limit } = req.query;
  const result = await opportunityEligibilityService.listStudentEligibility(
    req.organizationId,
    req.user._id,
    { page, limit }
  );

  return sendSuccess(res, {
    statusCode: 200,
    message: 'Student eligibility records retrieved successfully',
    data: result.evaluations,
    pagination: result.pagination
  });
});

// --- Staff Endpoints ---

export const getEligibilityCohortAdmin = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { page, limit, status, q } = req.query;
  const result = await opportunityEligibilityService.getOpportunityEligibilityCohort(
    req.organizationId,
    id,
    { page, limit, status, q }
  );

  return sendSuccess(res, {
    statusCode: 200,
    message: 'Opportunity eligibility cohort retrieved successfully',
    data: result.evaluations,
    pagination: result.pagination,
    metadata: { opportunity: result.opportunity }
  });
});

export const overrideEligibilityAdmin = asyncHandler(async (req, res) => {
  const { evaluationId } = req.params;
  const { overrideStatus, reason } = req.body;
  const result = await opportunityEligibilityService.overrideEligibilityEvaluation(
    req.organizationId,
    req.user,
    evaluationId,
    { overrideStatus, reason }
  );

  return sendSuccess(res, {
    statusCode: 200,
    message: 'Eligibility evaluation overridden successfully',
    data: result
  });
});
