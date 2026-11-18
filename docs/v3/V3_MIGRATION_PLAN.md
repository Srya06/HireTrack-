# HireTrack v3 — Incremental Migration Plan (Chunk V0)

> **Status:** Audit & Planning Baseline (Chunk V0) — Pending Owner Confirmation  
> **Branch:** `feat/v0-audit-and-feature-flags`  
> **Stack (Unchanged):** Node.js LTS, Express.js (ESM), MongoDB + Mongoose, React 18 + Vite, Tailwind CSS, JWT + `bcryptjs`, `express-validator`

---

## 0. Source Priority & Audit Assumptions

1. **Source Priority:** Master Prompt `DECISIONS` $\to$ `docs/v3/` product docs $\to$ v1 engineering conventions (`HireTrack_Documentation/`).
2. **Assumptions Made During Audit:**
   - The repository currently holds v1 documentation under `HireTrack_Documentation/`; no pre-existing `docs/v3/` files (such as `API_DOCUMENTATION_1.md`) were present in the workspace. This plan is derived strictly from the Master Prompt `DECISIONS` and the audited v1 codebase. When additional `docs/v3/` specifications are placed in the repo, route schemas will be reconciled against them while honoring all collision-handling `DECISIONS`.
   - Single default `Organization` will be seeded and backfilled onto existing `users` and `studentprofiles`, while all v3 models and queries enforce strict `organizationId` scoping from day one.
   - No destructive operations (no dropping/renaming collections, fields, or legacy v1 routes) are scheduled without explicit owner approval.

---

## 1. Baseline Verification Results (Pre-Change)

Recorded on `main` / branch `feat/v0-audit-and-feature-flags` before adding Chunk V0 feature flags:

| Check | Command | Result | Details |
| :--- | :--- | :--- | :--- |
| **Server Test Suite** | `npm --prefix server test` | **PASS** | 8/8 suites, **93/93 tests** passed (70.49s, `MongoMemoryServer`) |
| **Client Test Suite** | `npm --prefix client test` | **PASS** | 7/7 suites, **39/39 tests** passed (43.42s, Vitest + RTL) |
| **Client Production Build** | `npm --prefix client run build` | **PASS** | Built cleanly in 25.27s (`dist/assets/index-B0N-X_6T.js` 794.93 kB, CSS 33.73 kB) |
| **Linter** | N/A | **NOT CONFIGURED** | Neither `server/package.json` nor `client/package.json` defines a `lint` script |

---

## 2. Current-State Repository Summary (HireTrack v1)

### 2.1 Top-Level Structure & Scripts
- **Root (`package.json`):** `dev:server`, `dev:client`, `build:client`, `test:server`, `test:client`, `test`, `seed:admin`, `seed:demo`, `verify:demo`.
- **Server (`server/package.json`):** `start`, `dev`, `seed:admin`, `seed:demo`, `verify:demo`, `test` (`cross-env NODE_ENV=test node --experimental-vm-modules node_modules/jest/bin/jest.js --runInBand --detectOpenHandles --forceExit`).
- **Client (`client/package.json`):** `dev`, `build`, `preview`, `test` (`vitest run`).
- **Env Files:** `server/.env.example` (`NODE_ENV`, `PORT`, `MONGODB_URI`, `CLIENT_URL`, `JWT_SECRET`, `JWT_EXPIRES_IN`, `CLOUDINARY_*`, `MAX_RESUME_SIZE_MB`) and `client/.env.example` (`VITE_API_BASE_URL`). Real `.env` files are gitignored.

### 2.2 Existing Server Inventory
- **Models (8):** `User`, `StudentProfile`, `RecruiterProfile`, `Job`, `Application`, `Interview`, `AuditLog`, `Notification` (exported from `server/src/models/index.js`).
- **Routes (10 mounted under `/api/v1`):**
  - `/health` (`health.routes.js`)
  - `/auth` (`auth.routes.js`: register, login, me, logout)
  - `/admin` (`admin.routes.js`: ping, overview, recruiters/pending, recruiters/:recruiterId/approval, users, users/:id/status, jobs, jobs/:id/status)
  - `/students` (`student.routes.js`: me, me/resume, :id)
  - `/recruiters` (`recruiter.routes.js`: me)
  - `/jobs` (`job.routes.js`: /, /mine, /:jobId, /:jobId/publish, /:jobId/close, /:jobId/applications)
  - `/applications` (`application.routes.js`: /me, /:id, /:id/status, /:id/withdraw, /:id/interviews)
  - `/interviews` (`interview.routes.js`: /:id, /:id/cancel)
  - `/notifications` (`notification.routes.js`: /, /read-all, /:id/read)
  - `/uploads` (`upload.routes.js`: /resumes/:filename)
