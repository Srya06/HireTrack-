import api from './api.js';

export const scheduleInterview = async (applicationId, data) => {
  const response = await api.post(`/applications/${applicationId}/interviews`, data);
  return response;
};

export const getInterviews = async (applicationId) => {
  const response = await api.get(`/applications/${applicationId}/interviews`);
  return response;
};

export const cancelInterview = async (interviewId, data) => {
  const response = await api.patch(`/interviews/${interviewId}/cancel`, data);
  return response;
};

