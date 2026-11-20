import path from 'path';
import fs from 'fs';
import { asyncHandler } from '../utils/asyncHandler.js';
import { sendSuccess } from '../utils/response.js';
import { ApiError } from '../utils/ApiError.js';
import { FileAsset, OrganizationMembership, Application, Job } from '../models/index.js';
import { generateSignedFileToken, verifySignedFileToken } from '../utils/signedUrl.js';
import { RESUMES_UPLOAD_DIR, createResumePdfBuffer } from '../utils/demoPdfGenerator.js';
import { MEMBERSHIP_ROLES, MEMBERSHIP_STATUSES, ROLES, ERROR_CODES } from '../utils/constants.js';

const STAFF_ROLES_WITH_FILE_ACCESS = [
  MEMBERSHIP_ROLES.ORG_ADMIN,
  MEMBERSHIP_ROLES.PLACEMENT_COORDINATOR,
  MEMBERSHIP_ROLES.INTERVIEWER
];

export const getSignedUrl = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const fileAsset = await FileAsset.findById(id);
  if (!fileAsset) {
    throw ApiError.notFound('File asset not found', [], ERROR_CODES.NOT_FOUND);
  }

  // Check authorization
  const isOwner = fileAsset.ownerId.toString() === req.user._id.toString();
  let isAuthorizedStaff = false;

  if (fileAsset.organizationId) {
    const activeStaffMembership = await OrganizationMembership.findOne({
      organizationId: fileAsset.organizationId,
      userId: req.user._id,
      role: { $in: STAFF_ROLES_WITH_FILE_ACCESS },
      status: MEMBERSHIP_STATUSES.ACTIVE
    });
    if (activeStaffMembership) {
      isAuthorizedStaff = true;
    }
  }

  // Legacy recruiter access check
  let isAuthorizedRecruiter = false;
  if (!isOwner && !isAuthorizedStaff && req.user.role === ROLES.RECRUITER) {
    const recruiterJobs = await Job.find({ recruiterId: req.user._id }, { _id: 1 });
    const hasApplication = await Application.exists({
      studentId: fileAsset.ownerId,
      jobId: { $in: recruiterJobs.map((j) => j._id) }
    });
    if (hasApplication) {
      isAuthorizedRecruiter = true;
    }
  }

  if (!isOwner && !isAuthorizedStaff && !isAuthorizedRecruiter && req.user.role !== ROLES.ADMIN) {
    throw ApiError.forbidden(
      'Access denied: You do not have permission to view this file asset',
      [],
      ERROR_CODES.FORBIDDEN
    );
  }

  const expiresInSeconds = 900; // 15 minutes
  const { token, expires } = generateSignedFileToken(fileAsset._id.toString(), expiresInSeconds);
  const signedUrl = `/api/v1/files/${fileAsset._id}/download?token=${token}&expires=${expires}`;

  return sendSuccess(res, {
    statusCode: 200,
    message: 'Signed download URL generated',
    data: {
      fileAssetId: fileAsset._id,
      fileName: fileAsset.originalName,
      signedUrl,
      expiresAt: new Date(expires).toISOString()
    }
  });
});

export const downloadFile = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { token, expires } = req.query;

  const fileAsset = await FileAsset.findById(id);
  if (!fileAsset) {
    throw ApiError.notFound('File asset not found', [], ERROR_CODES.NOT_FOUND);
  }

  // Token-based validation
  let hasValidToken = false;
  if (token && expires) {
    hasValidToken = verifySignedFileToken(id, token, expires);
  }

  // If no valid token and no authenticated user
  if (!hasValidToken && !req.user) {
    throw ApiError.forbidden(
      'Access denied: Invalid or expired download token',
      [],
      ERROR_CODES.FORBIDDEN
    );
  }

  // Physical file location
  const uploadDir = RESUMES_UPLOAD_DIR;
  let resolvedPath = null;

  // Try direct filename match in uploadDir
  if (fileAsset.fileName) {
    const candidate = path.join(uploadDir, path.basename(fileAsset.fileName));
    if (fs.existsSync(candidate)) {
      resolvedPath = candidate;
    }
  }

  // Try finding file matching storageKey in uploadDir
  if (!resolvedPath && fileAsset.storageKey) {
    if (fs.existsSync(uploadDir)) {
      const files = fs.readdirSync(uploadDir);
      const match = files.find(
        (f) => f.includes(fileAsset.storageKey) || f.startsWith(fileAsset.storageKey)
      );
      if (match) {
        resolvedPath = path.join(uploadDir, match);
      }
    }
  }

  if (!resolvedPath || !fs.existsSync(resolvedPath)) {
    const buffer = createResumePdfBuffer({
      name: fileAsset.originalName || 'Student Resume',
      usn: 'DEMO-USN',
      branch: 'Engineering',
      cgpa: '9.0',
      email: 'student@hiretrack.edu'
    });
    res.setHeader('Content-Type', fileAsset.mimeType || 'application/pdf');
    res.setHeader(
      'Content-Disposition',
      `inline; filename="${encodeURIComponent(fileAsset.originalName || 'document.pdf')}"`
    );
    return res.status(200).send(buffer);
  }

  res.setHeader('Content-Type', fileAsset.mimeType || 'application/pdf');
  res.setHeader(
    'Content-Disposition',
    `inline; filename="${encodeURIComponent(fileAsset.originalName || 'document.pdf')}"`
  );

  return res.sendFile(path.resolve(resolvedPath));
});