- **Services (10):** `auth`, `student`, `recruiter`, `job`, `application`, `eligibility`, `statusTransition`, `interview`, `admin`, `notification`.
- **Middleware (7):** `auth.middleware.js` (`protect`, `authorizeRoles`), `validate.middleware.js`, `rateLimit.middleware.js` (`authRateLimiter`, `apiRateLimiter`), `mongoSanitize.middleware.js`, `upload.middleware.js`, `notFound.middleware.js`, `error.middleware.js`.
- **Tests (8 suites / 93 tests):** `health`, `auth`, `student`, `recruiter_jobs`, `applications`, `interviews_admin`, `notifications`, `unit_services`.

### 2.3 Existing Client Inventory
- **Layouts:** `PublicLayout`, `DashboardLayout` (sidebar, mobile drawer, topbar with `NotificationBell`, user menu).
- **Guards & Context:** `AuthContext`, `ProtectedRoute`, `RoleRoute`.
- **Pages (20):**
  - Public: `Landing`, `Login`, `Register`, `AccessDenied`, `NotFound`
  - Student: `StudentDashboard`, `JobsBrowse`, `JobDetails`, `MyApplications`, `ApplicationDetails`, `StudentProfile`
  - Recruiter (legacy v1): `RecruiterDashboard`, `MyJobs`, `CreateEditJob`, `JobApplicants`, `RecruiterProfile`
  - Admin: `AdminDashboard`, `PendingRecruiters`, `UserManagement`, `JobModeration`
- **Tests (7 suites / 39 tests):** `smoke`, `components`, `auth_guards`, `student_ui`, `recruiter_ui`, `admin_ui`, `notification_ui`.

---

## 3. Gap Analysis: HireTrack v3 Requirement Areas

| # | v3 Requirement Area | Disposition | Existing v1 Code | v3 Additive Plan |
| :--- | :--- | :--- | :--- | :--- |
| 1 | **Identity & Organization** | **Extend + New** | `User`, `auth.middleware.js`, `auth.service.js`, `AuthContext`, `RoleRoute` | Keep `User.role` untouched. Add `Organization`, `OrganizationMembership` (`STUDENT`, `ORG_ADMIN`, `PLACEMENT_COORDINATOR`, `AMBASSADOR_COORDINATOR`, `INTERVIEWER`), `attachOrganization` middleware, `authorizeMemberships(...)`, org-scoped query helper (`scopeOrg`), backfill migration `npm run migrate:v3-org-backfill`, and membership-aware client workspaces. |
| 2 | **Students & Bulk Import** | **Extend + New** | `StudentProfile`, `student.service.js`, `student.routes.js`, `StudentProfile.jsx` | Extend `StudentProfile` with optional `organizationId`, `backlogs`, `tenthPercentage`, `twelfthPercentage`, `diplomaPercentage`, `department`, `section`, `verificationStatus`, `importBatchId`. Add CSV bulk student import + dry-run preview + invite/activation flow for staff (`ORG_ADMIN` / `PLACEMENT_COORDINATOR`), keeping `ALLOW_PUBLIC_STUDENT_SIGNUP` flag-controlled. |
| 3 | **Jobs (Opportunities)** | **New (legacy untouched)** | v1 `Job` (`recruiterId`-owned) | Keep v1 `/jobs` frozen/untouched behind `LEGACY_RECRUITER_FLOW`. Add `JobOpportunity` collection (staff-published, `organizationId`, `applicationUrl`, `applicationInstructions`, embedded bounded `criteria[]` + `criteriaVersion`, `deadlineAt` in UTC + org timezone rules, `status`). Exposed at `/opportunities` and `/admin/opportunities`. CTA (`applicationUrl` + instructions) is ALWAYS shown immediately unless closed/expired. |
| 4 | **Advisory Eligibility** | **New (keep v1 pure fn)** | v1 `eligibility.service.js` (hard gate on 3 fields) | Leave v1 `eligibility.service.js` unchanged for v1 tests. Add v3 pure advisory engine (`opportunityEligibility.service.js`) evaluating bounded criteria against `StudentProfile`, producing per-criterion `PASS` / `FAIL` / `MISSING_DATA` (missing data never silently passes), mandatory disclaimer, persisted `EligibilityEvaluation` records, and staff override audit support. Never gates `applicationUrl`. |
| 5 | **Application Tracking** | **New (legacy untouched)** | v1 `Application` (internal recruiter pipeline) | Keep v1 `/applications` untouched. Add `JobApplication` collection (student self-reported external application status: `interested`, `applied`, `shortlisted`, `interviewing`, `offered`, `rejected`, `withdrawn` — explicitly marked `verificationState: 'unverified'` / labelled `"unverified"` in UI, plus click/redirect timestamp). Exposed at `/opportunities/:id/application-status` and `/students/me/job-applications`. |
| 6 | **Mock Tests** | **New** | None | Separate module, models (`TestCategory`, `QuestionBank`, `Question`, `MockTest`, `MockTestAttempt`, `MockTestAnswer`), APIs, and dedicated nav/pages. Server owns timers, deadlines, question snapshots, and grading. Answer keys are NEVER exposed to students during active attempts (and only per test review policy after submission). Atomic conditional updates prevent double-submit/late-submit races. |
| 7 | **AI Mock Interviews** | **New** | None | Separate module, models (`InterviewTrack`, `AiMockInterviewSession`, `AiInterviewTurn`), APIs, and pages. Distinct from Mock Tests and Human Interviews. Pluggable deterministic/LLM evaluator adapter (zero unnecessary PII sent to any LLM), rate-limited turn endpoint, server-enforced turn/time caps, structured rubric feedback. |
| 8 | **Human Mock Interviews** | **New** | v1 `Interview` (legacy recruiter round) | Leave v1 `Interview` untouched. Add `InterviewerProfile`, `HumanMockInterviewSlot`, `HumanMockInterviewBooking`, `HumanInterviewEvaluation`. Dedicated Interviewer workspace (`INTERVIEWER` membership sees ONLY assigned sessions). Atomic conditional slot booking (`findOneAndUpdate` with `status: 'open'`). Optional AI-pass rule gates ONLY human mock booking (default OFF via `InstitutePolicy` + feature flag). Feedback release audited. |
| 9 | **Readiness** | **New** | None | Read-only aggregation service & endpoint (`GET /api/v1/students/me/readiness` and staff view). Computes transparent domain summaries across profile completeness, Mock Tests, AI Interviews, and Human Interviews. Never mutates or merges source records; never fabricates a placement probability score. |
| 10 | **Ambassadors** | **New** | None | Capability-based (`AmbassadorProfile` linked to student user, NOT a role). Models: `AmbassadorProfile`, `AmbassadorCampaign`, `AmbassadorReferralCode`, `ReferredParticipant`, `AmbassadorCertificate`. Strictly no fee collection, no placement promises, no sensitive participant PII exposed to ambassadors. Rate-limited public referral capture. Staff verification audited. |
| 11 | **Reports, Policies & Audit** | **Extend + New** | `AuditLog`, `auditLogger.js`, `admin.service.js` | Extend `AuditLog` with `organizationId`, `entityType`, `entityId` (keeping `resourceType`/`resourceId` mirrored for v1 compatibility). Add `InstitutePolicy` (per-org toggles like `requireAiPassForHumanMock: false`, timezone, retention/disclaimer settings) and `FileAsset` (authorized short-lived signed URLs for private files). Add org-scoped placement/readiness/ambassador reports & CSV exports with no PII leaks in logs. |
| 12 | **Notifications** | **Extend** | `Notification`, `notification.service.js`, `NotificationBell.jsx` | Extend `Notification` with optional `organizationId` + org-scoped index; backfill existing rows; emit org-scoped notifications for v3 events (opportunity published, human mock booked/feedback released, ambassador approved/certificate issued) while keeping v1 notification tests green. |

