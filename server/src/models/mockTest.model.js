import mongoose from 'mongoose';
import {
  MOCK_TEST_STATUSES,
  MOCK_TEST_REVIEW_POLICIES,
  QUESTION_SELECTION_MODES
} from '../utils/constants.js';

const questionSelectionConfigSchema = new mongoose.Schema(
  {
    mode: {
      type: String,
      enum: Object.values(QUESTION_SELECTION_MODES),
      default: QUESTION_SELECTION_MODES.MANUAL
    },
    bankId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'QuestionBank'
    },
    count: {
      type: Number,
      default: 0,
      min: 0
    },
    difficultyDistribution: {
      easy: { type: Number, default: 0, min: 0 },
      medium: { type: Number, default: 0, min: 0 },
      hard: { type: Number, default: 0, min: 0 }
    },
    topicTags: {
      type: [String],
      default: []
    },
    questionIds: {
      type: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Question' }],
      default: []
    }
  },
  { _id: false }
);

const sectionSchema = new mongoose.Schema(
  {
    sectionId: {
      type: String,
      required: true,
      trim: true
    },
    name: {
      type: String,
      required: [true, 'Section name is required'],
      trim: true
    },
    durationMinutes: {
      type: Number,
      min: 1
    },
    questionSelectionConfig: {
      type: questionSelectionConfigSchema,
      default: () => ({})
    },
    marksPerQuestion: {
      type: Number,
      default: 1,
      min: [0.1, 'Marks per question must be greater than 0']
    },
    negativeMarksPerQuestion: {
      type: Number,
      default: 0,
      min: [0, 'Negative marks cannot be negative']
    }
  },
  { _id: false }
);

const scoringConfigSchema = new mongoose.Schema(
  {
    defaultCorrectMarks: {
      type: Number,
      default: 1,
      min: [0.1, 'Default correct marks must be greater than 0']
    },
    enableNegativeMarking: {
      type: Boolean,
      default: false
    },
    defaultNegativeMarks: {
      type: Number,
      default: 0,
      min: [0, 'Default negative marks cannot be negative']
    },
    passMarks: {
      type: Number,
      default: 0,
      min: 0
    }
  },
  { _id: false }
);

const mockTestSchema = new mongoose.Schema(
  {
    organizationId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Organization',
      required: [true, 'Organization ID is required'],
      index: true
    },
    title: {
      type: String,
      required: [true, 'Test title is required'],
      trim: true
    },
    description: {
      type: String,
      trim: true,
      default: ''
    },
    instructions: {
      type: String,
      trim: true,
      default: ''
    },
    categoryId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'TestCategory',
      index: true
    },
    durationMinutes: {
      type: Number,
      required: [true, 'Duration in minutes is required'],
      min: [1, 'Duration must be at least 1 minute']
    },
    attemptLimit: {
      type: Number,
      default: 1,
      min: [1, 'Attempt limit must be at least 1']
    },
    reviewPolicy: {
      type: String,
      enum: Object.values(MOCK_TEST_REVIEW_POLICIES),
      default: MOCK_TEST_REVIEW_POLICIES.IMMEDIATE
    },
    status: {
      type: String,
      enum: Object.values(MOCK_TEST_STATUSES),
      default: MOCK_TEST_STATUSES.DRAFT,
      index: true
    },
    version: {
      type: Number,
      default: 1,
      min: 1
    },
    scoringConfig: {
      type: scoringConfigSchema,
      default: () => ({})
    },
    sections: {
      type: [sectionSchema],
      default: []
    },
    publishedAt: {
      type: Date
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    }
  },
  {
    timestamps: true,
    toJSON: {
      virtuals: true,
      transform: (doc, ret) => {
        delete ret.__v;
        return ret;
      }
    }
  }
);

mockTestSchema.virtual('orgId').get(function () {
  return this.organizationId;
});

// Computed virtual: totalQuestions
mockTestSchema.virtual('totalQuestions').get(function () {
  if (!this.sections || !this.sections.length) return 0;
  return this.sections.reduce((sum, sec) => {
    const config = sec.questionSelectionConfig;
    if (config?.mode === QUESTION_SELECTION_MODES.MANUAL && config?.questionIds?.length) {
      return sum + config.questionIds.length;
    }
    return sum + (config?.count || 0);
  }, 0);
});

// Computed virtual: totalMarks
mockTestSchema.virtual('totalMarks').get(function () {
  if (!this.sections || !this.sections.length) return 0;
  return this.sections.reduce((sum, sec) => {
    const marks = sec.marksPerQuestion || this.scoringConfig?.defaultCorrectMarks || 1;
    const config = sec.questionSelectionConfig;
    const count =
      config?.mode === QUESTION_SELECTION_MODES.MANUAL && config?.questionIds?.length
        ? config.questionIds.length
        : config?.count || 0;
    return sum + count * marks;
  }, 0);
});

// Indexes
mockTestSchema.index({ organizationId: 1, status: 1 });
mockTestSchema.index({ organizationId: 1, categoryId: 1 });

export const MockTest = mongoose.model('MockTest', mockTestSchema);
