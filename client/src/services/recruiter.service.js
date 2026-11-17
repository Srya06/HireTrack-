import api from './api.js';

export const getMyProfile = async () => {
  const response = await api.get('/recruiters/me');
  return response;
};

export const updateMyProfile = async (profileData) => {
  const response = await api.patch('/recruiters/me', profileData);
  return response;
};

