import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import StaffRoles from '../pages/admin/StaffRoles.jsx';
import InterviewerDashboard from '../pages/interviewer/InterviewerDashboard.jsx';
import AccessDenied from '../pages/public/AccessDenied.jsx';
import DashboardLayout from '../layouts/DashboardLayout.jsx';
import MembershipRoute from '../routes/MembershipRoute.jsx';
import { FeatureFlagsProvider } from '../context/FeatureFlagsContext.jsx';
import * as AuthContextModule from '../context/AuthContext.jsx';
import { staffService, notificationService } from '../services/index.js';

vi.mock('../services/index.js', () => ({
  staffService: {
    getStaff: vi.fn(),
    grantStaffRole: vi.fn(),
    updateStaffMembership: vi.fn()
  },
  notificationService: {
    getNotifications: vi.fn(),
    markAsRead: vi.fn(),
    markAllAsRead: vi.fn()
  },
  configService: {
    getFeatureFlags: vi.fn()
  }
}));

describe('Chunk V1: Organization Workspaces, Membership Guards & Staff Roles UI', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    notificationService.getNotifications.mockResolvedValue({
      success: true,
      data: { notifications: [], unreadCount: 0 }
    });
  });

  describe('MembershipRoute & Interviewer Workspace', () => {
    it('allows INTERVIEWER membership to access InterviewerDashboard', () => {
      vi.spyOn(AuthContextModule, 'useAuth').mockReturnValue({
        user: { id: 'u1', name: 'Dr. Nair', email: 'nair@campus.edu', role: 'student' },
        organization: { name: 'Demo Campus Org', timezone: 'Asia/Kolkata' },
        membershipRoles: ['INTERVIEWER'],
        loading: false,
        logout: vi.fn()
      });

      render(
        <MemoryRouter initialEntries={['/interviewer/dashboard']}>
          <FeatureFlagsProvider initialFlags={{ LEGACY_RECRUITER_FLOW: true }}>
            <Routes>
              <Route
                path="/interviewer/dashboard"
                element={
                  <MembershipRoute allowedMemberships={['INTERVIEWER']}>
                    <InterviewerDashboard />
                  </MembershipRoute>
                }
              />
              <Route path="/access-denied" element={<AccessDenied />} />
            </Routes>
          </FeatureFlagsProvider>
        </MemoryRouter>
      );

      expect(screen.getByText('Interviewer Workspace')).toBeInTheDocument();
      expect(screen.getByText(/Assigned Sessions Scope Only/i)).toBeInTheDocument();
    });

    it('redirects STUDENT without INTERVIEWER membership to AccessDenied', () => {
      vi.spyOn(AuthContextModule, 'useAuth').mockReturnValue({
        user: { id: 'u2', name: 'Student User', email: 'stu@campus.edu', role: 'student' },
        organization: { name: 'Demo Campus Org', timezone: 'Asia/Kolkata' },
        membershipRoles: ['STUDENT'],
        loading: false,
        logout: vi.fn()
      });

      render(
        <MemoryRouter initialEntries={['/interviewer/dashboard']}>
          <FeatureFlagsProvider initialFlags={{ LEGACY_RECRUITER_FLOW: true }}>
            <Routes>
              <Route
                path="/interviewer/dashboard"
                element={
                  <MembershipRoute allowedMemberships={['INTERVIEWER']}>
                    <InterviewerDashboard />
                  </MembershipRoute>
                }
              />
              <Route path="/access-denied" element={<AccessDenied />} />
            </Routes>
          </FeatureFlagsProvider>
        </MemoryRouter>
      );

      expect(screen.getByText('Access Denied (403)')).toBeInTheDocument();
    });
  });

  describe('Workspace Navigation Shell & Feature Flag Gating', () => {
    it('hides unbuilt v3 nav items when flags are false and shows separate Mock Tests & Mock Interviews when enabled', () => {
      vi.spyOn(AuthContextModule, 'useAuth').mockReturnValue({
        user: { id: 'u2', name: 'Student User', email: 'stu@campus.edu', role: 'student' },
        organization: { name: 'Campus Org', timezone: 'Asia/Kolkata' },
        membershipRoles: ['STUDENT'],
        loading: false,
        logout: vi.fn()
      });

      const { unmount } = render(
        <MemoryRouter initialEntries={['/student/dashboard']}>
          <FeatureFlagsProvider
            initialFlags={{
              V3_MOCK_TESTS_ENABLED: false,
              V3_AI_INTERVIEWS_ENABLED: false,
              V3_HUMAN_INTERVIEWS_ENABLED: false
            }}
          >
            <Routes>
              <Route path="/student/*" element={<DashboardLayout />} />
            </Routes>
          </FeatureFlagsProvider>
        </MemoryRouter>
      );

      expect(screen.queryByText('Mock Tests')).not.toBeInTheDocument();
      expect(screen.queryByText('Mock Interviews')).not.toBeInTheDocument();
      unmount();

      render(
        <MemoryRouter initialEntries={['/student/dashboard']}>
          <FeatureFlagsProvider
            initialFlags={{
              V3_MOCK_TESTS_ENABLED: true,
              V3_AI_INTERVIEWS_ENABLED: true,
              V3_HUMAN_INTERVIEWS_ENABLED: true
            }}
          >
            <Routes>
              <Route path="/student/*" element={<DashboardLayout />} />
            </Routes>
          </FeatureFlagsProvider>
        </MemoryRouter>
      );

      expect(screen.getByText('Mock Tests')).toBeInTheDocument();
      expect(screen.getByText('Mock Interviews')).toBeInTheDocument();
    });

    it('hides Pending Recruiters in Admin nav when LEGACY_RECRUITER_FLOW is false while keeping Staff & Roles', () => {
      vi.spyOn(AuthContextModule, 'useAuth').mockReturnValue({
        user: { id: 'a1', name: 'Org Admin', email: 'admin@campus.edu', role: 'admin' },
        organization: { name: 'Campus Org', timezone: 'Asia/Kolkata' },
        membershipRoles: ['ORG_ADMIN'],
        loading: false,
        logout: vi.fn()
      });

      render(
        <MemoryRouter initialEntries={['/admin/dashboard']}>
          <FeatureFlagsProvider initialFlags={{ LEGACY_RECRUITER_FLOW: false }}>
            <Routes>
              <Route path="/admin/*" element={<DashboardLayout />} />
            </Routes>
          </FeatureFlagsProvider>
        </MemoryRouter>
      );

      expect(screen.getByText('Staff & Roles')).toBeInTheDocument();
      expect(screen.queryByText('Pending Recruiters')).not.toBeInTheDocument();
    });
  });

  describe('StaffRoles Page (Admin)', () => {
    it('renders no-permission state when user does not hold ORG_ADMIN membership', () => {
      vi.spyOn(AuthContextModule, 'useAuth').mockReturnValue({
        user: { id: 'c1', name: 'Coordinator', email: 'coord@campus.edu', role: 'student' },
        organization: { name: 'Campus Org' },
        membershipRoles: ['PLACEMENT_COORDINATOR'],
        loading: false
      });

      render(
        <MemoryRouter>
          <StaffRoles />
        </MemoryRouter>
      );

      expect(screen.getByText('Permission Required')).toBeInTheDocument();
      expect(staffService.getStaff).not.toHaveBeenCalled();
    });

    it('lists staff memberships, grants a role, and revokes a role with ConfirmDialog', async () => {
      vi.spyOn(AuthContextModule, 'useAuth').mockReturnValue({
        user: { id: 'admin-1', name: 'Org Admin', email: 'admin@campus.edu', role: 'admin' },
        organization: { name: 'Campus Org' },
        membershipRoles: ['ORG_ADMIN'],
        loading: false
      });

      staffService.getStaff.mockResolvedValue({
        success: true,
        data: [
          {
            id: 'mem-1',
            role: 'PLACEMENT_COORDINATOR',
            status: 'active',
            grantedAt: new Date().toISOString(),
            userId: { id: 'u-coord', name: 'Priya Sharma', email: 'priya@campus.edu' }
          }
        ],
        pagination: { page: 1, limit: 10, total: 1, totalPages: 1 }
      });

      staffService.grantStaffRole.mockResolvedValue({
        success: true,
        data: { id: 'mem-2', role: 'INTERVIEWER', status: 'active' }
      });

      staffService.updateStaffMembership.mockResolvedValue({
        success: true,
        data: { id: 'mem-1', role: 'PLACEMENT_COORDINATOR', status: 'revoked' }
      });

      render(
        <MemoryRouter>
          <StaffRoles />
        </MemoryRouter>
      );

      await waitFor(() => {
        expect(screen.getByText('Priya Sharma')).toBeInTheDocument();
      });

      // Open Grant Staff Role modal and submit
      fireEvent.click(screen.getByRole('button', { name: /Grant Staff Role/i }));
      fireEvent.change(screen.getByLabelText(/Existing Organization User Email/i), {
        target: { value: 'mentor@campus.edu' }
      });
      fireEvent.change(screen.getByLabelText(/^Staff Role/i), {
        target: { value: 'INTERVIEWER' }
      });
      fireEvent.click(screen.getByRole('button', { name: /^Grant Role$/i }));

      await waitFor(() => {
        expect(staffService.grantStaffRole).toHaveBeenCalledWith({
          email: 'mentor@campus.edu',
          role: 'INTERVIEWER'
        });
      });

      // Trigger Revoke ConfirmDialog
      fireEvent.click(screen.getByRole('button', { name: /Revoke/i }));
      expect(screen.getByText('Revoke Staff Role')).toBeInTheDocument();
      fireEvent.click(screen.getByRole('button', { name: /Revoke Role/i }));

      await waitFor(() => {
        expect(staffService.updateStaffMembership).toHaveBeenCalledWith('mem-1', {
          status: 'revoked'
        });
      });
    });
  });
});
