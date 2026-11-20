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

// HireTrack v3 Student Self-Profile
export const getMyProfileV3 = async () => {
  const response = await api.get('/students/me/profile');
  return response;
};

export const updateMyProfileV3 = async (profileData) => {
  const response = await api.patch('/students/me/profile', profileData);
  return response;
};

// HireTrack v3 Admin Student Directory & Master Record Management
export const getAdminStudents = async (params = {}) => {
  const response = await api.get('/admin/students', { params });
  return response;
};

export const updateStudentByStaff = async (id, data) => {
  const response = await api.patch(`/admin/students/${id}`, data);
  return response;
};

export const getImportTemplate = async () => {
  const response = await api.get('/admin/students/import/template', {
    responseType: 'blob'
  });
  return response;
};

export const importStudentsCsv = async (formDataOrPayload, { dryRun = true } = {}) => {
  const isMultipart = formDataOrPayload instanceof FormData;
  const config = {
    params: { dryRun },
    headers: isMultipart ? { 'Content-Type': 'multipart/form-data' } : {}
  };
  const response = await api.post('/admin/students/import', formDataOrPayload, config);
  return response;
};

export const getFileSignedUrl = async (fileAssetId) => {
  const response = await api.get(`/files/${fileAssetId}/signed-url`);
  return response;
};


