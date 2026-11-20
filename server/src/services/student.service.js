import { StudentProfile } from '../models/studentProfile.model.js';
import { User } from '../models/user.model.js';
import { Organization } from '../models/organization.model.js';
import { FileAsset } from '../models/fileAsset.model.js';
import { ensureDefaultOrganization } from '../scripts/seedDefaultOrg.js';
import { ApiError } from '../utils/ApiError.js';
import { getStorageAdapter } from '../utils/storage/storageAdapter.js';
import {
  checkProfileCompleteness,
  checkProfileCompletenessV3
} from '../utils/profileCompleteness.js';
import { getSignedDownloadUrl } from '../utils/signedUrl.js';
import { scopeOrg, findByIdInOrg, paginateInOrg } from '../utils/orgScope.js';
import { recordAuditEvent } from './audit.service.js';
import { ROLES, ERROR_CODES } from '../utils/constants.js';

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

/**
 * HireTrack v3 Student Self-Profile Retrieval (GET /students/me/profile)
 * Returns student profile, v3 completeness analysis, and private signed resume URL.
 */
export const getStudentProfileV3 = async (userId) => {
  const profile = await StudentProfile.findOne({ userId }).populate(
    'userId',
    'name email role accountStatus organizationId'
  );

  if (!profile) {
    throw ApiError.notFound('Student profile not found', [], ERROR_CODES.NOT_FOUND);
  }

  const completeness = checkProfileCompleteness(profile);
  const completenessV3 = checkProfileCompletenessV3(profile);

  let signedResumeUrl = null;
  if (profile.fileAssetId) {
    signedResumeUrl = getSignedDownloadUrl(profile.fileAssetId.toString());
  }

  const profObj = profile.toJSON();
  if (signedResumeUrl) {
    profObj.signedResumeUrl = signedResumeUrl;
    if (profObj.resume) {
      profObj.resume.signedUrl = signedResumeUrl;
    }
  }

  return {
    profile: profObj,
    completeness,
    completenessV3,
    signedResumeUrl
  };
};

/**
 * HireTrack v3 Student Self-Profile Update (PATCH /students/me/profile)
 * Allows self-editing of personal/contact/bio fields.
 * Master fields (studentCode, degree, cohort, branch, graduationYear) require staff.
 */
