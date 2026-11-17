import React, { createContext, useContext, useState, useEffect } from 'react';
import { authService } from '../services/index.js';

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(() => localStorage.getItem('hiretrack_token') || null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Restore authenticated session on mount
  useEffect(() => {
    const initializeAuth = async () => {
      const storedToken = localStorage.getItem('hiretrack_token');
      if (!storedToken) {
        setLoading(false);
        return;
      }

      try {
        const response = await authService.getMe();
        if (response.success && response.data) {
          // getMe returns user and role profile
          setUser(response.data.user || response.data);
          setToken(storedToken);
        } else {
          localStorage.removeItem('hiretrack_token');
          setUser(null);
          setToken(null);
        }
      } catch (err) {
        console.warn('Session restoration failed:', err?.message || err);
        localStorage.removeItem('hiretrack_token');
        setUser(null);
        setToken(null);
      } finally {
        setLoading(false);
      }
    };

    initializeAuth();
  }, []);

  // Listen for 401 unauthorized interceptor events
  useEffect(() => {
    const handleUnauthorized = () => {
      setUser(null);
      setToken(null);
      localStorage.removeItem('hiretrack_token');
    };

    if (typeof window !== 'undefined') {
      window.addEventListener('hiretrack:unauthorized', handleUnauthorized);
      return () => window.removeEventListener('hiretrack:unauthorized', handleUnauthorized);
    }
  }, []);

  const login = async (credentials) => {
    setError(null);
    try {
      const response = await authService.login(credentials);
      if (response.success && response.data) {
        const { user: loggedInUser, accessToken } = response.data;
        localStorage.setItem('hiretrack_token', accessToken);
        setToken(accessToken);
        setUser(loggedInUser);
        return loggedInUser;
      }
      throw new Error(response.message || 'Login failed');
    } catch (err) {
      const msg = err.message || 'Login failed';
      setError(msg);
      throw err;
    }
  };

  const register = async (userData) => {
    setError(null);
    try {
      const response = await authService.register(userData);
      if (response.success && response.data) {
        const { user: registeredUser, accessToken } = response.data;
        localStorage.setItem('hiretrack_token', accessToken);
        setToken(accessToken);
        setUser(registeredUser);
        return registeredUser;
      }
      throw new Error(response.message || 'Registration failed');
    } catch (err) {
      const msg = err.message || 'Registration failed';
      setError(msg);
      throw err;
    }
  };

  const logout = async () => {
    try {
      await authService.logout().catch(() => {});
    } finally {
      localStorage.removeItem('hiretrack_token');
      setToken(null);
      setUser(null);
      setError(null);
    }
  };

  const refreshUser = async () => {
    try {
      const response = await authService.getMe();
      if (response.success && response.data) {
        setUser(response.data.user || response.data);
      }
    } catch (err) {
      console.warn('Refresh user failed:', err);
    }
  };

  const value = {
    user,
    token,
    loading,
    error,
    isAuthenticated: !!user,
    login,
    register,
    logout,
    refreshUser
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export default AuthContext;

