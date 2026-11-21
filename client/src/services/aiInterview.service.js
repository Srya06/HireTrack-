import api from './api.js';

// --- Student Endpoints ---

export const getActiveAiTracks = async (params = {}) => {
  const response = await api.get('/ai-interviews/tracks', { params });
  return response;
};

export const getAiTrackById = async (id) => {
  const response = await api.get(`/ai-interviews/tracks/${id}`);
  return response;
};

export const startAiSession = async (trackId) => {
  const response = await api.post('/ai-interviews/sessions', { trackId });
  return response;
};

export const getSessionDetails = async (sessionId) => {
  const response = await api.get(`/ai-interviews/sessions/${sessionId}`);
  return response;
};

export const getSessionTranscript = async (sessionId) => {
  const response = await api.get(`/ai-interviews/sessions/${sessionId}/turns`);
  return response;
};

export const submitTurn = async (sessionId, data) => {
  const response = await api.post(`/ai-interviews/sessions/${sessionId}/turns`, data);
  return response;
};

export const completeSession = async (sessionId) => {
  const response = await api.post(`/ai-interviews/sessions/${sessionId}/complete`);
  return response;
};

export const retryEvaluation = async (sessionId) => {
  const response = await api.post(`/ai-interviews/sessions/${sessionId}/retry-evaluation`);
  return response;
};

export const getSessionFeedback = async (sessionId) => {
  const response = await api.get(`/ai-interviews/sessions/${sessionId}/feedback`);
  return response;
};

export const getStudentHistory = async (params = {}) => {
  const response = await api.get('/students/me/ai-interview-history', { params });
  return response;
};

// --- Staff / Admin Track Management ---

export const getAdminTracks = async (params = {}) => {
  const response = await api.get('/admin/interview-tracks', { params });
  return response;
};

export const createAdminTrack = async (data) => {
  const response = await api.post('/admin/interview-tracks', data);
  return response;
};

export const updateAdminTrack = async (id, data) => {
  const response = await api.patch(`/admin/interview-tracks/${id}`, data);
  return response;
};

export const archiveAdminTrack = async (id) => {
  const response = await api.delete(`/admin/interview-tracks/${id}`);
  return response;
};

