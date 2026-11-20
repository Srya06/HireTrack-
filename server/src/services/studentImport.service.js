import crypto from 'crypto';
import { User, StudentProfile, OrganizationMembership } from '../models/index.js';
import { ApiError } from '../utils/ApiError.js';
import { recordAuditEvent } from './audit.service.js';
import { scopeOrg } from '../utils/orgScope.js';
import {
  ROLES,
  USER_STATUSES,
  MEMBERSHIP_ROLES,
  MEMBERSHIP_STATUSES,
  ERROR_CODES
} from '../utils/constants.js';

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const MAX_IMPORT_ROWS = 1000;

export const CSV_TEMPLATE = `studentCode,fullName,email,branch,degree,cohort,graduationYear,cgpa,phone
STU2026CS001,Aarav Sharma,aarav.sharma@campus.edu,CSE,B.Tech,2022-2026,2026,8.75,+91 9876543210
STU2026IS042,Diya Patel,diya.patel@campus.edu,ISE,B.Tech,2022-2026,2026,8.40,+91 9876543211
STU2026EC018,Kavya Iyer,kavya.iyer@campus.edu,ECE,B.Tech,2022-2026,2026,,+91 9876543212`;

/**
 * Parses CSV text into array of row objects.
 * Supports comma separation, quotes, and CRLF/LF line endings.
 */
