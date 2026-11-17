import { checkEligibility } from '../src/services/eligibility.service.js';
import { validateStatusTransition, isTerminalStatus } from '../src/services/statusTransition.service.js';
import { APPLICATION_STATUSES } from '../src/utils/constants.js';

describe('Unit Tests: Eligibility Service (TESTING.md section 5)', () => {
  const baseProfile = {
    branch: 'CSE',
    graduationYear: 2026,
    cgpa: 8.5
  };

  const baseJob = {
    eligibleBranches: ['CSE', 'ISE'],
    eligibleGraduationYears: [2026, 2027],
    minCgpa: 7.5
  };

  it('should be eligible when branch, year and CGPA meet criteria', () => {
    const result = checkEligibility(baseProfile, baseJob);
    expect(result.isEligible).toBe(true);
    expect(result.reasons).toHaveLength(0);
  });

  it('branch matches: case-insensitive match should pass', () => {
    const result = checkEligibility({ ...baseProfile, branch: 'cse' }, baseJob);
    expect(result.isEligible).toBe(true);
    expect(result.criteria.branch).toBe(true);
  });

  it('branch mismatch: unlisted branch should fail eligibility', () => {
    const result = checkEligibility({ ...baseProfile, branch: 'MECH' }, baseJob);
    expect(result.isEligible).toBe(false);
    expect(result.criteria.branch).toBe(false);
    expect(result.reasons[0]).toMatch(/branch 'MECH' is not eligible/i);
  });

  it('graduation year matches: listed year should pass', () => {
    const result = checkEligibility({ ...baseProfile, graduationYear: 2027 }, baseJob);
    expect(result.isEligible).toBe(true);
    expect(result.criteria.graduationYear).toBe(true);
  });

  it('graduation year mismatch: unlisted year should fail eligibility', () => {
    const result = checkEligibility({ ...baseProfile, graduationYear: 2025 }, baseJob);
    expect(result.isEligible).toBe(false);
    expect(result.criteria.graduationYear).toBe(false);
    expect(result.reasons[0]).toMatch(/graduation year 2025 is not eligible/i);
  });

  it('CGPA exactly equals minimum: CGPA == min is eligible', () => {
    const result = checkEligibility({ ...baseProfile, cgpa: 7.5 }, baseJob);
    expect(result.isEligible).toBe(true);
    expect(result.criteria.cgpa).toBe(true);
  });

  it('CGPA below minimum: should fail eligibility', () => {
    const result = checkEligibility({ ...baseProfile, cgpa: 7.49 }, baseJob);
    expect(result.isEligible).toBe(false);
    expect(result.criteria.cgpa).toBe(false);
    expect(result.reasons[0]).toMatch(/cgpa 7.49 is below minimum requirement of 7.5/i);
  });

  it('no branch/year criteria means unrestricted for those dimensions', () => {
    const unrestrictedJob = {
      eligibleBranches: [],
      eligibleGraduationYears: [],
      minCgpa: null
    };

    const anyProfile = {
      branch: 'CIVIL',
      graduationYear: 2030,
      cgpa: 5.0
    };

    const result = checkEligibility(anyProfile, unrestrictedJob);
    expect(result.isEligible).toBe(true);
    expect(result.reasons).toHaveLength(0);
  });

  it('missing student profile fields fail safely when criteria require them', () => {
    // Missing branch
    const missingBranchResult = checkEligibility(
      { graduationYear: 2026, cgpa: 8.0 },
      baseJob
    );
    expect(missingBranchResult.isEligible).toBe(false);
    expect(missingBranchResult.reasons).toContain('Branch information missing from profile');

    // Missing graduationYear
    const missingYearResult = checkEligibility(
      { branch: 'CSE', cgpa: 8.0 },
      baseJob
    );
    expect(missingYearResult.isEligible).toBe(false);
    expect(missingYearResult.reasons).toContain('Graduation year missing from profile');

    // Missing CGPA
    const missingCgpaResult = checkEligibility(
      { branch: 'CSE', graduationYear: 2026 },
      baseJob
    );
    expect(missingCgpaResult.isEligible).toBe(false);
    expect(missingCgpaResult.reasons).toContain('CGPA missing from profile');

    // Null profile
    const nullProfileResult = checkEligibility(null, baseJob);
    expect(nullProfileResult.isEligible).toBe(false);
    expect(nullProfileResult.reasons.length).toBe(3);
  });
});

