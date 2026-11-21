import api from './api.js';

// --- Staff Endpoints ---

export const getAdminOpportunities = async (params = {}) => {
  const response = await api.get('/admin/opportunities', { params });
  return response;
};

export const getAdminOpportunityById = async (id) => {
  const response = await api.get(`/admin/opportunities/${id}`);
  return response;
};

export const createOpportunity = async (data) => {
  const response = await api.post('/admin/opportunities', data);
  return response;
};

export const updateOpportunity = async (id, data) => {
  const response = await api.patch(`/admin/opportunities/${id}`, data);
  return response;
};

export const publishOpportunity = async (id) => {
  const response = await api.post(`/admin/opportunities/${id}/publish`);
  return response;
};

export const closeOpportunity = async (id) => {
  const response = await api.post(`/admin/opportunities/${id}/close`);
  return response;
};

export const archiveOpportunity = async (id) => {
  const response = await api.post(`/admin/opportunities/${id}/archive`);
  return response;
};

// --- Student Endpoints ---

export const getStudentOpportunities = async (params = {}) => {
  const response = await api.get('/opportunities', { params });
  return response;
};

export const getStudentOpportunityById = async (id) => {
  const response = await api.get(`/opportunities/${id}`);
  return response;
};

// --- Chunk V4 Eligibility Endpoints ---

export const getOpportunityEligibility = async (id) => {
  const response = await api.get(`/opportunities/${id}/eligibility`);
  return response;
};

export const evaluateOpportunityEligibility = async (id) => {
  const response = await api.post(`/opportunities/${id}/eligibility/evaluate`);
  return response;
};

export const getMyEligibilityHistory = async (params = {}) => {
  const response = await api.get('/opportunities/me/eligibility', { params });
  return response;
};

export const getOpportunityEligibilityCohort = async (id, params = {}) => {
  const response = await api.get(`/admin/opportunities/${id}/eligibility-results`, { params });
  return response;
};

export const overrideEligibility = async (evaluationId, data) => {
  const response = await api.post(`/admin/eligibility/${evaluationId}/override`, data);
  return response;
};

// --- Chunk V5 Application Tracking Endpoints ---

export const recordOpportunityApplicationStatus = async (opportunityId, data) => {
  const response = await api.post(`/opportunities/${opportunityId}/application-status`, data);
  return response;
};

export const recordOpportunityLinkClick = async (opportunityId) => {
  const response = await api.post(`/opportunities/${opportunityId}/application-link-click`);
  return response;
};

export const getStudentJobApplications = async (params = {}) => {
  const response = await api.get('/students/me/job-applications', { params });
  return response;
};

export const getAdminApplicationsReport = async (params = {}) => {
  const response = await api.get('/admin/applications', { params });
  return response;
};

export const verifyApplicationStaff = async (applicationId, data) => {
  const response = await api.patch(`/admin/applications/${applicationId}/verification`, data);
  return response;
};



