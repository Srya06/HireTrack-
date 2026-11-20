import mongoose from 'mongoose';

const fileAssetSchema = new mongoose.Schema(
  {
    organizationId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Organization',
      required: false,
      index: true
    },
    ownerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'Owner User ID is required'],
      index: true
    },
    purpose: {
      type: String,
      enum: ['resume', 'student_import', 'avatar', 'certificate'],
      default: 'resume',
      required: [true, 'Purpose is required'],
      index: true
    },
    originalName: {
      type: String,
      required: [true, 'Original filename is required'],
      trim: true
    },
    fileName: {
      type: String,
      required: [true, 'Stored filename is required'],
      trim: true
    },
    mimeType: {
      type: String,
      required: [true, 'MIME type is required']
    },
    size: {
      type: Number,
      required: [true, 'File size in bytes is required']
    },
    storageProvider: {
      type: String,
      enum: ['local', 'cloudinary'],
      default: 'local'
    },
    storageKey: {
      type: String,
      required: [true, 'Storage key is required'],
      index: true
    },
    isPrivate: {
      type: Boolean,
      default: true
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

fileAssetSchema.index({ organizationId: 1, ownerId: 1, purpose: 1 });

export const FileAsset = mongoose.model('FileAsset', fileAssetSchema);
