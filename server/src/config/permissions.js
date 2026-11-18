import { MEMBERSHIP_ROLES } from '../utils/constants.js';

/**
 * Canonical HireTrack v3 Role-Based Permission Matrix (org-scoped via OrganizationMembership).
 * Least-privilege per role + organization.
 */
export const PERMISSION_MATRIX = Object.freeze({
  [MEMBERSHIP_ROLES.ORG_ADMIN]: Object.freeze({
    label: 'Organization Admin',
    workspace: 'admin',
    summary: 'Manages staff, role memberships, student bulk imports, institute policies, and audit logs.',
    capabilities: Object.freeze([
      'staff:read',
      'staff:grant',
      'staff:update',
      'roles:manage',
      'students:import',
      'students:verify',
      'policies:read',
      'policies:write',
      'audit:read',
      'reports:read'
    ])
  }),
  [MEMBERSHIP_ROLES.PLACEMENT_COORDINATOR]: Object.freeze({
    label: 'Placement Coordinator',
    workspace: 'admin',
    summary: 'Manages staff-published job opportunities, advisory eligibility, application reporting, and student readiness.',
    capabilities: Object.freeze([
      'opportunities:read',
      'opportunities:write',
      'opportunities:publish',
      'eligibility:read',
      'eligibility:override',
      'applications:report',
      'readiness:read',
      'mock_tests:manage',
      'interviews:manage'
    ])
  }),
  [MEMBERSHIP_ROLES.AMBASSADOR_COORDINATOR]: Object.freeze({
    label: 'Ambassador Coordinator',
    workspace: 'admin',
    summary: 'Manages campus ambassador applications, campaigns, referral verification, and certificates.',
    capabilities: Object.freeze([
      'ambassadors:read',
      'ambassadors:verify',
      'ambassadors:campaigns',
      'ambassadors:certificates'
    ])
  }),
  [MEMBERSHIP_ROLES.INTERVIEWER]: Object.freeze({
    label: 'Interviewer',
    workspace: 'interviewer',
    summary: 'Manages own interview availability slots and evaluates only assigned human mock interview sessions.',
    capabilities: Object.freeze([
      'interviewer:profile',
      'interviewer:slots',
      'interviewer:assigned_sessions:read',
      'interviewer:evaluations:write'
    ])
  }),
  [MEMBERSHIP_ROLES.STUDENT]: Object.freeze({
    label: 'Student',
    workspace: 'student',
    summary: 'Accesses own profile, opportunities, advisory eligibility, self-reported applications, mock tests, mock interviews, readiness, and optional ambassador capability.',
    capabilities: Object.freeze([
      'student:profile:own',
      'opportunities:discover',
      'eligibility:own',
      'job_applications:own',
      'mock_tests:attempt',
      'ai_interviews:own',
      'human_interviews:book',
      'readiness:own',
      'ambassador:apply'
    ])
  })
});

export const getRolePermissions = (role) => PERMISSION_MATRIX[role] || null;
