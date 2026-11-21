import mongoose from 'mongoose';
import { MOCK_TEST_ATTEMPT_STATUSES } from '../utils/constants.js';

const topicAnalyticSchema = new mongoose.Schema(
  {
    topicTag: { type: String, required: true },
    totalQuestions: { type: Number, default: 0 },
    correct: { type: Number, default: 0 },
    incorrect: { type: Number, default: 0 },
    unattempted: { type: Number, default: 0 },
    score: { type: Number, default: 0 },
    maxScore: { type: Number, default: 0 }
  },
  { _id: false }
);

const mockTestAttemptSchema = new mongoose.Schema(
  {
    organizationId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Organization',
      required: [true, 'Organization ID is required'],
      index: true
    },
    mockTestId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'MockTest',
      required: [true, 'Mock test ID is required'],
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
      index: true
    },
    testVersion: {
      type: Number,
      required: true,
      default: 1
    },
    attemptNumber: {
      type: Number,
      required: true,
      default: 1
    },
    startedAt: {
      type: Date,
      default: Date.now,
      required: true
    },
    deadlineAt: {
      type: Date,
      required: true,
      index: true
    },
    submittedAt: {
      type: Date
    },
    status: {
      type: String,
      enum: Object.values(MOCK_TEST_ATTEMPT_STATUSES),
      default: MOCK_TEST_ATTEMPT_STATUSES.IN_PROGRESS,
      index: true
    },
    questionOrder: {
      type: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Question' }],
      default: []
    },
    optionOrder: {
      type: Map,
      of: [String],
      default: {}
    },
    scoringSnapshot: {
      type: mongoose.Schema.Types.Mixed,
      default: {}
    },
    reviewPolicy: {
      type: String,
      default: 'IMMEDIATE'
    },
    score: {
      type: Number,
      default: 0
    },
    maxScore: {
      type: Number,
      default: 0
    },
    percentage: {
      type: Number,
      default: 0
    },
    passed: {
      type: Boolean,
      default: false
    },
    timeTakenSeconds: {
      type: Number,
      default: 0
    },
    topicAnalytics: {
      type: [topicAnalyticSchema],
      default: []
    },
    idempotencyKey: {
      type: String,
      sparse: true,
      index: true
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

mockTestAttemptSchema.virtual('orgId').get(function () {
  return this.organizationId;
});

// Compound Indexes
mockTestAttemptSchema.index({ organizationId: 1, studentId: 1, mockTestId: 1 });
mockTestAttemptSchema.index({ organizationId: 1, mockTestId: 1, status: 1 });
mockTestAttemptSchema.index({ organizationId: 1, status: 1, deadlineAt: 1 });

export const MockTestAttempt = mongoose.model('MockTestAttempt', mockTestAttemptSchema);

