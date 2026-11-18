import mongoose from 'mongoose';
import { MEMBERSHIP_ROLES, MEMBERSHIP_STATUSES } from '../utils/constants.js';

const organizationMembershipSchema = new mongoose.Schema(
  {
    organizationId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Organization',
      required: [true, 'Organization ID is required'],
      index: true
    },
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'User ID is required'],
      index: true
    },
    role: {
      type: String,
      enum: {
        values: Object.values(MEMBERSHIP_ROLES),
        message: '{VALUE} is not a valid organization membership role'
      },
      required: [true, 'Membership role is required'],
      index: true
    },
    status: {
      type: String,
      enum: {
        values: Object.values(MEMBERSHIP_STATUSES),
        message: '{VALUE} is not a valid membership status'
      },
      default: MEMBERSHIP_STATUSES.ACTIVE,
      index: true
    },
    grantedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null
    },
    grantedAt: {
      type: Date,
      default: Date.now
    },
    revokedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null
    },
    revokedAt: {
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

// Unique invariant: one membership record per (organizationId, userId, role)
organizationMembershipSchema.index({ organizationId: 1, userId: 1, role: 1 }, { unique: true });
organizationMembershipSchema.index({ userId: 1, status: 1 });
organizationMembershipSchema.index({ organizationId: 1, role: 1, status: 1 });

export const OrganizationMembership = mongoose.model(
  'OrganizationMembership',
  organizationMembershipSchema
);
