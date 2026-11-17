import { RecruiterProfile, User } from '../models/index.js';
import { ApiError } from '../utils/ApiError.js';
import { USER_STATUSES, RECRUITER_APPROVAL_STATUSES } from '../utils/constants.js';

export const getPendingRecruiters = async ({ page = 1, limit = 10 } = {}) => {
  const pageNum = Math.max(1, parseInt(page, 10) || 1);
  const limitNum = Math.min(100, Math.max(1, parseInt(limit, 10) || 10));
  const skip = (pageNum - 1) * limitNum;

  const filter = { approvalStatus: RECRUITER_APPROVAL_STATUSES.PENDING };

  const [total, profiles] = await Promise.all([
    RecruiterProfile.countDocuments(filter),
    RecruiterProfile.find(filter)
      .populate('userId', 'name email accountStatus lastLoginAt createdAt')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limitNum)
  ]);

  const totalPages = Math.ceil(total / limitNum) || 1;

  return {
    recruiters: profiles.map((p) => p.toJSON()),
    pagination: {
      page: pageNum,
      limit: limitNum,
      total,
      totalPages,
      hasNextPage: pageNum < totalPages,
      hasPrevPage: pageNum > 1
    }
  };
};

export const updateRecruiterApproval = async (recruiterProfileId, { approvalStatus }, adminUser) => {
  if (![RECRUITER_APPROVAL_STATUSES.APPROVED, RECRUITER_APPROVAL_STATUSES.REJECTED].includes(approvalStatus)) {
    throw ApiError.badRequest("approvalStatus must be either 'approved' or 'rejected'");
  }

  const profile = await RecruiterProfile.findById(recruiterProfileId);
  if (!profile) {
    throw ApiError.notFound('Recruiter profile not found');
  }

  const user = await User.findById(profile.userId);
  if (!user) {
    throw ApiError.notFound('Associated recruiter user account not found');
  }

  // Sync statuses
  if (approvalStatus === RECRUITER_APPROVAL_STATUSES.APPROVED) {
    profile.approvalStatus = RECRUITER_APPROVAL_STATUSES.APPROVED;
    user.accountStatus = USER_STATUSES.ACTIVE;
  } else {
    profile.approvalStatus = RECRUITER_APPROVAL_STATUSES.REJECTED;
    user.accountStatus = USER_STATUSES.REJECTED;
  }

  profile.reviewedBy = adminUser._id;
  profile.reviewedAt = new Date();

  await Promise.all([profile.save(), user.save()]);

  return {
    recruiter: profile.toJSON(),
    user: user.toJSON()
  };
};

