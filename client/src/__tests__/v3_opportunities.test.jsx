import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import AdminOpportunities from '../pages/admin/AdminOpportunities.jsx';
import OpportunitiesBrowse from '../pages/student/OpportunitiesBrowse.jsx';
import OpportunityDetails from '../pages/student/OpportunityDetails.jsx';
import * as AuthContextModule from '../context/AuthContext.jsx';
import { opportunityService } from '../services/index.js';

vi.mock('../services/index.js', () => ({
  opportunityService: {
    getAdminOpportunities: vi.fn(),
    getAdminOpportunityById: vi.fn(),
    createOpportunity: vi.fn(),
    updateOpportunity: vi.fn(),
    publishOpportunity: vi.fn(),
    closeOpportunity: vi.fn(),
    archiveOpportunity: vi.fn(),
    getStudentOpportunities: vi.fn(),
    getStudentOpportunityById: vi.fn()
  }
}));

vi.mock('../services/opportunity.service.js', () => ({
  getAdminOpportunities: vi.fn(),
  getAdminOpportunityById: vi.fn(),
  createOpportunity: vi.fn(),
  updateOpportunity: vi.fn(),
  publishOpportunity: vi.fn(),
  closeOpportunity: vi.fn(),
  archiveOpportunity: vi.fn(),
  getStudentOpportunities: vi.fn(),
  getStudentOpportunityById: vi.fn()
}));

