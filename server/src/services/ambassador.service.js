import crypto from 'crypto';
import mongoose from 'mongoose';
import {
  AmbassadorProfile,
  AmbassadorCampaign,
  AmbassadorReferralCode,
  ReferredParticipant,
  AmbassadorCertificate,
  StudentProfile,
  User
} from '../models/index.js';
import {
  AMBASSADOR_PROFILE_STATUSES,
  AMBASSADOR_CAMPAIGN_STATUSES,
  REFERRED_PARTICIPANT_STATUSES,
  AMBASSADOR_CERTIFICATE_STATUSES
} from '../utils/constants.js';
import { recordAuditLog } from './audit.service.js';
import { createNotification } from './notification.service.js';

// --- Crypto & Masking Helpers ---

export const generateReferralCode = () => {
  return `HT-${crypto.randomBytes(4).toString('hex').toUpperCase()}`;
};

export const computeDedupeKey = (campaignId, email, phone) => {
  const normEmail = (email || '').trim().toLowerCase();
  const rawDigits = (phone || '').trim().replace(/\D/g, '');
  const normPhone = rawDigits.length >= 10 ? rawDigits.slice(-10) : rawDigits;
  return crypto
    .createHash('sha256')
    .update(`${campaignId}:${normEmail}:${normPhone}`)
    .digest('hex');
};

export const maskName = (name) => {
  if (!name) return '***';
  const parts = name.trim().split(/\s+/);
  return parts.map((p) => p[0] + '*'.repeat(Math.max(1, p.length - 1))).join(' ');
};

export const maskEmail = (email) => {
  if (!email || !email.includes('@')) return '***@***.com';
  const [user, domain] = email.split('@');
  const maskedUser = user.length > 1 ? user[0] + '*'.repeat(user.length - 1) : '*';
  const domainParts = domain.split('.');
  const maskedDomain = domainParts
    .map((d, i) => (i === domainParts.length - 1 ? d : d[0] + '*'.repeat(Math.max(1, d.length - 1))))
    .join('.');
  return `${maskedUser}@${maskedDomain}`;
};

export const maskPhone = (phone) => {
  if (!phone) return '******';
  const clean = phone.replace(/\D/g, '');
  if (clean.length <= 4) return '****';
  return '*'.repeat(clean.length - 4) + clean.slice(-4);
};

// --- Student Ambassador Operations ---

/**
 * Student applies to become a campus ambassador.
 */
export const applyForAmbassador = async (organizationId, userId, applicationNotes = '', reqMeta = {}) => {
  const orgId = new mongoose.Types.ObjectId(organizationId);
  const uId = new mongoose.Types.ObjectId(userId);

  const studentProfile = await StudentProfile.findOne({
    organizationId: orgId,
    userId: uId
  });

  if (!studentProfile) {
    const err = new Error('Student profile not found. Please complete your student profile first.');
    err.statusCode = 404;
    throw err;
  }

  let existing = await AmbassadorProfile.findOne({
    organizationId: orgId,
    studentProfileId: studentProfile._id
  });

  if (existing) {
    if (existing.status === AMBASSADOR_PROFILE_STATUSES.PENDING) {
      const err = new Error('Your ambassador application is already pending coordinator review.');
      err.statusCode = 409;
      throw err;
    }
    if (existing.status === AMBASSADOR_PROFILE_STATUSES.APPROVED) {
      const err = new Error('You are already an approved campus ambassador.');
      err.statusCode = 409;
      throw err;
    }
    // If previously rejected, allow re-applying by updating status to PENDING
    existing.status = AMBASSADOR_PROFILE_STATUSES.PENDING;
    existing.applicationNotes = applicationNotes;
    existing.rejectedBy = null;
    existing.rejectedAt = null;
    existing.rejectionReason = null;
    await existing.save();

    await recordAuditLog({
      organizationId: orgId,
      actor: { id: uId, role: 'student' },
      action: 'REAPPLY_AMBASSADOR',
      resourceType: 'AmbassadorProfile',
      resourceId: existing._id,
      metadata: { applicationNotes },
      ipAddress: reqMeta.ipAddress,
      userAgent: reqMeta.userAgent
    });

    return existing;
  }

  const newProfile = await AmbassadorProfile.create({
    organizationId: orgId,
    studentProfileId: studentProfile._id,
    userId: uId,
    status: AMBASSADOR_PROFILE_STATUSES.PENDING,
    applicationNotes
  });

  await recordAuditLog({
    organizationId: orgId,
    actor: { id: uId, role: 'student' },
    action: 'APPLY_AMBASSADOR',
    resourceType: 'AmbassadorProfile',
    resourceId: newProfile._id,
    metadata: { applicationNotes },
    ipAddress: reqMeta.ipAddress,
    userAgent: reqMeta.userAgent
  });

  return newProfile;
};

/**
 * Returns student's own ambassador status, active campaign, referral code, verified counts, and certificate status.
 */
