import { asyncHandler } from '../utils/asyncHandler.js';
import { sendSuccess } from '../utils/response.js';
import * as opportunityService from '../services/opportunity.service.js';

// --- Staff Endpoints (/api/v1/admin/opportunities) ---

export const listAdmin = asyncHandler(async (req, res) => {
  const { page, limit, status, q, workMode } = req.query;
  const result = await opportunityService.listOpportunitiesAdmin(req.organizationId, {
    page,
    limit,
    status,
    q,
    workMode
  });

  return sendSuccess(res, {
    statusCode: 200,
    message: 'Opportunities retrieved successfully',
    data: result.opportunities,
    pagination: result.pagination
  });
});

export const createAdmin = asyncHandler(async (req, res) => {
  const result = await opportunityService.createOpportunity(
    req.organizationId,
    req.user,
    req.body
  );

  return sendSuccess(res, {
    statusCode: 201,
    message: 'Job opportunity created successfully',
    data: result
  });
});

export const getByIdAdmin = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const result = await opportunityService.getOpportunityByIdAdmin(req.organizationId, id);

  return sendSuccess(res, {
    statusCode: 200,
    message: 'Opportunity retrieved successfully',
    data: result
  });
});

export const updateAdmin = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const result = await opportunityService.updateOpportunity(
    req.organizationId,
    req.user,
    id,
    req.body
  );

  return sendSuccess(res, {
    statusCode: 200,
    message: 'Opportunity updated successfully',
    data: result
  });
});

export const publishAdmin = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const result = await opportunityService.publishOpportunity(req.organizationId, req.user, id);

  return sendSuccess(res, {
    statusCode: 200,
    message: 'Opportunity published successfully and visible to students',
    data: result
  });
});

export const closeAdmin = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const result = await opportunityService.closeOpportunity(req.organizationId, req.user, id);

  return sendSuccess(res, {
    statusCode: 200,
    message: 'Opportunity closed successfully',
    data: result
  });
});

export const archiveAdmin = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const result = await opportunityService.archiveOpportunity(req.organizationId, req.user, id);

  return sendSuccess(res, {
    statusCode: 200,
    message: 'Opportunity archived successfully',
    data: result
  });
});

// --- Student Endpoints (/api/v1/opportunities) ---

export const listStudent = asyncHandler(async (req, res) => {
  const { page, limit, q, workMode, location, company, status } = req.query;
  const result = await opportunityService.listOpportunitiesStudent(req.organizationId, {
    page,
    limit,
    q,
    workMode,
    location,
    company,
    status
  });

  return sendSuccess(res, {
    statusCode: 200,
    message: 'Published opportunities retrieved successfully',
    data: result.opportunities,
    pagination: result.pagination
  });
});

export const getByIdStudent = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const result = await opportunityService.getOpportunityByIdStudent(req.organizationId, id);

  return sendSuccess(res, {
    statusCode: 200,
    message: 'Opportunity details retrieved successfully',
    data: result
  });
});