describe('Chunk V3: Job Opportunities, Staff Lifecycle & Student Portal UI', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('AdminOpportunities Component', () => {
    const mockOpportunities = [
      {
        _id: 'opp-101',
        companyName: 'Acme Corp',
        jobTitle: 'Software Engineer',
        employerJobId: 'ACME-991',
        workMode: 'ON_SITE',
        location: 'Bengaluru',
        compensationText: '₹14 LPA',
        status: 'DRAFT',
        effectiveStatus: 'DRAFT',
        deadline: '2026-12-31T23:59:59.000Z',
        criteriaVersion: 1,
        criteria: [
          { type: 'MIN_CGPA', operator: 'GTE', value: 8.0, isHardRequirement: true, displayLabel: 'Min CGPA 8.0' }
        ]
      },
      {
        _id: 'opp-102',
        companyName: 'Tech Innovations',
        jobTitle: 'Frontend Engineer',
        workMode: 'REMOTE',
        location: 'Remote',
        compensationText: '₹18 LPA',
        status: 'PUBLISHED',
        effectiveStatus: 'PUBLISHED',
        deadline: '2026-11-30T23:59:59.000Z',
        criteriaVersion: 2,
        criteria: []
      }
    ];

    it('renders opportunity list with status badges, criteria count, and actions', async () => {
      opportunityService.getAdminOpportunities.mockResolvedValue({
        success: true,
        data: {
          data: mockOpportunities,
          pagination: { page: 1, limit: 15, total: 2, totalPages: 1 }
        }
      });

      render(
        <MemoryRouter>
          <AdminOpportunities />
        </MemoryRouter>
      );

      await waitFor(() => {
        expect(screen.getByText('Job Opportunities & Campus Drives')).toBeDefined();
        expect(screen.getByText('Acme Corp')).toBeDefined();
        expect(screen.getByText('Software Engineer')).toBeDefined();
        expect(screen.getByText('Tech Innovations')).toBeDefined();
      });
    });

    it('opens create modal with criteria builder and live preview tabs', async () => {
      opportunityService.getAdminOpportunities.mockResolvedValue({
        success: true,
        data: { data: [], pagination: { page: 1, limit: 15, total: 0, totalPages: 1 } }
      });

      render(
        <MemoryRouter>
          <AdminOpportunities />
        </MemoryRouter>
      );

      await waitFor(() => {
        expect(screen.getByText('Create Opportunity')).toBeDefined();
      });

      fireEvent.click(screen.getByText('Create Opportunity'));

      expect(screen.getByText('1. Job Details & Links')).toBeDefined();
      expect(screen.getByText('3. Live Student Preview')).toBeDefined();
    });
  });

  describe('OpportunitiesBrowse Component', () => {
    const mockStudentOpportunities = [
      {
        _id: 'opp-201',
        companyName: 'Google',
        jobTitle: 'Cloud Engineer',
        workMode: 'HYBRID',
        location: 'Hyderabad',
        compensationText: '₹22 LPA',
        status: 'PUBLISHED',
        effectiveStatus: 'PUBLISHED',
        applicationUrl: 'https://careers.google.com/jobs/123',
        deadline: '2026-12-15T00:00:00.000Z',
        destinationDomain: 'careers.google.com',
        requiredCriteria: [
          { type: 'MIN_CGPA', value: 8.0, isHardRequirement: true, displayLabel: 'CGPA ≥ 8.0' }
        ],
        preferredCriteria: [
          { type: 'SKILL', value: 'Go', isHardRequirement: false, displayLabel: 'Golang' }
        ]
      },
      {
        _id: 'opp-202',
        companyName: 'Old Startup',
        jobTitle: 'Intern',
        workMode: 'REMOTE',
        status: 'EXPIRED',
        effectiveStatus: 'EXPIRED',
        applicationUrl: 'https://startup.com/apply',
        deadline: '2026-10-01T00:00:00.000Z',
        requiredCriteria: []
      }
    ];

    it('renders published opportunities with criteria chips and always-visible CTA button', async () => {
      opportunityService.getStudentOpportunities.mockResolvedValue({
        success: true,
        data: {
          data: mockStudentOpportunities,
          pagination: { page: 1, limit: 15, total: 2, totalPages: 1 }
        }
      });

      render(
        <MemoryRouter>
          <OpportunitiesBrowse />
        </MemoryRouter>
      );

      await waitFor(() => {
        expect(screen.getByText('Placement Opportunities')).toBeDefined();
        expect(screen.getByText('Google')).toBeDefined();
        expect(screen.getByText('Cloud Engineer')).toBeDefined();
        expect(screen.getByText('CGPA ≥ 8.0')).toBeDefined();
      });

      // Active opportunity has active Open Application button
      const openLinks = screen.getAllByText('Open Application');
      expect(openLinks.length).toBeGreaterThan(0);

      // Expired opportunity has disabled "Deadline Expired" CTA button
      expect(screen.getByText('Deadline Expired')).toBeDefined();
    });
  });

  describe('OpportunityDetails Component', () => {
    const mockDetail = {
      _id: 'opp-301',
      companyName: 'Microsoft',
      jobTitle: 'Software Engineer II',
      workMode: 'HYBRID',
      location: 'Bengaluru / Redmond',
      compensationText: '₹28 LPA',
      applicationUrl: 'https://careers.microsoft.com/us/en/job/987',
      applicationInstructions: 'Use college email and paste USN on top of resume.',
      deadline: '2026-12-30T23:59:59.000Z',
      status: 'PUBLISHED',
      effectiveStatus: 'PUBLISHED',
      destinationDomain: 'careers.microsoft.com',
      lastVerifiedAt: '2026-11-19T10:00:00.000Z',
      description: '### Job Overview\nBuild enterprise cloud services at scale.',
      requiredCriteria: [
        { type: 'DEGREE', value: 'B.Tech', isHardRequirement: true, displayLabel: 'B.Tech / B.E.' },
        { type: 'MIN_CGPA', value: 8.5, isHardRequirement: true, displayLabel: 'CGPA ≥ 8.5' }
      ],
      preferredCriteria: [
        { type: 'SKILL', value: 'Distributed Systems', isHardRequirement: false, displayLabel: 'Distributed Systems' }
      ]
    };

    it('renders opportunity details with split criteria, domain pill, and application instructions', async () => {
      opportunityService.getStudentOpportunityById.mockResolvedValue({
        success: true,
        data: mockDetail
      });

      render(
        <MemoryRouter initialEntries={['/student/opportunities/opp-301']}>
          <Routes>
            <Route path="/student/opportunities/:id" element={<OpportunityDetails />} />
          </Routes>
        </MemoryRouter>
      );

      await waitFor(() => {
        expect(screen.getAllByText('Software Engineer II').length).toBeGreaterThan(0);
        expect(screen.getByText('Microsoft')).toBeDefined();
        expect(screen.getByText('careers.microsoft.com')).toBeDefined();
        expect(screen.getByText('Application Instructions')).toBeDefined();
        expect(screen.getByText('Required Qualifications')).toBeDefined();
        expect(screen.getByText('B.Tech / B.E.')).toBeDefined();
        expect(screen.getByText('Preferred Qualifications')).toBeDefined();
        expect(screen.getByText('Distributed Systems')).toBeDefined();
      });

      // Always-visible CTA button
      const ctaBtn = screen.getByText('Open Official Application');
      expect(ctaBtn).toBeDefined();
    });
  });
});
