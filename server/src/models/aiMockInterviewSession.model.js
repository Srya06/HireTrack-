import mongoose from 'mongoose';
import { AI_INTERVIEW_SESSION_STATUSES } from '../utils/constants.js';

const dimensionScoreSchema = new mongoose.Schema(
  {
    dimension: {
      type: String,
      required: true
    },
    score: {
      type: Number,
      required: true
    },
    maxScore: {
      type: Number,
      required: true
    },
    strengths: {
      type: [String],
      default: []
    },
    improvements: {
      type: [String],
      default: []
    }
  },
  { _id: false }
);

const evaluationSchema = new mongoose.Schema(
  {
    overallScore: {
      type: Number,
      required: true
    },
    maxScore: {
      type: Number,
      required: true
    },
    percentage: {
      type: Number,
      required: true
    },
    passed: {
      type: Boolean,
      required: true
    },
    feedbackSummary: {
      type: String,
      required: true
    },
    dimensionScores: {
      type: [dimensionScoreSchema],
      default: []
    },
    recommendations: {
      type: [String],
      default: []
    },
    disclaimer: {
      type: String,
      default: 'AI-generated practice guidance, not an employer decision'
    }
  },
  { _id: false }
);

const aiMockInterviewSessionSchema = new mongoose.Schema(
  {
    organizationId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Organization',
      required: [true, 'Organization ID is required'],
      index: true
    },
    studentId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'Student ID is required'],
      index: true
    },
    studentProfileId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'StudentProfile',
      default: null
    },
    trackId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'InterviewTrack',
      required: [true, 'Track ID is required'],
      index: true
    },
    status: {
      type: String,
      enum: Object.values(AI_INTERVIEW_SESSION_STATUSES),
      default: AI_INTERVIEW_SESSION_STATUSES.IN_PROGRESS,
      index: true
    },
    provider: {
      type: String,
      default: 'mock'
    },
    model: {
      type: String,
      default: 'mock-model'
    },
    promptVersion: {
      type: String,
      default: 'v1'
    },
    startedAt: {
      type: Date,
      default: Date.now
    },
    completedAt: {
      type: Date,
      default: null
    },
    feedbackReleasedAt: {
      type: Date,
      default: null
    },
    retentionExpiresAt: {
      type: Date,
      default: () => new Date(Date.now() + 90 * 24 * 60 * 60 * 1000) // 90 days retention hook
    },
    currentQuestionIndex: {
      type: Number,
      default: 1
    },
    currentFollowUpCount: {
      type: Number,
      default: 0
    },
    evaluation: {
      type: evaluationSchema,
      default: null
    },
    errorDetails: {
      type: String,
      default: null
    }
  },
  {
    timestamps: true
  }
);

aiMockInterviewSessionSchema.index({ organizationId: 1, studentId: 1, startedAt: -1 });
aiMockInterviewSessionSchema.index({ organizationId: 1, trackId: 1 });
aiMockInterviewSessionSchema.index({ studentId: 1, startedAt: -1 });
aiMockInterviewSessionSchema.index({ retentionExpiresAt: 1 });

const AiMockInterviewSession = mongoose.model('AiMockInterviewSession', aiMockInterviewSessionSchema);

export default AiMockInterviewSession;

