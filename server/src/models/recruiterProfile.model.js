import mongoose from 'mongoose';
import { RECRUITER_APPROVAL_STATUSES } from '../utils/constants.js';

const recruiterProfileSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'User ID is required'],
      unique: true,
      index: true
    },
    companyName: {
      type: String,
      required: [true, 'Company name is required'],
      trim: true,
      maxlength: [150, 'Company name cannot exceed 150 characters']
    },
    website: {
      type: String,
      trim: true,
      default: ''
    },
    designation: {
      type: String,
      trim: true,
      default: ''
    },
    contactPhone: {
      type: String,
      trim: true,
      default: ''
    },
    description: {
      type: String,
      trim: true,
      maxlength: [2000, 'Description cannot exceed 2000 characters'],
      default: ''
    },
    approvalStatus: {
      type: String,
      enum: {
        values: [
          RECRUITER_APPROVAL_STATUSES.PENDING,
          RECRUITER_APPROVAL_STATUSES.APPROVED,
          RECRUITER_APPROVAL_STATUSES.REJECTED
        ],
        message: '{VALUE} is not a valid recruiter approval status'
      },
      default: RECRUITER_APPROVAL_STATUSES.PENDING
    },
    reviewedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null
    },
    reviewedAt: {
      type: Date,
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

// Index for recruiter approvals list
recruiterProfileSchema.index({ approvalStatus: 1, createdAt: -1 });

export const RecruiterProfile = mongoose.model('RecruiterProfile', recruiterProfileSchema);

