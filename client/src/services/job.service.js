import api from './api.js';

export const getJobs = async (params = {}) => {
  const response = await api.get('/jobs', { params });
  return response;
};

export const getJobById = async (jobId) => {
  const response = await api.get(`/jobs/${jobId}`);
  return response;
};

export const getMyJobs = async (params = {}) => {
  const response = await api.get('/jobs/mine', { params });
  return response;
};

export const createJob = async (jobData) => {
  const response = await api.post('/jobs', jobData);
  return response;
};

export const updateJob = async (jobId, jobData) => {
  const response = await api.patch(`/jobs/${jobId}`, jobData);
  return response;
};

export const publishJob = async (jobId) => {
  const response = await api.patch(`/jobs/${jobId}/publish`);
  return response;
};

export const closeJob = async (jobId) => {
  const response = await api.patch(`/jobs/${jobId}/close`);
  return response;
};

