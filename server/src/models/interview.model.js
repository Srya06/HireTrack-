import mongoose from 'mongoose';
import { INTERVIEW_MODES, INTERVIEW_STATUSES } from '../utils/constants.js';

const interviewSchema = new mongoose.Schema(
  {
    applicationId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Application',
      required: [true, 'Application ID is required'],
      index: true
    },
    scheduledBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'Scheduled by user ID is required']
    },
    scheduledAt: {
      type: Date,
      required: [true, 'Interview scheduled date and time is required']
    },
    mode: {
      type: String,
      enum: {
        values: Object.values(INTERVIEW_MODES),
        message: '{VALUE} is not a valid interview mode'
      },
      required: [true, 'Interview mode is required']
    },
    locationOrLink: {
      type: String,
      trim: true,
      maxlength: [500, 'Location or link cannot exceed 500 characters'],
      default: ''
    },
    notes: {
      type: String,
      trim: true,
      maxlength: [1000, 'Notes cannot exceed 1000 characters'],
      default: ''
    },
    status: {
      type: String,
      enum: {
        values: Object.values(INTERVIEW_STATUSES),
        message: '{VALUE} is not a valid interview status'
      },
      default: INTERVIEW_STATUSES.SCHEDULED,
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

interviewSchema.index({ applicationId: 1, scheduledAt: 1 });

export const Interview = mongoose.model('Interview', interviewSchema);