export const getMyAmbassadorStatus = async (organizationId, userId) => {
  const orgId = new mongoose.Types.ObjectId(organizationId);
  const uId = new mongoose.Types.ObjectId(userId);

  const profile = await AmbassadorProfile.findOne({
    organizationId: orgId,
    userId: uId
  }).populate('studentProfileId', 'fullName rollNumber studentId degree branch');

  if (!profile) {
    return {
      isAmbassador: false,
      profile: null,
      activeCampaign: null,
      referralCode: null,
      stats: null,
      certificate: null
    };
  }

  // Find active campaign in org
  const now = new Date();
  const activeCampaign = await AmbassadorCampaign.findOne({
    organizationId: orgId,
    status: AMBASSADOR_CAMPAIGN_STATUSES.ACTIVE,
    startsAt: { $lte: now },
    endsAt: { $gte: now }
  }).sort({ createdAt: -1 });

  let referralCode = null;
  let stats = {
    totalCaptured: 0,
    verifiedCount: 0,
    pendingCount: 0,
    duplicateCount: 0,
    rejectedCount: 0,
    targetCount: activeCampaign?.targetCount || 10,
    progressPercentage: 0
  };
  let certificate = null;

  if (profile.status === AMBASSADOR_PROFILE_STATUSES.APPROVED && activeCampaign) {
    // Find or provision code
    referralCode = await AmbassadorReferralCode.findOne({
      organizationId: orgId,
      ambassadorProfileId: profile._id,
      campaignId: activeCampaign._id,
      active: true
    });

    if (!referralCode) {
      let code = generateReferralCode();
      let exists = await AmbassadorReferralCode.findOne({ code });
      while (exists) {
        code = generateReferralCode();
        exists = await AmbassadorReferralCode.findOne({ code });
      }

      referralCode = await AmbassadorReferralCode.create({
        organizationId: orgId,
        ambassadorProfileId: profile._id,
        campaignId: activeCampaign._id,
        code,
        active: true
      });
    }

    // Tally participant stats
    const participants = await ReferredParticipant.find({
      organizationId: orgId,
      ambassadorProfileId: profile._id,
      campaignId: activeCampaign._id
    });

    stats.totalCaptured = participants.length;
    participants.forEach((p) => {
      if (p.verificationStatus === REFERRED_PARTICIPANT_STATUSES.VERIFIED) stats.verifiedCount++;
      else if (p.verificationStatus === REFERRED_PARTICIPANT_STATUSES.PENDING) stats.pendingCount++;
      else if (p.verificationStatus === REFERRED_PARTICIPANT_STATUSES.DUPLICATE) stats.duplicateCount++;
      else if (p.verificationStatus === REFERRED_PARTICIPANT_STATUSES.REJECTED) stats.rejectedCount++;
    });

    const target = activeCampaign.targetCount || 1;
    stats.progressPercentage = Math.min(100, Math.round((stats.verifiedCount / target) * 100));

    // Find certificate
    certificate = await AmbassadorCertificate.findOne({
      organizationId: orgId,
      ambassadorProfileId: profile._id,
      campaignId: activeCampaign._id
    });
  }

  const appBaseUrl = process.env.APP_BASE_URL || 'http://localhost:5173';
  const referralLink = referralCode ? `${appBaseUrl}/referral?code=${referralCode.code}` : null;

  return {
    isAmbassador: true,
    profile: {
      id: profile._id,
      status: profile.status,
      applicationNotes: profile.applicationNotes,
      approvedAt: profile.approvedAt,
      rejectedAt: profile.rejectedAt,
      rejectionReason: profile.rejectionReason,
      suspendedAt: profile.suspendedAt,
      suspensionReason: profile.suspensionReason
    },
    activeCampaign: activeCampaign
      ? {
          id: activeCampaign._id,
          name: activeCampaign.name,
          description: activeCampaign.description,
          targetCount: activeCampaign.targetCount,
          startsAt: activeCampaign.startsAt,
          endsAt: activeCampaign.endsAt,
          verificationRules: activeCampaign.verificationRules
        }
      : null,
    referralCode: referralCode ? referralCode.code : null,
    referralLink,
    stats,
    certificate: certificate
      ? {
          id: certificate._id,
          status: certificate.status,
          certificateNumber: certificate.certificateNumber,
          certificateObjectKey: certificate.certificateObjectKey,
          issuedAt: certificate.issuedAt,
          metadata: certificate.metadata
        }
      : null
  };
};

/**
 * Ambassador views own captured referrals with masked contact information.
 */
