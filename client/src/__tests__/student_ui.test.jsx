import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import StudentDashboard from '../pages/student/StudentDashboard.jsx';
import JobsBrowse from '../pages/student/JobsBrowse.jsx';
import JobDetails from '../pages/student/JobDetails.jsx';
import ApplicationDetails from '../pages/student/ApplicationDetails.jsx';
import StudentProfile from '../pages/student/StudentProfile.jsx';
import * as AuthContextModule from '../context/AuthContext.jsx';
import * as studentService from '../services/student.service.js';
import * as jobService from '../services/job.service.js';
import * as applicationService from '../services/application.service.js';
import * as interviewService from '../services/interview.service.js';

describe('Chunk 7: Student UI Suite', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
  });

  const mockStudentUser = {
    _id: 'stu_123',
    name: 'Maya Rao',
    email: 'maya@hiretrack.edu',
    role: 'student',
    accountStatus: 'active'
  };

  const mockProfile = {
    userId: 'stu_123',
    studentId: '1RV22CS099',
    branch: 'CSE',
    graduationYear: 2026,
    cgpa: 9.2,
    skills: ['React', 'Node.js'],
    resume: {
      url: 'https://cloudinary.example.com/resumes/maya.pdf',
      publicId: 'mock_resume_id',
      fileName: 'Maya_Rao_Resume.pdf',
      size: 204800,
      uploadedAt: '2026-11-01T10:00:00.000Z'
    },
    profileCompleteness: {
      percentage: 100,
      isComplete: true
    }
  };

  describe('Student Dashboard / Overview', () => {
    it('renders profile completeness, pipeline status summary, and recent applications', async () => {
      vi.spyOn(AuthContextModule, 'useAuth').mockReturnValue({
        user: mockStudentUser,
        isAuthenticated: true,
        loading: false
      });

      vi.spyOn(studentService, 'getMyProfile').mockResolvedValueOnce({
        success: true,
        data: mockProfile
      });

      vi.spyOn(applicationService, 'getMyApplications').mockResolvedValueOnce({
        success: true,
        data: {
          applications: [
            {
              _id: 'app_1',
              status: 'shortlisted',
              createdAt: '2026-11-05T00:00:00.000Z',
              jobId: { _id: 'job_1', title: 'Fullstack Dev', companyName: 'Razorpay' }
            }
          ],
          pagination: { total: 1, totalPages: 1 }
        }
      });

      vi.spyOn(jobService, 'getJobs').mockResolvedValueOnce({
        success: true,
        data: {
          jobs: [
            {
              _id: 'job_2',
              title: 'Cloud Engineer',
              companyName: 'AWS',
              location: 'Bengaluru',
              applicationDeadline: '2026-12-01T00:00:00.000Z'
            }
          ],
          pagination: { total: 1, totalPages: 1 }
        }
      });

      render(
        <MemoryRouter>
          <StudentDashboard />
        </MemoryRouter>
      );

      await waitFor(() => {
        expect(screen.getByText(/Welcome back, Maya Rao!/i)).toBeInTheDocument();
      });

      expect(screen.getByText('100%')).toBeInTheDocument();
      expect(screen.getByText('Application Pipeline Summary')).toBeInTheDocument();
      expect(screen.getByText('Fullstack Dev')).toBeInTheDocument();
      expect(screen.getByText('Razorpay')).toBeInTheDocument();
    });
  });

  describe('Find Jobs (Browse & Filter)', () => {
    it('renders job cards and handles search input', async () => {
      vi.spyOn(jobService, 'getJobs').mockResolvedValueOnce({
        success: true,
        data: {
          jobs: [
            {
              _id: 'job_10',
              title: 'Software Development Engineer',
              companyName: 'Microsoft',
              location: 'Bengaluru',
              employmentType: 'full_time',
              salaryRange: '20 - 24 LPA',
              applicationDeadline: '2026-12-31T00:00:00.000Z',
              status: 'published',
              eligibilityCriteria: { minCgpa: 8.0, allowedBranches: ['CSE', 'ISE'] }
            }
          ],
          pagination: { total: 1, totalPages: 1 }
        }
      });

      vi.spyOn(applicationService, 'getMyApplications').mockResolvedValueOnce({
        success: true,
        data: { applications: [] }
      });

      render(
        <MemoryRouter>
          <JobsBrowse />
        </MemoryRouter>
      );

      await waitFor(() => {
        expect(screen.getByText('Software Development Engineer')).toBeInTheDocument();
      });

      expect(screen.getByText('Microsoft')).toBeInTheDocument();
      expect(screen.getByText(/20 - 24 LPA/i)).toBeInTheDocument();
      expect(screen.getByPlaceholderText(/Search by job title, company, skills/i)).toBeInTheDocument();
    });
  });

  describe('Job Details & Apply Confirmation Modal', () => {
    it('evaluates eligibility and confirms application submission with resume snapshot', async () => {
      vi.spyOn(jobService, 'getJobById').mockResolvedValueOnce({
        success: true,
        data: {
          job: {
            _id: 'job_99',
            title: 'Systems Engineer',
            companyName: 'Infosys',
            location: 'Mysuru',
            employmentType: 'full_time',
            salaryRange: '9.5 LPA',
            applicationDeadline: '2026-12-15T00:00:00.000Z',
            description: 'Core backend development in Java/Go.',
            requirements: 'Strong CS fundamentals.',
            eligibilityCriteria: { minCgpa: 7.5, allowedBranches: ['CSE'] }
          },
          eligibility: {
            isEligible: true,
            reasons: []
          }
        }
      });

      vi.spyOn(studentService, 'getMyProfile').mockResolvedValueOnce({
        success: true,
        data: mockProfile
      });

      vi.spyOn(applicationService, 'getMyApplications').mockResolvedValueOnce({
        success: true,
        data: { applications: [] }
      });

      render(
        <MemoryRouter initialEntries={['/student/jobs/job_99']}>
          <Routes>
            <Route path="/student/jobs/:jobId" element={<JobDetails />} />
          </Routes>
        </MemoryRouter>
      );

      await waitFor(() => {
        expect(screen.getByText('Systems Engineer')).toBeInTheDocument();
      });

      expect(screen.getByText('You are eligible to apply!')).toBeInTheDocument();

      // Open Apply Modal
      const applyBtn = screen.getByRole('button', { name: /Apply for this Position/i });
      fireEvent.click(applyBtn);

      expect(screen.getByText('Confirm Job Application')).toBeInTheDocument();
      expect(screen.getByText('Maya_Rao_Resume.pdf')).toBeInTheDocument();

      // Mock application submission
      vi.spyOn(applicationService, 'applyToJob').mockResolvedValueOnce({
        success: true,
        data: { _id: 'new_app_id' }
      });

      const confirmBtn = screen.getByRole('button', { name: /Submit Application/i });
      fireEvent.click(confirmBtn);

      await waitFor(() => {
        expect(screen.getByText(/Application submitted successfully!/i)).toBeInTheDocument();
      });
    });
  });

  describe('Application Details with Interview Info & Timeline', () => {
    it('renders scheduled interview details and chronological step timeline', async () => {
      vi.spyOn(applicationService, 'getApplicationById').mockResolvedValueOnce({
        success: true,
        data: {
          _id: 'app_55',
          status: 'interview_scheduled',
          createdAt: '2026-11-02T10:00:00.000Z',
          jobId: {
            title: 'Data Analyst',
            companyName: 'Flipkart',
            location: 'Bengaluru',
            employmentType: 'full_time'
          },
          resumeSnapshot: {
            fileName: 'Maya_Resume_v1.pdf',
            size: 153600,
            url: 'https://cloudinary.example.com/resumes/maya.pdf'
          },
          statusHistory: [
            { _id: 'h1', status: 'applied', changedAt: '2026-11-02T10:00:00.000Z' },
            { _id: 'h2', status: 'shortlisted', changedAt: '2026-11-04T12:00:00.000Z' },
            { _id: 'h3', status: 'interview_scheduled', changedAt: '2026-11-05T14:00:00.000Z' }
          ]
        }
      });

      vi.spyOn(interviewService, 'getInterviews').mockResolvedValueOnce({
        success: true,
        data: [
          {
            _id: 'int_1',
            status: 'scheduled',
            mode: 'online',
            locationOrLink: 'https://meet.google.com/xyz-placement',
            scheduledAt: '2026-11-20T11:00:00.000Z',
            notes: 'Technical SQL and Python interview'
          }
        ]
      });

      render(
        <MemoryRouter initialEntries={['/student/applications/app_55']}>
          <Routes>
            <Route path="/student/applications/:applicationId" element={<ApplicationDetails />} />
          </Routes>
        </MemoryRouter>
      );

      await waitFor(() => {
        expect(screen.getByText('Data Analyst')).toBeInTheDocument();
      });

      expect(screen.getByText('Scheduled Interview Details')).toBeInTheDocument();
      expect(screen.getByText(/Technical SQL and Python interview/i)).toBeInTheDocument();
      expect(screen.getByText('Join Meeting')).toBeInTheDocument();
      expect(screen.getByText('Maya_Resume_v1.pdf')).toBeInTheDocument();
    });
  });

  describe('Student Profile & Resume Validation', () => {
    it('enforces size and extension validation with UX guidelines error copy', async () => {
      vi.spyOn(studentService, 'getMyProfile').mockResolvedValueOnce({
        success: true,
        data: mockProfile
      });

      render(
        <MemoryRouter>
          <StudentProfile />
        </MemoryRouter>
      );

      await waitFor(() => {
        expect(screen.getByText('Student Profile & Resume')).toBeInTheDocument();
      });

      // Attempt to upload invalid file (e.g. .exe or oversized)
      const fileInput = screen.getByLabelText(/Upload New Resume/i).parentElement.querySelector('input[type="file"]');
      const oversizedFile = new File(['x'.repeat(6 * 1024 * 1024)], 'huge_malware.exe', { type: 'application/octet-stream' });

      fireEvent.change(fileInput, { target: { files: [oversizedFile] } });

      await waitFor(() => {
        expect(screen.getByText('Upload a PDF or DOC/DOCX resume within the allowed file size.')).toBeInTheDocument();
      });
    });
  });
});

