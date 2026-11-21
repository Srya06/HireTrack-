import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import MockInterviewsLanding from '../pages/student/MockInterviewsLanding.jsx';
import AiInterviewChat from '../pages/student/AiInterviewChat.jsx';
import AiInterviewFeedback from '../pages/student/AiInterviewFeedback.jsx';
import AdminInterviewTracks from '../pages/admin/AdminInterviewTracks.jsx';
import * as aiInterviewService from '../services/aiInterview.service.js';

vi.mock('../services/aiInterview.service.js', () => ({
  getActiveAiTracks: vi.fn(),
  getAiTrackById: vi.fn(),
  startAiSession: vi.fn(),
  getSessionDetails: vi.fn(),
  getSessionTranscript: vi.fn(),
  submitTurn: vi.fn(),
  completeSession: vi.fn(),
  retryEvaluation: vi.fn(),
  getSessionFeedback: vi.fn(),
  getStudentHistory: vi.fn(),
  getAdminTracks: vi.fn(),
  createAdminTrack: vi.fn(),
  updateAdminTrack: vi.fn(),
  archiveAdminTrack: vi.fn()
}));

describe('Chunk V8: AI Mock Interviews & Practice Evaluation UI Suite', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  const mockTrack = {
    _id: 'track-101',
    title: 'Frontend Engineering Practice',
    roleCategory: 'Frontend Development',
    description: 'React, DOM architecture, performance optimization',
    interviewType: 'AI',
    questionConfig: {
      maxQuestions: 3,
      maxFollowUps: 1,
      maxTurnChars: 500
    },
    rubricConfig: [
      {
        dimension: 'React & JavaScript Depth',
        maxScore: 10,
        description: 'Component lifecycle and hooks'
      },
      {
        dimension: 'Communication & Problem Solving',
        maxScore: 10,
        description: 'Structured explanation'
      }
    ],
    status: 'ACTIVE'
  };

  describe('1. MockInterviewsLanding Component', () => {
    it('renders distinct two paths: AI Mock Interview and Human Mock Interview (Coming in V9)', async () => {
      aiInterviewService.getActiveAiTracks.mockResolvedValueOnce({
        data: { data: [mockTrack] }
      });
      aiInterviewService.getStudentHistory.mockResolvedValueOnce({
        data: { data: [] }
      });

      render(
        <MemoryRouter>
          <MockInterviewsLanding />
        </MemoryRouter>
      );

      await waitFor(() => {
        expect(screen.getByText('AI Mock Interview')).toBeInTheDocument();
      });

      expect(screen.getByText('Human Mock Interview')).toBeInTheDocument();
      expect(screen.getByText('Coming in V9')).toBeInTheDocument();
      expect(screen.getByText('Frontend Engineering Practice')).toBeInTheDocument();
      expect(screen.getByText(/Start AI Interview/i)).toBeInTheDocument();
    });

    it('switches to history tab and displays past AI practice sessions', async () => {
      aiInterviewService.getActiveAiTracks.mockResolvedValueOnce({
        data: { data: [mockTrack] }
      });
      aiInterviewService.getStudentHistory.mockResolvedValueOnce({
        data: {
          data: [
            {
              _id: 'sess-1',
              trackId: mockTrack,
              status: 'COMPLETED',
              startedAt: new Date().toISOString(),
              evaluation: {
                overallScore: 16,
                maxScore: 20,
                percentage: 80,
                passed: true
              }
            }
          ]
        }
      });

      render(
        <MemoryRouter>
          <MockInterviewsLanding />
        </MemoryRouter>
      );

      await waitFor(() => {
        expect(screen.getByText('Frontend Engineering Practice')).toBeInTheDocument();
      });

      // Switch tab
      const histTab = screen.getByText(/My AI History/i);
      fireEvent.click(histTab);

      await waitFor(() => {
        expect(screen.getByText('COMPLETED')).toBeInTheDocument();
        expect(screen.getByText('16')).toBeInTheDocument();
        expect(screen.getByText('(80%)')).toBeInTheDocument();
        expect(screen.getByText(/View Feedback/i)).toBeInTheDocument();
      });
    });
  });

  describe('2. AiInterviewChat Component', () => {
    const mockSessionTranscript = {
      session: {
        _id: 'sess-101',
        track: mockTrack,
        status: 'IN_PROGRESS',
        currentQuestionIndex: 1
      },
      turns: [
        {
          turnNumber: 1,
          speaker: 'AI',
          content: 'Hello! How do you optimize rendering performance in complex React applications?',
          isFollowUp: false
        }
      ]
    };

    it('renders AI interviewer turn, character count, and submits student response', async () => {
      aiInterviewService.getSessionTranscript.mockResolvedValueOnce({
        data: { data: mockSessionTranscript }
      });
      aiInterviewService.submitTurn.mockResolvedValueOnce({
        data: {
          data: {
            aiTurn: {
              turnNumber: 3,
              speaker: 'AI',
              content: 'What techniques do you use to measure frame drops?',
              isFollowUp: true
            },
            isConcluding: false
          }
        }
      });

      render(
        <MemoryRouter initialEntries={['/student/mock-interviews/ai/sess-101']}>
          <Routes>
            <Route path="/student/mock-interviews/ai/:sessionId" element={<AiInterviewChat />} />
          </Routes>
        </MemoryRouter>
      );

      await waitFor(() => {
        expect(
          screen.getByText(/How do you optimize rendering performance/i)
        ).toBeInTheDocument();
      });

      expect(screen.getByText('Zero PII Transmitted')).toBeInTheDocument();

      // Enter student answer
      const input = screen.getByPlaceholderText(/Type your response here/i);
      fireEvent.change(input, {
        target: { value: 'I utilize React.memo, useMemo, and avoid inline object allocations.' }
      });

      const sendBtn = screen.getByRole('button', { name: /Send Reply/i });
      fireEvent.click(sendBtn);

      await waitFor(() => {
        expect(aiInterviewService.submitTurn).toHaveBeenCalledWith(
          'sess-101',
          expect.objectContaining({
            content: 'I utilize React.memo, useMemo, and avoid inline object allocations.'
          })
        );
      });
    });
  });

  describe('3. AiInterviewFeedback Component', () => {
    const mockFeedbackData = {
      sessionId: 'sess-101',
      track: mockTrack,
      status: 'COMPLETED',
      evaluation: {
        overallScore: 17,
        maxScore: 20,
        percentage: 85,
        passed: true,
        feedbackSummary: 'Excellent grasp of React fundamentals and clean modular architecture.',
        dimensionScores: [
          {
            dimension: 'React & JavaScript Depth',
            score: 9,
            maxScore: 10,
            strengths: ['Effective use of hooks and memoization'],
            improvements: ['Could elaborate on Profiler DevTools']
          }
        ],
        recommendations: ['Explore concurrent rendering primitives like useTransition'],
        disclaimer: 'AI-generated practice guidance, not an employer decision'
      }
    };

    it('renders scorecard, rubric dimensions, and mandatory practice disclaimer', async () => {
      aiInterviewService.getSessionFeedback.mockResolvedValueOnce({
        data: { data: mockFeedbackData }
      });
      aiInterviewService.getSessionTranscript.mockResolvedValueOnce({
        data: { data: { turns: [] } }
      });

      render(
        <MemoryRouter initialEntries={['/student/mock-interviews/ai/sess-101/feedback']}>
          <Routes>
            <Route path="/student/mock-interviews/ai/:sessionId/feedback" element={<AiInterviewFeedback />} />
          </Routes>
        </MemoryRouter>
      );

      await waitFor(() => {
        expect(screen.getByText('Ready for Campus Drives')).toBeInTheDocument();
      });

      expect(screen.getByText('85% Overall Rating')).toBeInTheDocument();
      expect(screen.getByText(/AI-generated practice guidance, not an employer decision/i)).toBeInTheDocument();
      expect(screen.getByText('React & JavaScript Depth')).toBeInTheDocument();
      expect(screen.getByText('Effective use of hooks and memoization')).toBeInTheDocument();
    });
  });

  describe('4. AdminInterviewTracks Component', () => {
    it('renders admin track list and opens track creation modal', async () => {
      aiInterviewService.getAdminTracks.mockResolvedValueOnce({
        data: { data: [mockTrack] }
      });

      render(
        <MemoryRouter>
          <AdminInterviewTracks />
        </MemoryRouter>
      );

      await waitFor(() => {
        expect(screen.getByText('Frontend Engineering Practice')).toBeInTheDocument();
      });

      expect(screen.getByText('Frontend Development')).toBeInTheDocument();
      expect(screen.getByText('Create Interview Track')).toBeInTheDocument();

      // Open create modal
      fireEvent.click(screen.getByText('Create Interview Track'));
      expect(screen.getByText('Create AI Interview Track')).toBeInTheDocument();
    });
  });
});
