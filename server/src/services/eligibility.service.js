/**
 * Pure function to check student eligibility against job posting requirements.
 *
 * Rules:
 * 1. Empty criteria on a dimension means unrestricted.
 * 2. Missing student profile field fails safely when criteria requires it.
 * 3. CGPA == minCgpa is eligible.
 * 4. Branch comparison is case-insensitive.
 *
 * @param {object|null} studentProfile
 * @param {object} jobCriteria - { eligibleBranches, eligibleGraduationYears, minCgpa }
 * @returns {{ isEligible: boolean, reasons: string[], criteria: { branch: boolean, graduationYear: boolean, cgpa: boolean } }}
 */
export const checkEligibility = (studentProfile, jobCriteria = {}) => {
  const reasons = [];

  const eligibleBranches = Array.isArray(jobCriteria.eligibleBranches)
    ? jobCriteria.eligibleBranches.filter(Boolean)
    : [];

  const eligibleGraduationYears = Array.isArray(jobCriteria.eligibleGraduationYears)
    ? jobCriteria.eligibleGraduationYears.filter((y) => typeof y === 'number' || !isNaN(Number(y)))
    : [];

  const minCgpa =
    jobCriteria.minCgpa !== undefined && jobCriteria.minCgpa !== null && !isNaN(Number(jobCriteria.minCgpa))
      ? Number(jobCriteria.minCgpa)
      : null;

  // 1. Branch check
  let isBranchEligible = true;
  if (eligibleBranches.length > 0) {
    if (!studentProfile || !studentProfile.branch || !String(studentProfile.branch).trim()) {
      isBranchEligible = false;
      reasons.push('Branch information missing from profile');
    } else {
      const studentBranch = String(studentProfile.branch).trim().toUpperCase();
      const branchMatches = eligibleBranches.some((b) => String(b).trim().toUpperCase() === studentBranch);
      if (!branchMatches) {
        isBranchEligible = false;
        reasons.push(`Branch '${studentProfile.branch}' is not eligible (Required: ${eligibleBranches.join(', ')})`);
      }
    }
  }

  // 2. Graduation Year check
  let isYearEligible = true;
  if (eligibleGraduationYears.length > 0) {
    if (
      !studentProfile ||
      studentProfile.graduationYear === undefined ||
      studentProfile.graduationYear === null ||
      isNaN(Number(studentProfile.graduationYear))
    ) {
      isYearEligible = false;
      reasons.push('Graduation year missing from profile');
    } else {
      const studentYear = Number(studentProfile.graduationYear);
      const yearMatches = eligibleGraduationYears.map(Number).includes(studentYear);
      if (!yearMatches) {
        isYearEligible = false;
        reasons.push(
          `Graduation year ${studentYear} is not eligible (Required: ${eligibleGraduationYears.join(', ')})`
        );
      }
    }
  }

  // 3. Minimum CGPA check
  let isCgpaEligible = true;
  if (minCgpa !== null) {
    if (
      !studentProfile ||
      studentProfile.cgpa === undefined ||
      studentProfile.cgpa === null ||
      isNaN(Number(studentProfile.cgpa))
    ) {
      isCgpaEligible = false;
      reasons.push('CGPA missing from profile');
    } else {
      const studentCgpa = Number(studentProfile.cgpa);
      if (studentCgpa < minCgpa) {
        isCgpaEligible = false;
        reasons.push(`CGPA ${studentCgpa} is below minimum requirement of ${minCgpa}`);
      }
    }
  }

  return {
    isEligible: isBranchEligible && isYearEligible && isCgpaEligible,
    reasons,
    criteria: {
      branch: isBranchEligible,
      graduationYear: isYearEligible,
      cgpa: isCgpaEligible
    }
  };
};
