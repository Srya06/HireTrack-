import mongoose from 'mongoose';
import { HUMAN_INTERVIEW_EVALUATION_STATUSES } from '../utils/constants.js';

const rubricScoreSchema = new mongoose.Schema(
  {
    dimension: {
      type: String,
      required: true,
      trim: true
    },
    score: {
      type: Number,
      required: true,
      min: 0
    },
    maxScore: {
      type: Number,
      required: true,
      min: 1
    },
    feedback: {
      type: String,
      trim: true,
      default: ''
    }
  },
  { _id: false }
);

const humanInterviewEvaluationSchema = new mongoose.Schema(
  {
    organizationId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Organization',
      required: [true, 'Organization ID is required'],
      index: true
    },
    bookingId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'HumanMockInterviewBooking',
      required: [true, 'Booking ID is required'],
      unique: true,
      index: true
    },
    interviewerProfileId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'InterviewerProfile',
      required: [true, 'Interviewer profile ID is required'],
      index: true
    },
    evaluatedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'Evaluator user ID is required']
    },
    rubricScores: {
      type: [rubricScoreSchema],
      default: []
    },
    strengths: {
      type: [String],
      default: []
    },
    improvementAreas: {
      type: [String],
      default: []
    },
    overallFeedback: {
      type: String,
      trim: true,
      maxlength: [5000, 'Overall feedback cannot exceed 5000 characters'],
      default: ''
    },
    overallScore: {
      type: Number,
      min: 0,
      max: 100,
      default: 0
    },
    status: {
      type: String,
      enum: Object.values(HUMAN_INTERVIEW_EVALUATION_STATUSES),
      default: HUMAN_INTERVIEW_EVALUATION_STATUSES.DRAFT,
      index: true
    },
    disclaimer: {
      type: String,
      default: 'Human-evaluated practice guidance, not an employer decision'
    },
    submittedAt: {
      type: Date,
      default: null
    },
    releasedAt: {
      type: Date,
      default: null
    },
    releasedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null
    }
  },
  {
    timestamps: true,
    toJSON: {
      transform(doc, ret) {
        ret.id = ret._id;
        delete ret._id;
        delete ret.__v;
        return ret;
      }
    }
  }
);

humanInterviewEvaluationSchema.index({ organizationId: 1, status: 1 });

export const HumanInterviewEvaluation = mongoose.model(
  'HumanInterviewEvaluation',
  humanInterviewEvaluationSchema
);

