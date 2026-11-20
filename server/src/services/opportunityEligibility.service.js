import { JobOpportunity } from '../models/jobOpportunity.model.js';
import { StudentProfile } from '../models/studentProfile.model.js';
import { EligibilityEvaluation } from '../models/eligibilityEvaluation.model.js';
import { User } from '../models/user.model.js';
import { ApiError } from '../utils/ApiError.js';
import { findByIdInOrg, paginateInOrg, scopeOrg } from '../utils/orgScope.js';
import { recordAuditEvent } from './audit.service.js';
import { evaluateEligibility } from './eligibilityEngine.js';
import {
  ELIGIBILITY_STATUSES,
  OPPORTUNITY_STATUSES,
  ERROR_CODES
} from '../utils/constants.js';

/**
 * Student / Staff: Retrieve current eligibility evaluation for a student.
 * Recomputes and snapshots if criteriaVersion changed, profile was updated, or no record exists.
 *
 * @param {string|ObjectId} organizationId
 * @param {string|ObjectId} opportunityId
 * @param {string|ObjectId} studentUserId
 * @param {boolean} [forceRecompute=false]
 */
export const getOrEvaluateOpportunityEligibility = async (
  organizationId,
  opportunityId,
  studentUserId,
  forceRecompute = false
) => {
  const opportunity = await findByIdInOrg(JobOpportunity, opportunityId, organizationId);
  if (!opportunity) {
    throw ApiError.notFound('Opportunity not found', [], ERROR_CODES.NOT_FOUND);
  }

  // Student profile query (org-scoped)
  const profile = await StudentProfile.findOne(
    scopeOrg(organizationId, { userId: studentUserId })
  );

  // Check for existing evaluation snapshot
  if (!forceRecompute) {
    const existing = await EligibilityEvaluation.findOne(
      scopeOrg(organizationId, {
        opportunityId: opportunity._id,
        studentId: studentUserId
      })
    ).sort({ evaluatedAt: -1 });

    if (existing) {
      const isCriteriaCurrent = existing.criteriaVersion === (opportunity.criteriaVersion || 1);
      const isProfileCurrent =
        !profile?.updatedAt ||
        !existing.snapshot?.profileUpdatedAt ||
        new Date(profile.updatedAt) <= new Date(existing.snapshot.profileUpdatedAt);

      // If current or if explicitly overridden by staff, return the existing evaluation
      if ((isCriteriaCurrent && isProfileCurrent) || existing.override?.isOverridden) {
        const obj = existing.toJSON();
        return {
          ...obj,
          opportunity: {
            _id: opportunity._id,
            companyName: opportunity.companyName,
            jobTitle: opportunity.jobTitle,
            criteriaVersion: opportunity.criteriaVersion
          }
        };
      }
    }
  }

  // Execute pure deterministic engine
  const evalResult = evaluateEligibility(profile || {}, opportunity.criteria || []);

  const newEvaluation = new EligibilityEvaluation({
    organizationId,
    opportunityId: opportunity._id,
    studentId: studentUserId,
    studentProfileId: profile?._id || null,
    criteriaVersion: opportunity.criteriaVersion || 1,
    engineVersion: evalResult.engineVersion,
    status: evalResult.status,
    snapshot: {
      matched: evalResult.matched,
      unmet: evalResult.unmet,
      missing: evalResult.missing,
      preferred: evalResult.preferred,
      perCriterion: evalResult.perCriterion,
      disclaimer: evalResult.disclaimer,
      profileUpdatedAt: profile?.updatedAt || new Date()
    },
    evaluatedAt: new Date(),
    override: {
      isOverridden: false
    }
  });

  await newEvaluation.save();

  const resObj = newEvaluation.toJSON();
  return {
    ...resObj,
    opportunity: {
      _id: opportunity._id,
      companyName: opportunity.companyName,
      jobTitle: opportunity.jobTitle,
      criteriaVersion: opportunity.criteriaVersion
    }
  };
};

