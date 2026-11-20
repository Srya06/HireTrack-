import bcrypt from 'bcryptjs';
import crypto from 'crypto';
import {
  User,
  StudentProfile,
  RecruiterProfile,
  Organization,
  OrganizationMembership
} from '../models/index.js';
import { ApiError } from '../utils/ApiError.js';
import { signToken } from '../utils/token.js';
import { env } from '../config/env.js';
import { isFeatureEnabled } from '../config/features.js';
import {
  ROLES,
  USER_STATUSES,
  RECRUITER_APPROVAL_STATUSES,
  MEMBERSHIP_ROLES,
  MEMBERSHIP_STATUSES,
  ORGANIZATION_STATUSES,
  ERROR_CODES
} from '../utils/constants.js';

/**
 * Resolves active organization memberships and primary organization for a user.
 * Additive helper used by login, register, and GET /me.
 */
export const getUserMembershipContext = async (user) => {
  if (!user?._id) {
    return { organization: null, memberships: [] };
  }

  const memberships = await OrganizationMembership.find({
    userId: user._id,
    status: MEMBERSHIP_STATUSES.ACTIVE
  }).populate('organizationId', 'name slug timezone status');

  const activeMemberships = memberships.filter(
    (m) => m.organizationId && m.organizationId.status === ORGANIZATION_STATUSES.ACTIVE
  );

  let primaryOrg = null;
  if (activeMemberships.length > 0) {
    if (user.organizationId) {
      const matched = activeMemberships.find(
        (m) => m.organizationId._id.toString() === user.organizationId.toString()
      );
      primaryOrg = matched ? matched.organizationId : activeMemberships[0].organizationId;
    } else {
      primaryOrg = activeMemberships[0].organizationId;
    }
  }

  return {
    organization: primaryOrg ? primaryOrg.toJSON() : null,
    memberships: activeMemberships.map((m) => {
      const obj = m.toJSON();
      return {
        id: obj.id,
        organizationId: m.organizationId._id.toString(),
        role: obj.role,
        status: obj.status,
        grantedAt: obj.grantedAt
      };
    })
  };
};

export const registerUser = async (data) => {
  // Allowlist incoming fields strictly - ignore any client-sent accountStatus, organizationId, admin flags or IDs
  const { name, email, password, role, studentProfile, recruiterProfile } = data;

  if (role === ROLES.ADMIN) {
    throw ApiError.badRequest('Admin role cannot be created via public registration');
  }

  if (![ROLES.STUDENT, ROLES.RECRUITER].includes(role)) {
    throw ApiError.badRequest("Role must be either 'student' or 'recruiter'");
  }

  if (role === ROLES.STUDENT && !isFeatureEnabled('ALLOW_PUBLIC_STUDENT_SIGNUP')) {
    throw ApiError.forbidden(
      'Public student registration is currently disabled. Please contact your placement administrator.'
    );
  }

  if (role === ROLES.RECRUITER && !isFeatureEnabled('LEGACY_RECRUITER_FLOW')) {
    throw ApiError.forbidden('Recruiter registration is disabled in this deployment.');
  }

  const normalizedEmail = email.toLowerCase().trim();

  // Check email uniqueness
  const existingUser = await User.findOne({ email: normalizedEmail });
  if (existingUser) {
    throw ApiError.conflict('An account with this email address already exists', [
      { field: 'email', message: 'Email is already registered' }
    ]);
  }

  // If student, verify studentId uniqueness before creating user
  if (role === ROLES.STUDENT) {
    const existingStudent = await StudentProfile.findOne({
      studentId: studentProfile.studentId.trim()
    });
    if (existingStudent) {
      throw ApiError.conflict('A student profile with this Student ID already exists', [
        { field: 'studentProfile.studentId', message: 'Student ID is already registered' }
      ]);
    }
  }

  // Hash password with bcryptjs
  const saltRounds = 12;
  const passwordHash = await bcrypt.hash(password, saltRounds);

  // Derive account status: student is active, recruiter begins pending
  const accountStatus =
    role === ROLES.RECRUITER ? USER_STATUSES.PENDING : USER_STATUSES.ACTIVE;

  // Attach default organization if one has been seeded
  const defaultOrg = await Organization.findOne({
    slug: env.DEFAULT_ORG_SLUG,
    status: ORGANIZATION_STATUSES.ACTIVE
  });

  const user = await User.create({
    name: name.trim(),
    email: normalizedEmail,
    passwordHash,
    role,
    accountStatus,
    organizationId: defaultOrg ? defaultOrg._id : null
  });

  let profile = null;

  if (role === ROLES.STUDENT) {
    profile = await StudentProfile.create({
      userId: user._id,
      organizationId: defaultOrg ? defaultOrg._id : null,
      studentId: studentProfile.studentId.trim(),
      branch: studentProfile.branch.trim(),
      graduationYear: Number(studentProfile.graduationYear),
      cgpa: Number(studentProfile.cgpa),
      phone: studentProfile.phone ? String(studentProfile.phone).trim() : '',
      skills: Array.isArray(studentProfile.skills) ? studentProfile.skills : []
    });

    if (defaultOrg) {
      await OrganizationMembership.create({
        organizationId: defaultOrg._id,
        userId: user._id,
        role: MEMBERSHIP_ROLES.STUDENT,
        status: MEMBERSHIP_STATUSES.ACTIVE
      });
    }
  } else if (role === ROLES.RECRUITER) {
    profile = await RecruiterProfile.create({
      userId: user._id,
      companyName: recruiterProfile.companyName.trim(),
      website: recruiterProfile.website ? String(recruiterProfile.website).trim() : '',
      designation: recruiterProfile.designation ? String(recruiterProfile.designation).trim() : '',
      contactPhone: recruiterProfile.contactPhone ? String(recruiterProfile.contactPhone).trim() : '',
      description: recruiterProfile.description ? String(recruiterProfile.description).trim() : '',
      approvalStatus: RECRUITER_APPROVAL_STATUSES.PENDING
    });
  }

  const accessToken = signToken({ id: user._id, role: user.role });
  const membershipContext = await getUserMembershipContext(user);

  return {
    user: user.toJSON(),
    profile: profile ? profile.toJSON() : null,
    organization: membershipContext.organization,
    memberships: membershipContext.memberships,
    accessToken,
    token: accessToken
  };
};