describe('Unit Tests: Status Transition Service (DATABASE_SCHEMA.md)', () => {
  const {
    APPLIED,
    UNDER_REVIEW,
    SHORTLISTED,
    INTERVIEW_SCHEDULED,
    SELECTED,
    REJECTED,
    WITHDRAWN
  } = APPLICATION_STATUSES;

  // Permitted transitions
  it('should allow valid transitions from APPLIED', () => {
    expect(validateStatusTransition(APPLIED, UNDER_REVIEW).isValid).toBe(true);
    expect(validateStatusTransition(APPLIED, SHORTLISTED).isValid).toBe(true);
    expect(validateStatusTransition(APPLIED, REJECTED).isValid).toBe(true);
    expect(validateStatusTransition(APPLIED, WITHDRAWN).isValid).toBe(true);
  });

  it('should allow valid transitions from UNDER_REVIEW', () => {
    expect(validateStatusTransition(UNDER_REVIEW, SHORTLISTED).isValid).toBe(true);
    expect(validateStatusTransition(UNDER_REVIEW, REJECTED).isValid).toBe(true);
    expect(validateStatusTransition(UNDER_REVIEW, WITHDRAWN).isValid).toBe(true);
  });

  it('should allow valid transitions from SHORTLISTED', () => {
    expect(validateStatusTransition(SHORTLISTED, INTERVIEW_SCHEDULED).isValid).toBe(true);
    expect(validateStatusTransition(SHORTLISTED, SELECTED).isValid).toBe(true);
    expect(validateStatusTransition(SHORTLISTED, REJECTED).isValid).toBe(true);
    expect(validateStatusTransition(SHORTLISTED, WITHDRAWN).isValid).toBe(true);
  });

  it('should allow valid transitions from INTERVIEW_SCHEDULED', () => {
    expect(validateStatusTransition(INTERVIEW_SCHEDULED, SELECTED).isValid).toBe(true);
    expect(validateStatusTransition(INTERVIEW_SCHEDULED, REJECTED).isValid).toBe(true);
    expect(validateStatusTransition(INTERVIEW_SCHEDULED, WITHDRAWN).isValid).toBe(true);
  });

  // Invalid transitions from terminal states
  it('should reject transitions from terminal state SELECTED', () => {
    expect(isTerminalStatus(SELECTED)).toBe(true);
    expect(validateStatusTransition(SELECTED, APPLIED).isValid).toBe(false);
    expect(validateStatusTransition(SELECTED, SHORTLISTED).isValid).toBe(false);
    expect(validateStatusTransition(SELECTED, REJECTED).isValid).toBe(false);
  });

  it('should reject transitions from terminal state REJECTED', () => {
    expect(isTerminalStatus(REJECTED)).toBe(true);
    expect(validateStatusTransition(REJECTED, APPLIED).isValid).toBe(false);
    expect(validateStatusTransition(REJECTED, UNDER_REVIEW).isValid).toBe(false);
    expect(validateStatusTransition(REJECTED, SELECTED).isValid).toBe(false);
  });

  it('should reject transitions from terminal state WITHDRAWN', () => {
    expect(isTerminalStatus(WITHDRAWN)).toBe(true);
    expect(validateStatusTransition(WITHDRAWN, APPLIED).isValid).toBe(false);
    expect(validateStatusTransition(WITHDRAWN, SHORTLISTED).isValid).toBe(false);
  });

  // Invalid non-sequential transitions
  it('should reject invalid non-sequential skips', () => {
    // Cannot skip applied directly to selected
    expect(validateStatusTransition(APPLIED, SELECTED).isValid).toBe(false);
    // Cannot skip under_review directly to selected
    expect(validateStatusTransition(UNDER_REVIEW, SELECTED).isValid).toBe(false);
    // Cannot transition to self
    expect(validateStatusTransition(APPLIED, APPLIED).isValid).toBe(false);
  });
});

