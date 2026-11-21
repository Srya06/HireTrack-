import mongoose from 'mongoose';
import {
  QUESTION_TYPES,
  QUESTION_DIFFICULTIES,
  QUESTION_STATUSES
} from '../utils/constants.js';

const optionSchema = new mongoose.Schema(
  {
    optionId: {
      type: String,
      required: true,
      trim: true
    },
    text: {
      type: String,
      required: true,
      trim: true
    }
  },
  { _id: false }
);

const questionSchema = new mongoose.Schema(
  {
    organizationId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Organization',
      required: [true, 'Organization ID is required'],
      index: true
    },
    bankId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'QuestionBank',
      required: [true, 'Question bank ID is required'],
      index: true
    },
    type: {
      type: String,
      required: [true, 'Question type is required'],
      validate: {
        validator: function (v) {
          if (v === QUESTION_TYPES.CODING) {
            return false;
          }
          return [
            QUESTION_TYPES.SINGLE_CHOICE,
            QUESTION_TYPES.MULTI_SELECT,
            QUESTION_TYPES.SHORT_ANSWER
          ].includes(v);
        },
        message: function (props) {
          if (props.value === QUESTION_TYPES.CODING) {
            return 'CODING question type is not supported until a secure code execution sandbox is approved';
          }
          return `Invalid question type: ${props.value}`;
        }
      }
    },
    prompt: {
      type: String,
      required: [true, 'Question prompt is required'],
      trim: true
    },
    options: {
      type: [optionSchema],
      default: []
    },
    // answerKey and explanation use select: false for security
    answerKey: {
      type: mongoose.Schema.Types.Mixed,
      required: [true, 'Answer key is required'],
      select: false
    },
    explanation: {
      type: String,
      trim: true,
      default: '',
      select: false
    },
    difficulty: {
      type: String,
      enum: Object.values(QUESTION_DIFFICULTIES),
      default: QUESTION_DIFFICULTIES.MEDIUM,
      index: true
    },
    topicTags: {
      type: [String],
      default: [],
      index: true
    },
    status: {
      type: String,
      enum: Object.values(QUESTION_STATUSES),
      default: QUESTION_STATUSES.ACTIVE,
      index: true
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

questionSchema.virtual('orgId').get(function () {
  return this.organizationId;
});

// Explicit student-safe projection DTO allowlist
questionSchema.methods.toStudentDTO = function () {
  return {
    _id: this._id,
    id: this._id,
    bankId: this.bankId,
    type: this.type,
    prompt: this.prompt,
    options: (this.options || []).map((opt) => ({
      optionId: opt.optionId,
      text: opt.text
    })),
    difficulty: this.difficulty,
    topicTags: this.topicTags || []
  };
};

// Static helper to sanitize questions for students
questionSchema.statics.sanitizeForStudent = function (questionDoc) {
  if (!questionDoc) return null;
  const raw = typeof questionDoc.toObject === 'function' ? questionDoc.toObject() : questionDoc;
  return {
    _id: raw._id,
    id: raw._id,
    bankId: raw.bankId,
    type: raw.type,
    prompt: raw.prompt,
    options: (raw.options || []).map((opt) => ({
      optionId: opt.optionId,
      text: opt.text
    })),
    difficulty: raw.difficulty,
    topicTags: raw.topicTags || []
  };
};

// Indexes
questionSchema.index({ organizationId: 1, bankId: 1, status: 1 });
questionSchema.index({ organizationId: 1, difficulty: 1 });
questionSchema.index({ organizationId: 1, topicTags: 1 });

export const Question = mongoose.model('Question', questionSchema);

