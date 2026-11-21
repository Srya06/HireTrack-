import api from './api.js';

// --- Categories ---

export const getCategories = async (params = {}) => {
  const response = await api.get('/admin/test-categories', { params });
  return response;
};

export const createCategory = async (data) => {
  const response = await api.post('/admin/test-categories', data);
  return response;
};

export const updateCategory = async (id, data) => {
  const response = await api.patch(`/admin/test-categories/${id}`, data);
  return response;
};

export const archiveCategory = async (id) => {
  const response = await api.delete(`/admin/test-categories/${id}`);
  return response;
};

// --- Question Banks ---

export const getQuestionBanks = async (params = {}) => {
  const response = await api.get('/admin/question-banks', { params });
  return response;
};

export const createQuestionBank = async (data) => {
  const response = await api.post('/admin/question-banks', data);
  return response;
};

export const updateQuestionBank = async (id, data) => {
  const response = await api.patch(`/admin/question-banks/${id}`, data);
  return response;
};

export const archiveQuestionBank = async (id) => {
  const response = await api.delete(`/admin/question-banks/${id}`);
  return response;
};

// --- Questions ---

export const getQuestions = async (params = {}) => {
  const response = await api.get('/admin/questions', { params });
  return response;
};

export const getQuestionById = async (id) => {
  const response = await api.get(`/admin/questions/${id}`);
  return response;
};

export const createQuestion = async (data) => {
  const response = await api.post('/admin/questions', data);
  return response;
};

export const updateQuestion = async (id, data) => {
  const response = await api.patch(`/admin/questions/${id}`, data);
  return response;
};

export const archiveQuestion = async (id) => {
  const response = await api.delete(`/admin/questions/${id}`);
  return response;
};

// --- Mock Tests ---

export const getMockTests = async (params = {}) => {
  const response = await api.get('/admin/mock-tests', { params });
  return response;
};

export const getMockTestById = async (id) => {
  const response = await api.get(`/admin/mock-tests/${id}`);
  return response;
};

export const createMockTest = async (data) => {
  const response = await api.post('/admin/mock-tests', data);
  return response;
};

export const updateMockTest = async (id, data) => {
  const response = await api.patch(`/admin/mock-tests/${id}`, data);
  return response;
};

export const publishMockTest = async (id) => {
  const response = await api.post(`/admin/mock-tests/${id}/publish`);
  return response;
};

export const archiveMockTest = async (id) => {
  const response = await api.post(`/admin/mock-tests/${id}/archive`);
  return response;
};

export const getMockTestPreview = async (id) => {
  const response = await api.get(`/admin/mock-tests/${id}/preview`);
  return response;
};

// --- Student Endpoints ---

export const getStudentMockTests = async (params = {}) => {
  const response = await api.get('/mock-tests', { params });
  return response;
};

export const getStudentMockTestById = async (id) => {
  const response = await api.get(`/mock-tests/${id}`);
  return response;
};