export const getMyReferrals = async (organizationId, userId, filters = {}) => {
  const orgId = new mongoose.Types.ObjectId(organizationId);
  const uId = new mongoose.Types.ObjectId(userId);

  const profile = await AmbassadorProfile.findOne({
    organizationId: orgId,
    userId: uId
  });

  if (!profile) {
    const err = new Error('Ambassador profile not found.');
    err.statusCode = 404;
    throw err;
  }

  const query = {
    organizationId: orgId,
    ambassadorProfileId: profile._id
  };

  if (filters.campaignId) {
    query.campaignId = new mongoose.Types.ObjectId(filters.campaignId);
  }

  const page = Math.max(1, parseInt(filters.page, 10) || 1);
  const limit = Math.min(100, Math.max(1, parseInt(filters.limit, 10) || 20));
  const skip = (page - 1) * limit;

  const [total, participants] = await Promise.all([
    ReferredParticipant.countDocuments(query),
    ReferredParticipant.find(query)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .populate('campaignId', 'name')
      .lean()
  ]);

  // Mask PII before returning to the ambassador
  const masked = participants.map((p) => ({
    id: p._id,
    campaignName: p.campaignId?.name || 'Campaign',
    maskedName: maskName(p.name),
    maskedEmail: maskEmail(p.email),
    maskedPhone: maskPhone(p.phone),
    institute: p.institute,
    verificationStatus: p.verificationStatus,
    reason: p.reason,
    capturedAt: p.createdAt
  }));

  return {
    referrals: masked,
    pagination: {
      page,
      limit,
      total,
      pages: Math.ceil(total / limit)
    }
  };
};

/**
 * Ambassador requests certificate review when eligible.
 */
export const requestCertificateReview = async (organizationId, userId, campaignId, reqMeta = {}) => {
  const orgId = new mongoose.Types.ObjectId(organizationId);
  const uId = new mongoose.Types.ObjectId(userId);
  const cId = new mongoose.Types.ObjectId(campaignId);

  const profile = await AmbassadorProfile.findOne({
    organizationId: orgId,
    userId: uId
  }).populate('studentProfileId', 'fullName studentId');

  if (!profile || profile.status !== AMBASSADOR_PROFILE_STATUSES.APPROVED) {
    const err = new Error('Approved ambassador profile is required to request a certificate.');
    err.statusCode = 403;
    throw err;
  }

  const campaign = await AmbassadorCampaign.findOne({
    _id: cId,
    organizationId: orgId
  });

  if (!campaign) {
    const err = new Error('Campaign not found.');
    err.statusCode = 404;
    throw err;
  }

  const verifiedCount = await ReferredParticipant.countDocuments({
    organizationId: orgId,
    ambassadorProfileId: profile._id,
    campaignId: cId,
    verificationStatus: REFERRED_PARTICIPANT_STATUSES.VERIFIED
  });

  if (verifiedCount < campaign.targetCount) {
    const err = new Error(
      `Certificate requirement not met. Verified referrals: ${verifiedCount}/${campaign.targetCount}`
    );
    err.statusCode = 400;
    throw err;
  }

  let cert = await AmbassadorCertificate.findOne({
    organizationId: orgId,
    ambassadorProfileId: profile._id,
    campaignId: cId
  });

  if (!cert) {
    cert = await AmbassadorCertificate.create({
      organizationId: orgId,
      ambassadorProfileId: profile._id,
      campaignId: cId,
      status: AMBASSADOR_CERTIFICATE_STATUSES.UNDER_REVIEW,
      metadata: {
        recipientName: profile.studentProfileId?.fullName,
        recipientCollege: profile.studentProfileId?.studentId,
        campaignName: campaign.name,
        verifiedCount,
        targetCount: campaign.targetCount,
        includeBranding: false
      }
    });
  } else {
    cert.status = AMBASSADOR_CERTIFICATE_STATUSES.UNDER_REVIEW;
    cert.metadata.verifiedCount = verifiedCount;
    cert.metadata.targetCount = campaign.targetCount;
    await cert.save();
  }

  await recordAuditLog({
    organizationId: orgId,
    actor: { id: uId, role: 'student' },
    action: 'REQUEST_AMBASSADOR_CERTIFICATE',
    resourceType: 'AmbassadorCertificate',
    resourceId: cert._id,
    metadata: { campaignId, verifiedCount, targetCount: campaign.targetCount },
    ipAddress: reqMeta.ipAddress,
    userAgent: reqMeta.userAgent
  });

  return cert;
};

// --- Public Referral Capture ---

/**
 * Public endpoint to capture referral participation.
 * Validates referral code, active campaign dates, and approved ambassador status.
 * Evaluates duplicate status via normalized dedupeKey.
 */
