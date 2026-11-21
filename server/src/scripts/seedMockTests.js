import { connectDB, disconnectDB } from '../config/db.js';
import {
  Organization,
  User,
  TestCategory,
  QuestionBank,
  Question,
  MockTest
} from '../models/index.js';
import {
  QUESTION_TYPES,
  QUESTION_DIFFICULTIES,
  QUESTION_STATUSES,
  MOCK_TEST_STATUSES,
  MOCK_TEST_REVIEW_POLICIES,
  QUESTION_SELECTION_MODES
} from '../utils/constants.js';

export const seedMockTestData = async (orgId, staffUserId) => {
  console.log('Seeding Mock Test categories, question banks, and questions...');

  // 1. Categories
  let catTech = await TestCategory.findOne({ organizationId: orgId, slug: 'technical-cs-it' });
  if (!catTech) {
    catTech = await TestCategory.create({
      organizationId: orgId,
      name: 'Technical Assessment (CS & IT)',
      slug: 'technical-cs-it',
      description: 'Core computer science fundamentals, data structures, databases, and system concepts',
      status: 'ACTIVE',
      createdBy: staffUserId
    });
  }

  let catAptitude = await TestCategory.findOne({ organizationId: orgId, slug: 'aptitude-reasoning' });
  if (!catAptitude) {
    catAptitude = await TestCategory.create({
      organizationId: orgId,
      name: 'Quantitative Aptitude & Reasoning',
      slug: 'aptitude-reasoning',
      description: 'Mathematical problem solving, probability, permutations, and analytical logic',
      status: 'ACTIVE',
      createdBy: staffUserId
    });
  }

  // 2. Question Banks
  let bankDsa = await QuestionBank.findOne({ organizationId: orgId, name: 'Algorithms & Data Structures' });
  if (!bankDsa) {
    bankDsa = await QuestionBank.create({
      organizationId: orgId,
      categoryId: catTech._id,
      name: 'Algorithms & Data Structures',
      description: 'Asymptotic complexity, trees, graphs, sorting, and dynamic programming',
      topicTags: ['algorithms', 'dsa', 'complexity', 'trees', 'graphs'],
      status: 'ACTIVE',
      createdBy: staffUserId
    });
  }

  let bankDb = await QuestionBank.findOne({ organizationId: orgId, name: 'Databases & System Concepts' });
  if (!bankDb) {
    bankDb = await QuestionBank.create({
      organizationId: orgId,
      categoryId: catTech._id,
      name: 'Databases & System Concepts',
      description: 'ACID properties, indexing, SQL queries, normalization, and concurrency control',
      topicTags: ['database', 'sql', 'acid', 'indexing', 'os'],
      status: 'ACTIVE',
      createdBy: staffUserId
    });
  }

  let bankQuant = await QuestionBank.findOne({ organizationId: orgId, name: 'Quantitative Aptitude' });
  if (!bankQuant) {
    bankQuant = await QuestionBank.create({
      organizationId: orgId,
      categoryId: catAptitude._id,
      name: 'Quantitative Aptitude',
      description: 'Averages, percentages, time and work, permutations, and probability',
      topicTags: ['math', 'probability', 'ratios', 'algebra'],
      status: 'ACTIVE',
      createdBy: staffUserId
    });
  }

  // 3. Original Questions (Single Choice, Multi Select, Short Answer)
  const originalQuestions = [
    // DSA - Single Choice
    {
      organizationId: orgId,
      bankId: bankDsa._id,
      type: QUESTION_TYPES.SINGLE_CHOICE,
      prompt: 'What is the tightest worst-case time complexity of finding the median element in an unsorted array of N distinct integers?',
      options: [
        { optionId: 'opt_1', text: 'O(N log N)' },
        { optionId: 'opt_2', text: 'O(N)' },
        { optionId: 'opt_3', text: 'O(log N)' },
        { optionId: 'opt_4', text: 'O(N^2)' }
      ],
      answerKey: ['opt_2'],
      explanation: 'Using the Median-of-Medians algorithm (Quickselect worst-case variant), the k-th smallest element or median can be determined in strictly deterministic linear time O(N).',
      difficulty: QUESTION_DIFFICULTIES.HARD,
      topicTags: ['algorithms', 'complexity', 'arrays']
    },
    {
      organizationId: orgId,
      bankId: bankDsa._id,
      type: QUESTION_TYPES.SINGLE_CHOICE,
      prompt: 'Which of the following data structures provides O(1) amortized time complexity for both inserting an element and deleting the minimum element when priority keys are integers in a bounded range [0, C]?',
      options: [
        { optionId: 'opt_1', text: 'Dial\'s algorithm bucket queue' },
        { optionId: 'opt_2', text: 'Standard Binary Heap' },
        { optionId: 'opt_3', text: 'Red-Black Tree' },
        { optionId: 'opt_4', text: 'Treap' }
      ],
      answerKey: ['opt_1'],
      explanation: 'Dial\'s algorithm implements an array of buckets where indices represent integer priorities, achieving O(1) amortized operations for small bounded weights.',
      difficulty: QUESTION_DIFFICULTIES.MEDIUM,
      topicTags: ['dsa', 'queues', 'graphs']
    },
    // DSA - Multi Select
    {
      organizationId: orgId,
      bankId: bankDsa._id,
      type: QUESTION_TYPES.MULTI_SELECT,
      prompt: 'Which of the following graph algorithms correctly detect negative weight cycles in a directed graph?',
      options: [
        { optionId: 'opt_a', text: 'Bellman-Ford Algorithm' },
        { optionId: 'opt_b', text: 'Floyd-Warshall Algorithm' },
        { optionId: 'opt_c', text: 'Dijkstra Algorithm with Fibonacci Heap' },
        { optionId: 'opt_d', text: 'Prim Algorithm' }
      ],
      answerKey: ['opt_a', 'opt_b'],
      explanation: 'Both Bellman-Ford (via an N-th iteration relaxation check) and Floyd-Warshall (by checking if any dist[i][i] < 0) can detect negative cycles. Dijkstra and Prim assume non-negative edge weights and fail with negative cycles.',
      difficulty: QUESTION_DIFFICULTIES.MEDIUM,
      topicTags: ['graphs', 'algorithms']
    },
    // DSA - Short Answer
    {
      organizationId: orgId,
      bankId: bankDsa._id,
      type: QUESTION_TYPES.SHORT_ANSWER,
      prompt: 'What standard tree traversal of a Binary Search Tree (BST) produces keys in ascending sorted order?',
      options: [],
      answerKey: 'inorder',
      explanation: 'Inorder traversal visits the left subtree, the current node, and then the right subtree, producing strictly non-decreasing sorted order for valid BSTs.',
      difficulty: QUESTION_DIFFICULTIES.EASY,
      topicTags: ['trees', 'traversal']
    },
    // DB - Single Choice
    {
      organizationId: orgId,
      bankId: bankDb._id,
      type: QUESTION_TYPES.SINGLE_CHOICE,
      prompt: 'Under SQL:1992 isolation levels, which phenomenon is prevented by REPEATABLE READ but permitted under READ COMMITTED?',
      options: [
        { optionId: 'opt_1', text: 'Dirty Read' },
        { optionId: 'opt_2', text: 'Non-repeatable (Fuzzy) Read' },
        { optionId: 'opt_3', text: 'Phantom Read' },
        { optionId: 'opt_4', text: 'Lost Update' }
      ],
      answerKey: ['opt_2'],
      explanation: 'Non-repeatable read occurs when re-reading a row yields modified values. READ COMMITTED permits this if another transaction commits; REPEATABLE READ guarantees snapshot stability for rows read.',
      difficulty: QUESTION_DIFFICULTIES.MEDIUM,
      topicTags: ['database', 'acid', 'sql']
    },
    // DB - Multi Select
    {
      organizationId: orgId,
      bankId: bankDb._id,
      type: QUESTION_TYPES.MULTI_SELECT,
      prompt: 'Which of the following are properties of a B+ Tree index that make it optimal for storage engine block I/O?',
      options: [
        { optionId: 'opt_a', text: 'All actual data records/pointers are stored exclusively in leaf nodes' },
        { optionId: 'opt_b', text: 'Leaf nodes are doubly linked sequentially for efficient range scans' },
        { optionId: 'opt_c', text: 'Internal nodes have high fan-out, reducing tree height' },
        { optionId: 'opt_d', text: 'Lookup time is O(N) in the worst case' }
      ],
      answerKey: ['opt_a', 'opt_b', 'opt_c'],
      explanation: 'B+ trees store keys in leaves with sequential leaf links and high branching factor, guaranteeing O(log N) lookups with minimal disk page reads.',
      difficulty: QUESTION_DIFFICULTIES.MEDIUM,
      topicTags: ['indexing', 'database']
    },
    // Quant - Single Choice
    {
      organizationId: orgId,
      bankId: bankQuant._id,
      type: QUESTION_TYPES.SINGLE_CHOICE,
      prompt: 'Two pipes A and B can fill an empty reservoir in 12 minutes and 18 minutes respectively. An outlet pipe C empties it in 15 minutes. If all three pipes are opened together, how many minutes will it take to fill the reservoir completely?',
      options: [
        { optionId: 'opt_1', text: '13 11/13 minutes' },
        { optionId: 'opt_2', text: '12 6/7 minutes' },
        { optionId: 'opt_3', text: '14 2/11 minutes' },
        { optionId: 'opt_4', text: '15 minutes' }
      ],
      answerKey: ['opt_1'],
      explanation: 'Net rate = 1/12 + 1/18 - 1/15 = (15 + 10 - 12)/180 = 13/180 reservoir/minute. Time required = 180/13 = 13 11/13 minutes.',
      difficulty: QUESTION_DIFFICULTIES.MEDIUM,
      topicTags: ['math', 'time-and-work']
    },
    // Quant - Single Choice
    {
      organizationId: orgId,
      bankId: bankQuant._id,
      type: QUESTION_TYPES.SINGLE_CHOICE,
      prompt: 'A bag contains 5 red, 4 blue, and 3 green marbles. If 3 marbles are drawn simultaneously at random, what is the probability that all three marbles are of distinct colors?',
      options: [
        { optionId: 'opt_1', text: '3/11' },
        { optionId: 'opt_2', text: '6/11' },
        { optionId: 'opt_3', text: '9/22' },
        { optionId: 'opt_4', text: '1/4' }
      ],
      answerKey: ['opt_1'],
      explanation: 'Favorable outcomes = 5 * 4 * 3 = 60. Total outcomes = 12C3 = (12 * 11 * 10)/(3 * 2 * 1) = 220. Probability = 60/220 = 3/11.',
      difficulty: QUESTION_DIFFICULTIES.MEDIUM,
      topicTags: ['math', 'probability']
    }
  ];

  const createdQuestions = [];
  for (const qData of originalQuestions) {
    let existing = await Question.findOne({
      organizationId: orgId,
      bankId: qData.bankId,
      prompt: qData.prompt
    });
    if (!existing) {
      existing = await Question.create({
        ...qData,
        createdBy: staffUserId,
        status: QUESTION_STATUSES.ACTIVE
      });
    }
    createdQuestions.push(existing);
  }

  // 4. Sample Published Mock Test
  let sampleTest = await MockTest.findOne({
    organizationId: orgId,
    title: 'Campus Benchmark Technical & Aptitude Test 2026'
  });

  if (!sampleTest) {
    const dsaIds = createdQuestions.filter((q) => q.bankId.toString() === bankDsa._id.toString()).map((q) => q._id);
    const dbIds = createdQuestions.filter((q) => q.bankId.toString() === bankDb._id.toString()).map((q) => q._id);
    const quantIds = createdQuestions.filter((q) => q.bankId.toString() === bankQuant._id.toString()).map((q) => q._id);

    sampleTest = await MockTest.create({
      organizationId: orgId,
      title: 'Campus Benchmark Technical & Aptitude Test 2026',
      description: 'Institutional placement benchmark evaluating core engineering competencies and analytical aptitude.',
      instructions: 'Total duration is 60 minutes. Read each question carefully. Negative marking of 0.25 marks applies to incorrect answers.',
      categoryId: catTech._id,
      durationMinutes: 60,
      attemptLimit: 2,
      reviewPolicy: MOCK_TEST_REVIEW_POLICIES.IMMEDIATE,
      status: MOCK_TEST_STATUSES.PUBLISHED,
      version: 1,
      publishedAt: new Date(),
      scoringConfig: {
        defaultCorrectMarks: 1,
        enableNegativeMarking: true,
        defaultNegativeMarks: 0.25,
        passMarks: 4
      },
      sections: [
        {
          sectionId: 'sec_cs_core',
          name: 'Computer Science & Systems',
          durationMinutes: 35,
          marksPerQuestion: 1,
          negativeMarksPerQuestion: 0.25,
          questionSelectionConfig: {
            mode: QUESTION_SELECTION_MODES.MANUAL,
            bankId: bankDsa._id,
            count: dsaIds.length + dbIds.length,
            questionIds: [...dsaIds, ...dbIds]
          }
        },
        {
          sectionId: 'sec_quant',
          name: 'Quantitative Problem Solving',
          durationMinutes: 25,
          marksPerQuestion: 1,
          negativeMarksPerQuestion: 0.25,
          questionSelectionConfig: {
            mode: QUESTION_SELECTION_MODES.MANUAL,
            bankId: bankQuant._id,
            count: quantIds.length,
            questionIds: quantIds
          }
        }
      ],
      createdBy: staffUserId
    });
  }

  console.log(`Mock Test Seed Complete. Created test: "${sampleTest.title}" (Status: ${sampleTest.status}, Version: ${sampleTest.version})`);
  return {
    categories: [catTech, catAptitude],
    banks: [bankDsa, bankDb, bankQuant],
    questionsCount: createdQuestions.length,
    mockTest: sampleTest
  };
};

// Standalone execution script
const run = async () => {
  try {
    await connectDB();
    const defaultOrg = await Organization.findOne({ status: 'active' });
    if (!defaultOrg) {
      console.error('No active organization found. Run npm run seed:default-org first.');
      process.exit(1);
    }
    const staffUser = await User.findOne({ organizationId: defaultOrg._id, role: 'admin' });
    if (!staffUser) {
      console.error('No admin found for default org.');
      process.exit(1);
    }

    await seedMockTestData(defaultOrg._id, staffUser._id);
    await disconnectDB();
    process.exit(0);
  } catch (err) {
    console.error('Mock Test Seeding failed:', err);
    process.exit(1);
  }
};

if (process.argv[1]?.endsWith('seedMockTests.js')) {
  run();
}
