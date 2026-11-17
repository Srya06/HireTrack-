import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { MemoryRouter } from 'react-router-dom';
import AdminDashboard from '../pages/admin/AdminDashboard.jsx';
import PendingRecruiters from '../pages/admin/PendingRecruiters.jsx';
import UserManagement from '../pages/admin/UserManagement.jsx';
import JobModeration from '../pages/admin/JobModeration.jsx';
import * as AuthContextModule from '../context/AuthContext.jsx';
import * as adminService from '../services/admin.service.js';

describe('Chunk 9: Admin UI Suite', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
  });

  const mockAdminUser = {
    _id: 'admin_001',
    name: 'Placement Dean',
    email: 'admin@hiretrack.edu',
    role: 'admin',
    accountStatus: 'active'
  };

  const mockOverviewData = {
    students: 450,
    approvedRecruiters: 28,
    pendingRecruiters: 3,
    activeJobs: 14,
    totalJobs: 25,
    applications: 120,
    selectedStudents: 35,
    statusBreakdown: {
      applied: 40,
      under_review: 20,
      shortlisted: 15,
      interview_scheduled: 10,
      selected: 35,
      rejected: 0,
      withdrawn: 0
    }
  };

  describe('Admin Overview & Metrics Dashboard', () => {
    it('renders all persisted StatCards and Applications Pipeline Funnel from API without hardcoded data', async () => {
      vi.spyOn(AuthContextModule, 'useAuth').mockReturnValue({
        user: mockAdminUser,
        isAuthenticated: true,
        loading: false
      });

      const overviewSpy = vi.spyOn(adminService, 'getAdminOverview').mockResolvedValueOnce({
        success: true,
        data: mockOverviewData
      });

      render(
        <MemoryRouter>
          <AdminDashboard />
        </MemoryRouter>
      );

      await waitFor(() => {
        expect(overviewSpy).toHaveBeenCalled();
        // StatCards
        expect(screen.getByText('Registered Students')).toBeInTheDocument();
        expect(screen.getByText('450')).toBeInTheDocument();

        expect(screen.getByText('Approved Recruiters')).toBeInTheDocument();
        expect(screen.getByText('28')).toBeInTheDocument();

        expect(screen.getByText('Active Jobs')).toBeInTheDocument();
        expect(screen.getByText('14')).toBeInTheDocument();

        expect(screen.getByText('120')).toBeInTheDocument();
        expect(screen.getByText('Selected Students')).toBeInTheDocument();
        expect(screen.getAllByText('35').length).toBeGreaterThanOrEqual(1);

        // Applications Pipeline Funnel Breakdown
        expect(screen.getByText(/Applications Funnel Overview/i)).toBeInTheDocument();
        expect(screen.getByText('Interview Scheduled')).toBeInTheDocument();
        expect(screen.getByText('Under Review')).toBeInTheDocument();
      });
    });
  });

  describe('Pending Recruiter Approvals (UC-04)', () => {
    const mockPendingRecruiters = [
      {
        _id: 'rec_prof_1',
        companyName: 'Initech Systems',
        website: 'https://initech.com',
        phone: '+91 9123456789',
        contactPerson: 'Peter Gibbons',
        address: 'Electronic City, Bengaluru',
        description: 'Enterprise workflow automation platform.',
        approvalStatus: 'pending',
        createdAt: '2026-11-10T10:00:00.000Z',
        userId: {
          _id: 'user_rec_1',
          name: 'Peter Gibbons',
          email: 'peter@initech.com'
        }
      }
    ];

    it('renders pending recruiters list and enables company details review', async () => {
      vi.spyOn(adminService, 'getPendingRecruiters').mockResolvedValueOnce({
        success: true,
        data: {
          recruiters: mockPendingRecruiters,
          pagination: { total: 1, totalPages: 1 }
        }
      });

      render(
        <MemoryRouter>
          <PendingRecruiters />
        </MemoryRouter>
      );

      await waitFor(() => {
        expect(screen.getByText('Initech Systems')).toBeInTheDocument();
        expect(screen.getByText('peter@initech.com')).toBeInTheDocument();
      });

      // Click "Review Details"
      const reviewBtn = screen.getByRole('button', { name: /Review Details/i });
      fireEvent.click(reviewBtn);

      await waitFor(() => {
        expect(screen.getByText(/Company & Recruiter Verification/i)).toBeInTheDocument();
        expect(screen.getByText('Enterprise workflow automation platform.')).toBeInTheDocument();
        expect(screen.getByText('Electronic City, Bengaluru')).toBeInTheDocument();
      });
    });

    it('approves recruiter with ConfirmDialog (UC-04)', async () => {
      vi.spyOn(adminService, 'getPendingRecruiters').mockResolvedValue({
        success: true,
        data: {
          recruiters: mockPendingRecruiters,
          pagination: { total: 1, totalPages: 1 }
        }
      });

      const approveSpy = vi.spyOn(adminService, 'updateRecruiterApproval').mockResolvedValueOnce({
        success: true,
        data: { approvalStatus: 'approved' }
      });

      render(
        <MemoryRouter>
          <PendingRecruiters />
        </MemoryRouter>
      );

      await waitFor(() => {
        expect(screen.getByText('Initech Systems')).toBeInTheDocument();
      });

      // Click "Approve" button
      const approveBtn = screen.getByRole('button', { name: /Approve/i });
      fireEvent.click(approveBtn);

      // ConfirmDialog should be visible
      await waitFor(() => {
        expect(screen.getByText(/Approve Recruiter Registration/i)).toBeInTheDocument();
        expect(screen.getByText(/Are you sure you want to approve recruiter "Peter Gibbons" from "Initech Systems"\?/i)).toBeInTheDocument();
      });

      // Verify API has not been called before confirmation
      expect(approveSpy).not.toHaveBeenCalled();

      // Click confirm in dialog
      const confirmBtn = screen.getByRole('button', { name: 'Approve Recruiter' });
      fireEvent.click(confirmBtn);

      await waitFor(() => {
        expect(approveSpy).toHaveBeenCalledWith('rec_prof_1', {
          approvalStatus: 'approved'
        });
      });
    });

    it('rejects recruiter with specified reason', async () => {
      vi.spyOn(adminService, 'getPendingRecruiters').mockResolvedValue({
        success: true,
        data: {
          recruiters: mockPendingRecruiters,
          pagination: { total: 1, totalPages: 1 }
        }
      });

      const rejectSpy = vi.spyOn(adminService, 'updateRecruiterApproval').mockResolvedValueOnce({
        success: true,
        data: { approvalStatus: 'rejected' }
      });

      render(
        <MemoryRouter>
          <PendingRecruiters />
        </MemoryRouter>
      );

      await waitFor(() => {
        expect(screen.getByText('Initech Systems')).toBeInTheDocument();
      });

      // Click "Reject"
      const rejectBtn = screen.getByRole('button', { name: /Reject/i });
      fireEvent.click(rejectBtn);

      await waitFor(() => {
        expect(screen.getByText(/Reject Recruiter Registration/i)).toBeInTheDocument();
      });

      // Submit rejection
      const submitRejectBtn = screen.getByRole('button', { name: /Confirm Rejection/i });
      fireEvent.click(submitRejectBtn);

      await waitFor(() => {
        expect(rejectSpy).toHaveBeenCalledWith(
          'rec_prof_1',
          expect.objectContaining({
            approvalStatus: 'rejected'
          })
        );
      });
    });
  });

  describe('User Management (Students and Users List)', () => {
    const mockUsers = [
      {
        _id: 'user_stu_1',
        name: 'Arjun Mehta',
        email: 'arjun@college.edu',
        role: 'student',
        accountStatus: 'active',
        createdAt: '2026-10-01T00:00:00.000Z'
      },
      {
        _id: 'admin_001',
        name: 'Placement Dean',
        email: 'admin@hiretrack.edu',
        role: 'admin',
        accountStatus: 'active',
        createdAt: '2026-09-01T00:00:00.000Z'
      }
    ];

    it('lists users, supports search, and prevents suspension of administrators', async () => {
      vi.spyOn(AuthContextModule, 'useAuth').mockReturnValue({
        user: mockAdminUser,
        isAuthenticated: true,
        loading: false
      });

      const getUsersSpy = vi.spyOn(adminService, 'getUsers').mockResolvedValue({
        success: true,
        data: {
          users: mockUsers,
          pagination: { total: 2, totalPages: 1 }
        }
      });

      render(
        <MemoryRouter>
          <UserManagement />
        </MemoryRouter>
      );

      await waitFor(() => {
        expect(screen.getByText('Arjun Mehta')).toBeInTheDocument();
        expect(screen.getByText('Current Session')).toBeInTheDocument(); // Admin self-protection
      });

      // Search
      const searchInput = screen.getByPlaceholderText(/Search by name or email.../i);
      fireEvent.change(searchInput, { target: { value: 'Arjun' } });
      const searchBtn = screen.getByRole('button', { name: /Search/i });
      fireEvent.click(searchBtn);

      await waitFor(() => {
        expect(getUsersSpy).toHaveBeenCalledWith(
          expect.objectContaining({ q: 'Arjun' })
        );
      });
    });

    it('suspends a student account with confirmation dialog', async () => {
      vi.spyOn(AuthContextModule, 'useAuth').mockReturnValue({
        user: mockAdminUser,
        isAuthenticated: true,
        loading: false
      });

      vi.spyOn(adminService, 'getUsers').mockResolvedValue({
        success: true,
        data: {
          users: mockUsers,
          pagination: { total: 2, totalPages: 1 }
        }
      });

      const statusSpy = vi.spyOn(adminService, 'updateUserStatus').mockResolvedValueOnce({
        success: true,
        data: { _id: 'user_stu_1', accountStatus: 'suspended' }
      });

      render(
        <MemoryRouter>
          <UserManagement />
        </MemoryRouter>
      );

      await waitFor(() => {
        expect(screen.getByText('Arjun Mehta')).toBeInTheDocument();
      });

      // Click "Suspend" on student
      const suspendBtn = screen.getByRole('button', { name: /Suspend/i });
      fireEvent.click(suspendBtn);

      // Confirm dialog should be open
      await waitFor(() => {
        expect(screen.getByText(/Suspend User Account/i)).toBeInTheDocument();
        expect(screen.getByText(/Are you sure you want to suspend "Arjun Mehta"/i)).toBeInTheDocument();
      });

      const confirmBtn = screen.getByRole('button', { name: 'Suspend Account' });
      fireEvent.click(confirmBtn);

      await waitFor(() => {
        expect(statusSpy).toHaveBeenCalledWith(
          'user_stu_1',
          expect.objectContaining({
            accountStatus: 'suspended'
          })
        );
      });
    });
  });

  describe('Job Drive Moderation', () => {
    const mockJobs = [
      {
        _id: 'job_admin_1',
        title: 'Cloud DevOps Engineer',
        companyName: 'Amazon AWS',
        applicationDeadline: '2026-12-31T23:59:59.000Z',
        status: 'published'
      }
    ];

    it('moderates jobs with status changes and ConfirmDialog', async () => {
      vi.spyOn(adminService, 'getAdminJobs').mockResolvedValue({
        success: true,
        data: {
          jobs: mockJobs,
          pagination: { total: 1, totalPages: 1 }
        }
      });

      const updateJobSpy = vi.spyOn(adminService, 'updateAdminJobStatus').mockResolvedValueOnce({
        success: true,
        data: { _id: 'job_admin_1', status: 'closed' }
      });

      render(
        <MemoryRouter>
          <JobModeration />
        </MemoryRouter>
      );

      await waitFor(() => {
        expect(screen.getByText('Cloud DevOps Engineer')).toBeInTheDocument();
        expect(screen.getByText('Amazon AWS')).toBeInTheDocument();
      });

      // Click "Close"
      const closeBtn = screen.getByRole('button', { name: /Close/i });
      fireEvent.click(closeBtn);

      await waitFor(() => {
        expect(screen.getByText(/Set Job Status to "closed"/i)).toBeInTheDocument();
      });

      // Confirm
      const confirmBtn = screen.getByRole('button', { name: /Confirm Status Update/i });
      fireEvent.click(confirmBtn);

      await waitFor(() => {
        expect(updateJobSpy).toHaveBeenCalledWith('job_admin_1', {
          status: 'closed',
          reason: 'Administrator changed status to closed'
        });
      });
    });
  });
});

