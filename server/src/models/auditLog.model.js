import mongoose from 'mongoose';

const auditLogSchema = new mongoose.Schema(
  {
    organizationId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Organization',
      default: null,
      index: true
    },
    actorId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'Actor ID is required'],
      index: true
    },
    action: {
      type: String,
      required: [true, 'Action is required'],
      trim: true,
      index: true
    },
    entityType: {
      type: String,
      trim: true,
      index: true
    },
    entityId: {
      type: mongoose.Schema.Types.ObjectId,
      default: null
    },
    resourceType: {
      type: String,
      required: [true, 'Resource type is required'],
      trim: true,
      index: true
    },
    resourceId: {
      type: mongoose.Schema.Types.ObjectId,
      default: null
    },
    metadata: {
      type: mongoose.Schema.Types.Mixed,
      default: {}
    },
    createdAt: {
      type: Date,
      default: Date.now,
      index: true
    }
  },
  {
    timestamps: { createdAt: true, updatedAt: false },
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

// Keep v1 resourceType/resourceId and v3 entityType/entityId synchronized
auditLogSchema.pre('validate', function syncEntityAndResource(next) {
  if (!this.entityType && this.resourceType) {
    this.entityType = this.resourceType;
  } else if (!this.resourceType && this.entityType) {
    this.resourceType = this.entityType;
  }

  if (!this.entityId && this.resourceId) {
    this.entityId = this.resourceId;
  } else if (!this.resourceId && this.entityId) {
    this.resourceId = this.entityId;
  }

  next();
});

auditLogSchema.index({ actorId: 1, createdAt: -1 });
auditLogSchema.index({ organizationId: 1, entityType: 1, createdAt: -1 });

export const AuditLog = mongoose.model('AuditLog', auditLogSchema);

