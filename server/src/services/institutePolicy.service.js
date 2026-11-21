import { InstitutePolicy } from '../models/institutePolicy.model.js';
import { logAdminAction } from '../utils/auditLogger.js';
import { ApiError } from '../utils/ApiError.js';
import {
  INSTITUTE_POLICY_KEYS,
  DEFAULT_MOCK_INTERVIEW_POLICY,
  ERROR_CODES
} from '../utils/constants.js';

/**
 * Retrieves the organization's Mock Interview Policy with safe defaults.
 *
 * @param {string|mongoose.Types.ObjectId} organizationId
 * @returns {Promise<typeof DEFAULT_MOCK_INTERVIEW_POLICY>}
 */
export const getMockInterviewPolicy = async (organizationId) => {
  if (!organizationId) {
    return { ...DEFAULT_MOCK_INTERVIEW_POLICY };
  }

  const policyDoc = await InstitutePolicy.findOne({
    organizationId,
    policyKey: INSTITUTE_POLICY_KEYS.MOCK_INTERVIEWS
  });

  if (!policyDoc || !policyDoc.value) {
    return { ...DEFAULT_MOCK_INTERVIEW_POLICY };
  }

  return {
    ...DEFAULT_MOCK_INTERVIEW_POLICY,
    ...policyDoc.value
  };
};

/**
 * Updates the organization's Mock Interview Policy (Admin/Staff only) and audits the transition.
 *
 * @param {string|mongoose.Types.ObjectId} organizationId
 * @param {string|mongoose.Types.ObjectId} adminUserId
 * @param {object} updates
 * @returns {Promise<object>}
 */
export const updateMockInterviewPolicy = async (organizationId, adminUserId, updates = {}) => {
  if (!organizationId) {
    throw ApiError.badRequest('Organization ID is required', [], ERROR_CODES.VALIDATION_ERROR);
  }

  const currentPolicy = await getMockInterviewPolicy(organizationId);
  const updatedValue = { ...currentPolicy };

  if (updates.requireAiPassForHumanMock !== undefined) {
    updatedValue.requireAiPassForHumanMock = Boolean(updates.requireAiPassForHumanMock);
  }

  if (updates.minOverallScore !== undefined) {
    const score = Number(updates.minOverallScore);
    if (isNaN(score) || score < 0 || score > 100) {
      throw ApiError.badRequest('minOverallScore must be between 0 and 100', [], ERROR_CODES.VALIDATION_ERROR);
    }
    updatedValue.minOverallScore = score;
  }

  if (updates.trackIds !== undefined) {
    if (!Array.isArray(updates.trackIds)) {
      throw ApiError.badRequest('trackIds must be an array of IDs', [], ERROR_CODES.VALIDATION_ERROR);
    }
    updatedValue.trackIds = updates.trackIds.map(String);
  }

  if (updates.cancelBeforeHours !== undefined) {
    const hours = Number(updates.cancelBeforeHours);
    if (isNaN(hours) || hours < 0) {
      throw ApiError.badRequest('cancelBeforeHours must be a non-negative number', [], ERROR_CODES.VALIDATION_ERROR);
    }
    updatedValue.cancelBeforeHours = hours;
  }

  if (updates.allowResumeView !== undefined) {
    updatedValue.allowResumeView = Boolean(updates.allowResumeView);
  }

  const policyDoc = await InstitutePolicy.findOneAndUpdate(
    {
      organizationId,
      policyKey: INSTITUTE_POLICY_KEYS.MOCK_INTERVIEWS
    },
    {
      $set: {
        value: updatedValue,
        updatedBy: adminUserId
      }
    },
    { upsert: true, new: true, runValidators: true }
  );

  // Audit log the policy modification
  await logAdminAction({
    organizationId,
    actorId: adminUserId,
    action: 'POLICY_UPDATE',
    resourceType: 'InstitutePolicy',
    resourceId: policyDoc._id,
    metadata: {
      policyKey: INSTITUTE_POLICY_KEYS.MOCK_INTERVIEWS,
      previous: currentPolicy,
      updated: updatedValue
    }
  });

  return policyDoc.value;
};