---

## 4. Final Collection List

### 4.1 Preserved & Extended v1 Collections (8)
1. `users` — **Extend (additive):** optional `organizationId` (ref `Organization`, indexed). Keep `role` (`student|recruiter|admin`) untouched.
2. `studentprofiles` — **Extend (additive):** optional `organizationId`, `backlogs`, `tenthPercentage`, `twelfthPercentage`, `diplomaPercentage`, `department`, `section`, `verificationStatus`, `importBatchId`.
3. `recruiterprofiles` — **Freeze (legacy v1 only):** untouched behind `LEGACY_RECRUITER_FLOW`.
4. `jobs` — **Freeze (legacy v1 only):** untouched behind `LEGACY_RECRUITER_FLOW`.
5. `applications` — **Freeze (legacy v1 only):** untouched behind `LEGACY_RECRUITER_FLOW`.
6. `interviews` — **Freeze (legacy v1 only):** untouched behind `LEGACY_RECRUITER_FLOW`.
7. `notifications` — **Extend (additive):** optional `organizationId` + compound index `{ organizationId: 1, userId: 1, readAt: 1, createdAt: -1 }`.
8. `auditlogs` — **Extend (additive):** optional `organizationId`, `entityType`, `entityId` (mirrored with `resourceType`/`resourceId`) + index `{ organizationId: 1, entityType: 1, createdAt: -1 }`.

### 4.2 New v3 Collections (24)
All carry required `organizationId` (ref `Organization`, indexed) and UTC timestamps:

