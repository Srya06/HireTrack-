import { body } from 'express-validator';
import { APPLICATION_STATUSES } from '../utils/constants.js';

export const applyJobValidator = [
  body('coverLetter')
    .optional()
    .trim()
    .isLength({ max: 2000 })
    .withMessage('Cover letter cannot exceed 2000 characters')
];

export const updateApplicationStatusValidator = [
  body('status')
    .notEmpty()
    .withMessage('Application status is required')
    .isIn(Object.values(APPLICATION_STATUSES))
    .withMessage(`Invalid application status. Allowed: ${Object.values(APPLICATION_STATUSES).join(', ')}`),

  body('note')
    .optional()
    .trim()
    .isLength({ max: 1000 })
    .withMessage('Status note cannot exceed 1000 characters')
];
