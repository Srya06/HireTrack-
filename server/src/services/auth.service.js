import bcrypt from 'bcryptjs';
import { User, StudentProfile, RecruiterProfile } from '../models/index.js';
import { ApiError } from '../utils/ApiError.js';
import { signToken } from '../utils/token.js';
import { ROLES, USER_STATUSES, RECRUITER_APPROVAL_STATUSES } from '../utils/constants.js';

export const registerUser = async (data) => {
  // Allowlist incoming fields strictly - ignore any client-sent accountStatus, admin flags or IDs
  const { name, email, password, role, studentProfile, recruiterProfile } = data;

  if (role === ROLES.ADMIN) {
    throw ApiError.badRequest('Admin role cannot be created via public registration');
  }

  if (![ROLES.STUDENT, ROLES.RECRUITER].includes(role)) {
    throw ApiError.badRequest("Role must be either 'student' or 'recruiter'");
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

  const user = await User.create({
    name: name.trim(),
    email: normalizedEmail,
    passwordHash,
    role,
    accountStatus
  });

  let profile = null;

  if (role === ROLES.STUDENT) {
    profile = await StudentProfile.create({
      userId: user._id,
      studentId: studentProfile.studentId.trim(),
      branch: studentProfile.branch.trim(),
      graduationYear: Number(studentProfile.graduationYear),
      cgpa: Number(studentProfile.cgpa),
      phone: studentProfile.phone ? String(studentProfile.phone).trim() : '',
      skills: Array.isArray(studentProfile.skills) ? studentProfile.skills : []
    });
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

  return {
    user: user.toJSON(),
    profile: profile ? profile.toJSON() : null,
    accessToken
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

  return {
    user: user.toJSON(),
    profile: profile ? profile.toJSON() : null,
    accessToken
  };
};
