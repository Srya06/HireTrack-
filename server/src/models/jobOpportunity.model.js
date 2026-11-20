import mongoose from 'mongoose';
import {
  OPPORTUNITY_STATUSES,
  OPPORTUNITY_WORK_MODES,
  CRITERIA_TYPES,
  CRITERIA_OPERATORS
} from '../utils/constants.js';

const criteriaSubdocumentSchema = new mongoose.Schema(
  {
    type: {
      type: String,
      enum: {
        values: Object.values(CRITERIA_TYPES),
        message: '{VALUE} is not a valid criteria type'
      },
      required: [true, 'Criteria type is required']
    },
    operator: {
      type: String,
      enum: {
        values: Object.values(CRITERIA_OPERATORS),
        message: '{VALUE} is not a valid criteria operator'
      },
      default: CRITERIA_OPERATORS.EQUALS
    },
    value: {
      type: mongoose.Schema.Types.Mixed,
      required: [true, 'Criteria value is required']
    },
    isHardRequirement: {
      type: Boolean,
      default: true
    },
    displayLabel: {
      type: String,
      trim: true,
      default: ''
    },
    sortOrder: {
      type: Number,
      default: 0
    }
  },
  { _id: true }
);

const jobOpportunitySchema = new mongoose.Schema(
  {
    organizationId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Organization',
      required: [true, 'Organization ID is required'],
      index: true
    },
    companyName: {
      type: String,
      required: [true, 'Company name is required'],
      trim: true,
      minlength: [1, 'Company name must not be empty'],
      maxlength: [120, 'Company name cannot exceed 120 characters']
    },
    jobTitle: {
      type: String,
      required: [true, 'Job title is required'],
      trim: true,
      minlength: [1, 'Job title must not be empty'],
      maxlength: [150, 'Job title cannot exceed 150 characters']
    },
    employerJobId: {
      type: String,
      trim: true,
      default: null,
      maxlength: [100, 'Employer Job ID cannot exceed 100 characters']
    },
    description: {
      type: String,
      required: [true, 'Job description is required'],
      trim: true
    },
    location: {
      type: String,
      trim: true,
      default: 'Multiple / Remote',
      maxlength: [150, 'Location cannot exceed 150 characters']
    },
    workMode: {
      type: String,
      enum: {
        values: Object.values(OPPORTUNITY_WORK_MODES),
        message: '{VALUE} is not a valid work mode'
      },
      default: OPPORTUNITY_WORK_MODES.ON_SITE
    },
    compensationText: {
      type: String,
      trim: true,
      default: '',
      maxlength: [150, 'Compensation text cannot exceed 150 characters']
    },
    applicationUrl: {
      type: String,
      trim: true,
      default: null
    },
    applicationInstructions: {
      type: String,
      trim: true,
      default: ''
    },
    deadline: {
      type: Date,
      required: [true, 'Application deadline is required'],
      index: true
    },
    status: {
      type: String,
      enum: {
        values: Object.values(OPPORTUNITY_STATUSES),
        message: '{VALUE} is not a valid opportunity status'
      },
      default: OPPORTUNITY_STATUSES.DRAFT,
      index: true
    },
    sourceNote: {
      type: String,
      trim: true,
      default: '',
      maxlength: [500, 'Source note cannot exceed 500 characters']
    },
    sourceUrl: {
      type: String,
      trim: true,
      default: ''
    },
    lastVerifiedAt: {
      type: Date,
      default: null
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'Creator User ID is required']
    },
    criteriaVersion: {
      type: Number,
      default: 1
    },
    criteria: {
      type: [criteriaSubdocumentSchema],
      default: []
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

// Compound index for org-scoped opportunity listing & status/deadline queries
jobOpportunitySchema.index({ organizationId: 1, status: 1, deadline: 1 });
jobOpportunitySchema.index({ employerJobId: 1 }, { sparse: true });
jobOpportunitySchema.index({ organizationId: 1, createdAt: -1 });

/**
 * Computes effective status taking deadline expiry into account
 *
 * @param {Date} [now=new Date()]
 * @returns {string}
 */
jobOpportunitySchema.methods.getEffectiveStatus = function (now = new Date()) {
  if (this.status === OPPORTUNITY_STATUSES.PUBLISHED && this.deadline && this.deadline < now) {
    return OPPORTUNITY_STATUSES.EXPIRED;
  }
  return this.status;
};

/**
 * Extracts destination domain from applicationUrl
 *
 * @returns {string|null}
 */
jobOpportunitySchema.methods.getDestinationDomain = function () {
  if (!this.applicationUrl) return null;
  try {
    const parsed = new URL(this.applicationUrl);
    return parsed.hostname.toLowerCase();
  } catch {
    return null;
  }
};

export const JobOpportunity = mongoose.model('JobOpportunity', jobOpportunitySchema);
