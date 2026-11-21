import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { MemoryRouter } from 'react-router-dom';
import AdminMockTests from '../pages/admin/AdminMockTests.jsx';
import { mockTestService } from '../services/index.js';

vi.mock('../services/index.js', () => ({
  mockTestService: {
    getMockTests: vi.fn(),
    getMockTestById: vi.fn(),
    createMockTest: vi.fn(),
    updateMockTest: vi.fn(),
    publishMockTest: vi.fn(),
    archiveMockTest: vi.fn(),
    getMockTestPreview: vi.fn(),
    getQuestions: vi.fn(),
    createQuestion: vi.fn(),
    updateQuestion: vi.fn(),
    archiveQuestion: vi.fn(),
    getCategories: vi.fn(),
    createCategory: vi.fn(),
    getQuestionBanks: vi.fn(),
    createQuestionBank: vi.fn()
  }
}));

describe('Chunk V6: Mock Tests & Assessment Engine UI Suite', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  const mockCategories = [
    { _id: 'cat-1', name: 'Technical Assessment (CS & IT)', slug: 'technical-cs-it', status: 'ACTIVE' }
  ];

  const mockBanks = [
    { _id: 'bank-1', name: 'Algorithms & Data Structures', categoryId: mockCategories[0], topicTags: ['dsa', 'arrays'] }
  ];

  const mockTests = [
    {
      _id: 'test-1',
      title: 'Campus Benchmark Technical 2026',
      description: 'Placement benchmark',
      durationMinutes: 60,
      version: 1,
      status: 'PUBLISHED',
      totalQuestions: 15,
      totalMarks: 30,
      categoryId: mockCategories[0],
      scoringConfig: { enableNegativeMarking: true, defaultNegativeMarks: 0.25 },
      sections: [{ sectionId: 'sec_1', name: 'Core DSA' }]
    }
  ];

  const mockQuestions = [
    {
      _id: 'q-1',
      bankId: mockBanks[0],
      type: 'SINGLE_CHOICE',
      prompt: 'What is the worst-case complexity of Merge Sort?',
      difficulty: 'MEDIUM',
      options: [
        { optionId: 'opt_1', text: 'O(N log N)' },
        { optionId: 'opt_2', text: 'O(N^2)' }
      ],
      answerKey: ['opt_1'],
      explanation: 'Merge sort always divides in half.',
      topicTags: ['sorting', 'algorithms']
    }
  ];

  const mockPreview = {
    _id: 'test-1',
    title: 'Campus Benchmark Technical 2026',
    durationMinutes: 60,
    totalQuestions: 1,
    totalMarks: 2,
    instructions: 'Calculators not allowed.',
    sections: [
      {
        sectionId: 'sec_1',
        name: 'Core DSA',
        marksPerQuestion: 2,
        questions: [
          {
            _id: 'q-1',
            type: 'SINGLE_CHOICE',
            prompt: 'What is the worst-case complexity of Merge Sort?',
            options: [
              { optionId: 'opt_1', text: 'O(N log N)' },
              { optionId: 'opt_2', text: 'O(N^2)' }
            ],
            difficulty: 'MEDIUM',
            topicTags: ['sorting']
          }
        ]
      }
    ]
  };

  it('renders mock tests tab with list, version badge, and actions', async () => {
    mockTestService.getCategories.mockResolvedValue({ success: true, data: mockCategories });
    mockTestService.getQuestionBanks.mockResolvedValue({ success: true, data: mockBanks });
    mockTestService.getMockTests.mockResolvedValue({
      success: true,
      data: mockTests,
      pagination: { total: 1, totalPages: 1 }
    });

    render(
      <MemoryRouter>
        <AdminMockTests />
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getByText('Campus Benchmark Technical 2026')).toBeInTheDocument();
    });

    expect(screen.getByText('v1')).toBeInTheDocument();
    expect(screen.getByText('60 mins')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /preview/i })).toBeInTheDocument();
  });

  it('opens Student Preview modal and displays zero answer key / explanation leakage', async () => {
    mockTestService.getCategories.mockResolvedValue({ success: true, data: mockCategories });
    mockTestService.getQuestionBanks.mockResolvedValue({ success: true, data: mockBanks });
    mockTestService.getMockTests.mockResolvedValue({
      success: true,
      data: mockTests,
      pagination: { total: 1, totalPages: 1 }
    });
    mockTestService.getMockTestPreview.mockResolvedValue({ success: true, data: mockPreview });

    render(
      <MemoryRouter>
        <AdminMockTests />
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getByText('Campus Benchmark Technical 2026')).toBeInTheDocument();
    });

    const previewBtn = screen.getByRole('button', { name: /preview/i });
    fireEvent.click(previewBtn);

    await waitFor(() => {
      expect(screen.getByText(/Zero Leakage Verified/i)).toBeInTheDocument();
    });

    expect(screen.getByText('What is the worst-case complexity of Merge Sort?')).toBeInTheDocument();
    expect(screen.getByText('O(N log N)')).toBeInTheDocument();

    // Verify explanation and answerKey are NOT visible to students
    expect(screen.queryByText(/Merge sort always divides in half/i)).not.toBeInTheDocument();
  });

  it('switches to Questions Library tab and lists questions with difficulty and type chips', async () => {
    mockTestService.getCategories.mockResolvedValue({ success: true, data: mockCategories });
    mockTestService.getQuestionBanks.mockResolvedValue({ success: true, data: mockBanks });
    mockTestService.getMockTests.mockResolvedValue({ success: true, data: [] });
    mockTestService.getQuestions.mockResolvedValue({
      success: true,
      data: mockQuestions,
      pagination: { total: 1, totalPages: 1 }
    });

    render(
      <MemoryRouter>
        <AdminMockTests />
      </MemoryRouter>
    );

    // Switch tab
    const questionsTab = screen.getByRole('button', { name: /questions library/i });
    fireEvent.click(questionsTab);

    await waitFor(() => {
      expect(screen.getByText('What is the worst-case complexity of Merge Sort?')).toBeInTheDocument();
    });

    expect(screen.getByText('MEDIUM')).toBeInTheDocument();
    expect(screen.getByText('SINGLE_CHOICE')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /add new question/i })).toBeInTheDocument();
  });
});

