import { RecruiterProfile } from '../models/recruiterProfile.model.js';
import { ApiError } from '../utils/ApiError.js';

export const getRecruiterProfile = async (userId) => {
  const profile = await RecruiterProfile.findOne({ userId });
  if (!profile) {
    throw ApiError.notFound('Recruiter profile not found');
  }

  return profile.toJSON();
};

export const updateRecruiterProfile = async (userId, updateData) => {
  const profile = await RecruiterProfile.findOne({ userId });
  if (!profile) {
    throw ApiError.notFound('Recruiter profile not found');
  }

  // Strict allowlist: only recruiter-managed fields
  const allowedFields = ['companyName', 'website', 'designation', 'contactPhone', 'description'];

  for (const field of allowedFields) {
    if (updateData[field] !== undefined) {
      profile[field] = typeof updateData[field] === 'string' ? updateData[field].trim() : updateData[field];
    }
  }

  await profile.save();
  return profile.toJSON();
};