| Collection | Model Name | Key Indexes & Atomic Invariants |
| :--- | :--- | :--- |
| `organizations` | `Organization` | Unique `slug`; `timezone` (IANA string, default `Asia/Kolkata`), `status` |
| `organizationmemberships` | `OrganizationMembership` | Unique `{ organizationId: 1, userId: 1, role: 1 }`; index `{ userId: 1, status: 1 }` |
| `jobopportunities` | `JobOpportunity` | `{ organizationId: 1, status: 1, deadlineAt: 1 }`; embedded bounded `criteria[]` + `criteriaVersion` |
| `eligibilityevaluations` | `EligibilityEvaluation` | `{ organizationId: 1, opportunityId: 1, studentId: 1, criteriaVersion: 1 }` |
| `jobapplications` | `JobApplication` | Unique `{ organizationId: 1, opportunityId: 1, studentId: 1 }`; `verificationState: 'unverified'` |
| `testcategories` | `TestCategory` | Unique `{ organizationId: 1, slug: 1 }` |
| `questionbanks` | `QuestionBank` | `{ organizationId: 1, categoryId: 1, status: 1 }` |
| `questions` | `Question` | `{ organizationId: 1, questionBankId: 1, isActive: 1 }`; answer keys stripped in student projections |
| `mocktests` | `MockTest` | `{ organizationId: 1, categoryId: 1, status: 1 }` |
| `mocktestattempts` | `MockTestAttempt` | `{ organizationId: 1, mockTestId: 1, studentId: 1, status: 1 }`; atomic `findOneAndUpdate` on `status: 'in_progress'` for submission |
| `mocktestanswers` | `MockTestAnswer` | Unique `{ organizationId: 1, attemptId: 1, questionId: 1 }` |
| `interviewtracks` | `InterviewTrack` | Unique `{ organizationId: 1, slug: 1 }` |
| `aimockinterviewsessions` | `AiMockInterviewSession` | `{ organizationId: 1, studentId: 1, trackId: 1, status: 1 }`; atomic status preconditions |
| `aiinterviewturns` | `AiInterviewTurn` | Unique `{ organizationId: 1, sessionId: 1, turnNumber: 1 }` |
| `interviewerprofiles` | `InterviewerProfile` | Unique `{ organizationId: 1, userId: 1 }` |
| `humanmockinterviewslots` | `HumanMockInterviewSlot` | `{ organizationId: 1, interviewerId: 1, startsAt: 1, status: 1 }`; atomic `findOneAndUpdate({ _id, organizationId, status: 'open' })` for booking |
| `humanmockinterviewbookings` | `HumanMockInterviewBooking` | Partial unique `{ organizationId: 1, slotId: 1 }` where `status: { $in: ['booked', 'completed'] }` |
| `humaninterviewevaluations` | `HumanInterviewEvaluation` | Unique `{ organizationId: 1, bookingId: 1 }` |
| `institutepolicies` | `InstitutePolicy` | Unique `{ organizationId: 1 }`; `requireAiPassForHumanMock` (default `false`) |
| `ambassadorprofiles` | `AmbassadorProfile` | Unique `{ organizationId: 1, userId: 1 }` (capability, not a role) |
| `ambassadorcampaigns` | `AmbassadorCampaign` | `{ organizationId: 1, status: 1, startsAt: 1, endsAt: 1 }` |
| `ambassadorreferralcodes` | `AmbassadorReferralCode` | Unique `{ code: 1 }`, index `{ organizationId: 1, ambassadorProfileId: 1 }` |
| `referredparticipants` | `ReferredParticipant` | Unique `{ organizationId: 1, campaignId: 1, participantHash: 1 }` (no sensitive PII exposed) |
| `ambassadorcertificates` | `AmbassadorCertificate` | Unique `{ certificateNumber: 1 }`, index `{ organizationId: 1, ambassadorProfileId: 1 }` |
| `fileassets` | `FileAsset` | `{ organizationId: 1, ownerId: 1, purpose: 1 }`; private downloads via short-lived HMAC signed URLs |

*(Total: 8 preserved/extended v1 collections + 25 new v3 collections including `fileassets`.)*

---

## 5. Final Route List & Collision Handling (`/api/v1`)

### 5.1 Preserved Legacy v1 Routes (Untouched)
- `GET /api/v1/health`
- `POST /api/v1/auth/register`, `POST /api/v1/auth/login`, `GET /api/v1/auth/me`, `POST /api/v1/auth/logout`
- `GET/PATCH /api/v1/students/me`, `POST /api/v1/students/me/resume`, `PATCH /api/v1/students/:id`
- `GET/PATCH /api/v1/recruiters/me` *(legacy)*
- `GET/POST /api/v1/jobs`, `GET /api/v1/jobs/mine`, `GET/PATCH /api/v1/jobs/:jobId`, `PATCH /api/v1/jobs/:jobId/publish`, `PATCH /api/v1/jobs/:jobId/close`, `POST/GET /api/v1/jobs/:jobId/applications` *(legacy)*
- `GET /api/v1/applications/me`, `GET /api/v1/applications/:id`, `PATCH /api/v1/applications/:id/status`, `PATCH /api/v1/applications/:id/withdraw`, `POST/GET /api/v1/applications/:id/interviews` *(legacy)*
- `PATCH /api/v1/interviews/:id`, `PATCH /api/v1/interviews/:id/cancel` *(legacy)*
- `GET /api/v1/admin/ping`, `/overview`, `/recruiters/pending`, `/recruiters/:recruiterId/approval`, `/users`, `/users/:id/status`, `/jobs`, `/jobs/:id/status` *(legacy `/jobs` & `/recruiters` preserved)*
- `GET /api/v1/notifications`, `PATCH /api/v1/notifications/read-all`, `PATCH /api/v1/notifications/:id/read`
- `GET /api/v1/uploads/resumes/:filename` *(legacy local dev resume viewer)*

