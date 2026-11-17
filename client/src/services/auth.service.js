import api from './api.js';

export const login = async (credentials) => {
  const response = await api.post('/auth/login', credentials);
  return response;
};

export const register = async (userData) => {
  const response = await api.post('/auth/register', userData);
  return response;
};

export const getMe = async () => {
  const response = await api.get('/auth/me');
  return response;
};

export const logout = async () => {
  const response = await api.post('/auth/logout');
  return response;
};