export const updateStudentProfileV3 = async (userId, updateData) => {
  const profile = await StudentProfile.findOne({ userId }).populate(
    'userId',
    'name email role accountStatus organizationId'
  );

  if (!profile) {
    throw ApiError.notFound('Student profile not found', [], ERROR_CODES.NOT_FOUND);
  }

  // Mass-assignment check: block student from editing master academic fields
  const masterFields = [
    'studentCode',
    'studentId',
    'degree',
    'cohort',
    'course',
    'branch',
    'graduationYear',
    'verificationStatus',
    'profileVerifiedAt',
    'verifiedBy',
    'verifiedAt'
  ];

  const attemptedMasterFields = masterFields.filter((f) => updateData[f] !== undefined);
  if (attemptedMasterFields.length > 0) {
    throw ApiError.forbidden(
      `Master academic fields (${attemptedMasterFields.join(
        ', '
      )}) can only be modified by institution staff`,
      [],
      ERROR_CODES.FORBIDDEN
    );
  }

  // Student editable fields: phone, bio, skills, fullName, cgpa (if unverified or updating)
  if (updateData.phone !== undefined) {
    profile.phone = String(updateData.phone).trim();
  }
  if (updateData.bio !== undefined) {
    profile.bio = String(updateData.bio).trim();
  }
  if (updateData.skills !== undefined && Array.isArray(updateData.skills)) {
    profile.skills = updateData.skills.map((s) => String(s).trim()).filter(Boolean);
  }
  if (updateData.fullName !== undefined && String(updateData.fullName).trim()) {
    profile.fullName = String(updateData.fullName).trim();
    // Also sync User.name if student profile fullName is updated
    if (profile.userId) {
      const user = await User.findById(profile.userId._id || profile.userId);
      if (user) {
        user.name = profile.fullName;
        await user.save();
      }
    }
  }
  if (
    updateData.cgpa !== undefined &&
    updateData.cgpa !== null &&
    profile.verificationStatus !== 'verified'
  ) {
    const parsedCgpa = Number(updateData.cgpa);
    if (!isNaN(parsedCgpa) && parsedCgpa >= 0 && parsedCgpa <= 10) {
      profile.cgpa = parsedCgpa;
    }
  }

  await profile.save();

  const completeness = checkProfileCompleteness(profile);
  const completenessV3 = checkProfileCompletenessV3(profile);

  let signedResumeUrl = null;
  if (profile.fileAssetId) {
    signedResumeUrl = getSignedDownloadUrl(profile.fileAssetId.toString());
  }

  const profObj = profile.toJSON();
  if (signedResumeUrl) {
    profObj.signedResumeUrl = signedResumeUrl;
    if (profObj.resume) {
      profObj.resume.signedUrl = signedResumeUrl;
    }
  }

  return {
    profile: profObj,
    completeness,
    completenessV3,
    signedResumeUrl
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

  // Resolve organization
  let orgId = profile.organizationId;
  if (!orgId) {
    const { organization } = await ensureDefaultOrganization();
    orgId = organization?._id || null;
    if (orgId) {
      profile.organizationId = orgId;
    }
  }

  // Create or update private FileAsset record
  const fileAsset = await FileAsset.create({
    organizationId: orgId,
    ownerId: userId,
    purpose: 'resume',
    originalName: file.originalname,
    fileName: resumeMetadata.fileName || file.originalname,
    mimeType: file.mimetype,
    size: file.buffer?.length || resumeMetadata.size,
    storageProvider: 'local',
    storageKey: resumeMetadata.publicId || `resume_${Date.now()}`,
    isPrivate: true
  });

  profile.resume = resumeMetadata;
  profile.resumeObjectKey = fileAsset.storageKey;
  profile.fileAssetId = fileAsset._id;
  await profile.save();

  const signedUrl = getSignedDownloadUrl(fileAsset._id.toString());
  resumeMetadata.signedUrl = signedUrl;

  const completeness = checkProfileCompleteness(profile);

  return {
    profile: profile.toJSON(),
    resume: resumeMetadata,
    completeness,
    signedResumeUrl: signedUrl
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
  } else if (requesterUser.role !== ROLES.ADMIN) {
    throw ApiError.forbidden(
      'Access denied: Only the student or an administrator can modify this profile'
    );
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

/**
 * Staff-level Student Directory (GET /admin/students)
 * Scoped strictly to organizationId.
 */
export const listStudentsAdmin = async (
  organizationId,
  {
    page = 1,
    limit = 20,
    q = '',
    branch = '',
    degree = '',
    cohort = '',
    verificationStatus = '',
    accountStatus = ''
  } = {}
) => {
  const filter = {};

  if (branch) filter.branch = branch;
  if (degree) filter.degree = degree;
  if (cohort) filter.cohort = cohort;
  if (verificationStatus) filter.verificationStatus = verificationStatus;

  // Search by name, email, or studentCode
  if (q && q.trim()) {
    const escaped = q.trim().replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const regex = new RegExp(escaped, 'i');

    const matchingUsers = await User.find(
      scopeOrg(organizationId, {
        $or: [{ name: regex }, { email: regex }]
      }),
      { _id: 1 }
    ).lean();

    const userIds = matchingUsers.map((u) => u._id);

    filter.$or = [
      { studentCode: regex },
      { studentId: regex },
      { fullName: regex },
      { userId: { $in: userIds } }
    ];
  }

  const { items, pagination } = await paginateInOrg(StudentProfile, filter, organizationId, {
    page,
    limit,
    sort: { createdAt: -1 },
    populate: [
      { path: 'userId', select: 'name email role accountStatus organizationId lastLoginAt' },
      { path: 'verifiedBy', select: 'name email' }
    ]
  });

  const studentsWithSignedUrls = items.map((p) => {
    const obj = p.toJSON();
    if (obj.fileAssetId) {
      obj.signedResumeUrl = getSignedDownloadUrl(obj.fileAssetId.toString());
      if (obj.resume) {
        obj.resume.signedUrl = obj.signedResumeUrl;
      }
    }
    return obj;
  });

  return {
    students: studentsWithSignedUrls,
    pagination
  };
};

/**
 * Staff-level Student Profile Master Field Update & Verification (PATCH /admin/students/:id)
 * Scoped strictly to organizationId. Audited via recordAuditEvent.
 */
export const updateStudentByStaff = async (
  organizationId,
  actorUser,
  studentProfileId,
  updateData
) => {
  const profile = await findByIdInOrg(StudentProfile, studentProfileId, organizationId, {
    populate: { path: 'userId', select: 'name email role accountStatus' }
  });

  if (!profile) {
    throw ApiError.notFound(
      'Student profile not found in your organization',
      [],
      ERROR_CODES.NOT_FOUND
    );
  }

  const previousState = {
    studentCode: profile.studentCode,
    branch: profile.branch,
    degree: profile.degree,
    cohort: profile.cohort,
    cgpa: profile.cgpa,
    verificationStatus: profile.verificationStatus
  };

  // Staff can update master fields
  if (updateData.studentCode !== undefined && String(updateData.studentCode).trim()) {
    profile.studentCode = String(updateData.studentCode).trim();
    profile.studentId = profile.studentCode;
  }
  if (updateData.fullName !== undefined && String(updateData.fullName).trim()) {
    profile.fullName = String(updateData.fullName).trim();
    if (profile.userId) {
      await User.findByIdAndUpdate(profile.userId._id || profile.userId, {
        name: profile.fullName
      });
    }
  }
  if (updateData.branch !== undefined) profile.branch = String(updateData.branch).trim();
  if (updateData.degree !== undefined) profile.degree = String(updateData.degree).trim();
  if (updateData.cohort !== undefined) {
    profile.cohort = String(updateData.cohort).trim();
    profile.course = profile.cohort;
  }
  if (updateData.graduationYear !== undefined) {
    const yr = Number(updateData.graduationYear);
    if (!isNaN(yr) && yr >= 2000 && yr <= 2100) profile.graduationYear = yr;
  }
  if (updateData.cgpa !== undefined && updateData.cgpa !== null) {
    const cg = Number(updateData.cgpa);
    if (!isNaN(cg) && cg >= 0 && cg <= 10) profile.cgpa = cg;
  }
  if (updateData.phone !== undefined) profile.phone = String(updateData.phone).trim();
  if (updateData.backlogs !== undefined) profile.backlogs = Number(updateData.backlogs) || 0;

  // Verification status update
  if (updateData.verificationStatus !== undefined) {
    profile.verificationStatus = updateData.verificationStatus;
    if (updateData.verificationStatus === 'verified') {
      profile.profileVerifiedAt = new Date();
      profile.verifiedBy = actorUser._id;
      profile.verifiedAt = new Date();
    } else {
      profile.profileVerifiedAt = null;
      profile.verifiedBy = null;
      profile.verifiedAt = null;
    }
  }

  await profile.save();

  // Audit action
  await recordAuditEvent({
    organizationId,
    actorId: actorUser._id,
    action:
      updateData.verificationStatus === 'verified'
        ? 'STUDENT_PROFILE_VERIFIED'
        : 'STUDENT_PROFILE_MASTER_UPDATED',
    entityType: 'StudentProfile',
    entityId: profile._id,
    metadata: {
      studentCode: profile.studentCode,
      previousState,
      newState: {
        studentCode: profile.studentCode,
        branch: profile.branch,
        degree: profile.degree,
        cohort: profile.cohort,
        cgpa: profile.cgpa,
        verificationStatus: profile.verificationStatus
      }
    },
    allowedMetadataKeys: ['studentCode', 'previousState', 'newState']
  });

  return profile.toJSON();
};
