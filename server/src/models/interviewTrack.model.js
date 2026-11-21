import mongoose from 'mongoose';
import { INTERVIEW_TRACK_TYPES, INTERVIEW_TRACK_STATUSES } from '../utils/constants.js';

const rubricDimensionSchema = new mongoose.Schema(
  {
    dimension: {
      type: String,
      required: [true, 'Rubric dimension name is required'],
      trim: true
    },
    maxScore: {
      type: Number,
      required: true,
      default: 10,
      min: 1
    },
    description: {
      type: String,
      trim: true,
      default: ''
    },
    criteria: {
      type: [String],
      default: []
    }
  },
  { _id: false }
);

const questionConfigSchema = new mongoose.Schema(
  {
    maxQuestions: {
      type: Number,
      default: 5,
      min: 1,
      max: 20
    },
    maxFollowUps: {
      type: Number,
      default: 1,
      min: 0,
      max: 3
    },
    maxTurnChars: {
      type: Number,
      default: 1000,
      min: 100,
      max: 4000
    }
  },
  { _id: false }
);

const interviewTrackSchema = new mongoose.Schema(
  {
    organizationId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Organization',
      required: [true, 'Organization ID is required'],
      index: true
    },
    title: {
      type: String,
      required: [true, 'Interview track title is required'],
      trim: true
    },
    roleCategory: {
      type: String,
      required: [true, 'Role category is required'],
      trim: true
    },
    description: {
      type: String,
      trim: true,
      default: ''
    },
    interviewType: {
      type: String,
      enum: Object.values(INTERVIEW_TRACK_TYPES),
      default: INTERVIEW_TRACK_TYPES.AI,
      index: true
    },
    questionConfig: {
      type: questionConfigSchema,
      default: () => ({})
    },
    rubricConfig: {
      type: [rubricDimensionSchema],
      default: () => [
        {
          dimension: 'Technical Competence',
          maxScore: 10,
          description: 'Depth and accuracy of domain-specific technical concepts and solutions.',
          criteria: ['Accurate concepts', 'Appropriate depth']
        },
        {
          dimension: 'Problem Solving & Structure',
          maxScore: 10,
          description: 'Clarity in structuring thoughts, breaking down problems, and trade-off analysis.',
          criteria: ['Structured communication', 'Trade-off analysis']
        },
        {
          dimension: 'Communication & Delivery',
          maxScore: 10,
          description: 'Conciseness, clarity, active listening, and professional articulation.',
          criteria: ['Concise answers', 'Professional tone']
        }
      ]
    },
    status: {
      type: String,
      enum: Object.values(INTERVIEW_TRACK_STATUSES),
      default: INTERVIEW_TRACK_STATUSES.ACTIVE,
      index: true
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true
    }
  },
  {
    timestamps: true
  }
);

interviewTrackSchema.index({ organizationId: 1, status: 1, interviewType: 1 });
interviewTrackSchema.index({ organizationId: 1, roleCategory: 1 });

const InterviewTrack = mongoose.model('InterviewTrack', interviewTrackSchema);

export default InterviewTrack;
