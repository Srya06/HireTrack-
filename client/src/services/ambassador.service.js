import api from './api';

const ambassadorService = {
  // --- Student Ambassador Endpoints ---

  applyAmbassador: async (applicationNotes) => {
    const res = await api.post('/students/me/ambassador/apply', { applicationNotes });
    return res.data;
  },

  getMyStatus: async () => {
    const res = await api.get('/students/me/ambassador');
    return res.data;
  },

  getMyReferrals: async (params = {}) => {
    const res = await api.get('/students/me/ambassador/referrals', { params });
    return res.data;
  },

  requestCertificateReview: async (campaignId) => {
    const res = await api.post('/students/me/ambassador/certificate/request', { campaignId });
    return res.data;
  },

  // --- Public Referral Capture ---

  captureReferral: async (data) => {
    const res = await api.post('/referrals/capture', data);
    return res.data;
  },

  // --- Coordinator & Admin Endpoints ---

  getAmbassadorProfiles: async (params = {}) => {
    const res = await api.get('/admin/ambassadors/profiles', { params });
    return res.data;
  },

  updateAmbassadorStatus: async (id, data) => {
    const res = await api.patch(`/admin/ambassadors/profiles/${id}/status`, data);
    return res.data;
  },

  getCampaigns: async (params = {}) => {
    const res = await api.get('/admin/ambassadors/campaigns', { params });
    return res.data;
  },

  createCampaign: async (data) => {
    const res = await api.post('/admin/ambassadors/campaigns', data);
    return res.data;
  },

  updateCampaign: async (id, data) => {
    const res = await api.patch(`/admin/ambassadors/campaigns/${id}`, data);
    return res.data;
  },

  getReferrals: async (params = {}) => {
    const res = await api.get('/admin/ambassadors/referrals', { params });
    return res.data;
  },

  verifyReferral: async (id, data) => {
    const res = await api.patch(`/admin/ambassadors/referrals/${id}/verify`, data);
    return res.data;
  },

  getCertificates: async (params = {}) => {
    const res = await api.get('/admin/ambassadors/certificates', { params });
    return res.data;
  },

  updateCertificateStatus: async (id, data) => {
    const res = await api.patch(`/admin/ambassadors/certificates/${id}/status`, data);
    return res.data;
  },

  getReports: async () => {
    const res = await api.get('/admin/ambassadors/reports');
    return res.data;
  }
};

export default ambassadorService;
export { ambassadorService };

