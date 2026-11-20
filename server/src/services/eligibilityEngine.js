import {
  CRITERIA_TYPES,
  CRITERIA_OPERATORS,
  ELIGIBILITY_STATUSES,
  ELIGIBILITY_RESULT,
  ELIGIBILITY_ENGINE_VERSION
} from '../utils/constants.js';

export const ELIGIBILITY_DISCLAIMER =
  'Advisory placement eligibility based on candidate profile. Final candidate qualification is subject to employer review. This advisory check does not prevent submitting your application.';

/**
 * Normalizes branch strings and abbreviations for robust comparison.
 * e.g. "Computer Science and Engineering" <-> "CSE", "Information Science" <-> "ISE"
 */
const BRANCH_ABBREVIATIONS = {
  cse: ['computer science', 'computer science and engineering', 'cs', 'cse'],
  ise: ['information science', 'information science and engineering', 'is', 'ise', 'it', 'information technology'],
  ece: ['electronics and communication', 'electronics and communication engineering', 'ece', 'ec'],
  eee: ['electrical and electronics', 'electrical and electronics engineering', 'eee', 'ee'],
  me: ['mechanical', 'mechanical engineering', 'me', 'mech'],
  cv: ['civil', 'civil engineering', 'cv', 'civil']
};

const matchesBranch = (studentBranch, targetBranch) => {
  if (!studentBranch || !targetBranch) return false;
  const s = String(studentBranch).trim().toLowerCase();
  const t = String(targetBranch).trim().toLowerCase();

  if (s === t) return true;

  // Check abbreviation groups
  for (const group of Object.values(BRANCH_ABBREVIATIONS)) {
    const sInGroup = group.some((item) => s === item || s.includes(item));
    const tInGroup = group.some((item) => t === item || t.includes(item));
    if (sInGroup && tInGroup) return true;
  }

  return s.includes(t) || t.includes(s);
};

/**
 * Pure, deterministic eligibility evaluation engine (version 1).
 *
 * Rules:
 * 1) Any unmet HARD criterion -> DOES_NOT_MEET
 * 2) Else, any HARD criterion with missing student data -> POTENTIALLY_ELIGIBLE
 * 3) Else -> LIKELY_ELIGIBLE
 * 4) Preferred criteria are evaluated and reported, but NEVER change the status.
 * 5) CGPA == min is a pass.
 * 6) Never infer from unrelated data.
 *
 * @param {object} studentProfile
 * @param {Array} criteria - Array of criterion objects from JobOpportunity
 * @returns {object} { status, matched, unmet, missing, preferred, perCriterion, disclaimer, engineVersion }
 */
