import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import OpportunityDetails from '../pages/student/OpportunityDetails.jsx';
import StudentEligibility from '../pages/student/StudentEligibility.jsx';
import AdminOpportunities from '../pages/admin/AdminOpportunities.jsx';
import { opportunityService } from '../services/index.js';

vi.mock('../services/index.js', () => ({
  opportunityService: {
    getStudentOpportunityById: vi.fn(),
    getOpportunityEligibility: vi.fn(),
    evaluateOpportunityEligibility: vi.fn(),
    getMyEligibilityHistory: vi.fn(),
    getAdminOpportunities: vi.fn(),
    getOpportunityEligibilityCohort: vi.fn(),
    overrideEligibility: vi.fn()
  }
}));

describe('Chunk V4: Advisory Eligibility Engine, Checklist Panel & Staff Override UI', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('OpportunityDetails Eligibility Panel', () => {
    const mockOpportunity = {
      _id: 'opp-401',
      companyName: 'Stripe',
      jobTitle: 'Backend Engineer',
      workMode: 'REMOTE',
      location: 'Remote',
      compensationText: '₹24 LPA',
      applicationUrl: 'https://stripe.com/jobs/apply',
      applicationInstructions: 'Submit resume.',
      status: 'PUBLISHED',
      effectiveStatus: 'PUBLISHED',
      destinationDomain: 'stripe.com',
      deadline: '2026-12-31T00:00:00.000Z',
      requiredCriteria: [
        { type: 'MIN_CGPA', value: 8.0, isHardRequirement: true, displayLabel: 'Min CGPA 8.0' }
      ],
      preferredCriteria: []
    };

    const mockEvaluationPass = {
      _id: 'eval-401',
      status: 'LIKELY_ELIGIBLE',
      criteriaVersion: 1,
      engineVersion: '1',
      snapshot: {
        matched: ['Min CGPA 8.0'],
        unmet: [],
        missing: [],
        preferred: [],
        perCriterion: [
          {
            type: 'MIN_CGPA',
            label: 'Min CGPA 8.0',
            isHardRequirement: true,
            studentValue: 8.8,
            result: 'PASS',
            explanation: 'Your CGPA (8.8) meets or exceeds the required minimum (8.0)'
          }
        ],
        disclaimer: 'Advisory placement eligibility based on candidate profile.'
      },
      override: { isOverridden: false }
    };

    const mockEvaluationFail = {
      _id: 'eval-402',
      status: 'DOES_NOT_MEET',
      criteriaVersion: 1,
      engineVersion: '1',
      snapshot: {
        matched: [],
        unmet: ['Min CGPA 8.0'],
        missing: [],
        preferred: [],
        perCriterion: [
          {
            type: 'MIN_CGPA',
            label: 'Min CGPA 8.0',
            isHardRequirement: true,
            studentValue: 7.2,
            result: 'FAIL',
            explanation: 'Your CGPA (7.2) is below the required minimum (8.0)'
          }
        ],
        disclaimer: 'Advisory placement eligibility based on candidate profile.'
      },
      override: { isOverridden: false }
    };

    it('renders eligibility checklist with Likely Eligible badge and criterion breakdown', async () => {
      opportunityService.getStudentOpportunityById.mockResolvedValue({
        success: true,
        data: mockOpportunity
      });
      opportunityService.getOpportunityEligibility.mockResolvedValue({
        success: true,
        data: mockEvaluationPass
      });

      render(
        <MemoryRouter initialEntries={['/student/opportunities/opp-401']}>
          <Routes>
            <Route path="/student/opportunities/:id" element={<OpportunityDetails />} />
          </Routes>
        </MemoryRouter>
      );

      await waitFor(() => {
        expect(screen.getByText('Advisory Eligibility Checklist')).toBeDefined();
        expect(screen.getByText('Likely Eligible')).toBeDefined();
        expect(screen.getAllByText('Min CGPA 8.0').length).toBeGreaterThan(0);
        expect(screen.getByText('Pass')).toBeDefined();
        expect(screen.getByText('Your CGPA (8.8) meets or exceeds the required minimum (8.0)')).toBeDefined();
      });

      // CTA must be present and active
      const cta = screen.getByText('Open Official Application');
      expect(cta).toBeDefined();
    });

    it('NEVER hides or blocks Application CTA button when status is DOES_NOT_MEET', async () => {
      opportunityService.getStudentOpportunityById.mockResolvedValue({
        success: true,
        data: mockOpportunity
      });
      opportunityService.getOpportunityEligibility.mockResolvedValue({
        success: true,
        data: mockEvaluationFail
      });

      render(
        <MemoryRouter initialEntries={['/student/opportunities/opp-401']}>
          <Routes>
            <Route path="/student/opportunities/:id" element={<OpportunityDetails />} />
          </Routes>
        </MemoryRouter>
      );

      await waitFor(() => {
        expect(screen.getByText('Does Not Meet Criteria')).toBeDefined();
        expect(screen.getByText('Fail')).toBeDefined();
      });

      // Crucial non-blocking check: CTA button is STILL rendered and clickable!
      const cta = screen.getByText('Open Official Application');
      expect(cta).toBeDefined();
      expect(cta.getAttribute('href')).toBe('https://stripe.com/jobs/apply');
    });

    it('displays staff placement override notice when evaluation is overridden', async () => {
      const mockEvaluationOverridden = {
        ...mockEvaluationFail,
        override: {
          isOverridden: true,
          overrideStatus: 'LIKELY_ELIGIBLE',
          reason: 'Verified candidate internship recommendation letter.'
        }
      };

      opportunityService.getStudentOpportunityById.mockResolvedValue({
        success: true,
        data: mockOpportunity
      });
      opportunityService.getOpportunityEligibility.mockResolvedValue({
        success: true,
        data: mockEvaluationOverridden
      });

      render(
        <MemoryRouter initialEntries={['/student/opportunities/opp-401']}>
          <Routes>
            <Route path="/student/opportunities/:id" element={<OpportunityDetails />} />
          </Routes>
        </MemoryRouter>
      );

      await waitFor(() => {
        expect(screen.getByText('Placement Office Staff Determination')).toBeDefined();
        expect(screen.getByText(/Verified candidate internship recommendation letter/)).toBeDefined();
      });
    });
  });

  describe('StudentEligibility Overview Page', () => {
    const mockHistory = [
      {
        _id: 'eval-hist-1',
        opportunityId: {
          _id: 'opp-1',
          jobTitle: 'Data Analyst',
          companyName: 'Data Corp'
        },
        status: 'LIKELY_ELIGIBLE',
        evaluatedAt: '2026-11-19T00:00:00.000Z',
        snapshot: {
          matched: ['Degree', 'CGPA'],
          unmet: [],
          missing: []
        },
        override: { isOverridden: false }
      },
      {
        _id: 'eval-hist-2',
        opportunityId: {
          _id: 'opp-2',
          jobTitle: 'Systems Architect',
          companyName: 'Core Labs'
        },
        status: 'DOES_NOT_MEET',
        evaluatedAt: '2026-11-18T00:00:00.000Z',
        snapshot: {
          matched: ['Branch'],
          unmet: ['Experience'],
          missing: []
        },
        override: { isOverridden: false }
      }
    ];

    it('renders eligibility history summary cards and table of evaluations', async () => {
      opportunityService.getMyEligibilityHistory.mockResolvedValue({
        success: true,
        data: {
          data: mockHistory,
          pagination: { page: 1, limit: 20, total: 2, totalPages: 1 }
        }
      });

      render(
        <MemoryRouter>
          <StudentEligibility />
        </MemoryRouter>
      );

      await waitFor(() => {
        expect(screen.getByText('Placement Eligibility History')).toBeDefined();
        expect(screen.getByText('Data Analyst')).toBeDefined();
        expect(screen.getByText('Data Corp')).toBeDefined();
        expect(screen.getByText('Systems Architect')).toBeDefined();
        expect(screen.getByText('Core Labs')).toBeDefined();
      });
    });
  });

  describe('Staff Cohort & Override Modal Flow', () => {
    it('opens cohort modal, lists candidate evaluations, and triggers override dialog', async () => {
      opportunityService.getAdminOpportunities.mockResolvedValue({
        success: true,
        data: {
          data: [
            {
              _id: 'opp-staff-1',
              companyName: 'Amazon',
              jobTitle: 'SDE-1',
              status: 'PUBLISHED',
              effectiveStatus: 'PUBLISHED',
              criteriaVersion: 1,
              criteria: []
            }
          ],
          pagination: { page: 1, limit: 15, total: 1, totalPages: 1 }
        }
      });

      opportunityService.getOpportunityEligibilityCohort.mockResolvedValue({
        success: true,
        data: [
          {
            _id: 'eval-cohort-1',
            studentId: { name: 'Priya Sharma', email: 'priya@test.edu' },
            studentProfileId: { studentCode: '1RV22CS050', fullName: 'Priya Sharma', branch: 'CSE', cgpa: 7.8 },
            status: 'DOES_NOT_MEET',
            snapshot: { matched: ['Branch'], unmet: ['CGPA'], missing: [] },
            override: { isOverridden: false }
          }
        ]
      });

      render(
        <MemoryRouter>
          <AdminOpportunities />
        </MemoryRouter>
      );

      await waitFor(() => {
        expect(screen.getByText('Amazon')).toBeDefined();
      });

      // Click Cohort Modal button (title="View Eligibility Cohort")
      const cohortBtn = screen.getByTitle('View Eligibility Cohort');
      fireEvent.click(cohortBtn);

      await waitFor(() => {
        expect(screen.getByText(/Eligibility Cohort: SDE-1/)).toBeDefined();
        expect(screen.getByText('Priya Sharma')).toBeDefined();
      });

      // Click Override button
      const overrideBtn = screen.getByText('Override');
      fireEvent.click(overrideBtn);

      await waitFor(() => {
        expect(screen.getByText('Staff Eligibility Override')).toBeDefined();
        expect(screen.getByText('Confirm Override')).toBeDefined();
      });
    });
  });
});
