import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import RecruiterDashboard from '../pages/recruiter/RecruiterDashboard.jsx';
import MyJobs from '../pages/recruiter/MyJobs.jsx';
import CreateEditJob from '../pages/recruiter/CreateEditJob.jsx';
import JobApplicants from '../pages/recruiter/JobApplicants.jsx';
import RecruiterProfile from '../pages/recruiter/RecruiterProfile.jsx';
import * as AuthContextModule from '../context/AuthContext.jsx';
import * as recruiterService from '../services/recruiter.service.js';
import * as jobService from '../services/job.service.js';
import * as applicationService from '../services/application.service.js';
import * as interviewService from '../services/interview.service.js';

describe('Chunk 8: Recruiter UI Suite', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
  });

  const mockApprovedUser = {
    _id: 'rec_1',
    name: 'Sarah Connor',
    email: 'sarah@acme.com',
    role: 'recruiter',
    accountStatus: 'active'
  };

  const mockPendingUser = {
    _id: 'rec_2',
    name: 'Miles Dyson',
    email: 'miles@cyberdyne.com',
    role: 'recruiter',
    accountStatus: 'pending'
  };

  const mockApprovedProfile = {
    _id: 'prof_1',
    companyName: 'Acme Corp',
    website: 'https://acme.com',
    contactPerson: 'Sarah Connor',
    phone: '+91 9988776655',
    approvalStatus: 'approved'
  };

  const mockPendingProfile = {
    _id: 'prof_2',
    companyName: 'Cyberdyne Systems',
    website: 'https://cyberdyne.com',
    contactPerson: 'Miles Dyson',
    phone: '+91 9988776644',
    approvalStatus: 'pending'
  };

  const mockJobs = [
    {
      _id: 'job_101',
      title: 'Full Stack Engineer',
      department: 'Engineering',
      location: 'Bengaluru',
      employmentType: 'full_time',
      applicationDeadline: '2026-12-31T23:59:59.000Z',
      status: 'published',
      applicantCount: 5,
      eligibilityCriteria: {
        minCgpa: 7.5,
        allowedBranches: ['CSE', 'ISE'],
        allowedGraduationYears: [2026]
      }
    },
    {
      _id: 'job_102',
      title: 'AI/ML Intern',
      department: 'Research',
      location: 'Remote',
      employmentType: 'internship',
      applicationDeadline: '2026-11-30T23:59:59.000Z',
      status: 'draft',
      applicantCount: 0,
      eligibilityCriteria: {
        minCgpa: 8.0,
        allowedBranches: ['AIML', 'DATA_SCIENCE'],
        allowedGraduationYears: [2026, 2027]
      }
    }
  ];

  describe('Recruiter Overview / Dashboard', () => {
    it('displays pending approval notice when recruiter is pending', async () => {
      vi.spyOn(AuthContextModule, 'useAuth').mockReturnValue({
        user: mockPendingUser,
        isAuthenticated: true,
        loading: false
      });

      vi.spyOn(recruiterService, 'getMyProfile').mockResolvedValueOnce({
        success: true,
        data: mockPendingProfile
      });

      vi.spyOn(jobService, 'getMyJobs').mockResolvedValueOnce({
        success: true,
        data: { jobs: [] }
      });

      render(
        <MemoryRouter>
          <RecruiterDashboard />
        </MemoryRouter>
      );

      await waitFor(() => {
        expect(screen.getByText(/Account Awaiting Approval/i)).toBeInTheDocument();
        expect(screen.getByText(/Approval Required to Post/i)).toBeInTheDocument();
      });
    });

    it('displays metrics and quick actions for approved recruiter', async () => {
      vi.spyOn(AuthContextModule, 'useAuth').mockReturnValue({
        user: mockApprovedUser,
        isAuthenticated: true,
        loading: false
      });

      vi.spyOn(recruiterService, 'getMyProfile').mockResolvedValueOnce({
        success: true,
        data: mockApprovedProfile
      });

      vi.spyOn(jobService, 'getMyJobs').mockResolvedValueOnce({
        success: true,
        data: { jobs: mockJobs }
      });

      vi.spyOn(applicationService, 'getJobApplications').mockResolvedValue({
        success: true,
        data: {
          applications: [
            { _id: 'a1', status: 'applied' },
            { _id: 'a2', status: 'under_review' },
            { _id: 'a3', status: 'interview_scheduled' }
          ]
        }
      });

      render(
        <MemoryRouter>
          <RecruiterDashboard />
        </MemoryRouter>
      );

      await waitFor(() => {
        expect(screen.getByText('Acme Corp')).toBeInTheDocument();
        expect(screen.getByText(/Active Drives/i)).toBeInTheDocument();
        expect(screen.getByText(/Total Applicants/i)).toBeInTheDocument();
        expect(screen.getByText(/Awaiting Review/i)).toBeInTheDocument();
        expect(screen.getByText(/Upcoming Interviews/i)).toBeInTheDocument();
        expect(screen.getByText(/Post New Job Drive/i)).toBeInTheDocument();
      });
    });
  });

  describe('Job Management & Creation (CreateEditJob / MyJobs)', () => {
    it('disables publish button and warns pending recruiter in job creation form', async () => {
      vi.spyOn(AuthContextModule, 'useAuth').mockReturnValue({
        user: mockPendingUser,
        isAuthenticated: true,
        loading: false
      });

      vi.spyOn(recruiterService, 'getMyProfile').mockResolvedValueOnce({
        success: true,
        data: mockPendingProfile
      });

      render(
        <MemoryRouter initialEntries={['/recruiter/jobs/new']}>
          <Routes>
            <Route path="/recruiter/jobs/new" element={<CreateEditJob />} />
          </Routes>
        </MemoryRouter>
      );

      await waitFor(() => {
        expect(screen.getByText(/Post New Campus Drive/i)).toBeInTheDocument();
        expect(screen.getByText(/Approval from placement cell required to publish live drives/i)).toBeInTheDocument();
      });

      const publishBtn = screen.getByRole('button', { name: /Publish Campus Drive/i });
      expect(publishBtn).toBeDisabled();

      // Draft button should still be enabled
      const draftBtn = screen.getByRole('button', { name: /Save as Draft/i });
      expect(draftBtn).not.toBeDisabled();
    });

    it('allows approved recruiter to create and draft/publish a job', async () => {
      vi.spyOn(AuthContextModule, 'useAuth').mockReturnValue({
        user: mockApprovedUser,
        isAuthenticated: true,
        loading: false
      });

      vi.spyOn(recruiterService, 'getMyProfile').mockResolvedValueOnce({
        success: true,
        data: mockApprovedProfile
      });

      const createSpy = vi.spyOn(jobService, 'createJob').mockResolvedValueOnce({
        success: true,
        data: { job: { _id: 'job_new_99' } }
      });

      render(
        <MemoryRouter initialEntries={['/recruiter/jobs/new']}>
          <Routes>
            <Route path="/recruiter/jobs/new" element={<CreateEditJob />} />
          </Routes>
        </MemoryRouter>
      );

      await waitFor(() => {
        expect(screen.getByText(/Post New Campus Drive/i)).toBeInTheDocument();
      });

      // Fill in title and description
      fireEvent.change(screen.getByLabelText(/Job Title/i), {
        target: { value: 'Backend Engineer' }
      });
      fireEvent.change(screen.getByLabelText(/Detailed Job Description/i), {
        target: { value: 'Develop high-throughput REST and GraphQL APIs' }
      });

      const draftBtn = screen.getByRole('button', { name: /Save as Draft/i });
      fireEvent.click(draftBtn);

      await waitFor(() => {
        expect(createSpy).toHaveBeenCalledWith(
          expect.objectContaining({
            title: 'Backend Engineer',
            description: 'Develop high-throughput REST and GraphQL APIs'
          })
        );
      });
    });
  });

  describe('Applicants Review & Consequential Confirmations', () => {
    const mockApplicants = [
      {
        _id: 'app_001',
        status: 'applied',
        studentId: {
          _id: 'stu_01',
          name: 'Aditi Sharma',
          email: 'aditi@college.edu'
        },
        studentProfile: {
          branch: 'CSE',
          cgpa: 9.1,
          graduationYear: 2026
        },
        resumeSnapshot: {
          url: 'https://cloudinary.com/resumes/aditi.pdf',
          fileName: 'Aditi_Resume.pdf'
        }
      },
      {
        _id: 'app_002',
        status: 'shortlisted',
        studentId: {
          _id: 'stu_02',
          name: 'Rohan Verma',
          email: 'rohan@college.edu'
        },
        studentProfile: {
          branch: 'ISE',
          cgpa: 8.4,
          graduationYear: 2026
        },
        resumeSnapshot: {
          url: 'https://cloudinary.com/resumes/rohan.pdf',
          fileName: 'Rohan_Resume.pdf'
        }
      }
    ];

    it('renders applicant table with candidate details and resume links', async () => {
      vi.spyOn(AuthContextModule, 'useAuth').mockReturnValue({
        user: mockApprovedUser,
        isAuthenticated: true,
        loading: false
      });

      vi.spyOn(jobService, 'getJobById').mockResolvedValueOnce({
        success: true,
        data: { job: mockJobs[0] }
      });

      vi.spyOn(applicationService, 'getJobApplications').mockResolvedValueOnce({
        success: true,
        data: {
          applications: mockApplicants,
          pagination: { total: 2, totalPages: 1 }
        }
      });

      render(
        <MemoryRouter initialEntries={['/recruiter/jobs/job_101/applicants']}>
          <Routes>
            <Route path="/recruiter/jobs/:jobId/applicants" element={<JobApplicants />} />
          </Routes>
        </MemoryRouter>
      );

      await waitFor(() => {
        expect(screen.getByText('Aditi Sharma')).toBeInTheDocument();
        expect(screen.getByText('Rohan Verma')).toBeInTheDocument();
        expect(screen.getAllByText(/View Resume/i).length).toBe(2);
      });
    });

    it('requires ConfirmDialog for consequential status updates (e.g. reject)', async () => {
      vi.spyOn(AuthContextModule, 'useAuth').mockReturnValue({
        user: mockApprovedUser,
        isAuthenticated: true,
        loading: false
      });

      vi.spyOn(jobService, 'getJobById').mockResolvedValue({
        success: true,
        data: { job: mockJobs[0] }
      });

      vi.spyOn(applicationService, 'getJobApplications').mockResolvedValue({
        success: true,
        data: {
          applications: mockApplicants,
          pagination: { total: 2, totalPages: 1 }
        }
      });

      const updateStatusSpy = vi.spyOn(applicationService, 'updateApplicationStatus').mockResolvedValue({
        success: true,
        data: { _id: 'app_001', status: 'rejected' }
      });

      render(
        <MemoryRouter initialEntries={['/recruiter/jobs/job_101/applicants']}>
          <Routes>
            <Route path="/recruiter/jobs/:jobId/applicants" element={<JobApplicants />} />
          </Routes>
        </MemoryRouter>
      );

      await waitFor(() => {
        expect(screen.getByText('Aditi Sharma')).toBeInTheDocument();
      });

      // Click "Update Status" on first candidate
      const updateButtons = screen.getAllByRole('button', { name: /Update Status/i });
      fireEvent.click(updateButtons[0]);

      // Status modal opens
      expect(screen.getByText(/Update Application Status/i)).toBeInTheDocument();

      // Change status select to 'rejected'
      const statusSelect = screen.getByLabelText(/Next Permitted Status/i);
      fireEvent.change(statusSelect, { target: { value: 'rejected' } });

      // Click confirm on the form
      const formSubmitBtn = screen.getByRole('button', { name: /Confirm Status Update/i });
      fireEvent.click(formSubmitBtn);

      // ConfirmDialog should now be rendered for consequential action!
      await waitFor(() => {
        expect(screen.getByText(/Confirm Candidate Rejection/i)).toBeInTheDocument();
        expect(screen.getByText(/Are you sure you want to reject candidate Aditi Sharma\?/i)).toBeInTheDocument();
      });

      // API should NOT be called yet
      expect(updateStatusSpy).not.toHaveBeenCalled();

      // Confirm in dialog
      const dialogConfirmBtn = screen.getByRole('button', { name: /Confirm Rejection/i });
      fireEvent.click(dialogConfirmBtn);

      // Now API is invoked
      await waitFor(() => {
        expect(updateStatusSpy).toHaveBeenCalledWith('app_001', {
          status: 'rejected',
          note: ''
        });
      });
    });

    it('schedules an interview for a shortlisted candidate', async () => {
      vi.spyOn(AuthContextModule, 'useAuth').mockReturnValue({
        user: mockApprovedUser,
        isAuthenticated: true,
        loading: false
      });

      vi.spyOn(jobService, 'getJobById').mockResolvedValue({
        success: true,
        data: { job: mockJobs[0] }
      });

      vi.spyOn(applicationService, 'getJobApplications').mockResolvedValue({
        success: true,
        data: {
          applications: [mockApplicants[1]], // Shortlisted candidate Rohan
          pagination: { total: 1, totalPages: 1 }
        }
      });

      const scheduleSpy = vi.spyOn(interviewService, 'scheduleInterview').mockResolvedValue({
        success: true,
        data: {
          interview: { _id: 'int_001', scheduledAt: '2026-11-20T10:00:00.000Z' }
        }
      });

      render(
        <MemoryRouter initialEntries={['/recruiter/jobs/job_101/applicants']}>
          <Routes>
            <Route path="/recruiter/jobs/:jobId/applicants" element={<JobApplicants />} />
          </Routes>
        </MemoryRouter>
      );

      await waitFor(() => {
        expect(screen.getByText('Rohan Verma')).toBeInTheDocument();
      });

      // Click "Interview" button
      const interviewBtn = screen.getByRole('button', { name: /Interview/i });
      fireEvent.click(interviewBtn);

      // Schedule modal opens
      expect(screen.getByText(/Schedule Interview Round/i)).toBeInTheDocument();

      // Submit the interview form
      const submitBtn = screen.getByRole('button', { name: /Schedule & Notify/i });
      fireEvent.click(submitBtn);

      await waitFor(() => {
        expect(scheduleSpy).toHaveBeenCalledWith(
          'app_002',
          expect.objectContaining({
            mode: 'online',
            locationOrLink: expect.stringContaining('meet.google.com')
          })
        );
      });
    });
  });

  describe('Company Profile Management', () => {
    it('loads and saves recruiter company details', async () => {
      vi.spyOn(recruiterService, 'getMyProfile').mockResolvedValueOnce({
        success: true,
        data: mockApprovedProfile
      });

      const updateProfileSpy = vi.spyOn(recruiterService, 'updateMyProfile').mockResolvedValueOnce({
        success: true,
        data: {
          ...mockApprovedProfile,
          contactPerson: 'Sarah C. Connor'
        }
      });

      render(
        <MemoryRouter>
          <RecruiterProfile />
        </MemoryRouter>
      );

      await waitFor(() => {
        expect(screen.getByDisplayValue('Acme Corp')).toBeInTheDocument();
        expect(screen.getByDisplayValue('Sarah Connor')).toBeInTheDocument();
      });

      // Edit contact person
      const contactInput = screen.getByLabelText(/Primary Contact Person/i);
      fireEvent.change(contactInput, { target: { value: 'Sarah C. Connor' } });

      // Save
      const saveBtn = screen.getByRole('button', { name: /Save Profile/i });
      fireEvent.click(saveBtn);

      await waitFor(() => {
        expect(updateProfileSpy).toHaveBeenCalledWith(
          expect.objectContaining({
            contactPerson: 'Sarah C. Connor'
          })
        );
        expect(screen.getByText(/Company profile updated successfully!/i)).toBeInTheDocument();
      });
    });
  });
});

