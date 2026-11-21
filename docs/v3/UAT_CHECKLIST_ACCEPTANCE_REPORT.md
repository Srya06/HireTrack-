# HireTrack v3 — SRS Section 8 Acceptance Criteria Report & UAT Checklist

> **Version:** 3.0.0-pilot  
> **Status:** All Release Gates MET — Ready for Sign-Off  
> **Evaluation Date:** November 21, 2026

---

## 1. Acceptance Criteria Evaluation Matrix (SRS_1 Section 8)

Every requirement specified in `HireTrack_Documentation/SRS.md` has been evaluated across automated unit, integration, and security test suites:

### 1.1 Authentication & Authorization (SRS-AUTH)

| Req ID | Description | Test Suite Reference | Result |
| :--- | :--- | :--- | :--- |
| **SRS-AUTH-01** | User registration with role-specific required fields | `server/tests/auth.test.js` | **PASS** |
| **SRS-AUTH-02** | Email normalization and prevention of duplicate accounts (`409 Conflict`) | `server/tests/auth.test.js` | **PASS** |
| **SRS-AUTH-03** | Password hashing with `bcryptjs` (salt rounds $\ge 10$) | `server/tests/auth.test.js` | **PASS** |
| **SRS-AUTH-04** | Signed Bearer JWT issuance upon valid credentials | `server/tests/auth.test.js` | **PASS** |
| **SRS-AUTH-05** | Token validation; rejection of expired, malformed, or missing tokens (`401`) | `server/tests/auth.test.js` | **PASS** |
| **SRS-AUTH-06** | Server-side role resolution from database; never trusts client-supplied role | `server/tests/auth.test.js`, `v1_org_foundation.test.js` | **PASS** |

### 1.2 Student Academic Profile (SRS-STU)

| Req ID | Description | Test Suite Reference | Result |
| :--- | :--- | :--- | :--- |
| **SRS-STU-01** | Students view and update own profile | `server/tests/student.test.js` | **PASS** |
| **SRS-STU-02** | Profile supports student ID, branch, graduation cohort, CGPA, skills, resume | `server/tests/student.test.js`, `v2_student_records.test.js` | **PASS** |
| **SRS-STU-03** | Cross-student profile edit prevention (`403` or `404`) | `server/tests/v12_hardening_security.test.js` | **PASS** |
| **SRS-STU-04** | Server-side validation of CGPA ($0.0 - 10.0$) and graduation year ranges | `server/tests/student.test.js` | **PASS** |

### 1.3 Recruiter Governance & Job Management (SRS-REC & SRS-JOB)

| Req ID | Description | Test Suite Reference | Result |
| :--- | :--- | :--- | :--- |
| **SRS-REC-01** | Recruiter profile submission with company details | `server/tests/recruiter_jobs.test.js` | **PASS** |
| **SRS-REC-02** | New recruiters initialized with `pending` approval status | `server/tests/recruiter_jobs.test.js` | **PASS** |
| **SRS-REC-03** | Administrator approves/rejects recruiter access | `server/tests/recruiter_jobs.test.js` | **PASS** |
| **SRS-JOB-01** | Approved recruiters manage jobs; unapproved recruiters blocked (`403`) | `server/tests/recruiter_jobs.test.js` | **PASS** |
| **SRS-JOB-02** | Jobs specify criteria, title, description, location, deadline | `server/tests/recruiter_jobs.test.js`, `v3_opportunities.test.js` | **PASS** |
| **SRS-JOB-03** | Active job discovery shows only published, open, and non-expired opportunities | `server/tests/recruiter_jobs.test.js`, `v3_opportunities.test.js` | **PASS** |
| **SRS-JOB-04** | Recruiters cannot edit jobs owned by another recruiter (`403`/`404`) | `server/tests/recruiter_jobs.test.js` | **PASS** |

### 1.4 Application Tracking & Adjudication (SRS-APP)

| Req ID | Description | Test Suite Reference | Result |
| :--- | :--- | :--- | :--- |
| **SRS-APP-01** | Students submit applications to eligible openings | `server/tests/applications.test.js`, `v3_application_tracking.test.js` | **PASS** |
| **SRS-APP-02** | Server enforces deadline, eligibility, and duplicate rejection (`409`) | `server/tests/applications.test.js`, `v3_application_tracking.test.js` | **PASS** |
| **SRS-APP-03** | Application records store resume reference, status, and audit timestamps | `server/tests/applications.test.js` | **PASS** |
| **SRS-APP-04** | Recruiter views applicants only for owned jobs | `server/tests/applications.test.js` | **PASS** |
| **SRS-APP-05** | Permitted status transitions strictly enforced; invalid transitions rejected | `server/tests/unit_services.test.js` | **PASS** |
| **SRS-APP-06** | Students view own applications and status history | `server/tests/applications.test.js`, `v3_application_tracking.test.js` | **PASS** |
| **SRS-APP-07** | Status transition history appended on every update | `server/tests/applications.test.js`, `v3_application_tracking.test.js` | **PASS** |

### 1.5 Interview Management (SRS-INT)

