import { validateAiEvaluation, REQUIRED_DISCLAIMER } from './aiEvaluationValidator.js';

export class MockAiProvider {
  constructor(options = {}) {
    this.providerName = 'mock';
    this.modelName = options.model || 'mock-gpt-v1';
    this.promptVersion = 'v1';
  }

  /**
   * Generates a deterministic mock interview turn.
   */
  async generateTurn({
    track,
    turns = [],
    latestStudentAnswer = '',
    questionNumber = 1,
    isFollowUp = false,
    simulateOutage = false
  }) {
    if (simulateOutage || process.env.SIMULATE_AI_OUTAGE === 'true') {
      throw new Error('AI Provider Service Unavailable (Simulated Outage)');
    }

    const role = track.roleCategory || 'Software Engineering';

    // 1. Initial turn (Session start)
    if (turns.length === 0) {
      return {
        replyText: `Hello! Welcome to your mock interview session for ${role}. To begin, could you explain a challenging problem you solved recently and the key trade-offs you made?`,
        isConcluding: false,
        usage: { inputTokens: 45, outputTokens: 35 }
      };
    }

    // 2. Concluding turn (Exceeded max questions)
    const maxQuestions = track.questionConfig?.maxQuestions || 5;
    if (questionNumber > maxQuestions) {
      return {
        replyText: `Thank you for completing all questions. That concludes our practice interview! I am now analyzing your responses to generate your detailed feedback report.`,
        isConcluding: true,
        usage: { inputTokens: 120, outputTokens: 30 }
      };
    }

    // 3. Follow-up turn
    if (isFollowUp) {
      return {
        replyText: `Understood. In that context, how did you verify that your solution satisfied requirements without introducing performance bottlenecks or edge-case regressions?`,
        isConcluding: false,
        usage: { inputTokens: 180, outputTokens: 32 }
      };
    }

    // 4. Next Question turn
    const questionBank = [
      `Could you describe your strategy for ensuring data consistency and fault tolerance in a distributed environment?`,
      `How do you prioritize non-functional requirements such as security, maintainability, and observability when building features?`,
      `Can you discuss a time when you received critical feedback on an implementation, and how you adapted your approach?`,
      `How would you design a rate limiter to protect backend services from abusive traffic patterns?`,
      `What methodologies do you use to test complex systems end-to-end and prevent regressions in production?`
    ];

    const qIdx = (questionNumber - 1) % questionBank.length;
    const nextQ = questionBank[qIdx];

    return {
      replyText: `Great, let's move on to the next topic. ${nextQ}`,
      isConcluding: false,
      usage: { inputTokens: 220, outputTokens: 38 }
    };
  }

  /**
   * Evaluates the completed interview transcript against the rubric.
   */
  async evaluate({ track, turns = [], simulateOutage = false, simulateMalformed = false }) {
    if (simulateOutage || process.env.SIMULATE_AI_OUTAGE === 'true') {
      throw new Error('AI Provider Evaluation Service Unavailable (Simulated Outage)');
    }

    if (simulateMalformed) {
      // Return invalid payload without dimensions to test validator rejection
      return {
        invalidData: true,
        summary: 'Bad output'
      };
    }

    const rubricConfig = track.rubricConfig || [];

    const dimensionScores = rubricConfig.map((r, idx) => {
      // Deterministic scoring: award 80% of max score
      const score = Math.round(r.maxScore * 0.8 * 10) / 10;
      return {
        dimension: r.dimension,
        score,
        maxScore: r.maxScore,
        strengths: [
          `Clear conceptual understanding of ${r.dimension.toLowerCase()}`,
          `Structured thought process and practical examples provided`
        ],
        improvements: [
          `Could include more quantifiable metrics and trade-off considerations`
        ]
      };
    });

    const rawOutput = {
      feedbackSummary: `The candidate demonstrated strong foundational knowledge for the ${track.roleCategory} role, with clear communication and structured responses across all questions.`,
      passed: true,
      dimensionScores,
      recommendations: [
        'Practice articulating trade-offs between speed and consistency under load',
        'Deepen familiarity with telemetry and observability metrics in production systems'
      ],
      disclaimer: REQUIRED_DISCLAIMER
    };

    // Validate using the schema validator
    return validateAiEvaluation(rawOutput, rubricConfig);
  }
}

export default MockAiProvider;
