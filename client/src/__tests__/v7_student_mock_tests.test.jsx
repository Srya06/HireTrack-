import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import MockTestsCatalogue from '../pages/student/MockTestsCatalogue.jsx';
import MockTestInstructions from '../pages/student/MockTestInstructions.jsx';
import MockTestPlayer from '../pages/student/MockTestPlayer.jsx';
import MockTestResult from '../pages/student/MockTestResult.jsx';
import * as mockTestService from '../services/mockTest.service.js';

vi.mock('../services/mockTest.service.js', () => ({
  getStudentMockTests: vi.fn(),
  getStudentMockTestById: vi.fn(),
  startOrResumeAttempt: vi.fn(),
  getAttemptDetails: vi.fn(),
  saveAnswer: vi.fn(),
  submitAttempt: vi.fn(),
  getAttemptResult: vi.fn(),
  getStudentMockTestHistory: vi.fn()
}));

describe('Chunk V7: Student Mock Tests Assessment & Evaluation UI Suite', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  const mockTestItem = {
    _id: 'test-101',
    title: 'Full Stack Engineering Assessment',
    description: 'Core web technologies, algorithms and system architecture',
    durationMinutes: 45,
    attemptLimit: 2,
    totalQuestions: 10,
    totalMarks: 20,
    categoryId: { _id: 'cat-1', name: 'Software Engineering' },
    status: 'PUBLISHED'
  };

  describe('1. MockTestsCatalogue Component', () => {
    it('renders published assessments and history tabs', async () => {
      mockTestService.getStudentMockTests.mockResolvedValueOnce({
        data: { data: [mockTestItem] }
      });
      mockTestService.getStudentMockTestHistory.mockResolvedValueOnce({
        data: { data: [] }
      });

      render(
        <MemoryRouter>
          <MockTestsCatalogue />
        </MemoryRouter>
      );

      await waitFor(() => {
        expect(screen.getByText('Full Stack Engineering Assessment')).toBeInTheDocument();
      });

      expect(screen.getByText('45m')).toBeInTheDocument();
      expect(screen.getByText('View & Start Test →')).toBeInTheDocument();
      expect(screen.getByText(/Available Tests/i)).toBeInTheDocument();
    });

    it('switches to history tab and displays past attempt scores', async () => {
      mockTestService.getStudentMockTests.mockResolvedValueOnce({
        data: { data: [mockTestItem] }
      });
      mockTestService.getStudentMockTestHistory.mockResolvedValueOnce({
        data: {
          data: [
            {
              _id: 'att-1',
              mockTestId: mockTestItem,
              attemptNumber: 1,
              score: 16,
              maxScore: 20,
              percentage: 80,
              passed: true,
              status: 'EVALUATED',
              startedAt: new Date().toISOString()
            }
          ]
        }
      });

      render(
        <MemoryRouter>
          <MockTestsCatalogue />
        </MemoryRouter>
      );

      await waitFor(() => {
        expect(screen.getByText('Full Stack Engineering Assessment')).toBeInTheDocument();
      });

      // Switch to history tab
      const historyTab = screen.getByText(/My Test History/i);
      fireEvent.click(historyTab);

      await waitFor(() => {
        expect(screen.getByText('Passed')).toBeInTheDocument();
        expect(screen.getByText('16')).toBeInTheDocument();
        expect(screen.getByText('(80%)')).toBeInTheDocument();
      });
    });
  });

  describe('2. MockTestInstructions Component', () => {
    it('renders test guidelines and disables start until agreement is checked', async () => {
      mockTestService.getStudentMockTestById.mockResolvedValueOnce({
        data: {
          data: {
            ...mockTestItem,
            instructions: 'Read questions carefully. Each question has a time limit.'
          }
        }
      });

      render(
        <MemoryRouter initialEntries={['/student/mock-tests/test-101']}>
          <Routes>
            <Route path="/student/mock-tests/:id" element={<MockTestInstructions />} />
          </Routes>
        </MemoryRouter>
      );

      await waitFor(() => {
        expect(screen.getByText('Full Stack Engineering Assessment')).toBeInTheDocument();
      });

      expect(screen.getByText(/Read questions carefully/i)).toBeInTheDocument();

      const startButton = screen.getByRole('button', { name: /Start Assessment Now/i });
      expect(startButton).toBeDisabled();

      // Check agreement
      const checkbox = screen.getByRole('checkbox');
      fireEvent.click(checkbox);

      expect(startButton).not.toBeDisabled();
    });
  });

  describe('3. MockTestPlayer Component', () => {
    const mockAttemptSession = {
      attempt: {
        _id: 'att-101',
        mockTestId: { title: 'Full Stack Engineering Assessment' },
        status: 'IN_PROGRESS'
      },
      remainingSeconds: 1800,
      questions: [
        {
          _id: 'q-1',
          type: 'SINGLE_CHOICE',
          prompt: 'What is the primary role of a Load Balancer?',
          options: [
            { optionId: 'opt-a', text: 'Distribute network traffic' },
            { optionId: 'opt-b', text: 'Compile source code' }
          ]
        },
        {
          _id: 'q-2',
          type: 'SHORT_ANSWER',
          prompt: 'Which protocol is secure HTTP built on top of?'
        }
      ],
      savedAnswers: {}
    };

    it('renders countdown timer, question navigator, and autosaves on answer selection', async () => {
      mockTestService.getAttemptDetails.mockResolvedValueOnce({
        data: { data: mockAttemptSession }
      });
      mockTestService.saveAnswer.mockResolvedValueOnce({
        data: { success: true }
      });

      render(
        <MemoryRouter initialEntries={['/student/mock-tests/attempts/att-101']}>
          <Routes>
            <Route path="/student/mock-tests/attempts/:attemptId" element={<MockTestPlayer />} />
          </Routes>
        </MemoryRouter>
      );

      await waitFor(() => {
        expect(screen.getByText('What is the primary role of a Load Balancer?')).toBeInTheDocument();
      });

      // Question Navigator
      expect(screen.getByText('Question Navigator')).toBeInTheDocument();
      expect(screen.getByText(/30:00/)).toBeInTheDocument();

      // Select an option
      const optionA = screen.getByText('Distribute network traffic');
      fireEvent.click(optionA);

      await waitFor(() => {
        expect(mockTestService.saveAnswer).toHaveBeenCalledWith(
          'att-101',
          'q-1',
          expect.objectContaining({ selectedOptions: ['opt-a'] })
        );
      });
    });

    it('opens submit modal and displays unanswered questions warning', async () => {
      mockTestService.getAttemptDetails.mockResolvedValueOnce({
        data: { data: mockAttemptSession }
      });

      render(
        <MemoryRouter initialEntries={['/student/mock-tests/attempts/att-101']}>
          <Routes>
            <Route path="/student/mock-tests/attempts/:attemptId" element={<MockTestPlayer />} />
          </Routes>
        </MemoryRouter>
      );

      await waitFor(() => {
        expect(screen.getByText('What is the primary role of a Load Balancer?')).toBeInTheDocument();
      });

      // Click submit test button
      const submitBtn = screen.getByRole('button', { name: /Submit Test/i });
      fireEvent.click(submitBtn);

      await waitFor(() => {
        expect(screen.getByText('Submit Assessment?')).toBeInTheDocument();
        expect(screen.getByText(/You have 2 unanswered questions/i)).toBeInTheDocument();
      });
    });
  });

  describe('4. MockTestResult Component', () => {
    const mockResultData = {
      attemptId: 'att-101',
      mockTest: { title: 'Full Stack Engineering Assessment' },
      score: 18,
      maxScore: 20,
      percentage: 90,
      passed: true,
      timeTakenSeconds: 1240,
      reviewPolicy: 'IMMEDIATE',
      topicAnalytics: [
        {
          topicTag: 'Networking',
          totalQuestions: 5,
          correct: 4,
          incorrect: 1,
          score: 8,
          maxScore: 10
        }
      ],
      questionBreakdown: [
        {
          questionId: 'q-1',
          prompt: 'What is the primary role of a Load Balancer?',
          isCorrect: true,
          marksAwarded: 2,
          explanation: 'Distributes traffic evenly among application servers.',
          options: [
            { optionId: 'opt-a', text: 'Distribute network traffic' },
            { optionId: 'opt-b', text: 'Compile source code' }
          ],
          correctAnswerKey: 'opt-a',
          studentSelectedOptions: ['opt-a']
        }
      ]
    };

    it('renders scorecard, percentage, topic analytics and question breakdown', async () => {
      mockTestService.getAttemptResult.mockResolvedValueOnce({
        data: { data: mockResultData }
      });

      render(
        <MemoryRouter initialEntries={['/student/mock-tests/attempts/att-101/result']}>
          <Routes>
            <Route path="/student/mock-tests/attempts/:attemptId/result" element={<MockTestResult />} />
          </Routes>
        </MemoryRouter>
      );

      await waitFor(() => {
        expect(screen.getByText('Passed Standard')).toBeInTheDocument();
      });

      expect(screen.getByText('90% Accuracy')).toBeInTheDocument();
      expect(screen.getByText('Networking')).toBeInTheDocument();
      expect(screen.getByText('Detailed Question Review (1)')).toBeInTheDocument();
      expect(screen.getByText(/Distributes traffic evenly/i)).toBeInTheDocument();
    });
  });
});
