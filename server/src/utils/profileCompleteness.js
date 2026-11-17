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

