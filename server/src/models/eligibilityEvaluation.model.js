import mongoose from 'mongoose';
import { ELIGIBILITY_STATUSES, ELIGIBILITY_ENGINE_VERSION } from '../utils/constants.js';

const eligibilityEvaluationSchema = new mongoose.Schema(
  {
    organizationId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Organization',
      required: [true, 'Organization ID is required'],
      index: true
    },
    opportunityId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'JobOpportunity',
      required: [true, 'Opportunity ID is required'],
      index: true
    },
    studentId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'Student User ID is required'],
      index: true
    },
    studentProfileId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'StudentProfile'
    },
    criteriaVersion: {
      type: Number,
      required: true,
      default: 1
    },
    engineVersion: {
      type: String,
      required: true,
      default: ELIGIBILITY_ENGINE_VERSION
    },
    status: {
      type: String,
      enum: Object.values(ELIGIBILITY_STATUSES),
      required: true
    },
    snapshot: {
      matched: { type: [String], default: [] },
      unmet: { type: [String], default: [] },
      missing: { type: [String], default: [] },
      preferred: { type: [mongoose.Schema.Types.Mixed], default: [] },
      perCriterion: { type: [mongoose.Schema.Types.Mixed], default: [] },
      disclaimer: { type: String, default: '' },
      profileUpdatedAt: { type: Date }
    },
    evaluatedAt: {
      type: Date,
      default: Date.now,
      index: true
    },
    override: {
      isOverridden: {
        type: Boolean,
        default: false
      },
      overrideStatus: {
        type: String,
        enum: Object.values(ELIGIBILITY_STATUSES)
      },
      reason: {
        type: String,
        trim: true
      },
      overriddenBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
      },
      overriddenAt: {
        type: Date
      }
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

// Compound Indexes for fast retrieval and snapshot deduplication
eligibilityEvaluationSchema.index({
  organizationId: 1,
  opportunityId: 1,
  studentId: 1,
  criteriaVersion: 1
});
eligibilityEvaluationSchema.index({ organizationId: 1, opportunityId: 1, evaluatedAt: -1 });
eligibilityEvaluationSchema.index({ organizationId: 1, studentId: 1, evaluatedAt: -1 });

export const EligibilityEvaluation = mongoose.model(
  'EligibilityEvaluation',
  eligibilityEvaluationSchema
);