### 5.2 Collision Mapping Table (Per Master Prompt DECISIONS)

| v3 Doc Path | Colliding v1 Path | Final v3 Path Under `/api/v1` |
| :--- | :--- | :--- |
| `/jobs` | `GET/POST /api/v1/jobs` | `/api/v1/opportunities` |
| `/admin/jobs` | `GET/PATCH /api/v1/admin/jobs` | `/api/v1/admin/opportunities` |
| `/students/me/applications` | `GET /api/v1/applications/me` (and conceptual overlap) | `/api/v1/students/me/job-applications` |
| `/jobs/:id/eligibility` | `/api/v1/jobs/:jobId` | `/api/v1/opportunities/:id/eligibility` |
| `/jobs/:id/application-status` | `/api/v1/jobs/:jobId/applications` | `/api/v1/opportunities/:id/application-status` |

### 5.3 New v3 Routes Under `/api/v1` (All Paginated on List Endpoints)
- **Config (Chunk V0):**
  - `GET /api/v1/config/features` (public, allowlisted booleans only)
- **Org, Memberships & Policies (Chunk V1):**
  - `GET /api/v1/organizations/current`
  - `GET/POST/PATCH /api/v1/admin/memberships` (`ORG_ADMIN`)
  - `GET/PATCH /api/v1/admin/policy` (`ORG_ADMIN`, `PLACEMENT_COORDINATOR`)
  - `GET /api/v1/admin/audit-logs` (`ORG_ADMIN`)
  - `POST /api/v1/files`, `GET /api/v1/files/:id/signed-url`, `GET /api/v1/files/:id/download`
- **Students & Bulk Import (Chunk V2):**
  - `GET /api/v1/admin/students`, `POST /api/v1/admin/students/import` (supports `dryRun`), `PATCH /api/v1/admin/students/:id/verification`
- **Opportunities, Advisory Eligibility & External Application Tracking (Chunks V3–V4):**
  - `GET /api/v1/opportunities`, `GET /api/v1/opportunities/:id`
  - `GET /api/v1/opportunities/:id/eligibility`, `POST /api/v1/opportunities/:id/eligibility/evaluate`
  - `PUT/PATCH /api/v1/opportunities/:id/application-status` (student-reported `"unverified"`)
  - `GET /api/v1/students/me/job-applications`
  - `GET/POST /api/v1/admin/opportunities`, `GET/PATCH /api/v1/admin/opportunities/:id`, `PATCH /api/v1/admin/opportunities/:id/publish`, `PATCH /api/v1/admin/opportunities/:id/close`, `POST /api/v1/admin/opportunities/:id/eligibility-overrides`
- **Mock Tests (Chunks V5–V6):**
  - `GET/POST/PATCH /api/v1/admin/test-categories`, `/admin/question-banks`, `/admin/questions`, `/admin/mock-tests`
  - `GET /api/v1/mock-tests`, `GET /api/v1/mock-tests/:id`, `POST /api/v1/mock-tests/:id/attempts`
  - `GET /api/v1/mock-test-attempts/me`, `GET /api/v1/mock-test-attempts/:attemptId`, `PUT /api/v1/mock-test-attempts/:attemptId/answers`, `POST /api/v1/mock-test-attempts/:attemptId/submit`
- **AI Mock Interviews (Chunk V7):**
  - `GET/POST/PATCH /api/v1/admin/interview-tracks`
  - `GET /api/v1/interview-tracks`, `POST /api/v1/ai-interviews/sessions`, `GET /api/v1/ai-interviews/sessions/me`, `GET /api/v1/ai-interviews/sessions/:id`, `POST /api/v1/ai-interviews/sessions/:id/turns` (rate-limited), `POST /api/v1/ai-interviews/sessions/:id/complete`
- **Human Mock Interviews (Chunk V8):**
  - `GET/PUT /api/v1/interviewer/profile`, `GET/POST/DELETE /api/v1/interviewer/slots`, `GET /api/v1/interviewer/bookings` (assigned only), `POST/PATCH /api/v1/interviewer/bookings/:id/evaluation`, `POST /api/v1/interviewer/bookings/:id/evaluation/release`
  - `GET /api/v1/human-interviews/slots`, `POST /api/v1/human-interviews/bookings`, `GET /api/v1/human-interviews/bookings/me`, `PATCH /api/v1/human-interviews/bookings/:id/cancel`
- **Readiness (Chunk V9):**
  - `GET /api/v1/students/me/readiness`, `GET /api/v1/admin/students/:studentId/readiness`
- **Ambassadors (Chunk V10):**
  - `POST /api/v1/ambassadors/apply`, `GET /api/v1/ambassadors/me`, `GET /api/v1/ambassadors/campaigns`, `POST /api/v1/ambassadors/referral-codes`, `GET /api/v1/ambassadors/referrals/me`, `GET /api/v1/ambassadors/certificates/me`
  - `POST /api/v1/public/referrals/capture` (rate-limited, sanitized, minimal non-sensitive fields)
  - `GET/PATCH /api/v1/admin/ambassadors`, `GET/POST/PATCH /api/v1/admin/ambassador-campaigns`, `POST /api/v1/admin/ambassador-certificates`
