import mongoose from 'mongoose';
import { AMBASSADOR_PROFILE_STATUSES } from '../utils/constants.js';

const ambassadorProfileSchema = new mongoose.Schema(
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
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'User ID is required'],
      index: true
    },
    status: {
      type: String,
      enum: Object.values(AMBASSADOR_PROFILE_STATUSES),
      default: AMBASSADOR_PROFILE_STATUSES.PENDING,
      index: true
    },
    applicationNotes: {
      type: String,
      trim: true,
      maxlength: [1000, 'Application statement cannot exceed 1000 characters']
    },
    approvedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null
    },
    approvedAt: {
      type: Date,
      default: null
    },
    rejectedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null
    },
    rejectedAt: {
      type: Date,
      default: null
    },
    rejectionReason: {
      type: String,
      trim: true,
      default: null
    },
    suspendedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null
    },
    suspendedAt: {
      type: Date,
      default: null
    },
    suspensionReason: {
      type: String,
      trim: true,
      default: null
    }
  },
  {
    timestamps: true
  }
);

ambassadorProfileSchema.index({ organizationId: 1, studentProfileId: 1 }, { unique: true });
ambassadorProfileSchema.index({ organizationId: 1, userId: 1 }, { unique: true });

const AmbassadorProfile = mongoose.model('AmbassadorProfile', ambassadorProfileSchema);

export default AmbassadorProfile;
export { AmbassadorProfile };

