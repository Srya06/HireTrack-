import api from './api';

const humanInterviewService = {
  // Student endpoints
  getAvailableSlots: async (params = {}) => {
    const res = await api.get('/human-interviews/slots', { params });
    return res.data;
  },

  bookSlot: async (data) => {
    const res = await api.post('/human-interviews/bookings', data);
    return res.data;
  },

  getMyBookings: async (params = {}) => {
    const res = await api.get('/human-interviews/bookings/me', { params });
    return res.data;
  },

  cancelBooking: async (bookingId, data = {}) => {
    const res = await api.post(`/human-interviews/bookings/${bookingId}/cancel`, data);
    return res.data;
  },

  getBookingFeedback: async (bookingId) => {
    const res = await api.get(`/human-interviews/bookings/${bookingId}/feedback`);
    return res.data;
  },

  // Interviewer endpoints
  getInterviewerProfile: async () => {
    const res = await api.get('/interviewer/profile');
    return res.data;
  },

  updateInterviewerProfile: async (data) => {
    const res = await api.patch('/interviewer/profile', data);
    return res.data;
  },

  getInterviewerSlots: async (params = {}) => {
    const res = await api.get('/interviewer/slots', { params });
    return res.data;
  },

  createSlots: async (slotsData) => {
    const res = await api.post('/interviewer/slots', slotsData);
    return res.data;
  },

  deleteSlot: async (slotId) => {
    const res = await api.delete(`/interviewer/slots/${slotId}`);
    return res.data;
  },

  toggleSlotBlock: async (slotId, blocked) => {
    const res = await api.patch(`/interviewer/slots/${slotId}/block`, { blocked });
    return res.data;
  },

  getAssignedSessions: async (params = {}) => {
    const res = await api.get('/interviewer/sessions', { params });
    return res.data;
  },

  getStudentContext: async (bookingId) => {
    const res = await api.get(`/interviewer/sessions/${bookingId}/student-context`);
    return res.data;
  },

  submitEvaluation: async (bookingId, data) => {
    const res = await api.post(`/interviewer/sessions/${bookingId}/evaluation`, data);
    return res.data;
  },

  getEvaluation: async (bookingId) => {
    const res = await api.get(`/interviewer/sessions/${bookingId}/evaluation`);
    return res.data;
  },

  // Admin endpoints
  getPolicy: async () => {
    const res = await api.get('/admin/policies/mock-interviews');
    return res.data;
  },

  updatePolicy: async (data) => {
    const res = await api.patch('/admin/policies/mock-interviews', data);
    return res.data;
  },

  getAllBookings: async (params = {}) => {
    const res = await api.get('/admin/human-interview-bookings', { params });
    return res.data;
  },

  getInterviewers: async (params = {}) => {
    const res = await api.get('/admin/interviewers', { params });
    return res.data;
  },

  releaseEvaluation: async (evaluationId) => {
    const res = await api.post(`/admin/interview-feedback/${evaluationId}/release`);
    return res.data;
  }
};

export default humanInterviewService;

