import { asyncHandler } from '../utils/asyncHandler.js';
import { sendSuccess } from '../utils/response.js';
import * as readinessService from '../services/readiness.service.js';

/**
 * GET /api/v1/students/me/readiness
 * Authenticated student views their own readiness across domains.
 */
export const getStudentReadinessMe = asyncHandler(async (req, res) => {
  const readiness = await readinessService.getStudentReadiness(req.organizationId, req.user._id);

  return sendSuccess(res, {
    statusCode: 200,
    message: 'Student readiness aggregated successfully',
    data: readiness
  });
});

/**
 * GET /api/v1/admin/readiness/cohorts
 * Authorized placement staff views cohort-wide readiness.
 */
export const getCohortReadinessAdmin = asyncHandler(async (req, res) => {
  const result = await readinessService.getCohortReadiness(req.organizationId, req.query);

  return sendSuccess(res, {
    statusCode: 200,
    message: 'Cohort readiness retrieved successfully',
    data: result
  });
});

/**
 * GET /api/v1/admin/readiness/students/:studentId
 * Authorized placement staff inspects a specific student's readiness breakdown.
 */
export const getStudentReadinessAdmin = asyncHandler(async (req, res) => {
  const { studentId } = req.params;
  const readiness = await readinessService.getStudentReadinessForStaff(req.organizationId, studentId);

  return sendSuccess(res, {
    statusCode: 200,
    message: 'Student readiness details retrieved successfully',
    data: readiness
  });
});

