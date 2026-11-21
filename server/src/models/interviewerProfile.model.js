import mongoose from 'mongoose';

const interviewerProfileSchema = new mongoose.Schema(
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
    expertise: {
      type: [String],
      default: []
    },
    bio: {
      type: String,
      trim: true,
      maxlength: [1000, 'Bio cannot exceed 1000 characters'],
      default: ''
    },
    availability: {
      weeklyHours: { type: Number, min: 0, default: 5 },
      preferredTimezone: { type: String, default: 'UTC' },
      notes: { type: String, default: '' }
    },
    isActive: {
      type: Boolean,
      default: true,
      index: true
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

// One interviewer profile per user per organization
interviewerProfileSchema.index({ organizationId: 1, userId: 1 }, { unique: true });

export const InterviewerProfile = mongoose.model('InterviewerProfile', interviewerProfileSchema);

