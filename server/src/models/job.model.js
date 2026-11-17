import mongoose from 'mongoose';
import { JOB_STATUSES, EMPLOYMENT_TYPES } from '../utils/constants.js';

const jobSchema = new mongoose.Schema(
  {
    recruiterId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'Recruiter ID is required'],
      index: true
    },
    title: {
      type: String,
      required: [true, 'Job title is required'],
      trim: true,
      maxlength: [150, 'Job title cannot exceed 150 characters']
    },
    companyName: {
      type: String,
      required: [true, 'Company name is required'],
      trim: true,
      maxlength: [150, 'Company name cannot exceed 150 characters']
    },
    description: {
      type: String,
      required: [true, 'Job description is required'],
      trim: true
    },
    location: {
      type: String,
      required: [true, 'Location is required'],
      trim: true
    },
    employmentType: {
      type: String,
      enum: {
        values: [
          EMPLOYMENT_TYPES.FULL_TIME,
          EMPLOYMENT_TYPES.INTERNSHIP,
          EMPLOYMENT_TYPES.CONTRACT,
          EMPLOYMENT_TYPES.OTHER
        ],
        message: '{VALUE} is not a valid employment type'
      },
      default: EMPLOYMENT_TYPES.FULL_TIME
    },
    ctc: {
      type: String,
      trim: true,
      default: ''
    },
    minCgpa: {
      type: Number,
      min: [0, 'Minimum CGPA cannot be negative'],
      max: [10, 'Minimum CGPA cannot exceed 10.0'],
      default: null
    },
    eligibleBranches: {
      type: [String],
      default: [] // Empty means all branches are eligible
    },
    eligibleGraduationYears: {
      type: [Number],
      default: [] // Empty means all graduation years are eligible
    },
    requiredSkills: {
      type: [String],
      default: []
    },
    applicationDeadline: {
      type: Date,
      required: [true, 'Application deadline is required'],
      index: true
    },
    status: {
      type: String,
      enum: {
        values: [
          JOB_STATUSES.DRAFT,
          JOB_STATUSES.PUBLISHED,
          JOB_STATUSES.CLOSED,
          JOB_STATUSES.ARCHIVED
        ],
        message: '{VALUE} is not a valid job status'
      },
      default: JOB_STATUSES.DRAFT,
      index: true
    },
    adminReviewStatus: {
      type: String,
      enum: ['not_required', 'pending', 'approved', 'rejected'],
      default: 'not_required'
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

// Indexes per DATABASE_SCHEMA.md
jobSchema.index({ status: 1, applicationDeadline: 1 });
jobSchema.index({ recruiterId: 1, createdAt: -1 });

export const Job = mongoose.model('Job', jobSchema);

