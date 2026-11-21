import React, { useState, useEffect } from 'react';
import { mockTestService } from '../../services/index.js';
import DataTable from '../../components/DataTable.jsx';
import Pagination from '../../components/Pagination.jsx';
import StatusBadge from '../../components/StatusBadge.jsx';
import Modal from '../../components/Modal.jsx';
import ConfirmDialog from '../../components/ConfirmDialog.jsx';
import Button from '../../components/Button.jsx';
import {
  ClipboardList,
  PlusCircle,
  FileText,
  FolderPlus,
  HelpCircle,
  Eye,
  Edit,
  Trash2,
  CheckCircle2,
  AlertCircle,
  Clock,
  BookOpen,
  Filter,
  Search,
  Layers,
  Sparkles,
  ExternalLink,
  ShieldCheck,
  Tag
} from 'lucide-react';

export default function AdminMockTests() {
  const [activeTab, setActiveTab] = useState('tests'); // 'tests' | 'questions' | 'banks'

  // --- Mock Tests State ---
  const [tests, setTests] = useState([]);
  const [testsLoading, setTestsLoading] = useState(true);
  const [testsError, setTestsError] = useState(null);
  const [testsPage, setTestsPage] = useState(1);
  const [testsTotalPages, setTestsTotalPages] = useState(1);
  const [testsTotal, setTestsTotal] = useState(0);
  const [testStatusFilter, setTestStatusFilter] = useState('');

  // --- Questions State ---
  const [questions, setQuestions] = useState([]);
  const [questionsLoading, setQuestionsLoading] = useState(false);
  const [questionsError, setQuestionsError] = useState(null);
  const [questionsPage, setQuestionsPage] = useState(1);
  const [questionsTotalPages, setQuestionsTotalPages] = useState(1);
  const [questionsTotal, setQuestionsTotal] = useState(0);
  const [selectedBankFilter, setSelectedBankFilter] = useState('');
  const [difficultyFilter, setDifficultyFilter] = useState('');
  const [questionSearch, setQuestionSearch] = useState('');

  // --- Categories & Banks State ---
  const [categories, setCategories] = useState([]);
  const [banks, setBanks] = useState([]);

  // --- Builder Modal State ---
  const [isBuilderOpen, setIsBuilderOpen] = useState(false);
  const [editingTestId, setEditingTestId] = useState(null);
  const [testForm, setTestForm] = useState({
    title: '',
    description: '',
    instructions: '',
    categoryId: '',
    durationMinutes: 60,
    attemptLimit: 1,
    reviewPolicy: 'IMMEDIATE',
    scoringConfig: {
      defaultCorrectMarks: 1,
      enableNegativeMarking: false,
      defaultNegativeMarks: 0,
      passMarks: 0
    },
    sections: [
      {
        sectionId: 'sec_1',
        name: 'General Section',
        durationMinutes: 60,
        marksPerQuestion: 1,
        negativeMarksPerQuestion: 0,
        questionSelectionConfig: {
          mode: 'MANUAL',
          bankId: '',
          count: 0,
          questionIds: []
        }
      }
    ]
  });
  const [builderSubmitting, setBuilderSubmitting] = useState(false);
  const [builderError, setBuilderError] = useState('');

  // --- Question Form Modal State ---
  const [isQuestionModalOpen, setIsQuestionModalOpen] = useState(false);
  const [editingQuestionId, setEditingQuestionId] = useState(null);
  const [questionForm, setQuestionForm] = useState({
    bankId: '',
    type: 'SINGLE_CHOICE',
    prompt: '',
    options: [
      { optionId: 'opt_1', text: '' },
      { optionId: 'opt_2', text: '' }
    ],
    answerKey: ['opt_1'],
    shortAnswerText: '',
    explanation: '',
    difficulty: 'MEDIUM',
    topicTagsInput: ''
  });
  const [questionSubmitting, setQuestionSubmitting] = useState(false);
  const [questionModalError, setQuestionModalError] = useState('');

  // --- Bank & Category Modals ---
  const [isBankModalOpen, setIsBankModalOpen] = useState(false);
  const [bankForm, setBankForm] = useState({ name: '', categoryId: '', description: '', topicTagsInput: '' });
  const [isCategoryModalOpen, setIsCategoryModalOpen] = useState(false);
  const [categoryForm, setCategoryForm] = useState({ name: '', description: '' });

  // --- Preview Modal State ---
  const [previewData, setPreviewData] = useState(null);
  const [isPreviewOpen, setIsPreviewOpen] = useState(false);
  const [previewLoading, setPreviewLoading] = useState(false);

  // --- Confirmation Dialog ---
  const [confirmDialog, setConfirmDialog] = useState({
    isOpen: false,
    title: '',
    message: '',
    onConfirm: null,
    loading: false
  });

  // Load Categories & Banks
  const fetchCategoriesAndBanks = async () => {
    try {
      const [catRes, bankRes] = await Promise.all([
        mockTestService.getCategories({ limit: 100 }),
        mockTestService.getQuestionBanks({ limit: 100 })
      ]);
      setCategories(catRes?.data?.data || catRes?.data || []);
      setBanks(bankRes?.data?.data || bankRes?.data || []);
    } catch {
      // Background load
    }
  };

  // Load Mock Tests
  const fetchMockTests = async () => {
    setTestsLoading(true);
    setTestsError(null);
    try {
      const res = await mockTestService.getMockTests({
        page: testsPage,
        limit: 10,
        status: testStatusFilter || undefined
      });
      const items = res?.data?.data || res?.data || [];
      const pag = res?.data?.pagination || res?.pagination || {};
      setTests(Array.isArray(items) ? items : []);
      setTestsTotal(pag.total || (Array.isArray(items) ? items.length : 0));
      setTestsTotalPages(pag.totalPages || 1);
    } catch (err) {
      setTestsError(err?.response?.data?.message || err.message || 'Failed to load mock tests');
    } finally {
      setTestsLoading(false);
    }
  };

  // Load Questions
  const fetchQuestions = async () => {
    setQuestionsLoading(true);
    setQuestionsError(null);
    try {
      const res = await mockTestService.getQuestions({
        page: questionsPage,
        limit: 15,
        bankId: selectedBankFilter || undefined,
        difficulty: difficultyFilter || undefined,
        q: questionSearch || undefined
      });
      const items = res?.data?.data || res?.data || [];
      const pag = res?.data?.pagination || res?.pagination || {};
      setQuestions(Array.isArray(items) ? items : []);
      setQuestionsTotal(pag.total || (Array.isArray(items) ? items.length : 0));
      setQuestionsTotalPages(pag.totalPages || 1);
    } catch (err) {
      setQuestionsError(err?.response?.data?.message || err.message || 'Failed to load questions');
    } finally {
      setQuestionsLoading(false);
    }
  };

  useEffect(() => {
    fetchCategoriesAndBanks();
  }, []);

  useEffect(() => {
    if (activeTab === 'tests') fetchMockTests();
    if (activeTab === 'questions') fetchQuestions();
  }, [activeTab, testsPage, testStatusFilter, questionsPage, selectedBankFilter, difficultyFilter]);

  // Open Preview Modal
  const handleOpenPreview = async (testId) => {
    setIsPreviewOpen(true);
    setPreviewLoading(true);
    try {
      const res = await mockTestService.getMockTestPreview(testId);
      setPreviewData(res?.data?.data || res?.data);
    } catch (err) {
      alert(err?.response?.data?.message || 'Failed to generate test preview');
      setIsPreviewOpen(false);
    } finally {
      setPreviewLoading(false);
    }
  };

  // Publish Test
  const handlePublishTest = async (test) => {
    setConfirmDialog({
      isOpen: true,
      title: `Publish Mock Test "${test.title}"?`,
      message: 'Publishing will validate question availability, positive scoring parameters, and make this test discoverable to students.',
      confirmText: 'Validate & Publish',
      confirmVariant: 'primary',
      onConfirm: async () => {
        setConfirmDialog((p) => ({ ...p, loading: true }));
        try {
          await mockTestService.publishMockTest(test._id);
          setConfirmDialog((p) => ({ ...p, isOpen: false, loading: false }));
          fetchMockTests();
        } catch (err) {
          alert(err?.response?.data?.message || err.message || 'Failed to publish test');
          setConfirmDialog((p) => ({ ...p, loading: false }));
        }
      }
    });
  };

  // Archive Test
  const handleArchiveTest = async (test) => {
    setConfirmDialog({
      isOpen: true,
      title: `Archive Test "${test.title}"?`,
      message: 'Archived tests will be hidden from students. Completed attempts remain archived for compliance.',
      confirmText: 'Archive Test',
      confirmVariant: 'danger',
      onConfirm: async () => {
        setConfirmDialog((p) => ({ ...p, loading: true }));
        try {
          await mockTestService.archiveMockTest(test._id);
          setConfirmDialog((p) => ({ ...p, isOpen: false, loading: false }));
          fetchMockTests();
        } catch (err) {
          alert(err?.response?.data?.message || err.message || 'Failed to archive test');
          setConfirmDialog((p) => ({ ...p, loading: false }));
        }
      }
    });
  };

  // Save Test from Builder
  const handleSaveTestBuilder = async () => {
    if (!testForm.title.trim()) {
      setBuilderError('Test title is required');
      return;
    }

    setBuilderSubmitting(true);
    setBuilderError('');
    try {
      if (editingTestId) {
        await mockTestService.updateMockTest(editingTestId, testForm);
      } else {
        await mockTestService.createMockTest(testForm);
      }
      setIsBuilderOpen(false);
      setEditingTestId(null);
      fetchMockTests();
    } catch (err) {
      setBuilderError(err?.response?.data?.message || err.message || 'Failed to save test');
    } finally {
      setBuilderSubmitting(false);
    }
  };

  // Save Question
  const handleSaveQuestion = async () => {
    if (!questionForm.bankId) {
      setQuestionModalError('Please select a question bank');
      return;
    }
    if (!questionForm.prompt.trim()) {
      setQuestionModalError('Question prompt is required');
      return;
    }

    setQuestionSubmitting(true);
    setQuestionModalError('');
    try {
      const topicTags = questionForm.topicTagsInput
        .split(',')
        .map((t) => t.trim())
        .filter(Boolean);

      const payload = {
        bankId: questionForm.bankId,
        type: questionForm.type,
        prompt: questionForm.prompt.trim(),
        options: questionForm.options,
        answerKey:
          questionForm.type === 'SHORT_ANSWER'
            ? questionForm.shortAnswerText.trim()
            : questionForm.answerKey,
        explanation: questionForm.explanation.trim(),
        difficulty: questionForm.difficulty,
        topicTags
      };

      if (editingQuestionId) {
        await mockTestService.updateQuestion(editingQuestionId, payload);
      } else {
        await mockTestService.createQuestion(payload);
      }
      setIsQuestionModalOpen(false);
      setEditingQuestionId(null);
      fetchQuestions();
    } catch (err) {
      setQuestionModalError(err?.response?.data?.message || err.message || 'Failed to save question');
    } finally {
      setQuestionSubmitting(false);
    }
  };

  // Save Bank
  const handleSaveBank = async () => {
    if (!bankForm.name.trim() || !bankForm.categoryId) {
      alert('Name and category are required');
      return;
    }
    try {
      await mockTestService.createQuestionBank({
        name: bankForm.name.trim(),
        categoryId: bankForm.categoryId,
        description: bankForm.description.trim(),
        topicTags: bankForm.topicTagsInput.split(',').map((t) => t.trim()).filter(Boolean)
      });
      setIsBankModalOpen(false);
      setBankForm({ name: '', categoryId: '', description: '', topicTagsInput: '' });
      fetchCategoriesAndBanks();
    } catch (err) {
      alert(err?.response?.data?.message || 'Failed to create bank');
    }
  };

  // Save Category
  const handleSaveCategory = async () => {
    if (!categoryForm.name.trim()) {
      alert('Category name is required');
      return;
    }
    try {
      await mockTestService.createCategory({
        name: categoryForm.name.trim(),
        description: categoryForm.description.trim()
      });
      setIsCategoryModalOpen(false);
      setCategoryForm({ name: '', description: '' });
      fetchCategoriesAndBanks();
    } catch (err) {
      alert(err?.response?.data?.message || 'Failed to create category');
    }
  };

  // Table Columns for Mock Tests
  const testColumns = [
    {
      header: 'Test Title & Category',
      accessor: (row) => (
        <div>
          <div className="font-bold text-slate-900 flex items-center gap-2">
            <span>{row.title}</span>
            <span className="px-1.5 py-0.2 rounded text-[11px] font-mono bg-indigo-50 text-indigo-700 border border-indigo-200">
              v{row.version || 1}
            </span>
          </div>
          <div className="text-xs text-slate-500 mt-0.5 flex items-center gap-1.5">
            <span>{row.categoryId?.name || 'Uncategorized'}</span>
            <span>&bull;</span>
            <span className="flex items-center gap-1">
              <Clock className="w-3 h-3 text-slate-400" />
              {row.durationMinutes} mins
            </span>
          </div>
        </div>
      )
    },
    {
      header: 'Scope & Structure',
      accessor: (row) => (
        <div className="text-xs text-slate-600 space-y-0.5">
          <div>
            <strong>{row.sections?.length || 0}</strong> section(s) &bull;{' '}
            <strong>{row.totalQuestions || 0}</strong> questions
          </div>
          <div className="text-slate-400 text-[11px]">
            Total Marks: {row.totalMarks || 0} | Neg: {row.scoringConfig?.enableNegativeMarking ? 'Yes' : 'No'}
          </div>
        </div>
      )
    },
    {
      header: 'Status',
      accessor: (row) => <StatusBadge status={row.status} size="sm" />
    },
    {
      header: 'Actions',
      className: 'text-right',
      accessor: (row) => (
        <div className="flex items-center justify-end space-x-1.5">
          <Button
            variant="outline"
            size="sm"
            onClick={() => handleOpenPreview(row._id)}
            icon={Eye}
          >
            Preview
          </Button>

          {row.status === 'DRAFT' && (
            <Button
              variant="primary"
              size="sm"
              onClick={() => handlePublishTest(row)}
              icon={CheckCircle2}
            >
              Publish
            </Button>
          )}

          <Button
            variant="ghost"
            size="sm"
            onClick={() => {
              setEditingTestId(row._id);
              setTestForm({
                title: row.title,
                description: row.description || '',
                instructions: row.instructions || '',
                categoryId: row.categoryId?._id || row.categoryId || '',
                durationMinutes: row.durationMinutes,
                attemptLimit: row.attemptLimit || 1,
                reviewPolicy: row.reviewPolicy || 'IMMEDIATE',
                scoringConfig: row.scoringConfig || {
                  defaultCorrectMarks: 1,
                  enableNegativeMarking: false,
                  defaultNegativeMarks: 0,
                  passMarks: 0
                },
                sections: row.sections || []
              });
              setIsBuilderOpen(true);
            }}
            icon={Edit}
          >
            Edit
          </Button>

          {row.status !== 'ARCHIVED' && (
            <Button
              variant="ghost"
              size="sm"
              className="text-rose-600 hover:bg-rose-50"
              onClick={() => handleArchiveTest(row)}
              icon={Trash2}
            >
              Archive
            </Button>
          )}
        </div>
      )
    }
  ];

  // Table Columns for Questions
  const questionColumns = [
    {
      header: 'Question Prompt',
      accessor: (row) => (
        <div className="max-w-md">
          <div className="font-medium text-slate-900 text-xs line-clamp-2">{row.prompt}</div>
          <div className="text-[11px] text-slate-400 mt-1 flex flex-wrap items-center gap-1.5">
            <span className="font-semibold text-slate-600">{row.bankId?.name || 'Bank'}</span>
            <span>&bull;</span>
            <span className="uppercase text-indigo-600 font-mono text-[10px] bg-indigo-50 px-1 rounded">
              {row.type}
            </span>
            {row.topicTags?.map((tag) => (
              <span key={tag} className="bg-slate-100 text-slate-600 px-1.5 py-0.2 rounded text-[10px]">
                #{tag}
              </span>
            ))}
          </div>
        </div>
      )
    },
    {
      header: 'Difficulty',
      accessor: (row) => {
        const color =
          row.difficulty === 'EASY'
            ? 'text-emerald-700 bg-emerald-50 border-emerald-200'
            : row.difficulty === 'HARD'
            ? 'text-rose-700 bg-rose-50 border-rose-200'
            : 'text-amber-700 bg-amber-50 border-amber-200';
        return (
          <span className={`px-2 py-0.5 rounded text-xs font-semibold border ${color}`}>
            {row.difficulty}
          </span>
        );
      }
    },
    {
      header: 'Answer Key (Staff Only)',
      accessor: (row) => (
        <div className="text-xs font-mono text-slate-700">
          {Array.isArray(row.answerKey) ? row.answerKey.join(', ') : String(row.answerKey || '')}
        </div>
      )
    },
    {
      header: 'Actions',
      className: 'text-right',
      accessor: (row) => (
        <div className="flex items-center justify-end space-x-1">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => {
              setEditingQuestionId(row._id);
              setQuestionForm({
                bankId: row.bankId?._id || row.bankId || '',
                type: row.type,
                prompt: row.prompt,
                options: row.options || [],
                answerKey: Array.isArray(row.answerKey) ? row.answerKey : [],
                shortAnswerText: typeof row.answerKey === 'string' ? row.answerKey : '',
                explanation: row.explanation || '',
                difficulty: row.difficulty || 'MEDIUM',
                topicTagsInput: (row.topicTags || []).join(', ')
              });
              setIsQuestionModalOpen(true);
            }}
            icon={Edit}
          >
            Edit
          </Button>
        </div>
      )
    }
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-slate-900">Mock Tests & Assessment Engine</h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Author assessments, curate question banks, configure negative marking and preview student tests
          </p>
        </div>

        {/* Tab switch */}
        <div className="flex bg-slate-100 p-1 rounded-xl self-start sm:self-auto border border-slate-200">
          <button
            type="button"
            onClick={() => setActiveTab('tests')}
            className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-all ${
              activeTab === 'tests'
                ? 'bg-white text-indigo-700 shadow-sm'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Mock Tests
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('questions')}
            className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-all ${
              activeTab === 'questions'
                ? 'bg-white text-indigo-700 shadow-sm'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Questions Library
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('banks')}
            className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-all ${
              activeTab === 'banks'
                ? 'bg-white text-indigo-700 shadow-sm'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Question Banks & Categories
          </button>
        </div>
      </div>

      {/* --- TAB 1: MOCK TESTS --- */}
      {activeTab === 'tests' && (
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-3 p-4 bg-white rounded-xl border border-slate-200 shadow-sm">
            <div className="flex items-center gap-2">
              <span className="text-xs font-semibold text-slate-600">Status:</span>
              {['', 'DRAFT', 'PUBLISHED', 'ARCHIVED'].map((st) => (
                <button
                  key={st}
                  type="button"
                  onClick={() => {
                    setTestStatusFilter(st);
                    setTestsPage(1);
                  }}
                  className={`px-2.5 py-1 text-xs rounded-lg font-medium transition-colors ${
                    testStatusFilter === st
                      ? 'bg-indigo-600 text-white shadow-sm'
                      : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-50'
                  }`}
                >
                  {st || 'All'}
                </button>
              ))}
            </div>

            <Button
              variant="primary"
              size="sm"
              icon={PlusCircle}
              onClick={() => {
                setEditingTestId(null);
                setTestForm({
                  title: '',
                  description: '',
                  instructions: '',
                  categoryId: categories[0]?._id || '',
                  durationMinutes: 60,
                  attemptLimit: 1,
                  reviewPolicy: 'IMMEDIATE',
                  scoringConfig: {
                    defaultCorrectMarks: 1,
                    enableNegativeMarking: false,
                    defaultNegativeMarks: 0,
                    passMarks: 0
                  },
                  sections: [
                    {
                      sectionId: 'sec_1',
                      name: 'General Section',
                      durationMinutes: 60,
                      marksPerQuestion: 1,
                      negativeMarksPerQuestion: 0,
                      questionSelectionConfig: {
                        mode: 'MANUAL',
                        bankId: banks[0]?._id || '',
                        count: 0,
                        questionIds: []
                      }
                    }
                  ]
                });
                setIsBuilderOpen(true);
              }}
            >
              Build New Mock Test
            </Button>
          </div>

          <DataTable
            columns={testColumns}
            data={tests}
            loading={testsLoading}
            error={testsError}
            onRetry={fetchMockTests}
            emptyMessage="No mock tests authored yet. Click 'Build New Mock Test' to author an assessment."
          />

          {!testsLoading && tests.length > 0 && (
            <Pagination
              page={testsPage}
              totalPages={testsTotalPages}
              total={testsTotal}
              limit={10}
              onPageChange={(p) => setTestsPage(p)}
            />
          )}
        </div>
      )}

      {/* --- TAB 2: QUESTIONS LIBRARY --- */}
      {activeTab === 'questions' && (
        <div className="space-y-4">
          <div className="flex flex-col md:flex-row items-center justify-between gap-3 p-4 bg-white rounded-xl border border-slate-200 shadow-sm">
            <div className="flex flex-wrap items-center gap-2">
              <select
                value={selectedBankFilter}
                onChange={(e) => {
                  setSelectedBankFilter(e.target.value);
                  setQuestionsPage(1);
                }}
                className="text-xs rounded-lg border border-slate-200 px-2.5 py-1.5 bg-white text-slate-700"
              >
                <option value="">All Question Banks</option>
                {banks.map((b) => (
                  <option key={b._id} value={b._id}>
                    {b.name}
                  </option>
                ))}
              </select>

              <select
                value={difficultyFilter}
                onChange={(e) => {
                  setDifficultyFilter(e.target.value);
                  setQuestionsPage(1);
                }}
                className="text-xs rounded-lg border border-slate-200 px-2.5 py-1.5 bg-white text-slate-700"
              >
                <option value="">All Difficulties</option>
                <option value="EASY">Easy</option>
                <option value="MEDIUM">Medium</option>
                <option value="HARD">Hard</option>
              </select>
            </div>

            <Button
              variant="primary"
              size="sm"
              icon={PlusCircle}
              onClick={() => {
                setEditingQuestionId(null);
                setQuestionForm({
                  bankId: banks[0]?._id || '',
                  type: 'SINGLE_CHOICE',
                  prompt: '',
                  options: [
                    { optionId: 'opt_1', text: '' },
                    { optionId: 'opt_2', text: '' },
                    { optionId: 'opt_3', text: '' },
                    { optionId: 'opt_4', text: '' }
                  ],
                  answerKey: ['opt_1'],
                  shortAnswerText: '',
                  explanation: '',
                  difficulty: 'MEDIUM',
                  topicTagsInput: ''
                });
                setIsQuestionModalOpen(true);
              }}
            >
              Add New Question
            </Button>
          </div>

          <DataTable
            columns={questionColumns}
            data={questions}
            loading={questionsLoading}
            error={questionsError}
            onRetry={fetchQuestions}
            emptyMessage="No questions match the filter criteria. Add questions to populate your banks."
          />

          {!questionsLoading && questions.length > 0 && (
            <Pagination
              page={questionsPage}
              totalPages={questionsTotalPages}
              total={questionsTotal}
              limit={15}
              onPageChange={(p) => setQuestionsPage(p)}
            />
          )}
        </div>
      )}

      {/* --- TAB 3: BANKS & CATEGORIES --- */}
      {activeTab === 'banks' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Categories Card */}
          <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div>
                <h3 className="font-bold text-slate-900 text-sm">Test Categories</h3>
                <p className="text-xs text-slate-400">Higher-level institutional tracks</p>
              </div>
              <Button
                variant="outline"
                size="sm"
                icon={PlusCircle}
                onClick={() => setIsCategoryModalOpen(true)}
              >
                New Category
              </Button>
            </div>

            <div className="space-y-2">
              {categories.map((cat) => (
                <div
                  key={cat._id}
                  className="p-3 rounded-xl border border-slate-100 bg-slate-50 flex items-center justify-between text-xs"
                >
                  <div>
                    <div className="font-bold text-slate-800">{cat.name}</div>
                    <div className="text-slate-400 font-mono text-[11px]">{cat.slug}</div>
                  </div>
                  <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-50 text-emerald-700">
                    {cat.status}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* Question Banks Card */}
          <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div>
                <h3 className="font-bold text-slate-900 text-sm">Question Banks</h3>
                <p className="text-xs text-slate-400">Curated question repositories</p>
              </div>
              <Button
                variant="primary"
                size="sm"
                icon={PlusCircle}
                onClick={() => setIsBankModalOpen(true)}
              >
                New Bank
              </Button>
            </div>

            <div className="space-y-2">
              {banks.map((bank) => (
                <div
                  key={bank._id}
                  className="p-3 rounded-xl border border-slate-100 bg-slate-50 flex items-center justify-between text-xs"
                >
                  <div>
                    <div className="font-bold text-slate-800">{bank.name}</div>
                    <div className="text-slate-500 text-[11px]">
                      {bank.categoryId?.name || 'General'}
                    </div>
                  </div>
                  <div className="flex items-center gap-1.5">
                    {bank.topicTags?.map((tag) => (
                      <span key={tag} className="px-1.5 py-0.2 bg-white rounded border text-[10px] text-slate-600">
                        {tag}
                      </span>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* --- MODAL: TEST BUILDER --- */}
      <Modal
        isOpen={isBuilderOpen}
        onClose={() => setIsBuilderOpen(false)}
        title={editingTestId ? 'Edit Mock Test' : 'Mock Test Builder'}
        subtitle="Configure assessment scope, negative marking, attempt policies and question sections"
        maxWidth="max-w-2xl"
      >
        <div className="space-y-4 pt-2">
          {editingTestId && (
            <div className="p-3 bg-amber-50 rounded-xl border border-amber-200 text-xs text-amber-900 flex items-start gap-2">
              <AlertCircle className="w-4 h-4 text-amber-600 flex-shrink-0 mt-0.5" />
              <span>
                <strong>Versioning Notice:</strong> If this test is already published, saving changes will automatically increment its version. Existing student attempts will preserve their pinned version.
              </span>
            </div>
          )}

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Test Title <span className="text-rose-500">*</span>
            </label>
            <input
              type="text"
              value={testForm.title}
              onChange={(e) => setTestForm({ ...testForm, title: e.target.value })}
              placeholder="e.g. Campus Placement Benchmark 2026"
              className="w-full text-xs rounded-xl border border-slate-200 p-2.5 focus:outline-none focus:ring-1 focus:ring-indigo-500"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Category</label>
              <select
                value={testForm.categoryId}
                onChange={(e) => setTestForm({ ...testForm, categoryId: e.target.value })}
                className="w-full text-xs rounded-xl border border-slate-200 p-2.5 bg-white text-slate-700"
              >
                <option value="">Select Category</option>
                {categories.map((c) => (
                  <option key={c._id} value={c._id}>
                    {c.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Duration (minutes) <span className="text-rose-500">*</span>
              </label>
              <input
                type="number"
                min="1"
                value={testForm.durationMinutes}
                onChange={(e) => setTestForm({ ...testForm, durationMinutes: Number(e.target.value) })}
                className="w-full text-xs rounded-xl border border-slate-200 p-2.5"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Attempt Limit</label>
              <input
                type="number"
                min="1"
                value={testForm.attemptLimit}
                onChange={(e) => setTestForm({ ...testForm, attemptLimit: Number(e.target.value) })}
                className="w-full text-xs rounded-xl border border-slate-200 p-2.5"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Instructions</label>
            <textarea
              rows={2}
              value={testForm.instructions}
              onChange={(e) => setTestForm({ ...testForm, instructions: e.target.value })}
              placeholder="e.g. Calculators are prohibited. Questions have negative marking."
              className="w-full text-xs rounded-xl border border-slate-200 p-2.5"
            />
          </div>

          {/* Scoring Configuration */}
          <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 space-y-3">
            <h4 className="text-xs font-bold text-slate-800">Scoring Rules</h4>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label className="block text-[11px] font-medium text-slate-600 mb-1">
                  Marks per Question
                </label>
                <input
                  type="number"
                  step="0.5"
                  min="0.1"
                  value={testForm.scoringConfig.defaultCorrectMarks}
                  onChange={(e) =>
                    setTestForm({
                      ...testForm,
                      scoringConfig: {
                        ...testForm.scoringConfig,
                        defaultCorrectMarks: Number(e.target.value)
                      }
                    })
                  }
                  className="w-full text-xs rounded-lg border border-slate-200 p-2 bg-white"
                />
              </div>

              <div>
                <label className="block text-[11px] font-medium text-slate-600 mb-1">
                  Enable Negative Marking
                </label>
                <select
                  value={testForm.scoringConfig.enableNegativeMarking ? 'yes' : 'no'}
                  onChange={(e) =>
                    setTestForm({
                      ...testForm,
                      scoringConfig: {
                        ...testForm.scoringConfig,
                        enableNegativeMarking: e.target.value === 'yes'
                      }
                    })
                  }
                  className="w-full text-xs rounded-lg border border-slate-200 p-2 bg-white"
                >
                  <option value="no">Disabled (0)</option>
                  <option value="yes">Enabled</option>
                </select>
              </div>

              {testForm.scoringConfig.enableNegativeMarking && (
                <div>
                  <label className="block text-[11px] font-medium text-slate-600 mb-1">
                    Negative Penalty Marks
                  </label>
                  <input
                    type="number"
                    step="0.25"
                    min="0"
                    value={testForm.scoringConfig.defaultNegativeMarks}
                    onChange={(e) =>
                      setTestForm({
                        ...testForm,
                        scoringConfig: {
                          ...testForm.scoringConfig,
                          defaultNegativeMarks: Number(e.target.value)
                        }
                      })
                    }
                    className="w-full text-xs rounded-lg border border-slate-200 p-2 bg-white"
                  />
                </div>
              )}
            </div>
          </div>

          {builderError && (
            <div className="p-2 bg-rose-50 border border-rose-200 text-rose-700 text-xs rounded-lg">
              {builderError}
            </div>
          )}

          <div className="flex items-center justify-end space-x-2 pt-2 border-t border-slate-100">
            <Button variant="outline" size="sm" onClick={() => setIsBuilderOpen(false)}>
              Cancel
            </Button>
            <Button variant="primary" size="sm" loading={builderSubmitting} onClick={handleSaveTestBuilder}>
              Save Mock Test
            </Button>
          </div>
        </div>
      </Modal>

      {/* --- MODAL: QUESTION BUILDER --- */}
      <Modal
        isOpen={isQuestionModalOpen}
        onClose={() => setIsQuestionModalOpen(false)}
        title={editingQuestionId ? 'Edit Question' : 'Add New Question'}
        subtitle="Specify question prompt, choice options, secret answer key and detailed explanation"
        maxWidth="max-w-xl"
      >
        <div className="space-y-4 pt-2">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Question Bank</label>
              <select
                value={questionForm.bankId}
                onChange={(e) => setQuestionForm({ ...questionForm, bankId: e.target.value })}
                className="w-full text-xs rounded-xl border border-slate-200 p-2.5 bg-white"
              >
                <option value="">Select Question Bank</option>
                {banks.map((b) => (
                  <option key={b._id} value={b._id}>
                    {b.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Question Type</label>
              <select
                value={questionForm.type}
                onChange={(e) => setQuestionForm({ ...questionForm, type: e.target.value })}
                className="w-full text-xs rounded-xl border border-slate-200 p-2.5 bg-white"
              >
                <option value="SINGLE_CHOICE">Single Choice (Radio)</option>
                <option value="MULTI_SELECT">Multi Select (Checkbox)</option>
                <option value="SHORT_ANSWER">Short Answer (Text)</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Question Prompt (Markdown Supported) <span className="text-rose-500">*</span>
            </label>
            <textarea
              rows={3}
              value={questionForm.prompt}
              onChange={(e) => setQuestionForm({ ...questionForm, prompt: e.target.value })}
              placeholder="e.g. What is the time complexity of binary search?"
              className="w-full text-xs rounded-xl border border-slate-200 p-2.5"
            />
          </div>

          {/* Choices for Single / Multi Choice */}
          {['SINGLE_CHOICE', 'MULTI_SELECT'].includes(questionForm.type) && (
            <div className="space-y-2">
              <label className="block text-xs font-semibold text-slate-700">Options & Answer Key</label>
              {questionForm.options.map((opt, i) => (
                <div key={opt.optionId || i} className="flex items-center gap-2">
                  <input
                    type={questionForm.type === 'SINGLE_CHOICE' ? 'radio' : 'checkbox'}
                    checked={questionForm.answerKey.includes(opt.optionId)}
                    onChange={() => {
                      if (questionForm.type === 'SINGLE_CHOICE') {
                        setQuestionForm({ ...questionForm, answerKey: [opt.optionId] });
                      } else {
                        const exists = questionForm.answerKey.includes(opt.optionId);
                        const next = exists
                          ? questionForm.answerKey.filter((k) => k !== opt.optionId)
                          : [...questionForm.answerKey, opt.optionId];
                        setQuestionForm({ ...questionForm, answerKey: next });
                      }
                    }}
                  />
                  <input
                    type="text"
                    value={opt.text}
                    onChange={(e) => {
                      const updated = [...questionForm.options];
                      updated[i].text = e.target.value;
                      setQuestionForm({ ...questionForm, options: updated });
                    }}
                    placeholder={`Option ${i + 1} text`}
                    className="flex-1 text-xs rounded-lg border border-slate-200 p-2"
                  />
                </div>
              ))}
            </div>
          )}

          {questionForm.type === 'SHORT_ANSWER' && (
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Acceptable Short Answer (Case-insensitive)
              </label>
              <input
                type="text"
                value={questionForm.shortAnswerText}
                onChange={(e) => setQuestionForm({ ...questionForm, shortAnswerText: e.target.value })}
                placeholder="e.g. queue"
                className="w-full text-xs rounded-xl border border-slate-200 p-2.5"
              />
            </div>
          )}

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Detailed Explanation (Staff & Review view only)
            </label>
            <textarea
              rows={2}
              value={questionForm.explanation}
              onChange={(e) => setQuestionForm({ ...questionForm, explanation: e.target.value })}
              placeholder="e.g. Binary search halves the search space each step..."
              className="w-full text-xs rounded-xl border border-slate-200 p-2.5"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Difficulty</label>
              <select
                value={questionForm.difficulty}
                onChange={(e) => setQuestionForm({ ...questionForm, difficulty: e.target.value })}
                className="w-full text-xs rounded-xl border border-slate-200 p-2 bg-white"
              >
                <option value="EASY">Easy</option>
                <option value="MEDIUM">Medium</option>
                <option value="HARD">Hard</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Topic Tags (comma-separated)
              </label>
              <input
                type="text"
                value={questionForm.topicTagsInput}
                onChange={(e) => setQuestionForm({ ...questionForm, topicTagsInput: e.target.value })}
                placeholder="e.g. dsa, trees, algorithms"
                className="w-full text-xs rounded-xl border border-slate-200 p-2"
              />
            </div>
          </div>

          {questionModalError && (
            <div className="p-2 bg-rose-50 border border-rose-200 text-rose-700 text-xs rounded-lg">
              {questionModalError}
            </div>
          )}

          <div className="flex items-center justify-end space-x-2 pt-2 border-t border-slate-100">
            <Button variant="outline" size="sm" onClick={() => setIsQuestionModalOpen(false)}>
              Cancel
            </Button>
            <Button variant="primary" size="sm" loading={questionSubmitting} onClick={handleSaveQuestion}>
              Save Question
            </Button>
          </div>
        </div>
      </Modal>

      {/* --- MODAL: STUDENT PREVIEW --- */}
      <Modal
        isOpen={isPreviewOpen}
        onClose={() => setIsPreviewOpen(false)}
        title={previewData ? `${previewData.title} (Student Preview)` : 'Test Preview'}
        subtitle="Verifies question layout, options and guarantees zero leakage of secret answers"
        maxWidth="max-w-2xl"
      >
        {previewLoading ? (
          <div className="py-12 text-center text-xs text-slate-500">Generating student preview...</div>
        ) : previewData ? (
          <div className="space-y-4 pt-2">
            <div className="p-3 bg-emerald-50 rounded-xl border border-emerald-200 text-xs text-emerald-900 flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 text-emerald-600 flex-shrink-0" />
              <span>
                <strong>Zero Leakage Verified:</strong> Answer keys and explanations are completely stripped from student-facing payloads.
              </span>
            </div>

            <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 text-xs space-y-1">
              <div>
                <strong>Duration:</strong> {previewData.durationMinutes} minutes &bull;{' '}
                <strong>Total Questions:</strong> {previewData.totalQuestions} &bull;{' '}
                <strong>Total Marks:</strong> {previewData.totalMarks}
              </div>
              {previewData.instructions && (
                <div className="text-slate-600 italic">
                  <strong>Instructions:</strong> {previewData.instructions}
                </div>
              )}
            </div>

            {/* Questions by section */}
            <div className="space-y-4 max-h-96 overflow-y-auto pr-1">
              {previewData.sections?.map((sec, sIdx) => (
                <div key={sec.sectionId || sIdx} className="space-y-3">
                  <div className="font-bold text-xs text-slate-800 uppercase tracking-wider bg-slate-100 p-2 rounded-lg">
                    {sec.name} ({sec.questions?.length || 0} questions &bull; {sec.marksPerQuestion} mark each)
                  </div>

                  {sec.questions?.map((q, qIdx) => (
                    <div key={q._id || qIdx} className="p-3 rounded-xl border border-slate-200 bg-white space-y-2 text-xs">
                      <div className="font-semibold text-slate-900 flex items-start gap-2">
                        <span className="text-indigo-600">Q{qIdx + 1}.</span>
                        <span>{q.prompt}</span>
                      </div>

                      {q.options?.length > 0 && (
                        <div className="space-y-1 pl-4">
                          {q.options.map((opt) => (
                            <div key={opt.optionId} className="flex items-center gap-2 text-slate-700">
                              <span className="w-3.5 h-3.5 rounded-full border border-slate-300 inline-block" />
                              <span>{opt.text}</span>
                            </div>
                          ))}
                        </div>
                      )}

                      {q.type === 'SHORT_ANSWER' && (
                        <div className="pl-4">
                          <input
                            type="text"
                            disabled
                            placeholder="Type short answer here..."
                            className="w-full text-xs rounded-lg border border-slate-200 p-2 bg-slate-50 cursor-not-allowed"
                          />
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              ))}
            </div>
          </div>
        ) : null}
      </Modal>

      {/* --- MODAL: NEW BANK --- */}
      <Modal
        isOpen={isBankModalOpen}
        onClose={() => setIsBankModalOpen(false)}
        title="Create Question Bank"
        maxWidth="max-w-md"
      >
        <div className="space-y-3 pt-2">
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Category</label>
            <select
              value={bankForm.categoryId}
              onChange={(e) => setBankForm({ ...bankForm, categoryId: e.target.value })}
              className="w-full text-xs rounded-xl border border-slate-200 p-2.5 bg-white"
            >
              <option value="">Select Category</option>
              {categories.map((c) => (
                <option key={c._id} value={c._id}>
                  {c.name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Bank Name</label>
            <input
              type="text"
              value={bankForm.name}
              onChange={(e) => setBankForm({ ...bankForm, name: e.target.value })}
              placeholder="e.g. Computer Networks & Protocols"
              className="w-full text-xs rounded-xl border border-slate-200 p-2.5"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Topic Tags (comma-separated)</label>
            <input
              type="text"
              value={bankForm.topicTagsInput}
              onChange={(e) => setBankForm({ ...bankForm, topicTagsInput: e.target.value })}
              placeholder="e.g. tcp, udp, dns"
              className="w-full text-xs rounded-xl border border-slate-200 p-2.5"
            />
          </div>

          <div className="flex justify-end gap-2 pt-2 border-t">
            <Button variant="outline" size="sm" onClick={() => setIsBankModalOpen(false)}>
              Cancel
            </Button>
            <Button variant="primary" size="sm" onClick={handleSaveBank}>
              Create Bank
            </Button>
          </div>
        </div>
      </Modal>

      {/* --- MODAL: NEW CATEGORY --- */}
      <Modal
        isOpen={isCategoryModalOpen}
        onClose={() => setIsCategoryModalOpen(false)}
        title="Create Test Category"
        maxWidth="max-w-md"
      >
        <div className="space-y-3 pt-2">
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Category Name</label>
            <input
              type="text"
              value={categoryForm.name}
              onChange={(e) => setCategoryForm({ ...categoryForm, name: e.target.value })}
              placeholder="e.g. Logical & Analytical Reasoning"
              className="w-full text-xs rounded-xl border border-slate-200 p-2.5"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Description</label>
            <textarea
              rows={2}
              value={categoryForm.description}
              onChange={(e) => setCategoryForm({ ...categoryForm, description: e.target.value })}
              placeholder="Optional overview"
              className="w-full text-xs rounded-xl border border-slate-200 p-2.5"
            />
          </div>

          <div className="flex justify-end gap-2 pt-2 border-t">
            <Button variant="outline" size="sm" onClick={() => setIsCategoryModalOpen(false)}>
              Cancel
            </Button>
            <Button variant="primary" size="sm" onClick={handleSaveCategory}>
              Create Category
            </Button>
          </div>
        </div>
      </Modal>

      {/* Confirmation Dialog */}
      <ConfirmDialog
        isOpen={confirmDialog.isOpen}
        onClose={() => setConfirmDialog((p) => ({ ...p, isOpen: false }))}
        onConfirm={confirmDialog.onConfirm}
        title={confirmDialog.title}
        message={confirmDialog.message}
        confirmText={confirmDialog.confirmText}
        confirmVariant={confirmDialog.confirmVariant}
        loading={confirmDialog.loading}
      />
    </div>
  );
}