export const evaluateEligibility = (studentProfile = {}, criteria = []) => {
  const perCriterion = [];
  const matched = [];
  const unmet = [];
  const missing = [];
  const preferred = [];

  const profile = studentProfile || {};

  for (let i = 0; i < (criteria || []).length; i++) {
    const c = criteria[i];
    if (!c || typeof c !== 'object') continue;

    const type = c.type;
    const operator = c.operator || CRITERIA_OPERATORS.EQUALS;
    const isHardRequirement = c.isHardRequirement !== false;
    const label = c.displayLabel || `${type} requirement`;

    let result = ELIGIBILITY_RESULT.PASS;
    let studentValue = null;
    let explanation = '';

    switch (type) {
      case CRITERIA_TYPES.MIN_CGPA: {
        studentValue = profile.cgpa;
        const targetMin = Number(c.value);

        if (studentValue === undefined || studentValue === null || isNaN(Number(studentValue))) {
          result = ELIGIBILITY_RESULT.MISSING;
          explanation = 'CGPA is not recorded in your student profile';
        } else {
          const numCGPA = Number(studentValue);
          // CGPA == min is an explicit PASS
          if (numCGPA >= targetMin) {
            result = ELIGIBILITY_RESULT.PASS;
            explanation = `Your CGPA (${numCGPA}) meets or exceeds the required minimum (${targetMin})`;
          } else {
            result = ELIGIBILITY_RESULT.FAIL;
            explanation = `Your CGPA (${numCGPA}) is below the required minimum (${targetMin})`;
          }
        }
        break;
      }

      case CRITERIA_TYPES.BRANCH: {
        studentValue = profile.branch;
        if (!studentValue || !String(studentValue).trim()) {
          result = ELIGIBILITY_RESULT.MISSING;
          explanation = 'Branch / stream is not specified in your profile';
        } else {
          const allowedBranches = Array.isArray(c.value)
            ? c.value
            : String(c.value).split(',').map((x) => x.trim()).filter(Boolean);

          const isMatch = allowedBranches.some((target) => matchesBranch(studentValue, target));
          if (isMatch) {
            result = ELIGIBILITY_RESULT.PASS;
            explanation = `Your branch (${studentValue}) is eligible`;
          } else {
            result = ELIGIBILITY_RESULT.FAIL;
            explanation = `Your branch (${studentValue}) does not match the required branch(es): ${allowedBranches.join(', ')}`;
          }
        }
        break;
      }

      case CRITERIA_TYPES.DEGREE: {
        studentValue = profile.degree;
        if (!studentValue || !String(studentValue).trim()) {
          result = ELIGIBILITY_RESULT.MISSING;
          explanation = 'Degree qualification is not specified in your profile';
        } else {
          const allowedDegrees = Array.isArray(c.value)
            ? c.value
            : String(c.value).split(',').map((x) => x.trim()).filter(Boolean);

          const sDeg = String(studentValue).trim().toLowerCase();
          const isMatch = allowedDegrees.some((target) => {
            const tDeg = String(target).trim().toLowerCase();
            return sDeg === tDeg || sDeg.includes(tDeg) || tDeg.includes(sDeg);
          });

          if (isMatch) {
            result = ELIGIBILITY_RESULT.PASS;
            explanation = `Your degree (${studentValue}) satisfies the requirement`;
          } else {
            result = ELIGIBILITY_RESULT.FAIL;
            explanation = `Your degree (${studentValue}) does not match: ${allowedDegrees.join(', ')}`;
          }
        }
        break;
      }

      case CRITERIA_TYPES.GRADUATION_YEAR: {
        studentValue = profile.graduationYear;
        if (studentValue === undefined || studentValue === null || isNaN(Number(studentValue))) {
          result = ELIGIBILITY_RESULT.MISSING;
          explanation = 'Graduation year is not specified in your profile';
        } else {
          const sYear = Number(studentValue);
          const allowedYears = Array.isArray(c.value)
            ? c.value.map(Number)
            : String(c.value).split(',').map((x) => Number(x.trim())).filter((n) => !isNaN(n));

          if (operator === CRITERIA_OPERATORS.GREATER_EQUAL || operator === 'GTE') {
            const minYear = Math.min(...allowedYears);
            if (sYear >= minYear) {
              result = ELIGIBILITY_RESULT.PASS;
              explanation = `Your graduation year (${sYear}) meets the graduation timeline (≥ ${minYear})`;
            } else {
              result = ELIGIBILITY_RESULT.FAIL;
              explanation = `Your graduation year (${sYear}) does not meet the timeline (≥ ${minYear})`;
            }
          } else if (operator === CRITERIA_OPERATORS.LESS_EQUAL || operator === 'LTE') {
            const maxYear = Math.max(...allowedYears);
            if (sYear <= maxYear) {
              result = ELIGIBILITY_RESULT.PASS;
              explanation = `Your graduation year (${sYear}) meets the graduation timeline (≤ ${maxYear})`;
            } else {
              result = ELIGIBILITY_RESULT.FAIL;
              explanation = `Your graduation year (${sYear}) exceeds the graduation timeline (≤ ${maxYear})`;
            }
          } else {
            // Default IN or EQUALS
            if (allowedYears.includes(sYear)) {
              result = ELIGIBILITY_RESULT.PASS;
              explanation = `Graduation batch (${sYear}) matches the eligible cohort (${allowedYears.join(', ')})`;
            } else {
              result = ELIGIBILITY_RESULT.FAIL;
              explanation = `Graduation batch (${sYear}) does not match the eligible cohort (${allowedYears.join(', ')})`;
            }
          }
        }
        break;
      }

      case CRITERIA_TYPES.SKILL: {
        studentValue = profile.skills;
        const targetSkills = Array.isArray(c.value)
          ? c.value
          : String(c.value).split(',').map((x) => x.trim()).filter(Boolean);

        if (!studentValue || !Array.isArray(studentValue) || studentValue.length === 0) {
          result = ELIGIBILITY_RESULT.MISSING;
          explanation = 'No skills are listed in your student profile';
        } else {
          const lowerStudentSkills = studentValue.map((s) => String(s).trim().toLowerCase());
          const hasSkill = targetSkills.some((ts) => {
            const lowTs = String(ts).trim().toLowerCase();
            return lowerStudentSkills.some((ss) => ss === lowTs || ss.includes(lowTs));
          });

          if (hasSkill) {
            result = ELIGIBILITY_RESULT.PASS;
            explanation = `Skill requirement matched: ${targetSkills.join(', ')}`;
          } else {
            result = ELIGIBILITY_RESULT.FAIL;
            explanation = `Profile lacks required skill: ${targetSkills.join(', ')}`;
          }
        }
        break;
      }

      default: {
        // EXPERIENCE or OTHER generic requirements
        studentValue = profile[type?.toLowerCase()] || null;
        if (studentValue === null || studentValue === undefined || studentValue === '') {
          result = ELIGIBILITY_RESULT.MISSING;
          explanation = `${label} data is not present in profile`;
        } else {
          result = ELIGIBILITY_RESULT.PASS;
          explanation = `${label} satisfied`;
        }
        break;
      }
    }

    const evaluatedItem = {
      type,
      operator,
      value: c.value,
      isHardRequirement,
      label,
      studentValue,
      result,
      explanation
    };

    perCriterion.push(evaluatedItem);

    if (isHardRequirement) {
      if (result === ELIGIBILITY_RESULT.PASS) {
        matched.push(label);
      } else if (result === ELIGIBILITY_RESULT.FAIL) {
        unmet.push(label);
      } else if (result === ELIGIBILITY_RESULT.MISSING) {
        missing.push(label);
      }
    } else {
      preferred.push({
        label,
        satisfied: result === ELIGIBILITY_RESULT.PASS,
        studentValue,
        explanation
      });
    }
  }

  // Determine overall status
  let status = ELIGIBILITY_STATUSES.LIKELY_ELIGIBLE;

  if (unmet.length > 0) {
    status = ELIGIBILITY_STATUSES.DOES_NOT_MEET;
  } else if (missing.length > 0) {
    status = ELIGIBILITY_STATUSES.POTENTIALLY_ELIGIBLE;
  } else {
    status = ELIGIBILITY_STATUSES.LIKELY_ELIGIBLE;
  }

  return {
    engineVersion: ELIGIBILITY_ENGINE_VERSION,
    status,
    isEligible: status === ELIGIBILITY_STATUSES.LIKELY_ELIGIBLE,
    matched,
    unmet,
    missing,
    preferred,
    perCriterion,
    disclaimer: ELIGIBILITY_DISCLAIMER
  };
};
