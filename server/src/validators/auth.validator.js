import { body } from 'express-validator';
import { ROLES } from '../utils/constants.js';

export const registerValidator = [
  body('name')
    .trim()
    .notEmpty()
    .withMessage('Name is required')
    .isLength({ min: 2, max: 100 })
    .withMessage('Name must be between 2 and 100 characters'),

  body('email')
    .trim()
    .notEmpty()
    .withMessage('Email is required')
    .isEmail()
    .withMessage('Please provide a valid email address')
    .normalizeEmail(),

  body('password')
    .notEmpty()
    .withMessage('Password is required')
    .isLength({ min: 8 })
    .withMessage('Password must be at least 8 characters long')
    .matches(/^(?=.*[A-Za-z])(?=.*\d)/)
    .withMessage('Password must contain at least one letter and one number'),

  body('role')
    .trim()
    .notEmpty()
    .withMessage('Role is required')
    .custom((value) => {
      if (value === ROLES.ADMIN) {
        throw new Error('Admin role cannot be created via public registration');
      }
      if (![ROLES.STUDENT, ROLES.RECRUITER].includes(value)) {
        throw new Error("Role must be either 'student' or 'recruiter'");
      }
      return true;
    }),

  // Student profile validations when role is student
  body('studentProfile')
    .if(body('role').equals(ROLES.STUDENT))
    .notEmpty()
    .withMessage('Student profile details are required for student registration'),

  body('studentProfile.studentId')
    .if(body('role').equals(ROLES.STUDENT))
    .trim()
    .notEmpty()
    .withMessage('Student ID / USN is required')
    .isLength({ min: 2, max: 50 })
    .withMessage('Student ID must be between 2 and 50 characters'),

  body('studentProfile.branch')
    .if(body('role').equals(ROLES.STUDENT))
    .trim()
    .notEmpty()
    .withMessage('Branch is required')
    .isLength({ min: 2, max: 100 })
    .withMessage('Branch must be between 2 and 100 characters'),

  body('studentProfile.graduationYear')
    .if(body('role').equals(ROLES.STUDENT))
    .notEmpty()
    .withMessage('Graduation year is required')
    .isInt({ min: 2000, max: 2100 })
    .withMessage('Graduation year must be between 2000 and 2100'),

  body('studentProfile.cgpa')
    .if(body('role').equals(ROLES.STUDENT))
    .notEmpty()
    .withMessage('CGPA is required')
    .isFloat({ min: 0.0, max: 10.0 })
    .withMessage('CGPA must be between 0.0 and 10.0'),

  // Recruiter profile validations when role is recruiter
  body('recruiterProfile')
    .if(body('role').equals(ROLES.RECRUITER))
    .notEmpty()
    .withMessage('Recruiter profile details are required for recruiter registration'),

  body('recruiterProfile.companyName')
    .if(body('role').equals(ROLES.RECRUITER))
    .trim()
    .notEmpty()
    .withMessage('Company name is required')
    .isLength({ min: 2, max: 150 })
    .withMessage('Company name must be between 2 and 150 characters'),

  body('recruiterProfile.website')
    .if(body('role').equals(ROLES.RECRUITER))
    .optional({ checkFalsy: true })
    .trim()
    .isURL()
    .withMessage('Website must be a valid URL'),

  body('recruiterProfile.designation')
    .if(body('role').equals(ROLES.RECRUITER))
    .optional()
    .trim()
    .isLength({ max: 100 })
    .withMessage('Designation cannot exceed 100 characters'),

  body('recruiterProfile.contactPhone')
    .if(body('role').equals(ROLES.RECRUITER))
    .optional()
    .trim()
    .isLength({ max: 20 })
    .withMessage('Contact phone cannot exceed 20 characters')
];

export const loginValidator = [
  body('email')
    .trim()
    .notEmpty()
    .withMessage('Email is required')
    .isEmail()
    .withMessage('Please provide a valid email address')
    .normalizeEmail(),

  body('password')
    .notEmpty()
    .withMessage('Password is required')
];

export const acceptInvitationValidator = [
  body('token')
    .trim()
    .notEmpty()
    .withMessage('Invitation token is required'),

  body('password')
    .notEmpty()
    .withMessage('Password is required')
    .isLength({ min: 8 })
    .withMessage('Password must be at least 8 characters long')
    .matches(/^(?=.*[A-Za-z])(?=.*\d)/)
    .withMessage('Password must contain at least one letter and one number')
];

