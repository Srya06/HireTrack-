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
