import { describe, it, expect, vi, beforeEach } from 'vitest';
import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import MockInterviewsLanding from '../pages/student/MockInterviewsLanding.jsx';
import InterviewerWorkspace from '../pages/interviewer/InterviewerWorkspace.jsx';
import AdminInterviewPolicy from '../pages/admin/AdminInterviewPolicy.jsx';
import { FeatureFlagsProvider } from '../context/FeatureFlagsContext.jsx';
import * as aiInterviewService from '../services/aiInterview.service.js';
import humanInterviewService from '../services/humanInterview.service.js';

vi.mock('../services/aiInterview.service.js', () => ({
  getActiveAiTracks: vi.fn(),
  getStudentHistory: vi.fn(),
  startAiSession: vi.fn()
}));

vi.mock('../services/humanInterview.service.js', () => ({
  default: {
    getAvailableSlots: vi.fn(),
    bookSlot: vi.fn(),
    getMyBookings: vi.fn(),
    cancelBooking: vi.fn(),
    getBookingFeedback: vi.fn(),
    getInterviewerProfile: vi.fn(),
    updateInterviewerProfile: vi.fn(),
    getInterviewerSlots: vi.fn(),
    createSlots: vi.fn(),
    deleteSlot: vi.fn(),
    toggleSlotBlock: vi.fn(),
    getAssignedSessions: vi.fn(),
    getStudentContext: vi.fn(),
    submitEvaluation: vi.fn(),
    getEvaluation: vi.fn(),
    getPolicy: vi.fn(),
    updatePolicy: vi.fn(),
    getAllBookings: vi.fn(),
    releaseEvaluation: vi.fn()
  }
}));