- **Reports & Analytics (Chunk V11):**
  - `GET /api/v1/admin/reports/overview`, `/admin/reports/opportunities`, `/admin/reports/readiness`, `/admin/reports/ambassadors` (JSON + safe CSV export)

---

## 6. Feature-Flag List

Exposed publicly via `GET /api/v1/config/features` (backed by `server/src/config/features.js`):

| Flag Name | V0–V11 Default | Pilot Target (V12, w/ Approval) | Purpose |
| :--- | :---: | :---: | :--- |
| `LEGACY_RECRUITER_FLOW` | `true` | `false` | Keeps v1 recruiter portal, `/recruiters`, `/jobs`, `/applications`, `/interviews` active in UI & API until pilot cutover. |
| `ALLOW_PUBLIC_STUDENT_SIGNUP` | `true` | `false` | Keeps v1 open student self-registration active until staff bulk-import / invite onboarding is live. |
| `V3_OPPORTUNITIES_ENABLED` | `false` | `true` | Toggles v3 staff-published Opportunities, advisory eligibility, and external application tracking workspace items. |
| `V3_MOCK_TESTS_ENABLED` | `false` | `true` | Toggles Mock Tests navigation, student attempts, and staff test builder. |
| `V3_AI_INTERVIEWS_ENABLED` | `false` | `true` | Toggles AI Mock Interviews workspace and endpoints. |
| `V3_HUMAN_INTERVIEWS_ENABLED` | `false` | `true` | Toggles Human Mock Interviews booking and Interviewer workspace. |
| `V3_READINESS_ENABLED` | `false` | `true` | Toggles read-only Readiness aggregation views. |
| `V3_AMBASSADORS_ENABLED` | `false` | `true` | Toggles Campus Ambassador capability workflows and referral capture. |
| `REQUIRE_AI_PASS_FOR_HUMAN_INTERVIEW` | `false` | `false` (optional org policy) | Product truth: default OFF. When enabled (and org policy agrees), gates ONLY human mock interview booking — NEVER job application links. |

---

## 7. Legacy Freeze Plan

1. **V0–V11 (Coexistence):**
   - Zero destructive edits to v1 models (`RecruiterProfile`, `Job`, `Application`, `Interview`), v1 routes, v1 controllers, or v1 test suites.
   - All 93 v1 server tests and 39 v1 client tests run unchanged after every chunk.
   - New v3 UI workspaces are gated cleanly by `OrganizationMembership` + feature flags so legacy routes remain reachable when `LEGACY_RECRUITER_FLOW=true`.
2. **V12 (Pilot Cutover — Owner Approval Required):**
   - Flip `LEGACY_RECRUITER_FLOW=false` and `ALLOW_PUBLIC_STUDENT_SIGNUP=false` in pilot environment configuration ONLY after owner sign-off.
   - When `LEGACY_RECRUITER_FLOW=false`: UI hides Recruiter Portal links/nav and legacy registration tab; legacy API endpoints return `410 Gone` / `403 FORBIDDEN` (`FEATURE_DISABLED` code) while preserving database data intact for rollback or historical export.
   - Any future deletion of legacy collections or code requires an explicit separate decision from the owner.

---

## 8. Existing Code Conflicts with Master Prompt DECISIONS (and Smallest Additive Fixes)