export const capturePublicReferral = async (data, reqMeta = {}) => {
  const { code, name, email, phone, institute, notes } = data;

  if (!code || !name || !email || !phone || !institute) {
    const err = new Error('Code, name, email, phone, and institute are required.');
    err.statusCode = 400;
    throw err;
  }

  const referralCode = await AmbassadorReferralCode.findOne({
    code: String(code).trim().toUpperCase(),
    active: true
  }).populate('ambassadorProfileId').populate('campaignId');

  if (!referralCode || !referralCode.active) {
    const err = new Error('Invalid or inactive referral code.');
    err.statusCode = 404;
    throw err;
  }

  const ambassador = referralCode.ambassadorProfileId;
  if (!ambassador || ambassador.status !== AMBASSADOR_PROFILE_STATUSES.APPROVED) {
    const err = new Error('The ambassador associated with this referral code is not active.');
    err.statusCode = 400;
    throw err;
  }

  const campaign = referralCode.campaignId;
  const now = new Date();
  if (!campaign || campaign.status !== AMBASSADOR_CAMPAIGN_STATUSES.ACTIVE || now < campaign.startsAt || now > campaign.endsAt) {
    const err = new Error('This ambassador campaign is not currently active.');
    err.statusCode = 400;
    throw err;
  }

  const dedupeKey = computeDedupeKey(campaign._id, email, phone);
  const normEmail = email.trim().toLowerCase();

  // Check if participant already exists in this campaign (by dedupeKey or normalized email)
  const existingReferral = await ReferredParticipant.findOne({
    campaignId: campaign._id,
    $or: [{ dedupeKey }, { email: normEmail }]
  });

  let verificationStatus = REFERRED_PARTICIPANT_STATUSES.PENDING;
  let reason = null;

  if (existingReferral) {
    verificationStatus = REFERRED_PARTICIPANT_STATUSES.DUPLICATE;
    reason = 'Duplicate participant email or phone submitted for this campaign';
  }

  const participant = await ReferredParticipant.create({
    organizationId: referralCode.organizationId,
    codeId: referralCode._id,
    campaignId: campaign._id,
    ambassadorProfileId: ambassador._id,
    name: name.trim(),
    email: email.trim().toLowerCase(),
    phone: phone.trim(),
    institute: institute.trim(),
    dedupeKey,
    verificationStatus,
    reason,
    notes: notes?.trim() || null,
    ipAddress: reqMeta.ipAddress || null,
    userAgent: reqMeta.userAgent || null
  });

  return {
    success: true,
    message: verificationStatus === REFERRED_PARTICIPANT_STATUSES.DUPLICATE
      ? 'Referral captured for review (marked duplicate)'
      : 'Referral captured successfully',
    referralId: participant._id,
    verificationStatus: participant.verificationStatus
  };
};

// --- Coordinator & Admin Operations ---

/**
 * List ambassador applications with student details.
 */
export const getAmbassadorProfilesAdmin = async (organizationId, filters = {}) => {
  const orgId = new mongoose.Types.ObjectId(organizationId);
  const query = { organizationId: orgId };

  if (filters.status) {
    query.status = filters.status;
  }

  const page = Math.max(1, parseInt(filters.page, 10) || 1);
  const limit = Math.min(100, Math.max(1, parseInt(filters.limit, 10) || 20));
  const skip = (page - 1) * limit;

  const [total, profiles] = await Promise.all([
    AmbassadorProfile.countDocuments(query),
    AmbassadorProfile.find(query)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .populate('studentProfileId', 'fullName rollNumber studentId degree branch cgpa')
      .populate('userId', 'email')
      .populate('approvedBy', 'name email')
      .lean()
  ]);

  return {
    profiles: profiles.map((p) => ({
      id: p._id,
      userId: p.userId?._id,
      email: p.userId?.email,
      fullName: p.studentProfileId?.fullName,
      rollNumber: p.studentProfileId?.studentId || p.studentProfileId?.rollNumber,
      degree: p.studentProfileId?.degree,
      branch: p.studentProfileId?.branch,
      status: p.status,
      applicationNotes: p.applicationNotes,
      approvedBy: p.approvedBy?.name,
      approvedAt: p.approvedAt,
      rejectionReason: p.rejectionReason,
      suspensionReason: p.suspensionReason,
      createdAt: p.createdAt
    })),
    pagination: {
      page,
      limit,
      total,
      pages: Math.ceil(total / limit)
    }
  };
};

/**
 * Coordinator approves, rejects, or suspends an ambassador profile.
 * Reason required for rejection/suspension. Audited.
 * Guard: Ambassador cannot approve own profile.
 */