describe('Chunk V9: Human Mock Interviews & Interviewer Workspace UI Suite', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('1. MockInterviewsLanding Component (Dual Path)', () => {
    it('renders both AI and Human paths without "Coming in V9" disabled barrier', async () => {
      aiInterviewService.getActiveAiTracks.mockResolvedValue({
        data: [{ _id: 'track_1', title: 'Full Stack Track', roleCategory: 'Engineering', questionConfig: { maxQuestions: 5 } }]
      });
      aiInterviewService.getStudentHistory.mockResolvedValue({ data: [] });
      humanInterviewService.getAvailableSlots.mockResolvedValue({
        data: [{
          _id: 'slot_1',
          startsAt: new Date(Date.now() + 48 * 3600 * 1000).toISOString(),
          endsAt: new Date(Date.now() + 49 * 3600 * 1000).toISOString(),
          interviewer: { name: 'Alumni Alice', expertise: ['React', 'Node.js'] }
        }]
      });
      humanInterviewService.getMyBookings.mockResolvedValue({ data: [] });

      render(
        <FeatureFlagsProvider initialFlags={{ V3_HUMAN_INTERVIEWS_ENABLED: true }}>
          <BrowserRouter>
            <MockInterviewsLanding />
          </BrowserRouter>
        </FeatureFlagsProvider>
      );

      // Verify AI & Human path cards exist
      expect(screen.getByText('AI Mock Interview')).toBeInTheDocument();
      expect(screen.getByText('Human Mock Interview')).toBeInTheDocument();

      // "Coming in V9" should no longer be present
      expect(screen.queryByText(/Coming in V9/i)).not.toBeInTheDocument();

      // Click on Human Mock Interview card
      fireEvent.click(screen.getByText('Human Mock Interview'));

      // Wait for Available Interview Slots to render
      await waitFor(() => {
        expect(screen.getByText(/Available Interview Slots/i)).toBeInTheDocument();
        expect(screen.getByText('Alumni Alice')).toBeInTheDocument();
        expect(screen.getByText('Book Interview Slot')).toBeInTheDocument();
      });
    });

    it('opens booking confirmation modal and allows booking', async () => {
      humanInterviewService.getAvailableSlots.mockResolvedValue({
        data: [{
          _id: 'slot_1',
          startsAt: new Date(Date.now() + 48 * 3600 * 1000).toISOString(),
          endsAt: new Date(Date.now() + 49 * 3600 * 1000).toISOString(),
          interviewer: { name: 'Alumni Alice', expertise: ['React'] }
        }]
      });
      humanInterviewService.getMyBookings.mockResolvedValue({ data: [] });
      humanInterviewService.bookSlot.mockResolvedValue({ data: { id: 'booking_1', status: 'SCHEDULED' } });

      render(
        <FeatureFlagsProvider initialFlags={{ V3_HUMAN_INTERVIEWS_ENABLED: true }}>
          <BrowserRouter>
            <MockInterviewsLanding />
          </BrowserRouter>
        </FeatureFlagsProvider>
      );

      fireEvent.click(screen.getByText('Human Mock Interview'));

      await waitFor(() => {
        expect(screen.getByText('Book Interview Slot')).toBeInTheDocument();
      });

      fireEvent.click(screen.getByText('Book Interview Slot'));
      expect(screen.getByText(/Confirm Mock Interview Booking/i)).toBeInTheDocument();

      // Click Confirm & Book
      fireEvent.click(screen.getByText('Confirm & Book'));

      await waitFor(() => {
        expect(humanInterviewService.bookSlot).toHaveBeenCalledWith({
          slotId: 'slot_1',
          notes: ''
        });
      });
    });

    it('displays released evaluation modal with required practice disclaimer', async () => {
      humanInterviewService.getAvailableSlots.mockResolvedValue({ data: [] });
      humanInterviewService.getMyBookings.mockResolvedValue({
        data: [{
          _id: 'booking_comp',
          status: 'COMPLETED',
          bookedAt: new Date().toISOString(),
          slot: { interviewerName: 'Alice Mentor', startsAt: new Date().toISOString() },
          feedback: { isReleased: true, overallScore: 88 }
        }]
      });
      humanInterviewService.getBookingFeedback.mockResolvedValue({
        data: {
          booking: { interviewerName: 'Alice Mentor' },
          evaluation: {
            overallScore: 88,
            disclaimer: 'Human-evaluated practice guidance, not an employer decision',
            rubricScores: [{ dimension: 'Problem Solving', score: 9, maxScore: 10, feedback: 'Great clarity' }],
            strengths: ['Analytical rigor'],
            improvementAreas: ['Time management'],
            overallFeedback: 'Ready for live campus placement drive.'
          }
        }
      });

      render(
        <FeatureFlagsProvider initialFlags={{ V3_HUMAN_INTERVIEWS_ENABLED: true }}>
          <BrowserRouter>
            <MockInterviewsLanding />
          </BrowserRouter>
        </FeatureFlagsProvider>
      );

      fireEvent.click(screen.getByText('Human Mock Interview'));

      // Switch to My Human Sessions tab
      await waitFor(() => {
        const histTab = screen.getByText(/My Human Sessions/i);
        fireEvent.click(histTab);
      });

      await waitFor(() => {
        expect(screen.getByText(/View Released Evaluation/i)).toBeInTheDocument();
      });

      fireEvent.click(screen.getByText(/View Released Evaluation/i));

      await waitFor(() => {
        expect(screen.getByText('88%')).toBeInTheDocument();
        expect(screen.getByText('Problem Solving')).toBeInTheDocument();
        expect(screen.getByText('Human-evaluated practice guidance, not an employer decision')).toBeInTheDocument();
      });
    });
  });

  describe('2. InterviewerWorkspace Component', () => {
    it('renders interviewer workspace with slots and assigned sessions', async () => {
      humanInterviewService.getInterviewerProfile.mockResolvedValue({
        data: { expertise: ['System Design', 'React'], bio: 'Senior Engineer', availability: { weeklyHours: 6 } }
      });
      humanInterviewService.getInterviewerSlots.mockResolvedValue({
        data: [{ _id: 'slot_test', startsAt: new Date(Date.now() + 24 * 3600 * 1000).toISOString(), endsAt: new Date(Date.now() + 25 * 3600 * 1000).toISOString(), status: 'AVAILABLE' }]
      });
      humanInterviewService.getAssignedSessions.mockResolvedValue({
        data: [{
          _id: 'sess_1',
          status: 'SCHEDULED',
          studentUserId: { name: 'Sam Student' },
          studentProfileId: { degree: 'B.Tech', branch: 'CS' }
        }]
      });

      render(
        <BrowserRouter>
          <InterviewerWorkspace />
        </BrowserRouter>
      );

      await waitFor(() => {
        expect(screen.getByText('Interviewer Workspace')).toBeInTheDocument();
        expect(screen.getByText('Senior Engineer')).toBeInTheDocument();
        expect(screen.getByText('System Design')).toBeInTheDocument();
      });

      // Switch to assigned sessions
      fireEvent.click(screen.getByText(/Assigned Sessions & Evaluations/i));

      await waitFor(() => {
        expect(screen.getByText('Sam Student')).toBeInTheDocument();
        expect(screen.getByText('Student Profile')).toBeInTheDocument();
        expect(screen.getByText('Evaluate')).toBeInTheDocument();
      });
    });
  });

  describe('3. AdminInterviewPolicy Component', () => {
    it('renders policy toggles and release evaluation control', async () => {
      humanInterviewService.getPolicy.mockResolvedValue({
        data: { requireAiPassForHumanMock: true, minOverallScore: 75, cancelBeforeHours: 24, allowResumeView: true }
      });
      humanInterviewService.getAllBookings.mockResolvedValue({
        data: [{
          _id: 'b_admin',
          studentUserId: { name: 'Test Candidate' },
          status: 'COMPLETED',
          evaluation: { _id: 'eval_adm', status: 'SUBMITTED', overallScore: 82 }
        }]
      });
      humanInterviewService.releaseEvaluation.mockResolvedValue({
        data: { _id: 'eval_adm', status: 'RELEASED' }
      });

      render(
        <BrowserRouter>
          <AdminInterviewPolicy />
        </BrowserRouter>
      );

      await waitFor(() => {
        expect(screen.getByText('Institute Mock Interview Policy')).toBeInTheDocument();
        expect(screen.getByText('Require AI Mock Pass Before Human Interview')).toBeInTheDocument();
        expect(screen.getByText('Test Candidate')).toBeInTheDocument();
        expect(screen.getByText('Release to Student')).toBeInTheDocument();
      });

      // Click Release to Student
      fireEvent.click(screen.getByText('Release to Student'));

      await waitFor(() => {
        expect(humanInterviewService.releaseEvaluation).toHaveBeenCalledWith('eval_adm');
      });
    });
  });
});

