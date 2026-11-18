import api from './api.js';

export const getFeatureFlags = async () => {
  const response = await api.get('/config/features');
  return response;
};