export const updateAmbassadorStatusAdmin = async (organizationId, profileId, { status, reason }, actor, reqMeta = {}) => {
  const orgId = new mongoose.Types.ObjectId(organizationId);

  if (![AMBASSADOR_PROFILE_STATUSES.APPROVED, AMBASSADOR_PROFILE_STATUSES.REJECTED, AMBASSADOR_PROFILE_STATUSES.SUSPENDED].includes(status)) {
    const err = new Error('Invalid ambassador status transition.');
    err.statusCode = 400;
    throw err;
  }

  if ((status === AMBASSADOR_PROFILE_STATUSES.REJECTED || status === AMBASSADOR_PROFILE_STATUSES.SUSPENDED) && !reason?.trim()) {
    const err = new Error('A reason is required when rejecting or suspending an ambassador.');
    err.statusCode = 400;
    throw err;
  }

  const profile = await AmbassadorProfile.findOne({
    _id: profileId,
    organizationId: orgId
  });

  if (!profile) {
    const err = new Error('Ambassador profile not found.');
    err.statusCode = 404;
    throw err;
  }

  // Anti-self-approval guard
  if (profile.userId.toString() === actor.id.toString()) {
    const err = new Error('Forbidden: An ambassador cannot approve or modify their own ambassador status.');
    err.statusCode = 403;
    throw err;
  }

  const previousStatus = profile.status;
  profile.status = status;

  if (status === AMBASSADOR_PROFILE_STATUSES.APPROVED) {
    profile.approvedBy = actor._id || actor.id;
    profile.approvedAt = new Date();
    profile.rejectedBy = null;
    profile.rejectedAt = null;
    profile.rejectionReason = null;
    profile.suspendedBy = null;
    profile.suspendedAt = null;
    profile.suspensionReason = null;

    // Automatically provision a referral code for the active campaign
    const now = new Date();
    const activeCampaign = await AmbassadorCampaign.findOne({
      organizationId: orgId,
      status: AMBASSADOR_CAMPAIGN_STATUSES.ACTIVE,
      startsAt: { $lte: now },
      endsAt: { $gte: now }
    });

    if (activeCampaign) {
      const existingCode = await AmbassadorReferralCode.findOne({
        organizationId: orgId,
        ambassadorProfileId: profile._id,
        campaignId: activeCampaign._id
      });
      if (!existingCode) {
        let code = generateReferralCode();
        let codeExists = await AmbassadorReferralCode.findOne({ code });
        while (codeExists) {
          code = generateReferralCode();
          codeExists = await AmbassadorReferralCode.findOne({ code });
        }
        await AmbassadorReferralCode.create({
          organizationId: orgId,
          ambassadorProfileId: profile._id,
          campaignId: activeCampaign._id,
          code,
          active: true
        });
      }
    }
  } else if (status === AMBASSADOR_PROFILE_STATUSES.REJECTED) {
    profile.rejectedBy = actor._id || actor.id;
    profile.rejectedAt = new Date();
    profile.rejectionReason = reason.trim();
  } else if (status === AMBASSADOR_PROFILE_STATUSES.SUSPENDED) {
    profile.suspendedBy = actor._id || actor.id;
    profile.suspendedAt = new Date();
    profile.suspensionReason = reason.trim();

    // Deactivate active referral codes
    await AmbassadorReferralCode.updateMany(
      { organizationId: orgId, ambassadorProfileId: profile._id },
      { active: false }
    );
  }

  await profile.save();

  await recordAuditLog({
    organizationId: orgId,
    actor: { id: actor._id || actor.id, role: actor.role || 'staff' },
    action: 'UPDATE_AMBASSADOR_STATUS',
    resourceType: 'AmbassadorProfile',
    resourceId: profile._id,
    metadata: { previousStatus, newStatus: status, reason: reason?.trim() || null },
    ipAddress: reqMeta.ipAddress,
    userAgent: reqMeta.userAgent
  });

  return profile;
};

// --- Campaign Admin Operations ---

export const createCampaignAdmin = async (organizationId, campaignData, actor, reqMeta = {}) => {
  const orgId = new mongoose.Types.ObjectId(organizationId);

  const { name, description, targetCount, startsAt, endsAt, verificationRules } = campaignData;

  if (!name || !startsAt || !endsAt) {
    const err = new Error('Campaign name, start date, and end date are required.');
    err.statusCode = 400;
    throw err;
  }

  if (new Date(endsAt) <= new Date(startsAt)) {
    const err = new Error('Campaign end date must be after the start date.');
    err.statusCode = 400;
    throw err;
  }

  const campaign = await AmbassadorCampaign.create({
    organizationId: orgId,
    name: name.trim(),
    description: description?.trim(),
    targetCount: parseInt(targetCount, 10) || 10,
    startsAt: new Date(startsAt),
    endsAt: new Date(endsAt),
    verificationRules: verificationRules || {},
    status: AMBASSADOR_CAMPAIGN_STATUSES.ACTIVE,
    createdBy: actor._id || actor.id
  });

  await recordAuditLog({
    organizationId: orgId,
    actor: { id: actor._id || actor.id, role: actor.role || 'staff' },
    action: 'CREATE_AMBASSADOR_CAMPAIGN',
    resourceType: 'AmbassadorCampaign',
    resourceId: campaign._id,
    metadata: { name: campaign.name, targetCount: campaign.targetCount },
    ipAddress: reqMeta.ipAddress,
    userAgent: reqMeta.userAgent
  });

  return campaign;
};

export const getCampaignsAdmin = async (organizationId, filters = {}) => {
  const orgId = new mongoose.Types.ObjectId(organizationId);
  const query = { organizationId: orgId };

  if (filters.status) {
    query.status = filters.status;
  }

  const campaigns = await AmbassadorCampaign.find(query)
    .sort({ createdAt: -1 })
    .populate('createdBy', 'name email')
    .lean();

  return campaigns;
};

