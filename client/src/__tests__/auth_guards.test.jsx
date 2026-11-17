import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { MemoryRouter, Routes, Route, Navigate } from 'react-router-dom';
import Login from '../pages/public/Login.jsx';
import Register from '../pages/public/Register.jsx';
import ProtectedRoute from '../routes/ProtectedRoute.jsx';
import RoleRoute from '../routes/RoleRoute.jsx';
import * as AuthContextModule from '../context/AuthContext.jsx';
import * as authService from '../services/auth.service.js';

describe('Chunk 6: Forms and Route Guards Suite', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
  });

  describe('Login Form Component', () => {
    it('renders login form and quick demo credentials buttons', () => {
      render(
        <MemoryRouter>
          <AuthContextModule.AuthProvider>
            <Login />
          </AuthContextModule.AuthProvider>
        </MemoryRouter>
      );

      expect(screen.getByText('Sign in to HireTrack')).toBeInTheDocument();
      expect(screen.getByLabelText(/Email address/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/Password/i)).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /Sign In/i })).toBeInTheDocument();

      // Quick Demo Buttons
      expect(screen.getByText('Demo Admin')).toBeInTheDocument();
      expect(screen.getByText('Demo Recruiter')).toBeInTheDocument();
      expect(screen.getByText('Demo Student')).toBeInTheDocument();
    });

    it('populates fields when demo credentials button is clicked', () => {
      render(
        <MemoryRouter>
          <AuthContextModule.AuthProvider>
            <Login />
          </AuthContextModule.AuthProvider>
        </MemoryRouter>
      );

      const demoAdminBtn = screen.getByText('Demo Admin');
      fireEvent.click(demoAdminBtn);

      const emailInput = screen.getByLabelText(/Email address/i);
      expect(emailInput.value).toBe('admin@hiretrack.edu');
    });

    it('displays error alert on failed authentication', async () => {
      vi.spyOn(authService, 'login').mockRejectedValueOnce({
        message: 'Invalid email or password'
      });

      render(
        <MemoryRouter>
          <AuthContextModule.AuthProvider>
            <Login />
          </AuthContextModule.AuthProvider>
        </MemoryRouter>
      );

      const emailInput = screen.getByLabelText(/Email address/i);
      const passInput = screen.getByLabelText(/Password/i);
      const submitBtn = screen.getByRole('button', { name: /Sign In/i });

      fireEvent.change(emailInput, { target: { value: 'wrong@hiretrack.edu' } });
      fireEvent.change(passInput, { target: { value: 'WrongPass!' } });
      fireEvent.click(submitBtn);

      await waitFor(() => {
        expect(screen.getByText('Invalid email or password')).toBeInTheDocument();
      });
    });
  });

  describe('Register Form & Role Toggle', () => {
    it('switches between student and recruiter fields and triggers inline validation', async () => {
      render(
        <MemoryRouter>
          <AuthContextModule.AuthProvider>
            <Register />
          </AuthContextModule.AuthProvider>
        </MemoryRouter>
      );

      // Student is default
      expect(screen.getByLabelText(/Student ID \(USN \/ Roll No\)/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/Current CGPA/i)).toBeInTheDocument();

      // Switch to Recruiter
      const recruiterTab = screen.getByRole('button', { name: /Company \/ Recruiter/i });
      fireEvent.click(recruiterTab);

      // Recruiter fields shown, student fields hidden
      expect(screen.getByLabelText(/Company Name/i)).toBeInTheDocument();
      expect(screen.queryByLabelText(/Student ID/i)).not.toBeInTheDocument();
      expect(screen.getByText(/Recruiter accounts are created in/i)).toBeInTheDocument();

      // Submit without required fields to trigger inline validation
      const submitBtn = screen.getByRole('button', { name: /Complete Registration/i });
      fireEvent.click(submitBtn);

      await waitFor(() => {
        expect(screen.getByText(/Full name is required/i)).toBeInTheDocument();
        expect(screen.getByText(/Email address is required/i)).toBeInTheDocument();
      });
    });
  });

  describe('Route Guards: ProtectedRoute & RoleRoute', () => {
    it('redirects unauthenticated user to /login in ProtectedRoute', () => {
      // Mock useAuth to return unauthenticated
      vi.spyOn(AuthContextModule, 'useAuth').mockReturnValue({
        user: null,
        isAuthenticated: false,
        loading: false
      });

      render(
        <MemoryRouter initialEntries={['/student/dashboard']}>
          <Routes>
            <Route
              path="/student/dashboard"
              element={
                <ProtectedRoute>
                  <div>Secret Student Content</div>
                </ProtectedRoute>
              }
            />
            <Route path="/login" element={<div>Login Page Target</div>} />
          </Routes>
        </MemoryRouter>
      );

      expect(screen.queryByText('Secret Student Content')).not.toBeInTheDocument();
      expect(screen.getByText('Login Page Target')).toBeInTheDocument();
    });

    it('renders protected content when user is authenticated in ProtectedRoute', () => {
      vi.spyOn(AuthContextModule, 'useAuth').mockReturnValue({
        user: { _id: 'u1', name: 'Asha Rao', role: 'student' },
        isAuthenticated: true,
        loading: false
      });

      render(
        <MemoryRouter initialEntries={['/student/dashboard']}>
          <ProtectedRoute>
            <div>Authorized Student Dashboard</div>
          </ProtectedRoute>
        </MemoryRouter>
      );

      expect(screen.getByText('Authorized Student Dashboard')).toBeInTheDocument();
    });

    it('redirects to /access-denied when user role does not match RoleRoute', () => {
      vi.spyOn(AuthContextModule, 'useAuth').mockReturnValue({
        user: { _id: 'u2', name: 'Student User', role: 'student' },
        isAuthenticated: true,
        loading: false
      });

      render(
        <MemoryRouter initialEntries={['/admin/dashboard']}>
          <Routes>
            <Route
              path="/admin/dashboard"
              element={
                <RoleRoute allowedRoles={['admin']}>
                  <div>Admin Secret Area</div>
                </RoleRoute>
              }
            />
            <Route path="/access-denied" element={<div>Access Denied Page</div>} />
          </Routes>
        </MemoryRouter>
      );

      expect(screen.queryByText('Admin Secret Area')).not.toBeInTheDocument();
      expect(screen.getByText('Access Denied Page')).toBeInTheDocument();
    });

    it('allows access when user role matches RoleRoute', () => {
      vi.spyOn(AuthContextModule, 'useAuth').mockReturnValue({
        user: { _id: 'u3', name: 'Admin Officer', role: 'admin' },
        isAuthenticated: true,
        loading: false
      });

      render(
        <MemoryRouter initialEntries={['/admin/dashboard']}>
          <RoleRoute allowedRoles={['admin']}>
            <div>Admin Secret Area</div>
          </RoleRoute>
        </MemoryRouter>
      );

      expect(screen.getByText('Admin Secret Area')).toBeInTheDocument();
    });
  });
});

