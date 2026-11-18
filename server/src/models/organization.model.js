import mongoose from 'mongoose';
import { ORGANIZATION_STATUSES } from '../utils/constants.js';

const organizationSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'Organization name is required'],
      trim: true,
      minlength: [2, 'Organization name must be at least 2 characters'],
      maxlength: [150, 'Organization name cannot exceed 150 characters']
    },
    slug: {
      type: String,
      required: [true, 'Organization slug is required'],
      unique: true,
      lowercase: true,
      trim: true,
      match: [/^[a-z0-9-]+$/, 'Slug may only contain lowercase letters, numbers, and hyphens'],
      index: true
    },
    timezone: {
      type: String,
      required: [true, 'Organization timezone is required'],
      trim: true,
      default: 'Asia/Kolkata'
    },
    status: {
      type: String,
      enum: {
        values: Object.values(ORGANIZATION_STATUSES),
        message: '{VALUE} is not a valid organization status'
      },
      default: ORGANIZATION_STATUSES.ACTIVE,
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

export const Organization = mongoose.model('Organization', organizationSchema);