export const updateCampaignAdmin = async (organizationId, campaignId, updateData, actor, reqMeta = {}) => {
  const orgId = new mongoose.Types.ObjectId(organizationId);

  const campaign = await AmbassadorCampaign.findOne({
    _id: campaignId,
    organizationId: orgId
  });

  if (!campaign) {
    const err = new Error('Campaign not found.');
    err.statusCode = 404;
    throw err;
  }

  if (updateData.name) campaign.name = updateData.name.trim();
  if (updateData.description !== undefined) campaign.description = updateData.description.trim();
  if (updateData.targetCount) campaign.targetCount = parseInt(updateData.targetCount, 10);
  if (updateData.startsAt) campaign.startsAt = new Date(updateData.startsAt);
  if (updateData.endsAt) campaign.endsAt = new Date(updateData.endsAt);
  if (updateData.status) campaign.status = updateData.status;
  if (updateData.verificationRules) {
    campaign.verificationRules = { ...campaign.verificationRules, ...updateData.verificationRules };
  }

  await campaign.save();

  await recordAuditLog({
    organizationId: orgId,
    actor: { id: actor._id || actor.id, role: actor.role || 'staff' },
    action: 'UPDATE_AMBASSADOR_CAMPAIGN',
    resourceType: 'AmbassadorCampaign',
    resourceId: campaign._id,
    metadata: { updatedFields: Object.keys(updateData) },
    ipAddress: reqMeta.ipAddress,
    userAgent: reqMeta.userAgent
  });

  return campaign;
};

// --- Referral Verification Queue Operations ---

/**
 * Lists referred participants for verification queue.
 */
export const getReferralsAdmin = async (organizationId, filters = {}) => {
  const orgId = new mongoose.Types.ObjectId(organizationId);
  const query = { organizationId: orgId };

  if (filters.campaignId) query.campaignId = new mongoose.Types.ObjectId(filters.campaignId);
  if (filters.verificationStatus) query.verificationStatus = filters.verificationStatus;
  if (filters.ambassadorProfileId) query.ambassadorProfileId = new mongoose.Types.ObjectId(filters.ambassadorProfileId);

  const page = Math.max(1, parseInt(filters.page, 10) || 1);
  const limit = Math.min(100, Math.max(1, parseInt(filters.limit, 10) || 20));
  const skip = (page - 1) * limit;

  const [total, referrals] = await Promise.all([
    ReferredParticipant.countDocuments(query),
    ReferredParticipant.find(query)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .populate('campaignId', 'name')
      .populate('ambassadorProfileId')
      .populate('verifiedBy', 'name email')
      .lean()
  ]);

  return {
    referrals: referrals.map((r) => ({
      id: r._id,
      campaignId: r.campaignId?._id,
      campaignName: r.campaignId?.name,
      ambassadorProfileId: r.ambassadorProfileId?._id,
      name: r.name,
      email: r.email,
      phone: r.phone,
      institute: r.institute,
      dedupeKey: r.dedupeKey,
      verificationStatus: r.verificationStatus,
      reason: r.reason,
      verifiedBy: r.verifiedBy?.name,
      verifiedAt: r.verifiedAt,
      notes: r.notes,
      capturedAt: r.createdAt
    })),
    pagination: {
      page,
      limit,
      total,
      pages: Math.ceil(total / limit)
    }
  };
};

/**
 * Coordinator verifies, rejects, or flags a referred participant.
 * Anti-self-verification guard: Ambassador cannot verify own referrals.
 * Reason is required. Audited.
 * If verified count reaches target, triggers AmbassadorCertificate ELIGIBLE status!
 */