| Req ID | Description | Test Suite Reference | Result |
| :--- | :--- | :--- | :--- |
| **SRS-INT-01** | Recruiter/Interviewer schedules interview for candidate | `server/tests/interviews_admin.test.js`, `v9_human_mock_interviews.test.js` | **PASS** |
| **SRS-INT-02** | Interview records date, mode, meeting link, and notes | `server/tests/interviews_admin.test.js` | **PASS** |
| **SRS-INT-03** | Application state transitions to `interview_scheduled` | `server/tests/interviews_admin.test.js` | **PASS** |
| **SRS-INT-04** | Students access interview details for own sessions only | `server/tests/interviews_admin.test.js`, `v9_human_mock_interviews.test.js` | **PASS** |

### 1.6 Administration & Platform Governance (SRS-ADM)

| Req ID | Description | Test Suite Reference | Result |
| :--- | :--- | :--- | :--- |
| **SRS-ADM-01** | Admins inspect and toggle user account statuses | `server/tests/interviews_admin.test.js` | **PASS** |
| **SRS-ADM-02** | Admins approve or reject recruiter registrations | `server/tests/interviews_admin.test.js` | **PASS** |
| **SRS-ADM-03** | Admins moderate, publish, close, or archive jobs | `server/tests/interviews_admin.test.js`, `v3_opportunities.test.js` | **PASS** |
| **SRS-ADM-04** | Admins view live aggregate metrics and cohort readiness | `server/tests/interviews_admin.test.js`, `v10_readiness_reports.test.js` | **PASS** |
| **SRS-ADM-05** | Admin endpoints strictly reject non-admin users (`403`) | `server/tests/v1_org_foundation.test.js`, `v10_readiness_reports.test.js` | **PASS** |

---

## 2. Non-Functional Requirements (NFR) Validation

- **NFR-01 (Security):** Server-side RBAC, org scoping, parameter validation, rate limiting, and helmet headers active.
- **NFR-02 (Password Storage):** Plaintext passwords never stored; hashed with `bcryptjs`.
- **NFR-03 (Privacy):** No passwords, tokens, answer keys, or unmasked PII returned in API responses.
- **NFR-04 (Performance):** Paginated responses and verified query indexes (`JobOpportunity`, `MockTestAttempt`, `ReferredParticipant`).
- **NFR-05 (Reliability):** Centralized error handling returns consistent JSON `{ success: false, error: ... }`.
- **NFR-06 (Maintainability):** Clear separation between routes, controllers, models, and domain services.
- **NFR-07 (Compatibility):** Modern responsive layouts tested across mobile, tablet, and desktop breakpoints.
- **NFR-08 (Accessibility):** Form controls have accessible labels, keyboard focus rings, and high-contrast badges.
- **NFR-09 (Observability):** Structured audit logging without secret or credential leakage.
- **NFR-10 (Configuration):** Environment-driven credentials and feature flags.

---

## 3. User Acceptance Testing (UAT) Checklist

Use this checklist during pilot onboarding and stakeholder sign-off:

| Test ID | Persona | Action / Test Procedure | Expected Result | Status |
| :--- | :--- | :--- | :--- | :---: |
| **UAT-01** | Placement Admin | Log in with `admin@niet.edu` | Dashboard loads with verified cohort readiness & audit link | [x] PASS |
| **UAT-02** | Placement Admin | Import students via CSV batch upload | Dry-run preview displays validation; batch imports cleanly | [x] PASS |
| **UAT-03** | Placement Staff | Publish external Job Opportunity with criteria | Opportunity is listed with active application URL | [x] PASS |
| **UAT-04** | Student | Log in with `student.aarav@niet.edu` | Profile, eligibility badges, and mock test catalog visible | [x] PASS |
| **UAT-05** | Student | View Job Opportunity and record application | Application saved as `"unverified (student-reported)"` | [x] PASS |
| **UAT-06** | Student | Take Mock Test Diagnostic | Countdown timer ticks, autosave works, answer keys concealed | [x] PASS |
| **UAT-07** | Student | Submit Mock Test | Attempt transitions atomically to `SUBMITTED`, score shown | [x] PASS |
| **UAT-08** | Student | Complete AI Mock Interview session | AI turns converse, token budget respected, rubric generated | [x] PASS |
| **UAT-09** | Interviewer | Log in with `interviewer.tech@niet.edu` | Only assigned human mock bookings appear; submits review | [x] PASS |
| **UAT-10** | Placement Admin | Release human interview evaluation | Feedback released to student; student receives notification | [x] PASS |
| **UAT-11** | Ambassador | Log in with `student.diya@niet.edu` | Referral code & copy link rendered; referrals list masked | [x] PASS |
| **UAT-12** | Public Candidate| Access `/referral?code=HT-DIYA2026` and submit | Referral recorded in PENDING state without fees or promises | [x] PASS |
| **UAT-13** | Coordinator | Verify referral and review certificate | Certificate transitions from ELIGIBLE to APPROVED/ISSUED | [x] PASS |
| **UAT-14** | Placement Admin | Export Audit Logs and Student Readiness | Export downloads CSV without exposing confidential PII | [x] PASS |

