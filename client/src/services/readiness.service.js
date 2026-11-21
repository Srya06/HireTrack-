import api from './api';

const readinessService = {
  // Student self readiness
  getStudentReadiness: async () => {
    const res = await api.get('/students/me/readiness');
    return res.data;
  },

  // Staff cohort readiness
  getCohortReadiness: async (params = {}) => {
    const res = await api.get('/admin/readiness/cohorts', { params });
    return res.data;
  },

  getStudentReadinessAdmin: async (studentId) => {
    const res = await api.get(`/admin/readiness/students/${studentId}`);
    return res.data;
  },

  // Staff reports
  getOverviewReport: async (params = {}) => {
    const res = await api.get('/admin/reports/overview', { params });
    return res.data;
  },

  getJobsReport: async (params = {}) => {
    const res = await api.get('/admin/reports/jobs', { params });
    return res.data;
  },

  getMockTestsReport: async (params = {}) => {
    const res = await api.get('/admin/reports/mock-tests', { params });
    return res.data;
  },

  getMockInterviewsReport: async (params = {}) => {
    const res = await api.get('/admin/reports/mock-interviews', { params });
    return res.data;
  },

  // CSV Export with blob download
  exportReportCsv: async (reportPath, params = {}) => {
    const res = await api.get(`/admin/reports/${reportPath}`, {
      params: { ...params, format: 'csv' },
      responseType: 'blob'
    });
    return res.data;
  },

  // Audit Logs (ORG_ADMIN)
  getAuditLogs: async (params = {}) => {
    const res = await api.get('/admin/audit-logs', { params });
    return res.data;
  }
};

export default readinessService;
export { readinessService };

