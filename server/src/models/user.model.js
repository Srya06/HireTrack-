import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';
import { ROLES, USER_STATUSES } from '../utils/constants.js';

const userSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'Name is required'],
      trim: true,
      minlength: [2, 'Name must be at least 2 characters'],
      maxlength: [100, 'Name cannot exceed 100 characters']
    },
    email: {
      type: String,
      required: [true, 'Email is required'],
      unique: true,
      lowercase: true,
      trim: true,
      index: true,
      match: [/^\S+@\S+\.\S+$/, 'Please provide a valid email address']
    },
    passwordHash: {
      type: String,
      required: [true, 'Password hash is required'],
      select: false // Excluded by default from queries
    },
    role: {
      type: String,
      enum: {
        values: [ROLES.STUDENT, ROLES.RECRUITER, ROLES.ADMIN],
        message: '{VALUE} is not a valid role'
      },
      required: [true, 'Role is required']
    },
    accountStatus: {
      type: String,
      enum: {
        values: [
          USER_STATUSES.ACTIVE,
          USER_STATUSES.PENDING,
          USER_STATUSES.SUSPENDED,
          USER_STATUSES.REJECTED
        ],
        message: '{VALUE} is not a valid account status'
      },
      default: function () {
        return this.role === ROLES.RECRUITER ? USER_STATUSES.PENDING : USER_STATUSES.ACTIVE;
      }
    },
    lastLoginAt: {
      type: Date,
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
        delete ret.passwordHash; // Critical: Never return passwordHash
        return ret;
      }
    }
  }
);

/**
 * Compare plain password with stored hash
 */
userSchema.methods.comparePassword = async function (candidatePassword) {
  return bcrypt.compare(candidatePassword, this.passwordHash);
};

export const User = mongoose.model('User', userSchema);

