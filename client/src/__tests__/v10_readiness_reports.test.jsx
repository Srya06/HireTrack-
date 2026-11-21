import { describe, it, expect, vi, beforeEach } from 'vitest';
import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import StudentReadinessDashboard from '../pages/student/StudentReadinessDashboard.jsx';
import AdminCohortReadiness from '../pages/admin/AdminCohortReadiness.jsx';
import AdminReports from '../pages/admin/AdminReports.jsx';
import AdminAuditLogs from '../pages/admin/AdminAuditLogs.jsx';
import NotificationBell from '../components/NotificationBell.jsx';
import readinessService from '../services/readiness.service.js';
import { notificationService } from '../services/index.js';

vi.mock('../services/readiness.service.js', () => ({
  default: {
    getStudentReadiness: vi.fn(),
    getCohortReadiness: vi.fn(),
    getStudentReadinessAdmin: vi.fn(),
    getOverviewReport: vi.fn(),
    getJobsReport: vi.fn(),
    getMockTestsReport: vi.fn(),
    getMockInterviewsReport: vi.fn(),
    exportReportCsv: vi.fn(),
    getAuditLogs: vi.fn()
  }
}));

vi.mock('../services/index.js', () => ({
  notificationService: {
    getNotifications: vi.fn(),
    markAsRead: vi.fn(),
    markAllAsRead: vi.fn()
  }
}));

