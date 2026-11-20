import { body } from 'express-validator';
import { OPPORTUNITY_WORK_MODES, OPPORTUNITY_STATUSES } from '../utils/constants.js';

export const createOpportunityValidator = [
  body('companyName')
    .trim()
    .notEmpty()
    .withMessage('Company name is required')
    .isLength({ max: 120 })
    .withMessage('Company name cannot exceed 120 characters'),

  body('jobTitle')
    .trim()
    .notEmpty()
    .withMessage('Job title is required')
    .isLength({ max: 150 })
    .withMessage('Job title cannot exceed 150 characters'),

  body('description')
    .trim()
    .notEmpty()
    .withMessage('Job description is required'),

  body('workMode')
    .optional()
    .isIn(Object.values(OPPORTUNITY_WORK_MODES))
    .withMessage(`Work mode must be one of: ${Object.values(OPPORTUNITY_WORK_MODES).join(', ')}`),

  body('deadline')
    .optional()
    .isISO8601()
    .withMessage('Deadline must be a valid ISO 8601 date string'),

  body('status')
    .optional()
    .isIn(Object.values(OPPORTUNITY_STATUSES))
    .withMessage(`Status must be one of: ${Object.values(OPPORTUNITY_STATUSES).join(', ')}`),

  body('criteria')
    .optional()
    .isArray()
    .withMessage('Criteria must be an array')
];

export const updateOpportunityValidator = [
  body('companyName')
    .optional()
    .trim()
    .notEmpty()
    .withMessage('Company name cannot be empty')
    .isLength({ max: 120 })
    .withMessage('Company name cannot exceed 120 characters'),

  body('jobTitle')
    .optional()
    .trim()
    .notEmpty()
    .withMessage('Job title cannot be empty')
    .isLength({ max: 150 })
    .withMessage('Job title cannot exceed 150 characters'),

  body('description')
    .optional()
    .trim()
    .notEmpty()
    .withMessage('Job description cannot be empty'),

  body('workMode')
    .optional()
    .isIn(Object.values(OPPORTUNITY_WORK_MODES))
    .withMessage(`Work mode must be one of: ${Object.values(OPPORTUNITY_WORK_MODES).join(', ')}`),

  body('deadline')
    .optional()
    .isISO8601()
    .withMessage('Deadline must be a valid ISO 8601 date string'),

  body('status')
    .optional()
    .isIn(Object.values(OPPORTUNITY_STATUSES))
    .withMessage(`Status must be one of: ${Object.values(OPPORTUNITY_STATUSES).join(', ')}`),

  body('criteria')
    .optional()
    .isArray()
    .withMessage('Criteria must be an array')
];
