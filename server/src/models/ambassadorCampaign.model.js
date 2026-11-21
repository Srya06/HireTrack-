import mongoose from 'mongoose';
import { AMBASSADOR_CAMPAIGN_STATUSES } from '../utils/constants.js';

const ambassadorCampaignSchema = new mongoose.Schema(
  {
    organizationId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Organization',
      required: [true, 'Organization ID is required'],
      index: true
    },
    name: {
      type: String,
      required: [true, 'Campaign name is required'],
      trim: true,
      maxlength: [120, 'Campaign name cannot exceed 120 characters']
    },
    description: {
      type: String,
      trim: true,
      maxlength: [1000, 'Description cannot exceed 1000 characters']
    },
    targetCount: {
      type: Number,
      required: [true, 'Target referral count is required'],
      min: [1, 'Target count must be at least 1'],
      default: 10
    },
    startsAt: {
      type: Date,
      required: [true, 'Campaign start date is required']
    },
    endsAt: {
      type: Date,
      required: [true, 'Campaign end date is required']
    },
    verificationRules: {
      requireContactVerified: {
        type: Boolean,
        default: true
      },
      requireValidInstitute: {
        type: Boolean,
        default: true
      },
      requireQualifyingActivity: {
        type: Boolean,
        default: false
      }
    },
    status: {
      type: String,
      enum: Object.values(AMBASSADOR_CAMPAIGN_STATUSES),
      default: AMBASSADOR_CAMPAIGN_STATUSES.ACTIVE,
      index: true
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'Creator user ID is required']
    }
  },
  {
    timestamps: true
  }
);

ambassadorCampaignSchema.index({ organizationId: 1, status: 1 });

const AmbassadorCampaign = mongoose.model('AmbassadorCampaign', ambassadorCampaignSchema);

export default AmbassadorCampaign;
export { AmbassadorCampaign };

