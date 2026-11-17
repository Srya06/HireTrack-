import axios from 'axios';

const api = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000/api/v1',
  headers: {
    'Content-Type': 'application/json'
  },
  timeout: 10000
});

// Request interceptor: attach token if present in localStorage
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('hiretrack_token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Response interceptor: unwrap response or format error
api.interceptors.response.use(
  (response) => response.data,
  (error) => {
    // 401 Handling: clear stored token on session expiry / unauthorized on protected endpoints
    if (error.response?.status === 401) {
      const isLoginRequest = error.config?.url?.includes('/auth/login');
      if (!isLoginRequest) {
        localStorage.removeItem('hiretrack_token');
        if (typeof window !== 'undefined') {
          window.dispatchEvent(new Event('hiretrack:unauthorized'));
        }
      }
    }

    const errorResponse = error.response?.data || {
      success: false,
      message: error.message || 'Network error occurred',
      errors: [{ message: error.message || 'Network error' }]
    };
    return Promise.reject(errorResponse);
  }
);

export default api;

