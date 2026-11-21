import { JobOpportunity } from '../models/jobOpportunity.model.js';
import { Organization } from '../models/organization.model.js';
import { ApiError } from '../utils/ApiError.js';
import { scopeOrg, findByIdInOrg, paginateInOrg } from '../utils/orgScope.js';
import { recordAuditEvent } from './audit.service.js';
import { notifyJobPublished } from './notification.service.js';
import {
  OPPORTUNITY_STATUSES,
  OPPORTUNITY_WORK_MODES,
  CRITERIA_TYPES,
  CRITERIA_OPERATORS,
  ERROR_CODES
} from '../utils/constants.js';

const HTTP_URL_REGEX = /^https?:\/\/[^\s$.?#].[^\s]*$/i;

/**
 * Validates that a string is a safe HTTP or HTTPS URL.
 * Strictly blocks javascript:, data:, and relative strings.
 *
 * @param {string} url
 * @param {string} [fieldName='URL']
 */
export const validateHttpUrl = (url, fieldName = 'URL') => {
  if (!url || typeof url !== 'string') return;
  const trimmed = url.trim();
  if (!HTTP_URL_REGEX.test(trimmed)) {
    throw ApiError.badRequest(
      `Disallowed URL protocol: ${fieldName} must be a valid HTTP or HTTPS web address`,
      [{ field: fieldName, message: `Disallowed URL protocol or malformed address: "${url}"` }],
      ERROR_CODES.VALIDATION_ERROR
    );
  }
};

/**
 * Validates criteria array and detects conflicting or out-of-bound rules.
 *
 * @param {Array} criteria
 * @returns {Array} Validated criteria array
 */
export const validateAndSanitizeCriteria = (criteria) => {
  if (!criteria) return [];
  if (!Array.isArray(criteria)) {
    throw ApiError.badRequest('Criteria must be an array of requirements', [], ERROR_CODES.VALIDATION_ERROR);
  }

  const sanitized = [];

  for (let i = 0; i < criteria.length; i++) {
    const item = criteria[i];
    if (!item || typeof item !== 'object') continue;

    const type = item.type;
    if (!type || !Object.values(CRITERIA_TYPES).includes(type)) {
      throw ApiError.badRequest(
        `Invalid criteria type: ${type}`,
        [{ field: `criteria[${i}].type`, message: `Type must be one of: ${Object.values(CRITERIA_TYPES).join(', ')}` }],
        ERROR_CODES.VALIDATION_ERROR
      );
    }

    const operator = item.operator || CRITERIA_OPERATORS.EQUALS;
    let value = item.value;

    // Type-specific validation & conflict detection
    if (type === CRITERIA_TYPES.MIN_CGPA) {
      const num = Number(value);
      if (isNaN(num) || num < 0 || num > 10) {
        throw ApiError.badRequest(
          'Conflicting criteria: Minimum CGPA requirement must be a valid number between 0.0 and 10.0',
          [{ field: `criteria[${i}].value`, message: 'Conflicting criteria: Minimum CGPA cannot be negative or exceed 10.0' }],
          ERROR_CODES.VALIDATION_ERROR
        );
      }
      value = num;
    } else if (type === CRITERIA_TYPES.GRADUATION_YEAR) {
      if (Array.isArray(value)) {
        if (value.length === 0) {
          throw ApiError.badRequest(
            'Graduation year criteria cannot be an empty list',
            [{ field: `criteria[${i}].value`, message: 'Empty graduation year set creates an unfulfillable job requirement' }],
            ERROR_CODES.VALIDATION_ERROR
          );
        }
        value = value.map((y) => {
          const yr = Number(y);
          if (isNaN(yr) || yr < 2000 || yr > 2100) {
            throw ApiError.badRequest(
              'Graduation year must be between 2000 and 2100',
              [{ field: `criteria[${i}].value`, message: `Invalid year value: ${y}` }],
              ERROR_CODES.VALIDATION_ERROR
            );
          }
          return yr;
        });
      } else {
        const yr = Number(value);
        if (isNaN(yr) || yr < 2000 || yr > 2100) {
          throw ApiError.badRequest(
            'Graduation year must be between 2000 and 2100',
            [{ field: `criteria[${i}].value`, message: `Invalid year value: ${value}` }],
            ERROR_CODES.VALIDATION_ERROR
          );
        }
        value = yr;
      }
    } else if (type === CRITERIA_TYPES.BRANCH || type === CRITERIA_TYPES.DEGREE) {
      if (Array.isArray(value)) {
        if (value.length === 0) {
          throw ApiError.badRequest(
            `${type} criteria list cannot be empty`,
            [{ field: `criteria[${i}].value`, message: 'Empty list creates unfulfillable criterion' }],
            ERROR_CODES.VALIDATION_ERROR
          );
        }
        value = value.map((v) => String(v).trim()).filter(Boolean);
      } else {
        value = String(value || '').trim();
        if (!value) {
          throw ApiError.badRequest(
            `${type} criteria value cannot be empty`,
            [{ field: `criteria[${i}].value`, message: 'Value is required' }],
            ERROR_CODES.VALIDATION_ERROR
          );
        }
      }
    }

    sanitized.push({
      type,
      operator,
      value,
      isHardRequirement: item.isHardRequirement !== false,
      displayLabel: item.displayLabel ? String(item.displayLabel).trim() : '',
      sortOrder: Number(item.sortOrder) || i
    });
  }

  return sanitized;
};

/**
 * Validates that an opportunity record satisfies all business rules for publishing.
 *
 * @param {object} opp
 */
export const validateOpportunityForPublish = (opp) => {
  const errors = [];

  // 1. Title, Company, Description
  if (!opp.companyName || !opp.companyName.trim()) {
    errors.push({ field: 'companyName', message: 'Company name is required for publish' });
  }
  if (!opp.jobTitle || !opp.jobTitle.trim()) {
    errors.push({ field: 'jobTitle', message: 'Job title is required for publish' });
  }
  if (!opp.description || !opp.description.trim()) {
    errors.push({ field: 'description', message: 'Job description is required for publish' });
  }

  // 2. Application path: required application URL OR instructions
  const hasUrl = opp.applicationUrl && String(opp.applicationUrl).trim().length > 0;
  const hasInstructions = opp.applicationInstructions && String(opp.applicationInstructions).trim().length > 0;
  if (!hasUrl && !hasInstructions) {
    errors.push({
      field: 'applicationUrl',
      message: 'Publishing requires either a valid external Application URL or explicit Application Instructions'
    });
  }

  // 3. HTTP URL validations
  if (hasUrl) {
    if (!HTTP_URL_REGEX.test(String(opp.applicationUrl).trim())) {
      errors.push({
        field: 'applicationUrl',
        message: 'Application URL must start with http:// or https:// and be a valid web address'
      });
    }
  }
  if (opp.sourceUrl && String(opp.sourceUrl).trim().length > 0) {
    if (!HTTP_URL_REGEX.test(String(opp.sourceUrl).trim())) {
      errors.push({
        field: 'sourceUrl',
        message: 'Source URL must start with http:// or https://'
      });
    }
  }

  // 4. Source note and lastVerifiedAt required
  if (!opp.sourceNote || !String(opp.sourceNote).trim()) {
    errors.push({
      field: 'sourceNote',
      message: 'Source verification note is required before publishing'
    });
  }

  // 5. Deadline required
  if (!opp.deadline || isNaN(new Date(opp.deadline).getTime())) {
    errors.push({ field: 'deadline', message: 'A valid application deadline is required' });
  }

  // 6. Conflicting criteria validation
  if (opp.criteria && Array.isArray(opp.criteria)) {
    try {
      validateAndSanitizeCriteria(opp.criteria);
    } catch (err) {
      if (err.errors) errors.push(...err.errors);
      else errors.push({ field: 'criteria', message: err.message });
    }
  }

  if (errors.length > 0) {
    throw ApiError.badRequest(
      `Cannot publish opportunity: ${errors.map((e) => e.message).join('; ')}`,
      errors,
      ERROR_CODES.VALIDATION_ERROR
    );
  }
};

/**
 * Staff: List opportunities (paginated, org-scoped, with filter support)
 */
export const listOpportunitiesAdmin = async (
  organizationId,
  { page = 1, limit = 20, status, q, workMode } = {}
) => {
  const filter = {};

  if (status) {
    filter.status = status;
  }
  if (workMode) {
    filter.workMode = workMode;
  }
  if (q && String(q).trim()) {
    const term = String(q).trim();
    filter.$or = [
      { companyName: { $regex: term, $options: 'i' } },
      { jobTitle: { $regex: term, $options: 'i' } },
      { employerJobId: { $regex: term, $options: 'i' } }
    ];
  }

  const result = await paginateInOrg(
    JobOpportunity,
    filter,
    organizationId,
    { page, limit, sort: { createdAt: -1 } }
  );

  const now = new Date();
  const opportunities = (result.items || []).map((doc) => {
    const obj = doc.toJSON();
    obj.effectiveStatus = doc.getEffectiveStatus(now);
    obj.destinationDomain = doc.getDestinationDomain();
    return obj;
  });

  return {
    opportunities,
    pagination: result.pagination
  };
};

/**
 * Staff: Create opportunity
 */
export const createOpportunity = async (organizationId, actorUser, payload) => {
  const sanitizedCriteria = validateAndSanitizeCriteria(payload.criteria || []);

  if (payload.applicationUrl) {
    validateHttpUrl(payload.applicationUrl, 'applicationUrl');
  }
  if (payload.sourceUrl) {
    validateHttpUrl(payload.sourceUrl, 'sourceUrl');
  }

  const requestedStatus = payload.status || OPPORTUNITY_STATUSES.DRAFT;

  const opportunityDoc = new JobOpportunity({
    organizationId,
    companyName: payload.companyName,
    jobTitle: payload.jobTitle,
    employerJobId: payload.employerJobId || null,
    description: payload.description,
    location: payload.location || 'Multiple / Remote',
    workMode: payload.workMode || OPPORTUNITY_WORK_MODES.ON_SITE,
    compensationText: payload.compensationText || '',
    applicationUrl: payload.applicationUrl || null,
    applicationInstructions: payload.applicationInstructions || '',
    deadline: payload.deadline ? new Date(payload.deadline) : new Date(Date.now() + 30 * 24 * 3600 * 1000),
    status: requestedStatus,
    sourceNote: payload.sourceNote || '',
    sourceUrl: payload.sourceUrl || '',
    lastVerifiedAt: payload.lastVerifiedAt ? new Date(payload.lastVerifiedAt) : null,
    createdBy: actorUser._id,
    criteriaVersion: 1,
    criteria: sanitizedCriteria
  });

  if (requestedStatus === OPPORTUNITY_STATUSES.PUBLISHED) {
    if (!opportunityDoc.lastVerifiedAt) {
      opportunityDoc.lastVerifiedAt = new Date();
    }
    validateOpportunityForPublish(opportunityDoc);
  }

  await opportunityDoc.save();

  await recordAuditEvent({
    organizationId,
    actorId: actorUser._id,
    action: 'OPPORTUNITY_CREATED',
    entityType: 'JobOpportunity',
    entityId: opportunityDoc._id,
    metadata: {
      jobTitle: opportunityDoc.jobTitle,
      companyName: opportunityDoc.companyName,
      status: opportunityDoc.status,
      criteriaVersion: opportunityDoc.criteriaVersion
    },
    allowedMetadataKeys: ['jobTitle', 'companyName', 'status', 'criteriaVersion']
  });

  const obj = opportunityDoc.toJSON();
  obj.effectiveStatus = opportunityDoc.getEffectiveStatus();
  obj.destinationDomain = opportunityDoc.getDestinationDomain();

  return obj;
};

/**
 * Staff: Get opportunity by ID
 */
export const getOpportunityByIdAdmin = async (organizationId, id) => {
  const opp = await findByIdInOrg(JobOpportunity, id, organizationId);
  if (!opp) {
    throw ApiError.notFound('Job opportunity not found', [], ERROR_CODES.NOT_FOUND);
  }

  const obj = opp.toJSON();
  obj.effectiveStatus = opp.getEffectiveStatus();
  obj.destinationDomain = opp.getDestinationDomain();
  return obj;
};

/**
 * Staff: Update opportunity (increments criteriaVersion if criteria modified)
 */
export const updateOpportunity = async (organizationId, actorUser, id, updateData) => {
  const opp = await findByIdInOrg(JobOpportunity, id, organizationId);
  if (!opp) {
    throw ApiError.notFound('Job opportunity not found', [], ERROR_CODES.NOT_FOUND);
  }

  // Prevent cross-org or immutable field mutations
  delete updateData.organizationId;
  delete updateData.createdBy;

  if (updateData.applicationUrl !== undefined) {
    if (updateData.applicationUrl) validateHttpUrl(updateData.applicationUrl, 'applicationUrl');
    opp.applicationUrl = updateData.applicationUrl || null;
  }
  if (updateData.sourceUrl !== undefined) {
    if (updateData.sourceUrl) validateHttpUrl(updateData.sourceUrl, 'sourceUrl');
    opp.sourceUrl = updateData.sourceUrl || '';
  }

  if (updateData.companyName !== undefined) opp.companyName = updateData.companyName;
  if (updateData.jobTitle !== undefined) opp.jobTitle = updateData.jobTitle;
  if (updateData.employerJobId !== undefined) opp.employerJobId = updateData.employerJobId;
  if (updateData.description !== undefined) opp.description = updateData.description;
  if (updateData.location !== undefined) opp.location = updateData.location;
  if (updateData.workMode !== undefined) opp.workMode = updateData.workMode;
  if (updateData.compensationText !== undefined) opp.compensationText = updateData.compensationText;
  if (updateData.applicationInstructions !== undefined) {
    opp.applicationInstructions = updateData.applicationInstructions;
  }
  if (updateData.deadline !== undefined) opp.deadline = new Date(updateData.deadline);
  if (updateData.sourceNote !== undefined) opp.sourceNote = updateData.sourceNote;
  if (updateData.lastVerifiedAt !== undefined) {
    opp.lastVerifiedAt = updateData.lastVerifiedAt ? new Date(updateData.lastVerifiedAt) : null;
  }

  // If criteria provided, validate and increment criteriaVersion
  if (updateData.criteria !== undefined) {
    const sanitizedCriteria = validateAndSanitizeCriteria(updateData.criteria);
    opp.criteria = sanitizedCriteria;
    opp.criteriaVersion = (opp.criteriaVersion || 1) + 1;
  }

  // If status is being transitioned to PUBLISHED, validate
  if (updateData.status === OPPORTUNITY_STATUSES.PUBLISHED && opp.status !== OPPORTUNITY_STATUSES.PUBLISHED) {
    if (!opp.lastVerifiedAt) opp.lastVerifiedAt = new Date();
    validateOpportunityForPublish(opp);
    opp.status = OPPORTUNITY_STATUSES.PUBLISHED;
  } else if (updateData.status !== undefined) {
    opp.status = updateData.status;
  }

  await opp.save();

  await recordAuditEvent({
    organizationId,
    actorId: actorUser._id,
    action: 'OPPORTUNITY_UPDATED',
    entityType: 'JobOpportunity',
    entityId: opp._id,
    metadata: {
      jobTitle: opp.jobTitle,
      companyName: opp.companyName,
      status: opp.status,
      criteriaVersion: opp.criteriaVersion
    },
    allowedMetadataKeys: ['jobTitle', 'companyName', 'status', 'criteriaVersion']
  });

  const obj = opp.toJSON();
  obj.effectiveStatus = opp.getEffectiveStatus();
  obj.destinationDomain = opp.getDestinationDomain();
  return obj;
};

/**
 * Staff: Transition status to PUBLISHED with full publish validation
 */
export const publishOpportunity = async (organizationId, actorUser, id) => {
  const opp = await findByIdInOrg(JobOpportunity, id, organizationId);
  if (!opp) {
    throw ApiError.notFound('Job opportunity not found', [], ERROR_CODES.NOT_FOUND);
  }

  if (!opp.lastVerifiedAt) {
    opp.lastVerifiedAt = new Date();
  }

  validateOpportunityForPublish(opp);

  opp.status = OPPORTUNITY_STATUSES.PUBLISHED;
  await opp.save();

  await recordAuditEvent({
    organizationId,
    actorId: actorUser._id,
    action: 'OPPORTUNITY_PUBLISHED',
    entityType: 'JobOpportunity',
    entityId: opp._id,
    metadata: {
      jobTitle: opp.jobTitle,
      companyName: opp.companyName,
      criteriaVersion: opp.criteriaVersion
    },
    allowedMetadataKeys: ['jobTitle', 'companyName', 'criteriaVersion']
  });

  // Automated notification to enrolled students
  try {
    await notifyJobPublished({ organizationId, job: opp });
  } catch (notifErr) {
    console.warn('[OpportunityService] Notification failed:', notifErr.message);
  }

  const obj = opp.toJSON();
  obj.effectiveStatus = opp.getEffectiveStatus();
  obj.destinationDomain = opp.getDestinationDomain();
  return obj;
};

/**
 * Staff: Transition status to CLOSED
 */
export const closeOpportunity = async (organizationId, actorUser, id) => {
  const opp = await findByIdInOrg(JobOpportunity, id, organizationId);
  if (!opp) {
    throw ApiError.notFound('Job opportunity not found', [], ERROR_CODES.NOT_FOUND);
  }

  opp.status = OPPORTUNITY_STATUSES.CLOSED;
  await opp.save();

  await recordAuditEvent({
    organizationId,
    actorId: actorUser._id,
    action: 'OPPORTUNITY_CLOSED',
    entityType: 'JobOpportunity',
    entityId: opp._id,
    metadata: {
      jobTitle: opp.jobTitle,
      companyName: opp.companyName
    },
    allowedMetadataKeys: ['jobTitle', 'companyName']
  });

  const obj = opp.toJSON();
  obj.effectiveStatus = opp.getEffectiveStatus();
  return obj;
};

/**
 * Staff: Transition status to ARCHIVED
 */
export const archiveOpportunity = async (organizationId, actorUser, id) => {
  const opp = await findByIdInOrg(JobOpportunity, id, organizationId);
  if (!opp) {
    throw ApiError.notFound('Job opportunity not found', [], ERROR_CODES.NOT_FOUND);
  }

  opp.status = OPPORTUNITY_STATUSES.ARCHIVED;
  await opp.save();

  await recordAuditEvent({
    organizationId,
    actorId: actorUser._id,
    action: 'OPPORTUNITY_ARCHIVED',
    entityType: 'JobOpportunity',
    entityId: opp._id,
    metadata: {
      jobTitle: opp.jobTitle,
      companyName: opp.companyName
    },
    allowedMetadataKeys: ['jobTitle', 'companyName']
  });

  const obj = opp.toJSON();
  obj.effectiveStatus = opp.getEffectiveStatus();
  return obj;
};

/**
 * Student: List opportunities (published/closed/expired; never DRAFT or ARCHIVED)
 */
export const listOpportunitiesStudent = async (
  organizationId,
  { page = 1, limit = 15, q, workMode, location, company, status } = {}
) => {
  // Base visibility filter: students only see PUBLISHED, CLOSED, EXPIRED
  const filter = {
    status: { $in: [OPPORTUNITY_STATUSES.PUBLISHED, OPPORTUNITY_STATUSES.CLOSED, OPPORTUNITY_STATUSES.EXPIRED] }
  };

  if (status) {
    filter.status = status;
  }
  if (workMode) {
    filter.workMode = workMode;
  }
  if (location && String(location).trim()) {
    filter.location = { $regex: String(location).trim(), $options: 'i' };
  }
  if (company && String(company).trim()) {
    filter.companyName = { $regex: String(company).trim(), $options: 'i' };
  }
  if (q && String(q).trim()) {
    const term = String(q).trim();
    filter.$or = [
      { companyName: { $regex: term, $options: 'i' } },
      { jobTitle: { $regex: term, $options: 'i' } }
    ];
  }

  const result = await paginateInOrg(
    JobOpportunity,
    filter,
    organizationId,
    { page, limit, sort: { deadline: 1, createdAt: -1 } }
  );

  const now = new Date();
  const opportunities = (result.items || []).map((doc) => {
    const obj = doc.toJSON();
    const effectiveStatus = doc.getEffectiveStatus(now);

    // Strip staff-only fields for student privacy
    delete obj.sourceNote;
    delete obj.sourceUrl;
    delete obj.createdBy;
    delete obj.employerJobId;

    // Split criteria into required vs preferred
    const requiredCriteria = (obj.criteria || []).filter((c) => c.isHardRequirement !== false);
    const preferredCriteria = (obj.criteria || []).filter((c) => c.isHardRequirement === false);

    return {
      ...obj,
      effectiveStatus,
      status: effectiveStatus,
      destinationDomain: doc.getDestinationDomain(),
      applicationUrl: obj.applicationUrl || null,
      applicationInstructions: obj.applicationInstructions || '',
      requiredCriteria,
      preferredCriteria
    };
  });

  return {
    opportunities,
    pagination: result.pagination
  };
};

/**
 * Student: Get opportunity detail by ID (excludes DRAFT & ARCHIVED; splits criteria)
 */
export const getOpportunityByIdStudent = async (organizationId, id) => {
  const opp = await findByIdInOrg(JobOpportunity, id, organizationId);

  // If not found or in DRAFT or ARCHIVED state -> 404
  if (!opp || [OPPORTUNITY_STATUSES.DRAFT, OPPORTUNITY_STATUSES.ARCHIVED].includes(opp.status)) {
    throw ApiError.notFound('Opportunity not found or not published', [], ERROR_CODES.NOT_FOUND);
  }

  const now = new Date();
  const effectiveStatus = opp.getEffectiveStatus(now);
  const obj = opp.toJSON();

  // Strip staff-only fields
  delete obj.sourceNote;
  delete obj.sourceUrl;
  delete obj.createdBy;
  delete obj.employerJobId;

  const requiredCriteria = (obj.criteria || []).filter((c) => c.isHardRequirement !== false);
  const preferredCriteria = (obj.criteria || []).filter((c) => c.isHardRequirement === false);

  return {
    ...obj,
    effectiveStatus,
    status: effectiveStatus,
    destinationDomain: opp.getDestinationDomain(),
    applicationUrl: obj.applicationUrl || null,
    applicationInstructions: obj.applicationInstructions || '',
    requiredCriteria,
    preferredCriteria
  };
};
