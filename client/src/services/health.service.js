import api from './api.js';

export const getHealthStatus = async () => {
  return await api.get('/health');
};