export const verifyReferralAdmin = async (organizationId, referralId, { verificationStatus, reason, notes }, actor, reqMeta = {}) => {
  const orgId = new mongoose.Types.ObjectId(organizationId);

  if (![REFERRED_PARTICIPANT_STATUSES.VERIFIED, REFERRED_PARTICIPANT_STATUSES.REJECTED, REFERRED_PARTICIPANT_STATUSES.DUPLICATE].includes(verificationStatus)) {
    const err = new Error('Invalid verification status.');
    err.statusCode = 400;
    throw err;
  }

  if (!reason?.trim()) {
    const err = new Error('A reason is required when verifying, rejecting, or marking a referral as duplicate.');
    err.statusCode = 400;
    throw err;
  }

  const referral = await ReferredParticipant.findOne({
    _id: referralId,
    organizationId: orgId
  }).populate('ambassadorProfileId').populate('campaignId');

  if (!referral) {
    const err = new Error('Referral record not found.');
    err.statusCode = 404;
    throw err;
  }

  // Anti-self-verification guard
  const ambassadorUserId = referral.ambassadorProfileId?.userId?.toString();
  if (ambassadorUserId && ambassadorUserId === actor.id.toString()) {
    const err = new Error('Forbidden: An ambassador cannot verify their own referrals.');
    err.statusCode = 403;
    throw err;
  }

  const previousStatus = referral.verificationStatus;
  referral.verificationStatus = verificationStatus;
  referral.reason = reason.trim();
  referral.verifiedBy = actor._id || actor.id;
  referral.verifiedAt = new Date();
  if (notes) referral.notes = notes.trim();

  await referral.save();

  // Audit
  await recordAuditLog({
    organizationId: orgId,
    actor: { id: actor._id || actor.id, role: actor.role || 'staff' },
    action: 'VERIFY_REFERRAL',
    resourceType: 'ReferredParticipant',
    resourceId: referral._id,
    metadata: {
      previousStatus,
      newStatus: verificationStatus,
      reason: referral.reason,
      ambassadorProfileId: referral.ambassadorProfileId?._id
    },
    ipAddress: reqMeta.ipAddress,
    userAgent: reqMeta.userAgent
  });

  // Certificate eligibility auto-trigger on verification
  if (verificationStatus === REFERRED_PARTICIPANT_STATUSES.VERIFIED && referral.campaignId) {
    const verifiedCount = await ReferredParticipant.countDocuments({
      organizationId: orgId,
      ambassadorProfileId: referral.ambassadorProfileId._id,
      campaignId: referral.campaignId._id,
      verificationStatus: REFERRED_PARTICIPANT_STATUSES.VERIFIED
    });

    const target = referral.campaignId.targetCount || 10;
    if (verifiedCount >= target) {
      let cert = await AmbassadorCertificate.findOne({
        organizationId: orgId,
        ambassadorProfileId: referral.ambassadorProfileId._id,
        campaignId: referral.campaignId._id
      });

      if (!cert) {
        const student = await StudentProfile.findById(referral.ambassadorProfileId.studentProfileId);
        await AmbassadorCertificate.create({
          organizationId: orgId,
          ambassadorProfileId: referral.ambassadorProfileId._id,
          campaignId: referral.campaignId._id,
          status: AMBASSADOR_CERTIFICATE_STATUSES.ELIGIBLE,
          metadata: {
            recipientName: student?.fullName || 'Campus Ambassador',
            recipientCollege: student?.studentId || 'University',
            campaignName: referral.campaignId.name,
            verifiedCount,
            targetCount: target,
            includeBranding: false
          }
        });
      } else if (cert.status === AMBASSADOR_CERTIFICATE_STATUSES.REJECTED) {
        cert.status = AMBASSADOR_CERTIFICATE_STATUSES.ELIGIBLE;
        cert.metadata.verifiedCount = verifiedCount;
        await cert.save();
      }
    }
  }

  return referral;
};

// --- Certificate Queue & Approval Operations ---

export const getCertificatesAdmin = async (organizationId, filters = {}) => {
  const orgId = new mongoose.Types.ObjectId(organizationId);
  const query = { organizationId: orgId };

  if (filters.status) query.status = filters.status;
  if (filters.campaignId) query.campaignId = new mongoose.Types.ObjectId(filters.campaignId);

  const page = Math.max(1, parseInt(filters.page, 10) || 1);
  const limit = Math.min(100, Math.max(1, parseInt(filters.limit, 10) || 20));
  const skip = (page - 1) * limit;

  const [total, certificates] = await Promise.all([
    AmbassadorCertificate.countDocuments(query),
    AmbassadorCertificate.find(query)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .populate({
        path: 'ambassadorProfileId',
        populate: { path: 'studentProfileId', select: 'fullName studentId rollNumber degree branch' }
      })
      .populate('campaignId', 'name targetCount')
      .populate('approvedBy', 'name email')
      .lean()
  ]);

  return {
    certificates: certificates.map((c) => ({
      id: c._id,
      ambassadorProfileId: c.ambassadorProfileId?._id,
      studentName: c.ambassadorProfileId?.studentProfileId?.fullName || c.metadata?.recipientName,
      studentRoll: c.ambassadorProfileId?.studentProfileId?.studentId || c.ambassadorProfileId?.studentProfileId?.rollNumber,
      campaignName: c.campaignId?.name || c.metadata?.campaignName,
      status: c.status,
      certificateNumber: c.certificateNumber,
      certificateObjectKey: c.certificateObjectKey,
      verifiedCount: c.metadata?.verifiedCount || 0,
      targetCount: c.campaignId?.targetCount || c.metadata?.targetCount || 10,
      approvedBy: c.approvedBy?.name,
      approvedAt: c.approvedAt,
      issuedAt: c.issuedAt,
      rejectedReason: c.rejectedReason
    })),
    pagination: {
      page,
      limit,
      total,
      pages: Math.ceil(total / limit)
    }
  };
};

/**
 * Coordinator updates certificate status (APPROVED, ISSUED, REJECTED).
 * Anti-self-approval guard: Ambassador cannot approve own certificate.
 * Reason required for rejection. Audited.
 * On ISSUED, generates unique certificateNumber and certificateObjectKey.
 */
