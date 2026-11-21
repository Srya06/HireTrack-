import mongoose from 'mongoose';
import { AI_INTERVIEW_SPEAKERS } from '../utils/constants.js';

const aiInterviewTurnSchema = new mongoose.Schema(
  {
    organizationId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Organization',
      required: [true, 'Organization ID is required'],
      index: true
    },
    sessionId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'AiMockInterviewSession',
      required: [true, 'Session ID is required'],
      index: true
    },
    turnNumber: {
      type: Number,
      required: [true, 'Turn number is required'],
      min: 1
    },
    speaker: {
      type: String,
      enum: Object.values(AI_INTERVIEW_SPEAKERS),
      required: [true, 'Speaker is required']
    },
    content: {
      type: String,
      required: [true, 'Turn content is required'],
      trim: true
    },
    questionNumber: {
      type: Number,
      default: 1
    },
    isFollowUp: {
      type: Boolean,
      default: false
    },
    tokenUsage: {
      inputTokens: { type: Number, default: 0 },
      outputTokens: { type: Number, default: 0 }
    }
  },
  {
    timestamps: true
  }
);

aiInterviewTurnSchema.index({ sessionId: 1, turnNumber: 1 }, { unique: true });
aiInterviewTurnSchema.index({ sessionId: 1, createdAt: 1 });

const AiInterviewTurn = mongoose.model('AiInterviewTurn', aiInterviewTurnSchema);

export default AiInterviewTurn;

