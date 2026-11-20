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
    organizationId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Organization',
      default: null,
      index: true
    },
    studentId: {
      type: String,
      required: [true, 'Student ID (USN / Roll No) is required'],
      unique: true,
      trim: true,
      index: true
    },
    studentCode: {
      type: String,
      trim: true,
      index: true
    },
    fullName: {
      type: String,
      trim: true,
      default: ''
    },
    degree: {
      type: String,
      trim: true,
      default: 'B.Tech'
    },
    cohort: {
      type: String,
      trim: true,
      default: ''
    },
    course: {
      type: String,
      trim: true,
      default: ''
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
      default: null,
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
    profileVerifiedAt: {
      type: Date,
      default: null
    },
    verificationStatus: {
      type: String,
      enum: ['unverified', 'verified', 'rejected'],
      default: 'unverified',
      index: true
    },
    verifiedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null
    },
    verifiedAt: {
      type: Date,
      default: null
    },
    resumeObjectKey: {
      type: String,
      default: null
    },
    fileAssetId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'FileAsset',
      default: null
    },
    backlogs: {
      type: Number,
      default: 0
    },
    tenthPercentage: {
      type: Number,
      default: null
    },
    twelfthPercentage: {
      type: Number,
      default: null
    },
    diplomaPercentage: {
      type: Number,
      default: null
    },
    department: {
      type: String,
      trim: true,
      default: ''
    },
    section: {
      type: String,
      trim: true,
      default: ''
    },
    importBatchId: {
      type: String,
      default: null
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
        ret.studentCode = ret.studentCode || ret.studentId;
        ret.studentId = ret.studentId || ret.studentCode;
        delete ret._id;
        delete ret.__v;
        return ret;
      }
    }
  }
);

studentProfileSchema.pre('validate', function syncStudentIdentifiers(next) {
  if (!this.studentCode && this.studentId) {
    this.studentCode = this.studentId;
  } else if (!this.studentId && this.studentCode) {
    this.studentId = this.studentCode;
  }

  if (!this.course && this.cohort) {
    this.course = this.cohort;
  } else if (!this.cohort && this.course) {
    this.cohort = this.course;
  }

  if (this.verificationStatus === 'verified' && !this.profileVerifiedAt) {
    this.profileVerifiedAt = new Date();
  }

  next();
});

studentProfileSchema.index({ organizationId: 1, studentCode: 1 });
studentProfileSchema.index({ organizationId: 1, branch: 1, graduationYear: 1 });

// Compound index for branch/year/cgpa queries
studentProfileSchema.index({ branch: 1, graduationYear: 1, cgpa: -1 });

export const StudentProfile = mongoose.model('StudentProfile', studentProfileSchema);