describe('Chunk V10: Readiness & Reporting UI Test Suite', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('1. StudentReadinessDashboard Component', () => {
    const mockStudentReadinessData = {
      asOf: '2026-11-21T10:00:00.000Z',
      compositeIndicator: null,
      student: { name: 'Priya Sharma', rollNumber: 'CS-2026-001' },
      components: {
        profileCompleteness: {
          value: { percentage: 85, missingFields: ['skills'], hasResume: true },
          source: 'StudentProfile',
          asOf: '2026-11-21T09:30:00.000Z'
        },
        activeOpportunities: {
          value: { totalActive: 12 },
          source: 'JobOpportunity',
          asOf: '2026-11-21T09:40:00.000Z'
        },
        eligibilityDistribution: {
          value: { likelyEligibleCount: 8, potentiallyEligibleCount: 2, doesNotMeetCount: 2 },
          source: 'EligibilityEvaluation',
          asOf: '2026-11-21T09:40:00.000Z'
        },
        applicationStatuses: {
          value: { total: 4, interested: 1, applied: 2, notProceeding: 1, withdrawn: 0, verifiedCount: 1 },
          source: 'JobApplication (Student-Reported)',
          asOf: '2026-11-21T09:45:00.000Z'
        },
        mockTests: {
          value: { completedAttempts: 3, averagePercentage: 78.5, topicGaps: ['Data Structures'] },
          source: 'MockTestAttempt',
          asOf: '2026-11-21T09:50:00.000Z'
        },
        aiInterviews: {
          value: { completedSessions: 2, averagePercentage: 82, latestFeedbackSummary: 'Good clarity and problem solving' },
          source: 'AiMockInterviewSession',
          asOf: '2026-11-21T09:52:00.000Z'
        },
        humanInterviews: {
          value: { completedBookings: 1, averageReleasedScore: 90, latestFeedback: { overallFeedback: 'Strong communicator' } },
          source: 'HumanInterviewEvaluation',
          asOf: '2026-11-21T09:55:00.000Z'
        }
      },
      nextActions: [
        { key: 'COMPLETE_PROFILE', title: 'Complete remaining profile fields: skills', priority: 'HIGH', link: '/student/profile' },
        { key: 'APPLY_ELIGIBLE_JOBS', title: 'Review and apply to 8 eligible opportunities', priority: 'MEDIUM', link: '/student/opportunities' }
      ]
    };

    it('renders all 6 distinct dimension cards with source badges, freshness stamps and next actions', async () => {
      readinessService.getStudentReadiness.mockResolvedValue({ data: mockStudentReadinessData });

      render(
        <BrowserRouter>
          <StudentReadinessDashboard />
        </BrowserRouter>
      );

      // Loading state check
      expect(screen.getByText(/Aggregating multi-domain readiness metrics/i)).toBeInTheDocument();

      await waitFor(() => {
        expect(screen.getByText('Placement Preparation & Readiness')).toBeInTheDocument();
      });

      // 6 distinct dimension card headings
      expect(screen.getByText('Profile Completeness')).toBeInTheDocument();
      expect(screen.getByText('Opportunities & Eligibility')).toBeInTheDocument();
      expect(screen.getByText('Application Statuses')).toBeInTheDocument();
      expect(screen.getByText('Mock Test Performance')).toBeInTheDocument();
      expect(screen.getByText('AI Mock Interviews')).toBeInTheDocument();
      expect(screen.getByText('Human 1:1 Mock Interviews')).toBeInTheDocument();

      // Source badges verified
      expect(screen.getByText(/Source: StudentProfile/i)).toBeInTheDocument();
      expect(screen.getByText(/Source: JobApplication \(Student-Reported\)/i)).toBeInTheDocument();
      expect(screen.getByText(/Source: MockTestAttempt/i)).toBeInTheDocument();
      expect(screen.getByText(/Source: AiMockInterviewSession/i)).toBeInTheDocument();

      // Next actions rendered
      expect(screen.getByText('Recommended Next Steps')).toBeInTheDocument();
      expect(screen.getByText('Complete remaining profile fields: skills')).toBeInTheDocument();
      expect(screen.getByText('Review and apply to 8 eligible opportunities')).toBeInTheDocument();

      // Verifies pure preparation principle and disclaimer
      expect(screen.getByText(/Pure Multi-Domain Preparation Indicators/i)).toBeInTheDocument();
      expect(screen.getByText(/No fabricated placement probability or composite scoring/i)).toBeInTheDocument();
    });
  });

  describe('2. AdminCohortReadiness Component', () => {
    const mockCohortData = {
      cohort: {
        totalStudents: 150,
        averageProfileCompleteness: 82,
        completeProfilesCount: 110
      },
      summary: {
        totalStudents: 150,
        averageProfileCompleteness: 82,
        completeProfilesCount: 110
      },
      students: [
        {
          studentId: 'stud_1',
          fullName: 'Priya Sharma',
          name: 'Priya Sharma',
          rollNumber: 'CS-2026-001',
          rollNo: 'CS-2026-001',
          degree: 'B.Tech',
          branch: 'CSE',
          graduationYear: 2026,
          profileCompleteness: 92,
          mockTestsCompleted: 5,
          aiSessionsCompleted: 3,
          humanSessionsCompleted: 1,
          applicationsCount: 4
        }
      ],
      pagination: {
        page: 1,
        limit: 20,
        total: 1,
        pages: 1
      }
    };

    it('renders cohort KPI summary, filter controls, and student table', async () => {
      readinessService.getCohortReadiness.mockResolvedValue({ data: mockCohortData });

      render(
        <BrowserRouter>
          <AdminCohortReadiness />
        </BrowserRouter>
      );

      await waitFor(() => {
        expect(screen.getByText('Cohort Placement Readiness')).toBeInTheDocument();
      });

      // KPI cards
      expect(screen.getByText('150')).toBeInTheDocument();
      expect(screen.getByText('82%')).toBeInTheDocument();

      // Table row
      expect(screen.getByText('Priya Sharma')).toBeInTheDocument();
      expect(screen.getByText('CS-2026-001')).toBeInTheDocument();
      expect(screen.getByText('CSE • 2026')).toBeInTheDocument();
    });

    it('opens student drilldown modal when clicking View Breakdown', async () => {
      readinessService.getCohortReadiness.mockResolvedValue({ data: mockCohortData });
      readinessService.getStudentReadinessAdmin.mockResolvedValue({
        data: {
          student: { fullName: 'Priya Sharma', rollNumber: 'CS-2026-001' },
          components: {
            profileCompleteness: { value: { percentage: 92 } },
            activeOpportunities: { value: { eligibleCount: 7 } },
            mockTests: { value: { completedAttempts: 5, averagePercentage: 84.5 } }
          }
        }
      });

      render(
        <BrowserRouter>
          <AdminCohortReadiness />
        </BrowserRouter>
      );

      await waitFor(() => {
        expect(screen.getByText('Priya Sharma')).toBeInTheDocument();
      });

      const viewBtn = screen.getByRole('button', { name: /view/i });
      fireEvent.click(viewBtn);

      await waitFor(() => {
        expect(readinessService.getStudentReadinessAdmin).toHaveBeenCalledWith('stud_1');
        expect(screen.getByText(/Student Readiness Drilldown/i)).toBeInTheDocument();
      });
    });
  });

  describe('3. AdminReports Component', () => {
    const mockOverviewReport = {
      dateRange: { startDate: '2026-01-01', endDate: '2026-11-21' },
      metrics: {
        totalStudents: 150,
        totalJobs: 14,
        totalApplications: 88,
        totalMockAttempts: 210,
        totalAiSessions: 120,
        totalHumanBookings: 50
      }
    };

    const mockInterviewsReport = {
      aiMetrics: {
        source: 'AiMockInterviewSession',
        totalSessions: 140,
        completedSessions: 120,
        passedSessions: 95
      },
      humanMetrics: {
        source: 'HumanMockInterviewBooking + HumanInterviewEvaluation',
        totalSlots: 70,
        totalBookings: 60,
        completedBookings: 50
      }
    };

    it('renders Overview tab and allows switching to Mock Interviews with strict AI vs Human separation', async () => {
      readinessService.getOverviewReport.mockResolvedValue({ data: mockOverviewReport });
      readinessService.getMockInterviewsReport.mockResolvedValue({ data: mockInterviewsReport });

      render(
        <BrowserRouter>
          <AdminReports />
        </BrowserRouter>
      );

      await waitFor(() => {
        expect(screen.getByText('Placement Intelligence & Analytics Reports')).toBeInTheDocument();
      });

      // Overview metrics
      expect(screen.getByText('14')).toBeInTheDocument();
      expect(screen.getByText('88')).toBeInTheDocument();

      // Switch to Mock Interviews tab
      const interviewTab = screen.getByRole('button', { name: /Mock Interviews \(AI vs Human\)/i });
      fireEvent.click(interviewTab);

      await waitFor(() => {
        expect(readinessService.getMockInterviewsReport).toHaveBeenCalled();
        expect(screen.getByText('AI Mock Interview Metrics')).toBeInTheDocument();
        expect(screen.getByText('Human 1:1 Live Practice Metrics')).toBeInTheDocument();
      });
    });

    it('handles CSV report export with audited feedback', async () => {
      readinessService.getOverviewReport.mockResolvedValue({ data: mockOverviewReport });
      readinessService.exportReportCsv.mockResolvedValue(new Blob(['col1,col2\nval1,val2'], { type: 'text/csv' }));

      // Mock window.URL and anchor click to prevent jsdom navigation error
      window.URL.createObjectURL = vi.fn(() => 'blob:mock-url');
      window.URL.revokeObjectURL = vi.fn();
      const clickSpy = vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => {});

      render(
        <BrowserRouter>
          <AdminReports />
        </BrowserRouter>
      );

      await waitFor(() => {
        expect(screen.getByText('Placement Intelligence & Analytics Reports')).toBeInTheDocument();
      });

      const exportBtn = screen.getByRole('button', { name: /Export CSV/i });
      fireEvent.click(exportBtn);

      await waitFor(() => {
        expect(readinessService.exportReportCsv).toHaveBeenCalledWith('overview', expect.any(Object));
        expect(screen.getByText(/Report exported successfully and logged to audit trail\./i)).toBeInTheDocument();
      });

      clickSpy.mockRestore();
    });
  });

  describe('4. AdminAuditLogs Component', () => {
    const mockLogs = [
      {
        _id: 'log_1',
        action: 'EXPORT_REPORT',
        resourceType: 'Report',
        resourceId: 'overview',
        actor: { name: 'Admin Alice', email: 'admin@univ.edu', role: 'admin' },
        createdAt: '2026-11-21T10:15:00.000Z',
        ipAddress: '127.0.0.1',
        metadata: { format: 'csv', reportType: 'overview' }
      }
    ];

    it('renders audit logs and opens inspect modal on details click', async () => {
      readinessService.getAuditLogs.mockResolvedValue({
        data: {
          logs: mockLogs,
          pagination: { page: 1, limit: 20, total: 1, pages: 1 }
        }
      });

      render(
        <BrowserRouter>
          <AdminAuditLogs />
        </BrowserRouter>
      );

      await waitFor(() => {
        expect(screen.getByText('Institutional Audit Trail')).toBeInTheDocument();
        expect(screen.getByText('EXPORT_REPORT')).toBeInTheDocument();
        expect(screen.getByText('Admin Alice')).toBeInTheDocument();
      });

      // Click inspect button
      const inspectBtn = screen.getByRole('button', { name: /Inspect/i });
      fireEvent.click(inspectBtn);

      await waitFor(() => {
        expect(screen.getByText('Audit Record Inspection')).toBeInTheDocument();
        expect(screen.getByText(/127.0.0.1/i)).toBeInTheDocument();
      });
    });
  });

  describe('5. NotificationBell Component', () => {
    const mockNotifications = [
      {
        id: 'notif_1',
        title: 'New Opportunity Published',
        message: 'Google Software Engineer opportunity is now live',
        type: 'OPPORTUNITY_PUBLISHED',
        read: false,
        createdAt: '2026-11-21T10:00:00.000Z',
        link: '/student/opportunities'
      }
    ];

    it('displays unread badge and handles opening and marking notifications as read', async () => {
      notificationService.getNotifications.mockResolvedValue({
        success: true,
        data: {
          notifications: mockNotifications,
          unreadCount: 1
        }
      });
      notificationService.markAsRead.mockResolvedValue({ success: true });

      render(
        <BrowserRouter>
          <NotificationBell />
        </BrowserRouter>
      );

      await waitFor(() => {
        expect(screen.getByTestId('notification-badge')).toHaveTextContent('1');
      });

      const bellBtn = screen.getByRole('button', { name: /notifications/i });
      fireEvent.click(bellBtn);

      await waitFor(() => {
        expect(screen.getByText('New Opportunity Published')).toBeInTheDocument();
      });

      const notifItem = screen.getByText('New Opportunity Published').closest('[role="button"]');
      fireEvent.click(notifItem);

      await waitFor(() => {
        expect(notificationService.markAsRead).toHaveBeenCalledWith('notif_1');
      });
    });
  });
});
