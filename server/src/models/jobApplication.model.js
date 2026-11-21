import mongoose from 'mongoose';
import {
  JOB_APPLICATION_STATUSES,
  JOB_APPLICATION_VERIFICATION
} from '../utils/constants.js';

const statusHistorySchema = new mongoose.Schema(
  {
    status: {
      type: String,
      enum: Object.values(JOB_APPLICATION_STATUSES),
      required: true
    },
    changedAt: {
      type: Date,
      default: Date.now
    },
    notes: {
      type: String,
      maxlength: [500, 'Notes cannot exceed 500 characters'],
      trim: true
    },
    changedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    }
  },
  { _id: false }
);

const jobApplicationSchema = new mongoose.Schema(
  {
    organizationId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Organization',
      required: [true, 'Organization ID is required'],
      index: true
    },
    studentProfileId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'StudentProfile',
      required: [true, 'Student profile ID is required'],
      index: true
    },
    studentId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'Student user ID is required'],
      index: true
    },
    jobOpportunityId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'JobOpportunity',
      required: [true, 'Job opportunity ID is required'],
      index: true
    },
    status: {
      type: String,
      enum: Object.values(JOB_APPLICATION_STATUSES),
      default: JOB_APPLICATION_STATUSES.APPLIED,
      required: true
    },
    applicationDate: {
      type: Date,
      default: Date.now
    },
    notes: {
      type: String,
      maxlength: [500, 'Notes cannot exceed 500 characters'],
      trim: true,
      default: ''
    },
    verificationStatus: {
      type: String,
      enum: Object.values(JOB_APPLICATION_VERIFICATION),
      default: JOB_APPLICATION_VERIFICATION.UNVERIFIED,
      required: true
    },
    verificationReason: {
      type: String,
      trim: true,
      default: ''
    },
    verifiedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null
    },
    verifiedAt: {
      type: Date,
      default: null
    },
    clickCount: {
      type: Number,
      default: 0
    },
    lastClickedAt: {
      type: Date,
      default: null
    },
    statusHistory: {
      type: [statusHistorySchema],
      default: []
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

// Virtual alias: orgId <-> organizationId
jobApplicationSchema.virtual('orgId').get(function () {
  return this.organizationId;
});

// Unique compound index: one current record per (studentProfileId, jobOpportunityId)
jobApplicationSchema.index(
  { studentProfileId: 1, jobOpportunityId: 1 },
  { unique: true }
);

jobApplicationSchema.index({ organizationId: 1, studentId: 1, applicationDate: -1 });
jobApplicationSchema.index({ organizationId: 1, jobOpportunityId: 1, status: 1 });
jobApplicationSchema.index({ organizationId: 1, verificationStatus: 1 });

export const JobApplication = mongoose.model('JobApplication', jobApplicationSchema);
