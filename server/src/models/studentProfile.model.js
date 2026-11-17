import mongoose from 'mongoose';

const resumeSchema = new mongoose.Schema(
  {
    url: { type: String, required: true },
    publicId: { type: String, required: true },
    fileName: { type: String, required: true },
    mimeType: { type: String, required: true },
    size: { type: Number, required: true },
    uploadedAt: { type: Date, default: Date.now }
  },
  { _id: false }
);

const studentProfileSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'User ID is required'],
      unique: true,
      index: true
    },
    studentId: {
      type: String,
      required: [true, 'Student ID (USN / Roll No) is required'],
      unique: true,
      trim: true,
      index: true
    },
    phone: {
      type: String,
      trim: true,
      default: ''
    },
    branch: {
      type: String,
      required: [true, 'Branch is required'],
      trim: true
    },
    graduationYear: {
      type: Number,
      required: [true, 'Graduation year is required'],
      min: [2000, 'Graduation year must be valid'],
      max: [2100, 'Graduation year must be valid']
    },
    cgpa: {
      type: Number,
      required: [true, 'CGPA is required'],
      min: [0, 'CGPA cannot be negative'],
      max: [10, 'CGPA cannot exceed 10.0']
    },
    skills: {
      type: [String],
      default: []
    },
    bio: {
      type: String,
      trim: true,
      maxlength: [1000, 'Bio cannot exceed 1000 characters'],
      default: ''
    },
    resume: {
      type: resumeSchema,
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

// Compound index for branch/year/cgpa queries
studentProfileSchema.index({ branch: 1, graduationYear: 1, cgpa: -1 });

export const StudentProfile = mongoose.model('StudentProfile', studentProfileSchema);

