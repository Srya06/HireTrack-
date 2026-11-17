import { StudentProfile } from '../models/studentProfile.model.js';
import { ApiError } from '../utils/ApiError.js';
import { getStorageAdapter } from '../utils/storage/storageAdapter.js';
import { checkProfileCompleteness } from '../utils/profileCompleteness.js';
import { ROLES } from '../utils/constants.js';

export const getStudentProfile = async (userId) => {
  const profile = await StudentProfile.findOne({ userId });
  if (!profile) {
    throw ApiError.notFound('Student profile not found');
  }

  const completeness = checkProfileCompleteness(profile);

  return {
    profile: profile.toJSON(),
    completeness
  };
};

export const updateStudentProfile = async (userId, updateData) => {
  const profile = await StudentProfile.findOne({ userId });
  if (!profile) {
    throw ApiError.notFound('Student profile not found');
  }

  // Strict allowlist: never spread updateData
  const allowedFields = ['branch', 'graduationYear', 'cgpa', 'skills', 'bio', 'phone'];

  for (const field of allowedFields) {
    if (updateData[field] !== undefined) {
      if (field === 'cgpa' || field === 'graduationYear') {
        profile[field] = Number(updateData[field]);
      } else if (field === 'skills' && Array.isArray(updateData[field])) {
        profile[field] = updateData[field].map((s) => String(s).trim()).filter(Boolean);
      } else if (typeof updateData[field] === 'string') {
        profile[field] = updateData[field].trim();
      }
    }
  }

  await profile.save();
  const completeness = checkProfileCompleteness(profile);

  return {
    profile: profile.toJSON(),
    completeness
  };
};

export const uploadResume = async (userId, file) => {
  const profile = await StudentProfile.findOne({ userId });
  if (!profile) {
    throw ApiError.notFound('Student profile not found');
  }

  const storage = getStorageAdapter();

  // If replacing an existing resume, clean up old asset
  if (profile.resume && profile.resume.publicId) {
    await storage.delete(profile.resume.publicId).catch(() => {});
  }

  const resumeMetadata = await storage.upload(file.buffer, {
    filename: file.originalname,
    mimetype: file.mimetype
  });

  profile.resume = resumeMetadata;
  await profile.save();

  const completeness = checkProfileCompleteness(profile);

  return {
    profile: profile.toJSON(),
    resume: resumeMetadata,
    completeness
  };
};

/**
 * Handle direct ID updates with strict role & ownership enforcement (STU-02)
 */
export const updateStudentProfileById = async (requesterUser, targetId, updateData) => {
  // If student is trying to touch an ID other than their own, block with 403
  if (requesterUser.role === ROLES.STUDENT) {
    const isOwnUser = requesterUser._id.toString() === targetId.toString();
    const isOwnProfile = requesterUser.profile?._id?.toString() === targetId.toString();

    if (!isOwnUser && !isOwnProfile) {
      throw ApiError.forbidden("Access denied: You cannot modify another student's profile");
    }
  }

  // Target may be profile ID or user ID
  let profile = await StudentProfile.findById(targetId);
  if (!profile) {
    profile = await StudentProfile.findOne({ userId: targetId });
  }

  if (!profile) {
    throw ApiError.notFound('Student profile not found');
  }

  return updateStudentProfile(profile.userId, updateData);
};
