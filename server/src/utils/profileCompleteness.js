/**
 * Calculates student profile completeness.
 * Profile is complete when required academic information and a resume are attached.
 *
 * @param {object} profile - StudentProfile document or object
 * @returns {{ isComplete: boolean, missingFields: string[], percentage: number }}
 */
export const checkProfileCompleteness = (profile) => {
  if (!profile) {
    return {
      isComplete: false,
      missingFields: ['studentId', 'branch', 'graduationYear', 'cgpa', 'resume'],
      percentage: 0
    };
  }

  const missingFields = [];
  const requiredChecks = [
    { field: 'studentId', valid: Boolean(profile.studentId && profile.studentId.trim()) },
    { field: 'branch', valid: Boolean(profile.branch && profile.branch.trim()) },
    { field: 'graduationYear', valid: Boolean(profile.graduationYear && profile.graduationYear >= 2000) },
    { field: 'cgpa', valid: typeof profile.cgpa === 'number' && profile.cgpa >= 0 && profile.cgpa <= 10 },
    { field: 'resume', valid: Boolean(profile.resume && profile.resume.url) }
  ];

  let completedChecks = 0;
  for (const check of requiredChecks) {
    if (check.valid) {
      completedChecks++;
    } else {
      missingFields.push(check.field);
    }
  }

  const percentage = Math.round((completedChecks / requiredChecks.length) * 100);

  return {
    isComplete: missingFields.length === 0,
    missingFields,
    percentage
  };
};

export const isStudentProfileComplete = (profile) => {
  return checkProfileCompleteness(profile).isComplete;
};

/**
 * HireTrack v3 Profile Completeness Evaluator
 * Checks v3 academic fields, contact info, and private resume asset.
 *
 * @param {object} profile
 * @returns {{ isComplete: boolean, percentage: number, missingFields: string[], breakdown: { identity: boolean, academics: boolean, resume: boolean } }}
 */
export const checkProfileCompletenessV3 = (profile) => {
  if (!profile) {
    return {
      isComplete: false,
      percentage: 0,
      missingFields: ['studentCode', 'branch', 'degree', 'graduationYear', 'cgpa', 'phone', 'resume'],
      breakdown: {
        identity: false,
        academics: false,
        resume: false
      }
    };
  }

  const missingFields = [];
  const studentCode = profile.studentCode || profile.studentId;
  const branch = profile.branch;
  const degree = profile.degree;
  const graduationYear = profile.graduationYear;
  const cgpa = profile.cgpa;
  const phone = profile.phone;
  const hasResume = Boolean(
    profile.resumeObjectKey ||
      profile.fileAssetId ||
      (profile.resume && (profile.resume.url || profile.resume.publicId))
  );

  if (!studentCode || !String(studentCode).trim()) missingFields.push('studentCode');
  if (!branch || !String(branch).trim()) missingFields.push('branch');
  if (!degree || !String(degree).trim()) missingFields.push('degree');
  if (!graduationYear || Number(graduationYear) < 2000) missingFields.push('graduationYear');
  if (cgpa === null || cgpa === undefined || isNaN(Number(cgpa)) || Number(cgpa) < 0 || Number(cgpa) > 10) {
    missingFields.push('cgpa');
  }
  if (!phone || !String(phone).trim()) missingFields.push('phone');
  if (!hasResume) missingFields.push('resume');

  const totalChecks = 7;
  const passedChecks = totalChecks - missingFields.length;
  const percentage = Math.round((passedChecks / totalChecks) * 100);

  return {
    isComplete: missingFields.length === 0,
    score: percentage,
    percentage,
    missingFields,
    breakdown: {
      identity: Boolean(studentCode && phone),
      academics: Boolean(branch && degree && graduationYear && cgpa !== null && cgpa !== undefined),
      resume: hasResume
    }
  };
};