/**
 * Staff: Paginated cohort view of student eligibility for an opportunity.
 */
export const getOpportunityEligibilityCohort = async (
  organizationId,
  opportunityId,
  { page = 1, limit = 20, status, q } = {}
) => {
  const opportunity = await findByIdInOrg(JobOpportunity, opportunityId, organizationId);
  if (!opportunity) {
    throw ApiError.notFound('Opportunity not found', [], ERROR_CODES.NOT_FOUND);
  }

  const filter = { opportunityId: opportunity._id };

  if (status) {
    filter.$or = [{ status }, { 'override.overrideStatus': status }];
  }

  const result = await paginateInOrg(
    EligibilityEvaluation,
    filter,
    organizationId,
    {
      page,
      limit,
      sort: { evaluatedAt: -1 },
      populate: [
        { path: 'studentId', select: 'name email role accountStatus' },
        { path: 'studentProfileId', select: 'studentCode fullName branch graduationYear cgpa' },
        { path: 'override.overriddenBy', select: 'name email' }
      ]
    }
  );

  return {
    evaluations: result.items || [],
    pagination: result.pagination,
    opportunity: {
      _id: opportunity._id,
      companyName: opportunity.companyName,
      jobTitle: opportunity.jobTitle,
      criteriaVersion: opportunity.criteriaVersion
    }
  };
};

/**
 * Staff: Override an eligibility evaluation (requires explicit documented reason).
 */
export const overrideEligibilityEvaluation = async (
  organizationId,
  actorUser,
  evaluationId,
  { overrideStatus, reason }
) => {
  if (!reason || !String(reason).trim()) {
    throw ApiError.badRequest(
      'Override reason is required',
      [{ field: 'reason', message: 'A specific audit explanation must be documented for staff overrides' }],
      ERROR_CODES.VALIDATION_ERROR
    );
  }

  if (!overrideStatus || !Object.values(ELIGIBILITY_STATUSES).includes(overrideStatus)) {
    throw ApiError.badRequest(
      `Invalid override status: ${overrideStatus}`,
      [{ field: 'overrideStatus', message: `Must be one of: ${Object.values(ELIGIBILITY_STATUSES).join(', ')}` }],
      ERROR_CODES.VALIDATION_ERROR
    );
  }

  const evaluation = await findByIdInOrg(EligibilityEvaluation, evaluationId, organizationId);
  if (!evaluation) {
    throw ApiError.notFound('Eligibility evaluation not found', [], ERROR_CODES.NOT_FOUND);
  }

  evaluation.override = {
    isOverridden: true,
    overrideStatus,
    reason: String(reason).trim(),
    overriddenBy: actorUser._id,
    overriddenAt: new Date()
  };

  await evaluation.save();

  await recordAuditEvent({
    organizationId,
    actorId: actorUser._id,
    action: 'ELIGIBILITY_OVERRIDDEN',
    entityType: 'EligibilityEvaluation',
    entityId: evaluation._id,
    metadata: {
      opportunityId: evaluation.opportunityId,
      studentId: evaluation.studentId,
      overrideStatus,
      reason: String(reason).trim()
    },
    allowedMetadataKeys: ['opportunityId', 'studentId', 'overrideStatus', 'reason']
  });

  return evaluation.toJSON();
};

/**
 * Student: List their own eligibility evaluation history across opportunities.
 */
export const listStudentEligibility = async (
  organizationId,
  studentUserId,
  { page = 1, limit = 20 } = {}
) => {
  const result = await paginateInOrg(
    EligibilityEvaluation,
    { studentId: studentUserId },
    organizationId,
    {
      page,
      limit,
      sort: { evaluatedAt: -1 },
      populate: {
        path: 'opportunityId',
        select: 'companyName jobTitle location workMode compensationText deadline status'
      }
    }
  );

  return {
    evaluations: result.items || [],
    pagination: result.pagination
  };
};
