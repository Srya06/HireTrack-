import { body } from 'express-validator';
import { INTERVIEW_MODES, INTERVIEW_STATUSES } from '../utils/constants.js';

export const createInterviewValidator = [
  body('scheduledAt')
    .notEmpty()
    .withMessage('Interview date and time is required')
    .isISO8601()
    .withMessage('Interview date must be a valid ISO8601 date string')
    .custom((value) => {
      if (new Date(value) <= new Date()) {
        throw new Error('Interview scheduled date and time must be in the future');
      }
      return true;
    }),

  body('mode')
    .notEmpty()
    .withMessage('Interview mode is required')
    .isIn(Object.values(INTERVIEW_MODES))
    .withMessage(`Invalid mode. Allowed: ${Object.values(INTERVIEW_MODES).join(', ')}`),

  body('locationOrLink')
    .optional()
    .trim()
    .isLength({ max: 500 })
    .withMessage('Location or meeting link cannot exceed 500 characters'),

  body('notes')
    .optional()
    .trim()
    .isLength({ max: 1000 })
    .withMessage('Notes cannot exceed 1000 characters')
];

export const updateInterviewValidator = [
  body('scheduledAt')
    .optional()
    .isISO8601()
    .withMessage('Interview date must be a valid ISO8601 date string')
    .custom((value) => {
      if (new Date(value) <= new Date()) {
        throw new Error('Rescheduled interview date and time must be in the future');
      }
      return true;
    }),

  body('mode')
    .optional()
    .isIn(Object.values(INTERVIEW_MODES))
    .withMessage(`Invalid mode. Allowed: ${Object.values(INTERVIEW_MODES).join(', ')}`),

  body('locationOrLink')
    .optional()
    .trim()
    .isLength({ max: 500 })
    .withMessage('Location or meeting link cannot exceed 500 characters'),

  body('notes')
    .optional()
    .trim()
    .isLength({ max: 1000 })
    .withMessage('Notes cannot exceed 1000 characters'),

  body('status')
    .optional()
    .isIn(Object.values(INTERVIEW_STATUSES))
    .withMessage(`Invalid status. Allowed: ${Object.values(INTERVIEW_STATUSES).join(', ')}`)
];

