import mongoose from 'mongoose';

const institutePolicySchema = new mongoose.Schema(
  {
    organizationId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Organization',
      required: [true, 'Organization ID is required'],
      index: true
    },
    policyKey: {
      type: String,
      required: [true, 'Policy key is required'],
      trim: true,
      index: true
    },
    value: {
      type: mongoose.Schema.Types.Mixed,
      default: {}
    },
    updatedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
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

institutePolicySchema.index({ organizationId: 1, policyKey: 1 }, { unique: true });

export const InstitutePolicy = mongoose.model('InstitutePolicy', institutePolicySchema);