| # | Conflict Found in v1 Codebase | Location | Smallest Additive Fix (Scheduled Chunk) |
| :--- | :--- | :--- | :--- |
| 1 | **Missing `code` field in error responses** — Master prompt requires error envelopes to include a machine-readable `code` (`VALIDATION_ERROR`, `FORBIDDEN`, `NOT_FOUND`, `CONFLICT`, `RATE_LIMITED`). Current `ApiError` & `errorMiddleware` omit `code`. | `server/src/utils/ApiError.js`, `server/src/middleware/error.middleware.js`, `server/src/utils/response.js` | **Chunk V1:** Add optional `code` property on `ApiError` with status-to-code defaults and include `code` in `errorMiddleware` responses while keeping `success`, `message`, `errors` identical for v1 tests. |
| 2 | **`AuditLog` lacks `organizationId`, `entityType`, `entityId`** — v1 uses `resourceType`/`resourceId` only and has no org scope. | `server/src/models/auditLog.model.js`, `server/src/utils/auditLogger.js` | **Chunk V1:** Add optional `organizationId`, `entityType`, `entityId` fields; mirror `entityType` $\leftrightarrow$ `resourceType` and `entityId` $\leftrightarrow$ `resourceId` in `auditLogger.js` so v1 tests stay green. |
| 3 | **`Notification` lacks `organizationId`** — v1 notifications are scoped only by `userId`. | `server/src/models/notification.model.js`, `server/src/services/notification.service.js` | **Chunk V1:** Add optional `organizationId` + org-scoped compound index; backfill via `npm run migrate:v3-org-backfill`; include `organizationId` on all v3 notifications. |
| 4 | **`User` & `StudentProfile` lack `organizationId` and org-membership link** — auth middleware relies solely on `User.role`. | `server/src/models/user.model.js`, `server/src/models/studentProfile.model.js`, `server/src/middleware/auth.middleware.js` | **Chunk V1:** Add optional `organizationId` on `User` and `StudentProfile`; add `Organization` + `OrganizationMembership`; add `attachOrganization` and `authorizeMemberships(...)` middleware alongside untouched `authorizeRoles`; backfill via idempotent migration script. |
| 5 | **Unauthenticated local file download route** — Master prompt requires private files only via authorized short-lived signed URLs. v1 `GET /api/v1/uploads/resumes/:filename` is currently unauthenticated. | `server/src/routes/upload.routes.js` | **Chunk V1/V2:** Implement `FileAsset` + HMAC short-lived signed URL endpoints for all v3 private files. Keep v1 demo resume route intact during coexistence and gate/deprecate it under `LEGACY_RECRUITER_FLOW` in V12 (or require signed URLs with owner approval). |
| 6 | **Hard-gating v1 eligibility vs advisory v3 eligibility** — v1 `eligibility.service.js` blocks job applications and checks only 3 fixed fields without `MISSING_DATA` status or disclaimer. | `server/src/services/eligibility.service.js`, `server/src/services/application.service.js` | **Chunk V4:** Keep v1 `eligibility.service.js` untouched for legacy tests. Build separate v3 `opportunityEligibility.service.js` with bounded criteria, `PASS`/`FAIL`/`MISSING_DATA`, advisory disclaimer, and zero blocking of `applicationUrl`. |
| 7 | **Non-neutral institute/company placeholders** — `1RV22CS001` (real Bengaluru college USN prefix) in `Register.jsx`, `1RV22...` & `google.com` in `seedDemo.js`, `"Single-college campus placement platform"` in `PublicLayout.jsx`. | `client/src/pages/public/Register.jsx`, `client/src/layouts/PublicLayout.jsx`, `server/src/scripts/seedDemo.js` | **Chunk V1/V2:** Replace UI placeholders with institute-neutral examples (e.g., `STU2026CS001`, `org-domain.edu`, generic `"Campus Placement Platform"` / dynamic `organization.name`) without breaking existing test assertions. |
| 8 | **Auth registration not flag-gated** — `POST /api/v1/auth/register` always allows student & recruiter public signup regardless of `ALLOW_PUBLIC_STUDENT_SIGNUP` / `LEGACY_RECRUITER_FLOW`. | `server/src/services/auth.service.js`, `client/src/pages/public/Register.jsx` | **Chunk V1:** Consult `getFeatureFlags()` inside `auth.service.js` and `Register.jsx` (defaults remain `true` so v1 behavior & tests remain unchanged until V12 flip). |
| 9 | **No lint script configured** — Workflow requires running tests/lint/build per chunk. | `package.json`, `server/package.json`, `client/package.json` | Report honestly now; optionally add ESLint in a dedicated step only with owner approval (since Master Prompt prefers no new dependencies without justification). |

---

## 9. Risk List & Mitigations

1. **Cross-Org Data Leakage:** *Risk:* Missing `organizationId` filter on any v3 query exposes another org's records. *Mitigation:* Mandatory `attachOrganization` middleware (derived strictly from active `OrganizationMembership`, never client input) + shared `scopeOrg(req, filter)` query helper + mandatory cross-org isolation test (`404`) in every v3 chunk.
2. **Concurrency Without Replica Set:** *Risk:* MongoDB multi-document transactions require a replica set (unavailable on standalone/default `MongoMemoryServer`). *Mitigation:* Use single-document atomic `findOneAndUpdate` preconditions (e.g., `status: 'open'` for slot booking, `status: 'in_progress'` for test submission) + unique/partial indexes.
3. **Employer Link Gating Regression:** *Risk:* UI or API accidentally hides `applicationUrl` when eligibility fails or tests/interviews are incomplete. *Mitigation:* Explicit negative tests proving `applicationUrl` + `applicationInstructions` are returned even when eligibility is `FAIL` or `MISSING_DATA` and zero mock tests/interviews exist (disabled only when opportunity is expired/closed).
4. **Answer Key / Scoring / Timer Spoofing:** *Risk:* Client manipulates timers or reads correct answers from payloads. *Mitigation:* Server stores `startedAt`/`expiresAt` in UTC, computes scores server-side from `Question` records, and uses explicit allowlisted projections stripping `correctOption`/`answerKey` from all student responses.
5. **PII Leakage to Logs or LLMs:** *Risk:* Transcripts, resumes, or student emails logged or passed to an LLM adapter. *Mitigation:* Sanitize audit metadata, redact auth headers/secrets, send only anonymized prompt/rubric context (no name/email/phone/USN) to the AI interview evaluator adapter.
6. **v1 Regression:** *Risk:* Shared model or auth changes break legacy v1 tests. *Mitigation:* Strictly additive schema fields, preserved `User.role` + `authorizeRoles`, and running all 93 v1 server tests + 39 v1 client tests after every single chunk.
7. **Client Bundle Size (795 kB):** *Risk:* Adding v3 workspaces grows the single JS bundle further. *Mitigation:* Use `React.lazy` + `Suspense` route-level code splitting for new v3 workspaces when introduced.