export const updateCertificateStatusAdmin = async (organizationId, certificateId, { status, reason }, actor, reqMeta = {}) => {
  const orgId = new mongoose.Types.ObjectId(organizationId);

  if (![AMBASSADOR_CERTIFICATE_STATUSES.APPROVED, AMBASSADOR_CERTIFICATE_STATUSES.ISSUED, AMBASSADOR_CERTIFICATE_STATUSES.REJECTED].includes(status)) {
    const err = new Error('Invalid certificate status.');
    err.statusCode = 400;
    throw err;
  }

  if (status === AMBASSADOR_CERTIFICATE_STATUSES.REJECTED && !reason?.trim()) {
    const err = new Error('A rejection reason is required.');
    err.statusCode = 400;
    throw err;
  }

  const certificate = await AmbassadorCertificate.findOne({
    _id: certificateId,
    organizationId: orgId
  }).populate('ambassadorProfileId').populate('campaignId');

  if (!certificate) {
    const err = new Error('Certificate record not found.');
    err.statusCode = 404;
    throw err;
  }

  // Anti-self-approval guard
  const ambassadorUserId = certificate.ambassadorProfileId?.userId?.toString();
  if (ambassadorUserId && ambassadorUserId === actor.id.toString()) {
    const err = new Error('Forbidden: An ambassador cannot approve or issue their own certificate.');
    err.statusCode = 403;
    throw err;
  }

  const previousStatus = certificate.status;
  certificate.status = status;

  if (status === AMBASSADOR_CERTIFICATE_STATUSES.APPROVED) {
    certificate.approvedBy = actor._id || actor.id;
    certificate.approvedAt = new Date();
    certificate.rejectedReason = null;
  } else if (status === AMBASSADOR_CERTIFICATE_STATUSES.ISSUED) {
    certificate.approvedBy = certificate.approvedBy || actor._id || actor.id;
    certificate.approvedAt = certificate.approvedAt || new Date();
    certificate.issuedAt = new Date();
    certificate.certificateNumber = `CERT-AMB-${Date.now()}-${crypto.randomBytes(3).toString('hex').toUpperCase()}`;
    certificate.certificateObjectKey = `certificates/ambassador-${certificate._id}.pdf`;
    certificate.rejectedReason = null;
    if (certificate.metadata) {
      certificate.metadata.issuedAt = certificate.issuedAt;
      certificate.metadata.includeBranding = false; // Never include logo/branding unless configured
    }
  } else if (status === AMBASSADOR_CERTIFICATE_STATUSES.REJECTED) {
    certificate.rejectedReason = reason.trim();
  }

  await certificate.save();

  await recordAuditLog({
    organizationId: orgId,
    actor: { id: actor._id || actor.id, role: actor.role || 'staff' },
    action: 'UPDATE_CERTIFICATE_STATUS',
    resourceType: 'AmbassadorCertificate',
    resourceId: certificate._id,
    metadata: { previousStatus, newStatus: status, reason: reason?.trim() || null },
    ipAddress: reqMeta.ipAddress,
    userAgent: reqMeta.userAgent
  });

  return certificate;
};

// --- Ambassador Overview & Reports ---

export const getAmbassadorReportsAdmin = async (organizationId) => {
  const orgId = new mongoose.Types.ObjectId(organizationId);

  const [
    totalProfiles,
    approvedAmbassadors,
    pendingProfiles,
    totalReferrals,
    verifiedReferrals,
    duplicateReferrals,
    pendingReferrals,
    totalCertificates,
    issuedCertificates
  ] = await Promise.all([
    AmbassadorProfile.countDocuments({ organizationId: orgId }),
    AmbassadorProfile.countDocuments({ organizationId: orgId, status: AMBASSADOR_PROFILE_STATUSES.APPROVED }),
    AmbassadorProfile.countDocuments({ organizationId: orgId, status: AMBASSADOR_PROFILE_STATUSES.PENDING }),
    ReferredParticipant.countDocuments({ organizationId: orgId }),
    ReferredParticipant.countDocuments({ organizationId: orgId, verificationStatus: REFERRED_PARTICIPANT_STATUSES.VERIFIED }),
    ReferredParticipant.countDocuments({ organizationId: orgId, verificationStatus: REFERRED_PARTICIPANT_STATUSES.DUPLICATE }),
    ReferredParticipant.countDocuments({ organizationId: orgId, verificationStatus: REFERRED_PARTICIPANT_STATUSES.PENDING }),
    AmbassadorCertificate.countDocuments({ organizationId: orgId }),
    AmbassadorCertificate.countDocuments({ organizationId: orgId, status: AMBASSADOR_CERTIFICATE_STATUSES.ISSUED })
  ]);

  const activeCampaignsCount = await AmbassadorCampaign.countDocuments({
    organizationId: orgId,
    status: AMBASSADOR_CAMPAIGN_STATUSES.ACTIVE
  });

  return {
    overview: {
      totalAmbassadors: totalProfiles,
      activeAmbassadors: approvedAmbassadors,
      pendingApplications: pendingProfiles,
      activeCampaigns: activeCampaignsCount
    },
    referrals: {
      total: totalReferrals,
      verified: verifiedReferrals,
      pending: pendingReferrals,
      duplicates: duplicateReferrals,
      verificationRate: totalReferrals > 0 ? Math.round((verifiedReferrals / totalReferrals) * 100) : 0
    },
    certificates: {
      total: totalCertificates,
      issued: issuedCertificates
    }
  };
};
