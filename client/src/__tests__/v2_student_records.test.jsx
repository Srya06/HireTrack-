import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import StudentProfile from '../pages/student/StudentProfile.jsx';
import StudentDirectory from '../pages/admin/StudentDirectory.jsx';
import AcceptInvitation from '../pages/public/AcceptInvitation.jsx';
import * as AuthContextModule from '../context/AuthContext.jsx';
import { studentService, authService, notificationService } from '../services/index.js';

vi.mock('../services/index.js', () => ({
  studentService: {
    getMyProfile: vi.fn(),
    getMyProfileV3: vi.fn(),
    updateMyProfile: vi.fn(),
    updateMyProfileV3: vi.fn(),
    uploadResume: vi.fn(),
    getAdminStudents: vi.fn(),
    updateStudentByStaff: vi.fn(),
    getImportTemplate: vi.fn(),
    importStudentsCsv: vi.fn(),
    getFileSignedUrl: vi.fn()
  },
  authService: {
    acceptInvitation: vi.fn()
  },
  notificationService: {
    getNotifications: vi.fn().mockResolvedValue({ success: true, data: { notifications: [], unreadCount: 0 } })
  }
}));

describe('Chunk V2: Student Records, Directory, CSV Import & Invitation UI', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('StudentProfile V3 Component', () => {
    it('renders profile with completeness score, locked master fields, and editable personal fields', async () => {
      studentService.getMyProfileV3.mockResolvedValue({
        success: true,
        data: {
          profile: {
            studentCode: '1RV22CS099',
            studentId: '1RV22CS099',
            fullName: 'Maya Rao',
            degree: 'B.Tech',
            cohort: '2022-2026',
            branch: 'Computer Science and Engineering',
            graduationYear: 2026,
            cgpa: 9.2,
            phone: '+91 9888111222',
            bio: 'Aspiring Cloud & AI Engineer',
            skills: ['React', 'Node.js'],
            verificationStatus: 'verified',
            profileVerifiedAt: '2026-11-18T10:00:00Z',
            signedResumeUrl: '/api/v1/files/f1/download?token=signed_demo'
          },
          completenessV3: {
            score: 100,
            isComplete: true,
            missingFields: []
          }
        }
      });

      render(
        <MemoryRouter>
          <StudentProfile />
        </MemoryRouter>
      );

      await waitFor(() => {
        expect(screen.getByText('Student Profile & Resume')).toBeDefined();
        expect(screen.getByText('100% Complete')).toBeDefined();
        expect(screen.getByText('Verified by Placement Cell')).toBeDefined();
        expect(screen.getByText('Official Academic Credentials')).toBeDefined();
        expect(screen.getByText('View Document')).toBeDefined();
      });

      // Verify master fields are disabled/locked
      const studentCodeInput = screen.getByDisplayValue('1RV22CS099');
      expect(studentCodeInput.disabled).toBe(true);

      const degreeInput = screen.getByDisplayValue('B.Tech');
      expect(degreeInput.disabled).toBe(true);
    });
  });

  describe('StudentDirectory Component', () => {
    it('renders students list, filters, and import modal trigger', async () => {
      studentService.getAdminStudents.mockResolvedValue({
        success: true,
        data: [
          {
            _id: 's1',
            studentCode: '1RV22CS001',
            fullName: 'Aarav Sharma',
            userId: { name: 'Aarav Sharma', email: 'aarav@campus.edu' },
            degree: 'B.Tech',
            branch: 'CSE',
            cohort: '2022-2026',
            cgpa: 8.9,
            verificationStatus: 'verified'
          }
        ],
        pagination: { page: 1, limit: 10, total: 1, pages: 1 }
      });

      render(
        <MemoryRouter>
          <StudentDirectory />
        </MemoryRouter>
      );

      await waitFor(() => {
        expect(screen.getByText('Student Directory & Academic Records')).toBeDefined();
        expect(screen.getByText('Aarav Sharma')).toBeDefined();
        expect(screen.getByText('1RV22CS001')).toBeDefined();
        expect(screen.getByText('Import Students (CSV)')).toBeDefined();
      });

      // Open import modal
      fireEvent.click(screen.getByText('Import Students (CSV)'));
      expect(screen.getByText('Bulk Import Students (CSV)')).toBeDefined();
      expect(screen.getByText('Analyze Batch (Dry Run)')).toBeDefined();
    });
  });

  describe('AcceptInvitation Component', () => {
    it('renders set password form and handles activation submission', async () => {
      vi.spyOn(AuthContextModule, 'useAuth').mockReturnValue({
        login: vi.fn()
      });

      authService.acceptInvitation.mockResolvedValue({
        success: true,
        data: {
          token: 'mock_jwt_token',
          user: { id: 'u1', name: 'New Student', role: 'student', accountStatus: 'active' }
        }
      });

      render(
        <MemoryRouter initialEntries={['/invitation/accept?token=valid_token_123']}>
          <Routes>
            <Route path="/invitation/accept" element={<AcceptInvitation />} />
          </Routes>
        </MemoryRouter>
      );

      expect(screen.getByText('Activate Your Student Account')).toBeDefined();
      expect(screen.getByText('Set Password & Activate Account')).toBeDefined();

      const passInputs = screen.getAllByPlaceholderText('••••••••');
      fireEvent.change(passInputs[0], { target: { value: 'SecretPass123!' } });
      fireEvent.change(passInputs[1], { target: { value: 'SecretPass123!' } });

      fireEvent.click(screen.getByText('Set Password & Activate Account'));

      await waitFor(() => {
        expect(authService.acceptInvitation).toHaveBeenCalledWith({
          token: 'valid_token_123',
          password: 'SecretPass123!',
          confirmPassword: 'SecretPass123!'
        });
        expect(screen.getByText(/Account activated successfully/i)).toBeDefined();
      });
    });
  });
});