---

## 10. Proposed Incremental Roadmap (Chunks V1–V12)

| Chunk | Scope & Vertical Slice | Key Migrations / Verification |
| :--- | :--- | :--- |
| **V0 (Current)** | Repo audit, baseline test/build record, `docs/v3/V3_MIGRATION_PLAN.md`, `server/src/config/features.js`, `GET /api/v1/config/features` + tests | None (audit + feature flag config only) |
| **V1** | **Identity, Org, Memberships, Policies, Audit & Error Codes:** `Organization`, `OrganizationMembership`, `InstitutePolicy`, `FileAsset` (signed URLs); extend `User`, `StudentProfile`, `AuditLog`, `Notification`; `attachOrganization` + `authorizeMemberships(...)`; `ApiError` `code`; flag-aware auth/register; client `FeatureFlagsContext` + membership-aware shell | `npm run migrate:v3-org-backfill` (`--dry-run`, idempotent, count-only logs) |
| **V2** | **Students & Bulk Import:** Extend `StudentProfile` academic fields; staff student directory, CSV bulk import (dry-run + commit + invite/activation), profile verification workflow, institute-neutral placeholders | `npm run migrate:v3-student-fields` (if backfill needed) |
| **V3** | **Staff-Published Opportunities:** `JobOpportunity` (bounded `criteria[]`, `criteriaVersion`, `applicationUrl`, `applicationInstructions`, UTC deadlines + org timezone display/expiry); `/opportunities` & `/admin/opportunities`; Student & Staff UI | Opportunity & CTA visibility tests (never gated except expired/closed) |
| **V4** | **Advisory Eligibility & External Application Tracking:** Pure advisory eligibility engine (`PASS`/`FAIL`/`MISSING_DATA` + disclaimer), `EligibilityEvaluation`, staff override + audit; `JobApplication` (`"unverified"` student self-reported status) under `/opportunities/:id/application-status` and `/students/me/job-applications` | Unit tests for all eligibility edge cases (including missing data) + org isolation |
| **V5** | **Mock Tests — Authoring & Publishing:** `TestCategory`, `QuestionBank`, `Question`, `MockTest`; staff CRUD & publish; strict projection ensuring answer keys never leak to students | RBAC + answer-key leak tests + org isolation |
| **V6** | **Mock Tests — Student Attempts & Server Scoring:** `MockTestAttempt`, `MockTestAnswer`; server-owned timers/expiry, atomic conditional submit (`findOneAndUpdate`), server scoring, separate Mock Tests nav & UI | Timer expiry, double-submit race, and client-score rejection tests |
| **V7** | **AI Mock Interviews:** `InterviewTrack`, `AiMockInterviewSession`, `AiInterviewTurn`; pluggable PII-free evaluator adapter, rate-limited turns, structured feedback, separate AI Mock Interviews UI | Turn rate-limit, state transitions, PII-stripping, and org isolation tests |
| **V8** | **Human Mock Interviews & Interviewer Workspace:** `InterviewerProfile`, `HumanMockInterviewSlot`, `HumanMockInterviewBooking`, `HumanInterviewEvaluation`; atomic slot booking, Interviewer workspace (assigned sessions only), audited feedback release, optional AI-pass gate (default OFF) | Concurrent slot double-book test, assigned-only isolation, AI-pass toggle tests |
| **V9** | **Readiness (Read-Only Aggregator):** Read-only aggregation across Profile, Mock Tests, AI Interviews, and Human Interviews (no merged source records, no fabricated placement probability); Student & Staff UI | Pure aggregation unit tests + read-only verification |
| **V10** | **Campus Ambassadors:** `AmbassadorProfile` (capability), `AmbassadorCampaign`, `AmbassadorReferralCode`, `ReferredParticipant`, `AmbassadorCertificate`; rate-limited public referral capture; no fees/promises/sensitive PII; staff verification & certificate issuance (audited) | Public capture rate-limit, PII minimization, and capability authz tests |
| **V11** | **Reports, Audit Viewer & Org-Scoped Notifications:** Org-scoped admin reports (opportunities, readiness, ambassadors, CSV exports), Audit Log viewer, v3 notification triggers | Report count accuracy, audit coverage, and org isolation tests |
| **V12** | **Hardening, Pilot Flag Cutover & Delivery:** Full security & regression pass, `docs/v3` final reconciliation, README migration guide, and (ONLY with owner approval) flipping `LEGACY_RECRUITER_FLOW` & `ALLOW_PUBLIC_STUDENT_SIGNUP` to pilot values | Full v1 + v3 test suites, build, and manual pilot checklist |
