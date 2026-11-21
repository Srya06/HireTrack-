import mongoose from 'mongoose';
import { HUMAN_INTERVIEW_BOOKING_STATUSES } from '../utils/constants.js';

const humanMockInterviewBookingSchema = new mongoose.Schema(
  {
    organizationId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Organization',
      required: [true, 'Organization ID is required'],
      index: true
    },
    slotId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'HumanMockInterviewSlot',
      required: [true, 'Slot ID is required']
    },
    studentProfileId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'StudentProfile',
      required: [true, 'Student profile ID is required'],
      index: true
    },
    studentUserId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'Student user ID is required'],
      index: true
    },
    trackId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'InterviewTrack',
      default: null
    },
    status: {
      type: String,
      enum: Object.values(HUMAN_INTERVIEW_BOOKING_STATUSES),
      default: HUMAN_INTERVIEW_BOOKING_STATUSES.SCHEDULED,
      index: true
    },
    meetingUrl: {
      type: String,
      trim: true,
      default: ''
    },
    notes: {
      type: String,
      trim: true,
      maxlength: [1000, 'Notes cannot exceed 1000 characters'],
      default: ''
    },
    bookedAt: {
      type: Date,
      default: Date.now
    },
    completedAt: {
      type: Date,
      default: null
    },
    cancelledAt: {
      type: Date,
      default: null
    },
    cancelledBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null
    },
    cancellationReason: {
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

// CRITICAL: Partial unique index guaranteeing at most ONE active booking per slot
humanMockInterviewBookingSchema.index(
  { slotId: 1 },
  {
    name: 'unique_active_slot_booking',
    unique: true,
    partialFilterExpression: {
      status: {
        $in: [
          HUMAN_INTERVIEW_BOOKING_STATUSES.REQUESTED,
          HUMAN_INTERVIEW_BOOKING_STATUSES.SCHEDULED
        ]
      }
    }
  }
);

// Indexes for querying student history and organization bookings
humanMockInterviewBookingSchema.index({ organizationId: 1, studentUserId: 1, bookedAt: -1 });
humanMockInterviewBookingSchema.index({ organizationId: 1, status: 1, bookedAt: -1 });

export const HumanMockInterviewBooking = mongoose.model(
  'HumanMockInterviewBooking',
  humanMockInterviewBookingSchema
);