export const parseCsvText = (csvContent) => {
  if (!csvContent || typeof csvContent !== 'string') {
    return [];
  }

  const lines = csvContent
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter(Boolean);

  if (lines.length < 2) {
    return [];
  }

  // Parse header
  const headers = lines[0].split(',').map((h) => h.trim().replace(/^["']|["']$/g, ''));

  const rows = [];
  for (let i = 1; i < lines.length; i++) {
    const rawLine = lines[i];
    // Simple CSV parser supporting double quotes
    const values = [];
    let insideQuote = false;
    let currentValue = '';

    for (let charIndex = 0; charIndex < rawLine.length; charIndex++) {
      const char = rawLine[charIndex];
      if (char === '"' || char === "'") {
        insideQuote = !insideQuote;
      } else if (char === ',' && !insideQuote) {
        values.push(currentValue.trim());
        currentValue = '';
      } else {
        currentValue += char;
      }
    }
    values.push(currentValue.trim());

    const rowObj = { _rowNumber: i + 1 };
    headers.forEach((header, idx) => {
      let val = values[idx] !== undefined ? values[idx].trim().replace(/^["']|["']$/g, '') : '';
      rowObj[header] = val;
    });

    rows.push(rowObj);
  }

  return rows;
};

/**
 * Validates and imports student records into an organization via CSV.
 * Supports --dryRun with per-row error reporting without DB mutation.
 * Never logs raw row contents or PII.
 */
export const processStudentImport = async (
  organizationId,
  actorUser,
  csvContent,
  { dryRun = true } = {}
) => {
  const rows = parseCsvText(csvContent);

  if (!rows.length) {
    throw ApiError.badRequest(
      'CSV contains no data rows or has invalid headers. Please check the template.',
      [],
      ERROR_CODES.VALIDATION_ERROR
    );
  }

  if (rows.length > MAX_IMPORT_ROWS) {
    throw ApiError.badRequest(
      `CSV row count (${rows.length}) exceeds the maximum allowed limit of ${MAX_IMPORT_ROWS} rows per batch`,
      [],
      ERROR_CODES.VALIDATION_ERROR
    );
  }

  const errors = [];
  const duplicates = [];
  const validRows = [];

  const seenStudentCodesInBatch = new Set();
  const seenEmailsInBatch = new Set();

  for (const row of rows) {
    const rowNum = row._rowNumber;
    const studentCode = (row.studentCode || row.studentId || '').trim();
    const fullName = (row.fullName || row.name || '').trim();
    const email = (row.email || '').toLowerCase().trim();
    const branch = (row.branch || '').trim();
    const degree = (row.degree || 'B.Tech').trim();
    const cohort = (row.cohort || row.course || '').trim();
    const rawYear = row.graduationYear || row.year || '';
    const rawCgpa = row.cgpa !== undefined && row.cgpa !== '' ? row.cgpa : null;
    const phone = (row.phone || '').trim();

    // 1. Mandatory fields
    if (!studentCode) {
      errors.push({ row: rowNum, field: 'studentCode', message: 'Student code is required' });
      continue;
    }
    if (!email || !EMAIL_REGEX.test(email)) {
      errors.push({ row: rowNum, field: 'email', message: 'Valid email address is required' });
      continue;
    }
    if (!branch) {
      errors.push({ row: rowNum, field: 'branch', message: 'Branch is required' });
      continue;
    }

    // 2. Intra-batch duplicate checks
    if (seenStudentCodesInBatch.has(studentCode)) {
      duplicates.push({
        row: rowNum,
        studentCode,
        email,
        reason: 'Duplicate studentCode within this CSV file'
      });
      continue;
    }
    seenStudentCodesInBatch.add(studentCode);

    if (seenEmailsInBatch.has(email)) {
      duplicates.push({
        row: rowNum,
        studentCode,
        email,
        reason: 'Duplicate email within this CSV file'
      });
      continue;
    }
    seenEmailsInBatch.add(email);

    // 3. Type checks
    let parsedYear = 2026;
    if (rawYear) {
      const y = Number(rawYear);
      if (isNaN(y) || y < 2000 || y > 2100) {
        errors.push({
          row: rowNum,
          field: 'graduationYear',
          message: 'Graduation year must be between 2000 and 2100'
        });
        continue;
      }
      parsedYear = y;
    }

    let parsedCgpa = null;
    if (rawCgpa !== null) {
      const c = Number(rawCgpa);
      if (isNaN(c) || c < 0 || c > 10) {
        errors.push({
          row: rowNum,
          field: 'cgpa',
          message: 'CGPA must be a valid number between 0.0 and 10.0'
        });
        continue;
      }
      parsedCgpa = c;
    }

    validRows.push({
      rowNum,
      studentCode,
      fullName: fullName || email.split('@')[0],
      email,
      branch,
      degree,
      cohort,
      graduationYear: parsedYear,
      cgpa: parsedCgpa,
      phone
    });
  }

  // Pre-load existing users and profiles in this organization
  const emailsToCheck = validRows.map((r) => r.email);
  const studentCodesToCheck = validRows.map((r) => r.studentCode);

  const existingUsers = await User.find({ email: { $in: emailsToCheck } });
  const userMapByEmail = new Map(existingUsers.map((u) => [u.email.toLowerCase(), u]));

  const existingProfiles = await StudentProfile.find(
    scopeOrg(organizationId, {
      $or: [{ studentCode: { $in: studentCodesToCheck } }, { studentId: { $in: studentCodesToCheck } }]
    })
  );
  const profileMapByCode = new Map(
    existingProfiles.map((p) => [p.studentCode || p.studentId, p])
  );

  const finalCommitList = [];
  let newStudentsCount = 0;
  let updateStudentsCount = 0;

  for (const item of validRows) {
    const existingUser = userMapByEmail.get(item.email);
    const existingProfile = profileMapByCode.get(item.studentCode);

    if (existingUser) {
      // If user exists under a different organization, flag collision
      if (
        existingUser.organizationId &&
        existingUser.organizationId.toString() !== organizationId.toString()
      ) {
        duplicates.push({
          row: item.rowNum,
          studentCode: item.studentCode,
          email: item.email,
          reason: 'Email is already registered under another organization'
        });
        continue;
      }

      // If user exists but is assigned to a different student code
      if (existingProfile && existingProfile.userId.toString() !== existingUser._id.toString()) {
        duplicates.push({
          row: item.rowNum,
          studentCode: item.studentCode,
          email: item.email,
          reason: 'Student code and email mismatch with existing student record'
        });
        continue;
      }

      updateStudentsCount++;
      finalCommitList.push({ ...item, isUpdate: true, existingUser, existingProfile });
    } else if (existingProfile) {
      // StudentCode exists but email is different
      duplicates.push({
        row: item.rowNum,
        studentCode: item.studentCode,
        email: item.email,
        reason: 'Student code is already assigned to another email in this organization'
      });
    } else {
      newStudentsCount++;
      finalCommitList.push({ ...item, isUpdate: false, existingUser: null, existingProfile: null });
    }
  }

  const importBatchId = `batch_${Date.now()}_${crypto.randomBytes(4).toString('hex')}`;

  // If dry-run: return complete validation preview without DB writes
  if (dryRun) {
    return {
      dryRun: true,
      batchId: importBatchId,
      totalRows: rows.length,
      validRows: finalCommitList.length,
      validRowsCount: finalCommitList.length,
      invalidRows: errors.length + duplicates.length,
      errorRowsCount: errors.length,
      duplicateRowsCount: duplicates.length,
      newStudentsCount,
      updatedStudentsCount: updateStudentsCount,
      errors,
      duplicates,
      preview: finalCommitList.slice(0, 15).map((r) => ({
        row: r.rowNum,
        studentCode: r.studentCode,
        fullName: r.fullName,
        email: r.email,
        branch: r.branch,
        degree: r.degree,
        graduationYear: r.graduationYear,
        cgpa: r.cgpa,
        type: r.isUpdate ? 'update' : 'new'
      }))
    };
  }

  // Commit mode: execute idempotent upserts
  let committedCount = 0;
  const createdInvitations = [];

  for (const item of finalCommitList) {
    if (item.isUpdate) {
      const user = item.existingUser;
      let profile = item.existingProfile;

      if (!profile) {
        profile = await StudentProfile.findOne({ userId: user._id });
      }

      if (profile) {
        profile.fullName = item.fullName || profile.fullName;
        profile.branch = item.branch || profile.branch;
        profile.degree = item.degree || profile.degree;
        profile.cohort = item.cohort || profile.cohort;
        profile.graduationYear = item.graduationYear || profile.graduationYear;
        if (item.cgpa !== null) profile.cgpa = item.cgpa;
        if (item.phone) profile.phone = item.phone;
        profile.importBatchId = importBatchId;
        await profile.save();
      }

      committedCount++;
    } else {
      // Create invited user with hashed expiring invitation token
      const rawInvitationToken = crypto.randomBytes(32).toString('hex');
      const invitationTokenHash = crypto
        .createHash('sha256')
        .update(rawInvitationToken)
        .digest('hex');
      const invitationExpiresAt = new Date(Date.now() + 7 * 24 * 3600 * 1000); // 7 days

      const newUser = await User.create({
        name: item.fullName,
        email: item.email,
        role: ROLES.STUDENT,
        accountStatus: USER_STATUSES.INVITED,
        organizationId,
        invitationTokenHash,
        invitationExpiresAt
      });

      await OrganizationMembership.create({
        organizationId,
        userId: newUser._id,
        role: MEMBERSHIP_ROLES.STUDENT,
        status: MEMBERSHIP_STATUSES.ACTIVE
      });

      await StudentProfile.create({
        userId: newUser._id,
        organizationId,
        studentCode: item.studentCode,
        studentId: item.studentCode,
        fullName: item.fullName,
        degree: item.degree,
        cohort: item.cohort,
        branch: item.branch,
        graduationYear: item.graduationYear,
        cgpa: item.cgpa,
        phone: item.phone,
        verificationStatus: 'unverified',
        importBatchId
      });

      createdInvitations.push({
        studentCode: item.studentCode,
        email: item.email,
        token: rawInvitationToken,
        invitationToken: rawInvitationToken,
        expiresAt: invitationExpiresAt
      });

      committedCount++;
    }
  }

  // Audit bulk import (counts only, no PII)
  await recordAuditEvent({
    organizationId,
    actorId: actorUser._id,
    action: 'STUDENT_BULK_IMPORTED',
    entityType: 'StudentProfile',
    metadata: {
      importBatchId,
      totalRows: rows.length,
      committedCount,
      newStudentsCount,
      updatedStudentsCount: updateStudentsCount,
      errorsCount: errors.length,
      duplicatesCount: duplicates.length,
      dryRun: false
    },
    allowedMetadataKeys: [
      'importBatchId',
      'totalRows',
      'committedCount',
      'newStudentsCount',
      'updatedStudentsCount',
      'errorsCount',
      'duplicatesCount',
      'dryRun'
    ]
  });

  return {
    dryRun: false,
    batchId: importBatchId,
    totalRows: rows.length,
    committedCount,
    importedCount: committedCount,
    validRows: committedCount,
    invalidRows: errors.length + duplicates.length,
    newStudentsCount,
    updatedStudentsCount: updateStudentsCount,
    errors,
    duplicates,
    invitations: createdInvitations,
    invitationsCreated: createdInvitations.length
  };
};
