import api from './api.js';

export const getStaff = async (params = {}) => {
  const response = await api.get('/admin/staff', { params });
  return response;
};

export const grantStaffRole = async (data) => {
  const response = await api.post('/admin/staff', data);
  return response;
};

export const updateStaffMembership = async (membershipId, data) => {
  const response = await api.patch(`/admin/staff/${membershipId}`, data);
  return response;
};
