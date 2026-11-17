import api from './api.js';

export const getMyProfile = async () => {
  const response = await api.get('/students/me');
  return response;
};

export const updateMyProfile = async (profileData) => {
  const response = await api.patch('/students/me', profileData);
  return response;
};

export const uploadResume = async (formData) => {
  const response = await api.post('/students/me/resume', formData, {
    headers: {
      'Content-Type': 'multipart/form-data'
    }
  });
  return response;
};

