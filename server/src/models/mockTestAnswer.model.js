import mongoose from 'mongoose';

const mockTestAnswerSchema = new mongoose.Schema(
  {
    organizationId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Organization',
      required: [true, 'Organization ID is required'],
      index: true
    },
    attemptId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'MockTestAttempt',
      required: [true, 'Attempt ID is required'],
      index: true
    },
    questionId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Question',
      required: [true, 'Question ID is required'],
      index: true
    },
    studentId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'Student ID is required'],
      index: true
    },
    selectedOptions: {
      type: [String],
      default: []
    },
    textAnswer: {
      type: String,
      trim: true,
      default: ''
    },
    savedAt: {
      type: Date,
      default: Date.now,
      required: true
    },
    isCorrect: {
      type: Boolean,
      default: null
    },
    marksAwarded: {
      type: Number,
      default: 0
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

mockTestAnswerSchema.virtual('orgId').get(function () {
  return this.organizationId;
});

// Enforce unique answer record per (attemptId, questionId)
mockTestAnswerSchema.index({ attemptId: 1, questionId: 1 }, { unique: true });
mockTestAnswerSchema.index({ organizationId: 1, attemptId: 1 });

export const MockTestAnswer = mongoose.model('MockTestAnswer', mockTestAnswerSchema);
