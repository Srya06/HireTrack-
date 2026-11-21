import { describe, it, expect, vi, beforeEach } from 'vitest';
import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { BrowserRouter, MemoryRouter } from 'react-router-dom';
import StudentAmbassador from '../pages/student/StudentAmbassador.jsx';
import ReferralLanding from '../pages/public/ReferralLanding.jsx';
import AdminAmbassadors from '../pages/admin/AdminAmbassadors.jsx';
import ambassadorService from '../services/ambassador.service.js';

vi.mock('../services/ambassador.service.js', () => ({
  default: {
    applyAmbassador: vi.fn(),
    getMyStatus: vi.fn(),
    getMyReferrals: vi.fn(),
    requestCertificateReview: vi.fn(),
    captureReferral: vi.fn(),
    getAmbassadorProfiles: vi.fn(),
    updateAmbassadorStatus: vi.fn(),
    getCampaigns: vi.fn(),
    createCampaign: vi.fn(),
    updateCampaign: vi.fn(),
    getReferrals: vi.fn(),
    verifyReferral: vi.fn(),
    getCertificates: vi.fn(),
    updateCertificateStatus: vi.fn(),
    getReports: vi.fn()
  }
}));

describe('Chunk V11: Campus Ambassadors & Outreach UI Suite', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('1. StudentAmbassador Component', () => {
    it('renders application form when student has not applied yet and handles submit', async () => {
      ambassadorService.getMyStatus.mockResolvedValue({
        data: {
          isAmbassador: false,
          profile: null
        }
      });
      ambassadorService.applyAmbassador.mockResolvedValue({
        data: { status: 'PENDING' }
      });

      render(
        <BrowserRouter>
          <StudentAmbassador />
        </BrowserRouter>
      );

      await waitFor(() => {
        expect(screen.getByText('Campus Ambassador Program')).toBeInTheDocument();
        expect(screen.getByText('Apply to Become a Campus Ambassador')).toBeInTheDocument();
      });

      // Submit statement
      const textarea = screen.getByPlaceholderText(/why you want to be an ambassador/i);
      fireEvent.change(textarea, { target: { value: 'Excited to mentor junior batches in DSA.' } });

      const submitBtn = screen.getByRole('button', { name: /Submit Ambassador Application/i });
      fireEvent.click(submitBtn);

      await waitFor(() => {
        expect(ambassadorService.applyAmbassador).toHaveBeenCalledWith('Excited to mentor junior batches in DSA.');
      });
    });

    it('displays pending review state when profile status is PENDING', async () => {
      ambassadorService.getMyStatus.mockResolvedValue({
        data: {
          isAmbassador: true,
          profile: {
            status: 'PENDING',
            applicationNotes: 'Peer outreach strategy for campus drive'
          }
        }
      });

      render(
        <BrowserRouter>
          <StudentAmbassador />
        </BrowserRouter>
      );

      await waitFor(() => {
        expect(screen.getByText('Application Under Review')).toBeInTheDocument();
        expect(screen.getByText(/Peer outreach strategy for campus drive/i)).toBeInTheDocument();
      });
    });

    it('renders approved dashboard with active campaign, referral code, progress, and masked referrals', async () => {
      ambassadorService.getMyStatus.mockResolvedValue({
        data: {
          isAmbassador: true,
          profile: { status: 'APPROVED' },
          activeCampaign: {
            id: 'camp_1',
            name: 'Fall 2026 Campus Drive',
            targetCount: 10
          },
          referralCode: 'HT-ABCD1234',
          referralLink: 'http://localhost:5173/referral?code=HT-ABCD1234',
          stats: {
            verifiedCount: 10,
            targetCount: 10,
            progressPercentage: 100,
            pendingCount: 2,
            duplicateCount: 1
          },
          certificate: {
            status: 'ELIGIBLE'
          }
        }
      });

      ambassadorService.getMyReferrals.mockResolvedValue({
        data: {
          referrals: [
            {
              id: 'ref_1',
              maskedName: 'J*** D**',
              maskedEmail: 'j***@c***.edu',
              maskedPhone: '******1234',
              institute: 'National Tech',
              verificationStatus: 'VERIFIED',
              capturedAt: '2026-11-21T10:00:00.000Z'
            }
          ]
        }
      });

      render(
        <BrowserRouter>
          <StudentAmbassador />
        </BrowserRouter>
      );

      await waitFor(() => {
        expect(screen.getByText('ACTIVE AMBASSADOR')).toBeInTheDocument();
        expect(screen.getByText('HT-ABCD1234')).toBeInTheDocument();
      });

      // Target progress
      expect(screen.getByText('10')).toBeInTheDocument();

      // Masked participant log
      expect(screen.getByText('J*** D**')).toBeInTheDocument();
      expect(screen.getByText('j***@c***.edu')).toBeInTheDocument();
      expect(screen.getByText('******1234')).toBeInTheDocument();

      // Certificate eligibility and request button
      const certBtn = screen.getByRole('button', { name: /Request Certificate Review/i });
      expect(certBtn).toBeInTheDocument();
    });
  });

  describe('2. ReferralLanding Public Component', () => {
    it('populates code from query parameter and submits public referral record', async () => {
      ambassadorService.captureReferral.mockResolvedValue({
        message: 'Referral captured successfully',
        referralId: 'ref_123'
      });

      render(
        <MemoryRouter initialEntries={['/referral?code=HT-9F2B3E1A']}>
          <ReferralLanding />
        </MemoryRouter>
      );

      expect(screen.getByText('Campus Placement Outreach')).toBeInTheDocument();
      const codeInput = screen.getByDisplayValue('HT-9F2B3E1A');
      expect(codeInput).toBeInTheDocument();

      fireEvent.change(screen.getByPlaceholderText(/Candidate full name/i), { target: { value: 'Alex Morgan' } });
      fireEvent.change(screen.getByPlaceholderText(/name@college.edu/i), { target: { value: 'alex@nit.edu' } });
      fireEvent.change(screen.getByPlaceholderText(/\+91-9876543210/i), { target: { value: '9876543210' } });
      fireEvent.change(screen.getByPlaceholderText(/National Institute of Technology/i), { target: { value: 'NIT Trichy' } });

      const submitBtn = screen.getByRole('button', { name: /Submit Participation Record/i });
      fireEvent.click(submitBtn);

      await waitFor(() => {
        expect(ambassadorService.captureReferral).toHaveBeenCalledWith({
          code: 'HT-9F2B3E1A',
          name: 'Alex Morgan',
          email: 'alex@nit.edu',
          phone: '9876543210',
          institute: 'NIT Trichy'
        });
        expect(screen.getByText('Referral Submission Received')).toBeInTheDocument();
      });
    });
  });

  describe('3. AdminAmbassadors Coordinator Workspace', () => {
    const mockProfiles = [
      {
        id: 'prof_1',
        fullName: 'Rajat Sharma',
        rollNumber: 'CS-2026-001',
        email: 'rajat@univ.edu',
        branch: 'CSE',
        status: 'PENDING',
        applicationNotes: 'Leading campus peer workshops'
      }
    ];

    const mockReferrals = [
      {
        id: 'ref_1',
        name: 'Jane Doe',
        email: 'jane@college.edu',
        phone: '9876543210',
        institute: 'City Engineering College',
        campaignName: 'Fall 2026 Drive',
        verificationStatus: 'DUPLICATE'
      }
    ];

    it('renders applications tab and approves ambassador application with mandatory audit', async () => {
      ambassadorService.getAmbassadorProfiles.mockResolvedValue({
        data: { profiles: mockProfiles }
      });
      ambassadorService.updateAmbassadorStatus.mockResolvedValue({
        data: { status: 'APPROVED' }
      });

      render(
        <BrowserRouter>
          <AdminAmbassadors />
        </BrowserRouter>
      );

      await waitFor(() => {
        expect(screen.getByText('Ambassador Program Coordination')).toBeInTheDocument();
        expect(screen.getByText('Rajat Sharma')).toBeInTheDocument();
      });

      const approveBtn = screen.getByRole('button', { name: /Approve/i });
      fireEvent.click(approveBtn);

      await waitFor(() => {
        expect(screen.getByText(/Confirm Ambassador APPROVED/i)).toBeInTheDocument();
      });

      const confirmBtn = screen.getByRole('button', { name: /Confirm APPROVED/i });
      fireEvent.click(confirmBtn);

      await waitFor(() => {
        expect(ambassadorService.updateAmbassadorStatus).toHaveBeenCalledWith('prof_1', {
          status: 'APPROVED'
        });
      });
    });

    it('displays DUPLICATE warning badge on duplicate referrals and allows verification with reason', async () => {
      ambassadorService.getReferrals.mockResolvedValue({
        data: { referrals: mockReferrals }
      });
      ambassadorService.verifyReferral.mockResolvedValue({
        data: { verificationStatus: 'VERIFIED' }
      });

      render(
        <BrowserRouter>
          <AdminAmbassadors />
        </BrowserRouter>
      );

      // Switch to Referrals tab
      const referralsTab = screen.getByRole('button', { name: /Referral Verification Queue/i });
      fireEvent.click(referralsTab);

      await waitFor(() => {
        expect(ambassadorService.getReferrals).toHaveBeenCalled();
        expect(screen.getByText('Jane Doe')).toBeInTheDocument();
        // DUPLICATE warning flag visible
        expect(screen.getAllByText(/DUPLICATE/i).length).toBeGreaterThan(0);
      });

      const verifyBtn = screen.getByRole('button', { name: /Verify/i });
      fireEvent.click(verifyBtn);

      await waitFor(() => {
        expect(screen.getByText(/Verify Referral Participant: Jane Doe/i)).toBeInTheDocument();
      });

      const confirmVerifyBtn = screen.getByRole('button', { name: /Confirm Verification/i });
      fireEvent.click(confirmVerifyBtn);

      await waitFor(() => {
        expect(ambassadorService.verifyReferral).toHaveBeenCalledWith('ref_1', {
          verificationStatus: 'VERIFIED',
          reason: expect.any(String)
        });
      });
    });
  });
});
