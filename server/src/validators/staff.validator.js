import { body, query } from 'express-validator';
import { STAFF_MEMBERSHIP_ROLES, MEMBERSHIP_STATUSES } from '../utils/constants.js';

export const listStaffValidator = [
  query('role')
    .optional()
    .trim()
    .isIn(STAFF_MEMBERSHIP_ROLES)
    .withMessage(`Role filter must be one of: ${STAFF_MEMBERSHIP_ROLES.join(', ')}`),
  query('status')
    .optional()
    .trim()
    .isIn(Object.values(MEMBERSHIP_STATUSES))
    .withMessage(`Status filter must be one of: ${Object.values(MEMBERSHIP_STATUSES).join(', ')}`),
  query('page').optional().isInt({ min: 1 }).withMessage('Page must be a positive integer'),
  query('limit').optional().isInt({ min: 1, max: 100 }).withMessage('Limit must be between 1 and 100')
];

export const grantStaffRoleValidator = [
  body('role')
    .trim()
    .notEmpty()
    .withMessage('Staff role is required')
    .isIn(STAFF_MEMBERSHIP_ROLES)
    .withMessage(`Staff role must be one of: ${STAFF_MEMBERSHIP_ROLES.join(', ')}`),
  body('userId')
    .optional()
    .isMongoId()
    .withMessage('Invalid userId format'),
  body('email')
    .optional()
    .trim()
    .isEmail()
    .withMessage('Please provide a valid email address')
    .normalizeEmail(),
  body().custom((value) => {
    if (!value.userId && !value.email) {
      throw new Error('Either userId or email is required to grant a staff role');
    }
    return true;
  })
];

export const updateStaffMembershipValidator = [
  body('status')
    .trim()
    .notEmpty()
    .withMessage('Membership status is required')
    .isIn(Object.values(MEMBERSHIP_STATUSES))
    .withMessage(`Status must be one of: ${Object.values(MEMBERSHIP_STATUSES).join(', ')}`)
];
