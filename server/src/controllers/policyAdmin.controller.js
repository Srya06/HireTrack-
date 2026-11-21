import { InstitutePolicy } from '../models/institutePolicy.model.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { sendSuccess } from '../utils/response.js';
import { recordAuditEvent } from '../services/audit.service.js';
import { ApiError } from '../utils/ApiError.js';

export const DEFAULT_RETENTION_POLICY = {
  profileRetentionDays: 365,
  interviewTranscriptRetentionDays: 90,
  assessmentAttemptRetentionDays: 180,
  auditLogRetentionDays: 730
};

export const getRetentionPolicy = asyncHandler(async (req, res) => {
  const organizationId = req.organizationId;
  const policy = await InstitutePolicy.findOne({
    organizationId,
    policyKey: 'dataRetention'
  });

  return sendSuccess(res, {
    statusCode: 200,
    message: 'Data retention policy retrieved successfully',
    data: {
      policyKey: 'dataRetention',
      value: policy?.value || DEFAULT_RETENTION_POLICY,
      updatedAt: policy?.updatedAt || null
    }
  });
});

export const updateRetentionPolicy = asyncHandler(async (req, res) => {
  const organizationId = req.organizationId;
  const actor = req.user;
  const {
    profileRetentionDays,
    interviewTranscriptRetentionDays,
    assessmentAttemptRetentionDays,
    auditLogRetentionDays
  } = req.body;

  const currentPolicy = await InstitutePolicy.findOne({
    organizationId,
    policyKey: 'dataRetention'
  });

  const existingValue = currentPolicy?.value || DEFAULT_RETENTION_POLICY;

  const updatedValue = {
    profileRetentionDays:
      typeof profileRetentionDays === 'number' && profileRetentionDays > 0
        ? profileRetentionDays
        : existingValue.profileRetentionDays,
    interviewTranscriptRetentionDays:
      typeof interviewTranscriptRetentionDays === 'number' && interviewTranscriptRetentionDays > 0
        ? interviewTranscriptRetentionDays
        : existingValue.interviewTranscriptRetentionDays,
    assessmentAttemptRetentionDays:
      typeof assessmentAttemptRetentionDays === 'number' && assessmentAttemptRetentionDays > 0
        ? assessmentAttemptRetentionDays
        : existingValue.assessmentAttemptRetentionDays,
    auditLogRetentionDays:
      typeof auditLogRetentionDays === 'number' && auditLogRetentionDays > 0
        ? auditLogRetentionDays
        : existingValue.auditLogRetentionDays
  };

  const policy = await InstitutePolicy.findOneAndUpdate(
    { organizationId, policyKey: 'dataRetention' },
    {
      $set: {
        value: updatedValue,
        updatedBy: actor._id
      }
    },
    { new: true, upsert: true }
  );

  // Audited action
  await recordAuditEvent({
    organizationId,
    actorId: actor._id,
    action: 'RETENTION_POLICY_UPDATED',
    entityType: 'InstitutePolicy',
    entityId: policy._id,
    metadata: {
      policyKey: 'dataRetention',
      previousValue: existingValue,
      newValue: updatedValue
    },
    allowedMetadataKeys: ['policyKey', 'previousValue', 'newValue']
  });

  return sendSuccess(res, {
    statusCode: 200,
    message: 'Data retention policy updated successfully',
    data: {
      policyKey: 'dataRetention',
      value: policy.value,
      updatedAt: policy.updatedAt
    }
  });
});

