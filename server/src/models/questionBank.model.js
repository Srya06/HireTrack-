import mongoose from 'mongoose';

const questionBankSchema = new mongoose.Schema(
  {
    organizationId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Organization',
      required: [true, 'Organization ID is required'],
      index: true
    },
    name: {
      type: String,
      required: [true, 'Question bank name is required'],
      trim: true
    },
    categoryId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'TestCategory',
      required: [true, 'Category ID is required'],
      index: true
    },
    description: {
      type: String,
      trim: true,
      default: ''
    },
    topicTags: {
      type: [String],
      default: [],
      index: true
    },
    status: {
      type: String,
      enum: ['ACTIVE', 'ARCHIVED'],
      default: 'ACTIVE',
      index: true
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    }
  },
  {
    timestamps: true,
    toJSON: {
      virtuals: true,
      transform: (doc, ret) => {
        delete ret.__v;
        return ret;
      }
    }
  }
);

questionBankSchema.virtual('orgId').get(function () {
  return this.organizationId;
});

// Indexes
questionBankSchema.index({ organizationId: 1, categoryId: 1, status: 1 });
questionBankSchema.index({ organizationId: 1, name: 1 });

export const QuestionBank = mongoose.model('QuestionBank', questionBankSchema);