export const loginUser = async ({ email, password }) => {
  const normalizedEmail = email.toLowerCase().trim();

  // Explicitly select passwordHash which is hidden by default
  const user = await User.findOne({ email: normalizedEmail }).select('+passwordHash');
  if (!user) {
    throw ApiError.unauthorized('Invalid email or password');
  }

  const isMatch = await user.comparePassword(password);
  if (!isMatch) {
    throw ApiError.unauthorized('Invalid email or password');
  }

  // Check account statuses
  if (user.accountStatus === USER_STATUSES.SUSPENDED) {
    throw ApiError.forbidden('Your account has been suspended. Please contact the placement cell.');
  }
  if (user.accountStatus === USER_STATUSES.REJECTED) {
    throw ApiError.forbidden('Your account registration was rejected.');
  }

  // Update lastLoginAt
  user.lastLoginAt = new Date();
  await user.save();

  // Load associated role profile
  let profile = null;
  if (user.role === ROLES.STUDENT) {
    profile = await StudentProfile.findOne({ userId: user._id });
  } else if (user.role === ROLES.RECRUITER) {
    profile = await RecruiterProfile.findOne({ userId: user._id });
  }

  const accessToken = signToken({ id: user._id, role: user.role });
  const membershipContext = await getUserMembershipContext(user);

  return {
    user: user.toJSON(),
    profile: profile ? profile.toJSON() : null,
    organization: membershipContext.organization,
    memberships: membershipContext.memberships,
    accessToken,
    token: accessToken
  };
};

export const acceptInvitation = async ({ token, password }) => {
  if (!token || typeof token !== 'string') {
    throw ApiError.badRequest('Invitation token is required', [], ERROR_CODES.VALIDATION_ERROR);
  }

  const tokenHash = crypto.createHash('sha256').update(token.trim()).digest('hex');

  const user = await User.findOne({
    invitationTokenHash: tokenHash,
    invitationExpiresAt: { $gt: new Date() }
  }).select('+invitationTokenHash');

  if (!user) {
    throw ApiError.badRequest(
      'Invalid or expired invitation token. Please request a new invitation from your institution administrator.',
      [],
      ERROR_CODES.VALIDATION_ERROR
    );
  }

  const saltRounds = 12;
  user.passwordHash = await bcrypt.hash(password, saltRounds);
  user.accountStatus = USER_STATUSES.ACTIVE;
  user.invitationTokenHash = null;
  user.invitationExpiresAt = null;
  user.lastLoginAt = new Date();
  await user.save();

  let profile = null;
  if (user.role === ROLES.STUDENT) {
    profile = await StudentProfile.findOne({ userId: user._id });
  }

  const accessToken = signToken({ id: user._id, role: user.role });
  const membershipContext = await getUserMembershipContext(user);

  return {
    user: user.toJSON(),
    profile: profile ? profile.toJSON() : null,
    organization: membershipContext.organization,
    memberships: membershipContext.memberships,
    accessToken,
    token: accessToken
  };
};

