import mongoose from 'mongoose';

const ambassadorReferralCodeSchema = new mongoose.Schema(
  {
    organizationId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Organization',
      required: [true, 'Organization ID is required'],
      index: true
    },
    ambassadorProfileId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'AmbassadorProfile',
      required: [true, 'Ambassador profile ID is required'],
      index: true
    },
    campaignId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'AmbassadorCampaign',
      required: [true, 'Campaign ID is required'],
      index: true
    },
    code: {
      type: String,
      required: [true, 'Referral code is required'],
      unique: true,
      trim: true,
      uppercase: true
    },
    active: {
      type: Boolean,
      default: true,
      index: true
    }
  },
  {
    timestamps: true
  }
);

ambassadorReferralCodeSchema.index(
  { organizationId: 1, ambassadorProfileId: 1, campaignId: 1 },
  { unique: true }
);

const AmbassadorReferralCode = mongoose.model('AmbassadorReferralCode', ambassadorReferralCodeSchema);

export default AmbassadorReferralCode;
export { AmbassadorReferralCode };

