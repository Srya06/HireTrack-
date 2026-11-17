import api from './api.js';

export const getAdminOverview = async () => {
  const response = await api.get('/admin/overview');
  return response;
};

export const getPendingRecruiters = async (params = {}) => {
  const response = await api.get('/admin/recruiters/pending', { params });
  return response;
};

export const updateRecruiterApproval = async (recruiterId, data) => {
  const response = await api.patch(`/admin/recruiters/${recruiterId}/approval`, data);
  return response;
};

export const getUsers = async (params = {}) => {
  const response = await api.get('/admin/users', { params });
  return response;
};

export const updateUserStatus = async (userId, data) => {
  const response = await api.patch(`/admin/users/${userId}/status`, data);
  return response;
};

export const getAdminJobs = async (params = {}) => {
  const response = await api.get('/admin/jobs', { params });
  return response;
};

export const updateAdminJobStatus = async (jobId, data) => {
  const response = await api.patch(`/admin/jobs/${jobId}/status`, data);
  return response;
};

