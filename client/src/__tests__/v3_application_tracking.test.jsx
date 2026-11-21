import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import OpportunityDetails from '../pages/student/OpportunityDetails.jsx';
import MyApplications from '../pages/student/MyApplications.jsx';
import AdminApplications from '../pages/admin/AdminApplications.jsx';
import { opportunityService, applicationService } from '../services/index.js';

vi.mock('../services/index.js', () => ({
  opportunityService: {
    getStudentOpportunityById: vi.fn(),
    getOpportunityEligibility: vi.fn(),
    evaluateOpportunityEligibility: vi.fn(),
    getStudentJobApplications: vi.fn(),
    recordOpportunityApplicationStatus: vi.fn(),
    recordOpportunityLinkClick: vi.fn(),
    getAdminApplicationsReport: vi.fn(),
    verifyApplicationStaff: vi.fn()
  },
  applicationService: {
    getMyApplications: vi.fn(),
    withdrawApplication: vi.fn()
  }
}));

describe('Chunk V5: Student Application Tracking & Staff Reporting UI Suite', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  const mockOpportunity = {
    _id: 'opp-501',
    companyName: 'Acme Robotics',
    jobTitle: 'Robotics Software Engineer',
    workMode: 'HYBRID',
    location: 'Bangalore',
    compensationText: '₹18 LPA',
    applicationUrl: 'https://careers.acmerobotics.example.com/jobs/1',
    applicationInstructions: 'Apply on portal and note requisition ID',
    status: 'PUBLISHED',
    effectiveStatus: 'PUBLISHED',
    destinationDomain: 'acmerobotics.example.com',
    deadline: '2026-12-31T00:00:00.000Z',
    requiredCriteria: [],
    preferredCriteria: []
  };

  const mockV3Application = {
    _id: 'app-501',
    jobOpportunityId: {
      _id: 'opp-501',
      jobTitle: 'Robotics Software Engineer',
      companyName: 'Acme Robotics',
      location: 'Bangalore'
    },
    studentId: {
      _id: 'user-stu-1',
      name: 'Priya Sharma',
      email: 'priya@college.edu'
    },
    studentProfileId: {
      _id: 'prof-stu-1',
      studentCode: 'STU-2026-001',
      fullName: 'Priya Sharma',
      branch: 'Computer Science',
      cgpa: 8.9
    },
    status: 'APPLIED',
    applicationDate: '2026-11-20T10:00:00.000Z',
    notes: 'Submitted application on workday',
    verificationStatus: 'UNVERIFIED',
    clickCount: 2,
    statusHistory: [
      {
        status: 'INTERESTED',
        changedAt: '2026-11-20T09:00:00.000Z',
        notes: 'Opened employer portal'
      },
      {
        status: 'APPLIED',
        changedAt: '2026-11-20T10:00:00.000Z',
        notes: 'Submitted application on workday'
      }
    ]
  };

  describe('1. OpportunityDetails Application Tracking Control', () => {
    it('renders tracking control and displays unverified (student-reported) badge', async () => {
      opportunityService.getStudentOpportunityById.mockResolvedValueOnce({
        success: true,
        data: mockOpportunity
      });
      opportunityService.getOpportunityEligibility.mockResolvedValueOnce({
        success: true,
        data: { status: 'LIKELY_ELIGIBLE', snapshot: { perCriterion: [] } }
      });
      opportunityService.getStudentJobApplications.mockResolvedValueOnce({
        success: true,
        data: [mockV3Application]
      });

      render(
        <MemoryRouter initialEntries={['/student/opportunities/opp-501']}>
          <Routes>
            <Route path="/student/opportunities/:id" element={<OpportunityDetails />} />
          </Routes>
        </MemoryRouter>
      );

      await waitFor(() => {
        expect(screen.getByRole('heading', { level: 1, name: 'Robotics Software Engineer' })).toBeInTheDocument();
      });

      expect(screen.getByText('Track Your Application')).toBeInTheDocument();
      expect(screen.getByText(/unverified \(student-reported\)/i)).toBeInTheDocument();
      expect(screen.getByText('Update Application Status')).toBeInTheDocument();
    });

    it('submits updated status and notes to opportunityService', async () => {
      opportunityService.getStudentOpportunityById.mockResolvedValueOnce({
        success: true,
        data: mockOpportunity
      });
      opportunityService.getOpportunityEligibility.mockResolvedValueOnce({
        success: true,
        data: { status: 'LIKELY_ELIGIBLE', snapshot: { perCriterion: [] } }
      });
      opportunityService.getStudentJobApplications.mockResolvedValueOnce({
        success: true,
        data: [mockV3Application]
      });
      opportunityService.recordOpportunityApplicationStatus.mockResolvedValueOnce({
        success: true,
        data: {
          ...mockV3Application,
          status: 'WITHDRAWN',
          notes: 'Accepted an alternative offer'
        }
      });

      render(
        <MemoryRouter initialEntries={['/student/opportunities/opp-501']}>
          <Routes>
            <Route path="/student/opportunities/:id" element={<OpportunityDetails />} />
          </Routes>
        </MemoryRouter>
      );

      await waitFor(() => {
        expect(screen.getByText('Track Your Application')).toBeInTheDocument();
      });

      // Click "Withdrawn" button option
      const withdrawnBtn = screen.getByRole('button', { name: /withdrawn/i });
      fireEvent.click(withdrawnBtn);

      // Enter new notes
      const notesArea = screen.getByPlaceholderText(/e\.g\. Applied via Workday/i);
      fireEvent.change(notesArea, { target: { value: 'Accepted an alternative offer' } });

      // Save
      const saveBtn = screen.getByRole('button', { name: /update application status/i });
      fireEvent.click(saveBtn);

      await waitFor(() => {
        expect(opportunityService.recordOpportunityApplicationStatus).toHaveBeenCalledWith(
          'opp-501',
          expect.objectContaining({
            status: 'WITHDRAWN',
            notes: 'Accepted an alternative offer'
          })
        );
      });
    });

    it('triggers link click event when Open Official Application is clicked', async () => {
      opportunityService.getStudentOpportunityById.mockResolvedValueOnce({
        success: true,
        data: mockOpportunity
      });
      opportunityService.getOpportunityEligibility.mockResolvedValueOnce({
        success: true,
        data: { status: 'LIKELY_ELIGIBLE', snapshot: { perCriterion: [] } }
      });
      opportunityService.getStudentJobApplications.mockResolvedValue({
        success: true,
        data: []
      });
      opportunityService.recordOpportunityLinkClick.mockResolvedValueOnce({
        success: true,
        data: { clickCount: 1 }
      });

      render(
        <MemoryRouter initialEntries={['/student/opportunities/opp-501']}>
          <Routes>
            <Route path="/student/opportunities/:id" element={<OpportunityDetails />} />
          </Routes>
        </MemoryRouter>
      );

      await waitFor(() => {
        expect(screen.getByText('Open Official Application')).toBeInTheDocument();
      });

      const externalLink = screen.getByText('Open Official Application');
      fireEvent.click(externalLink);

      expect(opportunityService.recordOpportunityLinkClick).toHaveBeenCalledWith('opp-501');
    });
  });

  describe('2. Student MyApplications Page', () => {
    it('renders v3 applications with unverified (student-reported) badge and timeline trigger', async () => {
      opportunityService.getStudentJobApplications.mockResolvedValueOnce({
        success: true,
        data: [mockV3Application],
        pagination: { total: 1, totalPages: 1 }
      });

      render(
        <MemoryRouter>
          <MyApplications />
        </MemoryRouter>
      );

      await waitFor(() => {
        expect(screen.getByRole('link', { name: /Robotics Software Engineer/i })).toBeInTheDocument();
      });

      expect(screen.getByText(/unverified \(student-reported\)/i)).toBeInTheDocument();
      expect(screen.getByText(/Campus Opportunities \(v3\)/i)).toBeInTheDocument();

      // Click "Timeline" button to open history modal
      const timelineBtn = screen.getByRole('button', { name: /timeline/i });
      fireEvent.click(timelineBtn);

      await waitFor(() => {
        expect(screen.getByText(/Status Timeline/i)).toBeInTheDocument();
        expect(screen.getByText('Opened employer portal')).toBeInTheDocument();
      });
    });
  });

  describe('3. Staff AdminApplications Report & Verification', () => {
    const mockReportData = {
      success: true,
      data: [mockV3Application],
      metadata: {
        summary: {
          totalApplications: 12,
          appliedCount: 8,
          interestedCount: 4,
          verifiedCount: 3,
          unverifiedCount: 9
        }
      },
      pagination: { total: 1, totalPages: 1 }
    };

    it('renders KPI summary cards and applications table', async () => {
      opportunityService.getAdminApplicationsReport.mockResolvedValueOnce(mockReportData);

      render(
        <MemoryRouter>
          <AdminApplications />
        </MemoryRouter>
      );

      await waitFor(() => {
        expect(screen.getByText('Student Applications Report')).toBeInTheDocument();
      });

      // KPI cards
      expect(screen.getByText('12')).toBeInTheDocument(); // Total
      expect(screen.getByText('8')).toBeInTheDocument(); // Applied
      expect(screen.getByText('9')).toBeInTheDocument(); // Unverified

      // Student row
      expect(screen.getByText('Priya Sharma')).toBeInTheDocument();
      expect(screen.getByText('STU-2026-001')).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /verify/i })).toBeInTheDocument();
    });

    it('opens verification modal and enforces required reason before submitting', async () => {
      opportunityService.getAdminApplicationsReport.mockResolvedValue(mockReportData);
      opportunityService.verifyApplicationStaff.mockResolvedValueOnce({
        success: true,
        data: {
          ...mockV3Application,
          verificationStatus: 'VERIFIED',
          verificationReason: 'Official campus HR email confirmation'
        }
      });

      render(
        <MemoryRouter>
          <AdminApplications />
        </MemoryRouter>
      );

      await waitFor(() => {
        expect(screen.getByText('Priya Sharma')).toBeInTheDocument();
      });

      // Open verify modal
      const verifyBtn = screen.getByRole('button', { name: /verify/i });
      fireEvent.click(verifyBtn);

      await waitFor(() => {
        expect(screen.getByText('Verify Student Application')).toBeInTheDocument();
      });

      // Attempt submit without reason
      const saveBtn = screen.getByRole('button', { name: /save verification/i });
      fireEvent.click(saveBtn);

      expect(screen.getByText(/verification reason is required/i)).toBeInTheDocument();
      expect(opportunityService.verifyApplicationStaff).not.toHaveBeenCalled();

      // Fill reason
      const reasonBox = screen.getByPlaceholderText(/e\.g\. Confirmed with employer/i);
      fireEvent.change(reasonBox, {
        target: { value: 'Official campus HR email confirmation received' }
      });

      fireEvent.click(saveBtn);

      await waitFor(() => {
        expect(opportunityService.verifyApplicationStaff).toHaveBeenCalledWith(
          'app-501',
          expect.objectContaining({
            verificationStatus: 'VERIFIED',
            reason: 'Official campus HR email confirmation received'
          })
        );
      });
    });
  });
});
