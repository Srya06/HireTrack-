import { body } from 'express-validator';

export const updateStudentProfileValidator = [
  body('branch')
    .optional()
    .trim()
    .notEmpty()
    .withMessage('Branch cannot be empty')
    .isLength({ min: 2, max: 100 })
    .withMessage('Branch must be between 2 and 100 characters'),

  body('graduationYear')
    .optional()
    .isInt({ min: 2000, max: 2100 })
    .withMessage('Graduation year must be a valid year between 2000 and 2100'),

  body('cgpa')
    .optional()
    .isFloat({ min: 0.0, max: 10.0 })
    .withMessage('CGPA must be a valid number between 0.0 and 10.0'),

  body('skills')
    .optional()
    .isArray()
    .withMessage('Skills must be an array of strings'),

  body('skills.*')
    .optional()
    .isString()
    .trim()
    .withMessage('Each skill must be a string'),

  body('bio')
    .optional()
    .trim()
    .isLength({ max: 1000 })
    .withMessage('Bio cannot exceed 1000 characters'),

  body('phone')
    .optional()
    .trim()
    .isLength({ max: 20 })
    .withMessage('Phone cannot exceed 20 characters'),

  body('studentId')
    .optional()
    .custom((val, { req }) => {
      // studentId is institutional identity and immutable
      throw new Error('Student ID is immutable and cannot be updated');
    })
];

