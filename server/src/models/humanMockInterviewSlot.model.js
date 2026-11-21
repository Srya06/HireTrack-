import mongoose from 'mongoose';
import { HUMAN_INTERVIEW_SLOT_STATUSES } from '../utils/constants.js';

const humanMockInterviewSlotSchema = new mongoose.Schema(
  {
    organizationId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Organization',
      required: [true, 'Organization ID is required'],
      index: true
    },
    interviewerProfileId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'InterviewerProfile',
      required: [true, 'Interviewer profile ID is required'],
      index: true
    },
    startsAt: {
      type: Date,
      required: [true, 'Start time is required'],
      index: true
    },
    endsAt: {
      type: Date,
      required: [true, 'End time is required']
    },
    status: {
      type: String,
      enum: Object.values(HUMAN_INTERVIEW_SLOT_STATUSES),
      default: HUMAN_INTERVIEW_SLOT_STATUSES.AVAILABLE,
      index: true
    },
    meetingUrl: {
      type: String,
      trim: true,
      default: ''
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

// One slot per interviewer per start time
humanMockInterviewSlotSchema.index({ interviewerProfileId: 1, startsAt: 1 }, { unique: true });
// Fast query for available slots by organization and date range
humanMockInterviewSlotSchema.index({ organizationId: 1, status: 1, startsAt: 1 });

export const HumanMockInterviewSlot = mongoose.model(
  'HumanMockInterviewSlot',
  humanMockInterviewSlotSchema
);

