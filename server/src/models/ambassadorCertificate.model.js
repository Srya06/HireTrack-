import mongoose from 'mongoose';
import { AMBASSADOR_CERTIFICATE_STATUSES } from '../utils/constants.js';

const ambassadorCertificateSchema = new mongoose.Schema(
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
    status: {
      type: String,
      enum: Object.values(AMBASSADOR_CERTIFICATE_STATUSES),
      default: AMBASSADOR_CERTIFICATE_STATUSES.ELIGIBLE,
      index: true
    },
    certificateNumber: {
      type: String,
      unique: true,
      sparse: true,
      trim: true
    },
    certificateObjectKey: {
      type: String,
      default: null
    },
    metadata: {
      recipientName: { type: String, trim: true },
      recipientCollege: { type: String, trim: true },
      campaignName: { type: String, trim: true },
      verifiedCount: { type: Number, default: 0 },
      targetCount: { type: Number, default: 0 },
      issuedAt: { type: Date, default: null },
      includeBranding: { type: Boolean, default: false } // Never include logo/branding unless configured by org
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
    issuedAt: {
      type: Date,
      default: null
    },
    rejectedReason: {
      type: String,
      trim: true,
      default: null
    }
  },
  {
    timestamps: true
  }
);

ambassadorCertificateSchema.index(
  { organizationId: 1, ambassadorProfileId: 1, campaignId: 1 },
  { unique: true }
);

const AmbassadorCertificate = mongoose.model('AmbassadorCertificate', ambassadorCertificateSchema);

export default AmbassadorCertificate;
export { AmbassadorCertificate };

