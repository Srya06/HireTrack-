import mongoose from 'mongoose';
import { REFERRED_PARTICIPANT_STATUSES } from '../utils/constants.js';

const referredParticipantSchema = new mongoose.Schema(
  {
    organizationId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Organization',
      required: [true, 'Organization ID is required'],
      index: true
    },
    codeId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'AmbassadorReferralCode',
      required: [true, 'Referral code ID is required'],
      index: true
    },
    campaignId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'AmbassadorCampaign',
      required: [true, 'Campaign ID is required'],
      index: true
    },
    ambassadorProfileId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'AmbassadorProfile',
      required: [true, 'Ambassador profile ID is required'],
      index: true
    },
    name: {
      type: String,
      required: [true, 'Participant name is required'],
      trim: true,
      maxlength: [100, 'Name cannot exceed 100 characters']
    },
    email: {
      type: String,
      required: [true, 'Participant email is required'],
      trim: true,
      lowercase: true
    },
    phone: {
      type: String,
      required: [true, 'Participant phone number is required'],
      trim: true
    },
    institute: {
      type: String,
      required: [true, 'Participant institute / college is required'],
      trim: true,
      maxlength: [150, 'Institute cannot exceed 150 characters']
    },
    dedupeKey: {
      type: String,
      required: [true, 'Deduplication key is required'],
      index: true
    },
    verificationStatus: {
      type: String,
      enum: Object.values(REFERRED_PARTICIPANT_STATUSES),
      default: REFERRED_PARTICIPANT_STATUSES.PENDING,
      index: true
    },
    reason: {
      type: String,
      trim: true,
      default: null
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
    notes: {
      type: String,
      trim: true,
      maxlength: [500, 'Notes cannot exceed 500 characters']
    },
    ipAddress: {
      type: String,
      default: null
    },
    userAgent: {
      type: String,
      default: null
    }
  },
  {
    timestamps: true
  }
);

referredParticipantSchema.index({ organizationId: 1, campaignId: 1, verificationStatus: 1 });
referredParticipantSchema.index({ campaignId: 1, dedupeKey: 1 });

const ReferredParticipant = mongoose.model('ReferredParticipant', referredParticipantSchema);

export default ReferredParticipant;
export { ReferredParticipant };

