import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import Button from '../components/Button.jsx';
import StatusBadge from '../components/StatusBadge.jsx';
import JobCard from '../components/JobCard.jsx';
import ApplicationTimeline from '../components/ApplicationTimeline.jsx';

describe('Frontend Reusable Components Suite', () => {
  it('renders Button with variants and loading state', () => {
    const handleClick = vi.fn();
    const { rerender } = render(
      <Button variant="primary" onClick={handleClick}>
        Submit Application
      </Button>
    );

    const btn = screen.getByRole('button', { name: /Submit Application/i });
    expect(btn).toBeInTheDocument();
    fireEvent.click(btn);
    expect(handleClick).toHaveBeenCalledTimes(1);

    // Rerender with loading state
    rerender(
      <Button variant="primary" loading={true} onClick={handleClick}>
        Submit Application
      </Button>
    );
    expect(btn).toBeDisabled();
  });

  it('renders StatusBadge with semantic labels and classes', () => {
    const { rerender } = render(<StatusBadge status="applied" />);
    expect(screen.getByText('Applied')).toBeInTheDocument();

    rerender(<StatusBadge status="shortlisted" />);
    expect(screen.getByText('Shortlisted')).toBeInTheDocument();

    rerender(<StatusBadge status="interview_scheduled" />);
    expect(screen.getByText('Interview Scheduled')).toBeInTheDocument();

    rerender(<StatusBadge status="selected" />);
    expect(screen.getByText('Selected')).toBeInTheDocument();
  });

  it('renders JobCard with company details, deadline, and eligibility criteria', () => {
    const mockJob = {
      _id: 'job123',
      title: 'Senior Frontend Architect',
      companyName: 'Atlassian India',
      location: 'Bengaluru',
      employmentType: 'full_time',
      salaryRange: '24 - 30 LPA',
      applicationDeadline: new Date(Date.now() + 864000000).toISOString(),
      status: 'published',
      eligibilityCriteria: {
        minCgpa: 8.5,
        allowedBranches: ['CSE', 'ISE']
      }
    };

    const handleView = vi.fn();
    const handleApply = vi.fn();

    render(
      <JobCard
        job={mockJob}
        onViewDetails={handleView}
        onApply={handleApply}
      />
    );

    expect(screen.getByText('Senior Frontend Architect')).toBeInTheDocument();
    expect(screen.getByText('Atlassian India')).toBeInTheDocument();
    expect(screen.getByText(/24 - 30 LPA/i)).toBeInTheDocument();
    expect(screen.getByText(/Min CGPA: 8.5/i)).toBeInTheDocument();
    expect(screen.getByText(/Branches: CSE, ISE/i)).toBeInTheDocument();

    const viewBtn = screen.getByRole('button', { name: /View Details/i });
    fireEvent.click(viewBtn);
    expect(handleView).toHaveBeenCalledWith(mockJob);

    const applyBtn = screen.getByRole('button', { name: /Apply Now/i });
    fireEvent.click(applyBtn);
    expect(handleApply).toHaveBeenCalledWith(mockJob);
  });

  it('renders ApplicationTimeline with chronological step history', () => {
    const mockHistory = [
      {
        _id: 'h1',
        status: 'applied',
        changedAt: '2026-11-01T10:00:00.000Z',
        note: 'Submitted profile'
      },
      {
        _id: 'h2',
        status: 'shortlisted',
        changedAt: '2026-11-03T14:30:00.000Z',
        note: 'Selected for technical interview'
      }
    ];

    render(<ApplicationTimeline history={mockHistory} currentStatus="shortlisted" />);

    expect(screen.getByText('Applied')).toBeInTheDocument();
    expect(screen.getByText('Shortlisted')).toBeInTheDocument();
    expect(screen.getByText('Submitted profile')).toBeInTheDocument();
    expect(screen.getByText('Selected for technical interview')).toBeInTheDocument();
  });
});

