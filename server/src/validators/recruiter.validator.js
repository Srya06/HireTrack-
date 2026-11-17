import { body } from 'express-validator';

export const updateRecruiterProfileValidator = [
  body('companyName')
    .optional()
    .trim()
    .notEmpty()
    .withMessage('Company name cannot be empty')
    .isLength({ min: 2, max: 150 })
    .withMessage('Company name must be between 2 and 150 characters'),

  body('website')
    .optional({ checkFalsy: true })
    .trim()
    .isURL()
    .withMessage('Website must be a valid URL'),

  body('designation')
    .optional()
    .trim()
    .isLength({ max: 100 })
    .withMessage('Designation cannot exceed 100 characters'),

  body('contactPhone')
    .optional()
    .trim()
    .isLength({ max: 20 })
    .withMessage('Contact phone cannot exceed 20 characters'),

  body('description')
    .optional()
    .trim()
    .isLength({ max: 2000 })
    .withMessage('Description cannot exceed 2000 characters'),

  body('approvalStatus')
    .optional()
    .custom(() => {
      throw new Error('Approval status is managed by administrators only');
    })
];
