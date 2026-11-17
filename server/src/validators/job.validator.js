import { body } from 'express-validator';
import { EMPLOYMENT_TYPES, JOB_STATUSES } from '../utils/constants.js';

export const createJobValidator = [
  body('title')
    .trim()
    .notEmpty()
    .withMessage('Job title is required')
    .isLength({ min: 2, max: 150 })
    .withMessage('Job title must be between 2 and 150 characters'),

  body('description')
    .trim()
    .notEmpty()
    .withMessage('Job description is required')
    .isLength({ min: 10 })
    .withMessage('Job description must be at least 10 characters long'),

  body('location')
    .trim()
    .notEmpty()
    .withMessage('Location is required')
    .isLength({ max: 150 })
    .withMessage('Location cannot exceed 150 characters'),

  body('companyName')
    .optional()
    .trim()
    .isLength({ max: 150 })
    .withMessage('Company name cannot exceed 150 characters'),

  body('employmentType')
    .optional()
    .isIn(Object.values(EMPLOYMENT_TYPES))
    .withMessage(`Invalid employment type. Must be one of: ${Object.values(EMPLOYMENT_TYPES).join(', ')}`),

  body('ctc')
    .optional()
    .trim()
    .isLength({ max: 100 })
    .withMessage('CTC cannot exceed 100 characters'),

  body('minCgpa')
    .optional({ nullable: true })
    .isFloat({ min: 0.0, max: 10.0 })
    .withMessage('Minimum CGPA must be between 0.0 and 10.0'),

  body('eligibleBranches')
    .optional()
    .isArray()
    .withMessage('Eligible branches must be an array of strings'),

  body('eligibleBranches.*')
    .optional()
    .isString()
    .trim()
    .withMessage('Each eligible branch must be a string'),

  body('eligibleGraduationYears')
    .optional()
    .isArray()
    .withMessage('Eligible graduation years must be an array of numbers'),

  body('eligibleGraduationYears.*')
    .optional()
    .isInt({ min: 2000, max: 2100 })
    .withMessage('Each eligible graduation year must be between 2000 and 2100'),

  body('requiredSkills')
    .optional()
    .isArray()
    .withMessage('Required skills must be an array of strings'),

  body('applicationDeadline')
    .notEmpty()
    .withMessage('Application deadline is required')
    .isISO8601()
    .withMessage('Application deadline must be a valid ISO8601 date string')
    .custom((value) => {
      if (new Date(value) <= new Date()) {
        throw new Error('Application deadline must be a future date and time');
      }
      return true;
    }),

  body('status')
    .optional()
    .isIn([JOB_STATUSES.DRAFT, JOB_STATUSES.PUBLISHED])
    .withMessage("Initial job status must be either 'draft' or 'published'")
];

export const updateJobValidator = [
  body('title')
    .optional()
    .trim()
    .notEmpty()
    .withMessage('Job title cannot be empty')
    .isLength({ min: 2, max: 150 })
    .withMessage('Job title must be between 2 and 150 characters'),

  body('description')
    .optional()
    .trim()
    .notEmpty()
    .withMessage('Job description cannot be empty')
    .isLength({ min: 10 })
    .withMessage('Job description must be at least 10 characters long'),

  body('location')
    .optional()
    .trim()
    .notEmpty()
    .withMessage('Location cannot be empty'),

  body('employmentType')
    .optional()
    .isIn(Object.values(EMPLOYMENT_TYPES))
    .withMessage(`Invalid employment type. Must be one of: ${Object.values(EMPLOYMENT_TYPES).join(', ')}`),

  body('ctc')
    .optional()
    .trim()
    .isLength({ max: 100 }),

  body('minCgpa')
    .optional({ nullable: true })
    .isFloat({ min: 0.0, max: 10.0 })
    .withMessage('Minimum CGPA must be between 0.0 and 10.0'),

  body('eligibleBranches')
    .optional()
    .isArray()
    .withMessage('Eligible branches must be an array of strings'),

  body('eligibleGraduationYears')
    .optional()
    .isArray()
    .withMessage('Eligible graduation years must be an array of numbers'),

  body('requiredSkills')
    .optional()
    .isArray()
    .withMessage('Required skills must be an array of strings'),

  body('applicationDeadline')
    .optional()
    .isISO8601()
    .withMessage('Application deadline must be a valid ISO8601 date string')
    .custom((value) => {
      if (new Date(value) <= new Date()) {
        throw new Error('Application deadline must be a future date and time');
      }
      return true;
    })
];
