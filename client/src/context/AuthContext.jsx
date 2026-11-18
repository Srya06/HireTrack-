import React, { createContext, useContext, useState, useEffect } from 'react';
import { authService } from '../services/index.js';

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [organization, setOrganization] = useState(null);
  const [memberships, setMemberships] = useState([]);
  const [token, setToken] = useState(() => localStorage.getItem('hiretrack_token') || null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const applySessionPayload = (payload, activeToken) => {
    const nextUser = payload.user || payload;
    setUser(nextUser);
    setOrganization(payload.organization || null);
    setMemberships(Array.isArray(payload.memberships) ? payload.memberships : []);
    if (activeToken !== undefined) {
      setToken(activeToken);
    }
  };

  const clearSessionState = () => {
    localStorage.removeItem('hiretrack_token');
    setUser(null);
    setOrganization(null);
    setMemberships([]);
    setToken(null);
  };

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
          // getMe returns user, profile, organization, and memberships
          applySessionPayload(response.data, storedToken);
        } else {
          clearSessionState();
        }
      } catch (err) {
        console.warn('Session restoration failed:', err?.message || err);
        clearSessionState();
      } finally {
        setLoading(false);
      }
    };

    initializeAuth();
  }, []);

  // Listen for 401 unauthorized interceptor events
  useEffect(() => {
    const handleUnauthorized = () => {
      clearSessionState();
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
        applySessionPayload(response.data, accessToken);
        return {
          ...loggedInUser,
          memberships: Array.isArray(response.data.memberships) ? response.data.memberships : []
        };
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
        applySessionPayload(response.data, accessToken);
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
      clearSessionState();
      setError(null);
    }
  };

  const refreshUser = async () => {
    try {
      const response = await authService.getMe();
      if (response.success && response.data) {
        applySessionPayload(response.data);
      }
    } catch (err) {
      console.warn('Refresh user failed:', err);
    }
  };

  const activeMembershipRoles = memberships
    .filter((m) => m.status === 'active')
    .map((m) => m.role);

  const hasMembership = (...allowedRoles) => {
    return activeMembershipRoles.some((r) => allowedRoles.includes(r));
  };

  const value = {
    user,
    organization,
    memberships,
    membershipRoles: activeMembershipRoles,
    hasMembership,
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

