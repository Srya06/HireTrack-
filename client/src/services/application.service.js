import api from './api.js';

export const applyToJob = async (jobId) => {
  const response = await api.post(`/jobs/${jobId}/applications`);
  return response;
};

export const getMyApplications = async (params = {}) => {
  const response = await api.get('/applications/me', { params });
  return response;
};

export const getApplicationById = async (applicationId) => {
  const response = await api.get(`/applications/${applicationId}`);
  return response;
};

export const getJobApplications = async (jobId, params = {}) => {
  const response = await api.get(`/jobs/${jobId}/applications`, { params });
  return response;
};

export const updateApplicationStatus = async (applicationId, { status, note }) => {
  const response = await api.patch(`/applications/${applicationId}/status`, { status, note });
  return response;
};

export const withdrawApplication = async (applicationId) => {
  const response = await api.patch(`/applications/${applicationId}/withdraw`);
  return response;
};

