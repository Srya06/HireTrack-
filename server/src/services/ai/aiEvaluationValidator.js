import { ApiError } from '../../utils/ApiError.js';
import { ERROR_CODES } from '../../utils/constants.js';

export const REQUIRED_DISCLAIMER = 'AI-generated practice guidance, not an employer decision';

/**
 * Validates and normalizes AI evaluation output against the track's rubricConfig schema.
 * Throws ApiError if output is malformed or invalid so invalid/fabricated results are never stored.
 *
 * @param {object} rawOutput - Output from AI provider
 * @param {Array<object>} rubricConfig - Rubric dimensions from InterviewTrack
 * @returns {object} Validated and normalized evaluation document
 */
export const validateAiEvaluation = (rawOutput, rubricConfig = []) => {
  if (!rawOutput || typeof rawOutput !== 'object') {
    throw ApiError.badRequest(
      'Malformed AI evaluation: Output must be a valid JSON object',
      [],
      ERROR_CODES.VALIDATION_ERROR
    );
  }

  const {
    feedbackSummary,
    dimensionScores,
    recommendations,
    disclaimer
  } = rawOutput;

  if (typeof feedbackSummary !== 'string' || feedbackSummary.trim().length < 10) {
    throw ApiError.badRequest(
      'Malformed AI evaluation: feedbackSummary must be a string of at least 10 characters',
      [],
      ERROR_CODES.VALIDATION_ERROR
    );
  }

  if (!Array.isArray(dimensionScores) || dimensionScores.length === 0) {
    throw ApiError.badRequest(
      'Malformed AI evaluation: dimensionScores must be a non-empty array',
      [],
      ERROR_CODES.VALIDATION_ERROR
    );
  }

  // Build rubric dimension map
  const rubricMap = new Map();
  let expectedTotalMaxScore = 0;
  for (const r of rubricConfig) {
    rubricMap.set(r.dimension.trim().toLowerCase(), r);
    expectedTotalMaxScore += r.maxScore;
  }

  let totalScore = 0;
  const validatedDimensions = [];

  for (const item of dimensionScores) {
    if (!item || typeof item !== 'object') {
      throw ApiError.badRequest('Malformed dimension item in AI evaluation', [], ERROR_CODES.VALIDATION_ERROR);
    }

    const dimName = String(item.dimension || '').trim();
    const rubricDim = rubricMap.get(dimName.toLowerCase());

    if (!rubricDim) {
      // Dimension doesn't match rubric
      throw ApiError.badRequest(
        `Malformed AI evaluation: Unknown dimension "${dimName}" not found in track rubric`,
        [],
        ERROR_CODES.VALIDATION_ERROR
      );
    }

    const score = Number(item.score);
    if (isNaN(score) || score < 0 || score > rubricDim.maxScore) {
      throw ApiError.badRequest(
        `Malformed AI evaluation: Score for "${dimName}" must be a number between 0 and ${rubricDim.maxScore}`,
        [],
        ERROR_CODES.VALIDATION_ERROR
      );
    }

    totalScore += score;

    validatedDimensions.push({
      dimension: rubricDim.dimension,
      score: Math.round(score * 10) / 10,
      maxScore: rubricDim.maxScore,
      strengths: Array.isArray(item.strengths)
        ? item.strengths.map((s) => String(s).trim()).filter(Boolean)
        : [],
      improvements: Array.isArray(item.improvements)
        ? item.improvements.map((s) => String(s).trim()).filter(Boolean)
        : []
    });
  }

  // Verify all rubric dimensions were covered
  if (validatedDimensions.length < rubricConfig.length) {
    throw ApiError.badRequest(
      'Malformed AI evaluation: Not all rubric dimensions were evaluated',
      [],
      ERROR_CODES.VALIDATION_ERROR
    );
  }

  totalScore = Math.round(totalScore * 10) / 10;
  const maxScore = expectedTotalMaxScore > 0 ? expectedTotalMaxScore : 10;
  const percentage = Math.round((totalScore / maxScore) * 100);
  const passed = rawOutput.passed !== undefined ? Boolean(rawOutput.passed) : percentage >= 60;

  const validatedRecommendations = Array.isArray(recommendations)
    ? recommendations.map((r) => String(r).trim()).filter(Boolean)
    : [];

  return {
    overallScore: totalScore,
    maxScore,
    percentage,
    passed,
    feedbackSummary: feedbackSummary.trim(),
    dimensionScores: validatedDimensions,
    recommendations: validatedRecommendations,
    disclaimer: REQUIRED_DISCLAIMER
  };
};
