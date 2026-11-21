# HireTrack — Single-College Placement Management System (MVP)

HireTrack is an end-to-end, role-based placement management platform designed for single-college campus hiring operations. It unifies the campus recruitment lifecycle across three core stakeholders:

1. **Placement Cell Administration (`admin`)** — Oversees corporate partner approval, monitors live institutional placement analytics, moderates recruitment drives, and governs user accounts.
2. **Corporate Recruiters (`recruiter`)** — Submits company profile for verification, configures job drives with eligibility criteria, evaluates applicants, downloads candidate resumes, advances application states, and schedules interview rounds.
3. **Graduating Students (`student`)** — Maintains academic profile, uploads resumes, discovers eligible opportunities with real-time rule checks, applies to campus drives, and tracks application timelines with scheduled interview invites.

---

## 🛠 Technology Stack (Fixed Specification)

- **Backend:** Node.js LTS, Express.js (Native ES Modules), Mongoose ODM, MongoDB (Atlas cluster with automated deterministic in-memory fallback for testing).
- **Frontend:** React 18, Vite, Tailwind CSS, React Router v6, Axios, Lucide React, Recharts.
- **Security & RBAC:** Verified JWT authentication, bcryptjs password hashing (10–12 salt rounds), Helmet security headers, CORS origin whitelisting, rate limiting on `/auth` (20 req / 15 min), role and resource ownership verification server-side, strict field allowlisting on all mutations, and no secret leakage in logs.
- **In-App Notifications:** Real-time event notifications for application status updates, interview schedules, and recruiter approvals, with owner-only access, unread counters, and topbar bell popover dropdown with auto-polling.
- **Testing:** Jest + Supertest (Server test suite — 93 tests across 8 suites) & Vitest + React Testing Library (Client test suite — 39 tests across 7 suites) = 132 automated tests passing + End-to-End Demo Script (8 passing steps).

---

## 📋 Prerequisites

- **Node.js:** LTS version `v18.x` or `v20.x` or higher
- **npm:** `v9.x` or `v10.x` or higher
- **MongoDB:** MongoDB Atlas cluster or local MongoDB instance (automated in-memory MongoDB is built-in for testing)

---

## ⚙️ Environment Variables

### Server Configuration (`server/.env`)

Create `server/.env` (see template in `server/.env.example`):

| Variable | Description | Default / Example |
| :--- | :--- | :--- |
| `NODE_ENV` | Application environment (`development`, `production`, `test`) | `development` |
| `PORT` | Express backend listening port | `5000` |
| `MONGODB_URI` | MongoDB connection URI (Atlas or local) | `mongodb+srv://<user>:<password>@cluster0.mongodb.net/hiretrack` |
| `CLIENT_URL` | Allowed CORS origin for frontend | `http://localhost:5173` |
| `JWT_SECRET` | Secret key used for signing JWT tokens (min 32 characters) | `hiretrack_jwt_super_secret_for_local_development_only` |
| `JWT_EXPIRES_IN`| Token lifespan | `1d` |
| `MAX_RESUME_SIZE_MB` | Maximum allowed file upload size in MB | `5` |
| `CLOUDINARY_CLOUD_NAME` | Cloudinary cloud identifier (optional; defaults to local storage if omitted) | `your_cloud_name` |
| `CLOUDINARY_API_KEY` | Cloudinary API Key | `your_api_key` |
| `CLOUDINARY_API_SECRET` | Cloudinary API Secret | `your_api_secret` |

### Client Configuration (`client/.env`)

Create `client/.env` (see template in `client/.env.example`):

| Variable | Description | Default / Example |
| :--- | :--- | :--- |
| `VITE_API_BASE_URL` | Base URL of the backend Express API | `http://localhost:5000/api/v1` |

---

## 🚀 Local Installation & Startup

### 1. Clone & Install Dependencies

```bash
# Clone the repository
git clone https://github.com/your-org/hiretrack.git
cd hiretrack

# Install backend dependencies
cd server
npm install

# Install frontend dependencies
cd ../client
npm install
cd ..
```

### 2. Configure Environment Files

```bash
# From workspace root:
cp server/.env.example server/.env
cp client/.env.example client/.env
```

### 3. Seed Database & Start Applications

```bash
# Seed initial administrator account
npm run seed:admin

# Or seed the full demo dataset (admin, approved recruiter, pending recruiter, 3 students, 2 jobs, interview)
npm run seed:demo

# Start Backend API (Terminal 1)
npm run dev:server
# API running at: http://localhost:5000 (Health ping: http://localhost:5000/api/v1/health)

# Start Frontend UI (Terminal 2)
npm run dev:client
# Web App running at: http://localhost:5173
```

---

## 📜 Monorepo Scripts Reference

All primary commands can be executed directly from the root workspace:

| Command | Action |
| :--- | :--- |
| `npm run dev:server` | Starts the Express server with nodemon auto-restart |
| `npm run dev:client` | Starts the Vite React frontend development server |
| `npm run build:client`| Compiles optimized production frontend bundle to `client/dist/` |
| `npm run test` | Executes both backend Jest suite and frontend Vitest suite |
| `npm run test:server` | Runs all 7 backend Jest test suites (85 tests) |
| `npm run test:client` | Runs all 6 frontend Vitest test suites (34 tests) |
| `npm run seed:admin` | Seeds default administrative user account |
| `npm run seed:org` | Idempotently seeds the default v3 Organization (`DEFAULT_ORG_*` env vars) |
| `npm run seed:demo` | Seeds full demo ecosystem (3 roles, jobs, applications, interviews, default org + memberships) |
| `npm run migrate:v3-org-backfill -- --dry-run` | Previews v3 org & membership backfill counts without modifying DB (zero PII logged) |
| `npm run migrate:v3-org-backfill` | Idempotently backfills default `organizationId` onto Users & StudentProfiles and creates `STUDENT`/`ORG_ADMIN` memberships |
| `npm run migrate:v3-resumes -- --dry-run` | Previews v3 resume to FileAsset migration counts without modifying DB (zero PII logged) |
| `npm run migrate:v3-resumes` | Idempotently migrates existing student resume metadata into private `FileAsset` records |
| `npm run verify:demo` | Executes programmatic 8-step demo script with step-by-step assertions |

---

## 🔑 Demo Accounts & Pre-Seeded Credentials

The login screen (`/login`) includes 1-click autofill pills for instant access:

| Role | Email | Password | Status & Capabilities |
| :--- | :--- | :--- | :--- |
| **Admin** | `admin@hiretrack.edu` | `Admin@123456` | Full governance, recruiter approvals, persisted metrics |
| **Recruiter (Approved)** | `recruiter.approved@google.com` | `Recruiter@123456` | Verified Google Cloud recruiter; can post & publish drives |
| **Recruiter (Pending)** | `recruiter.pending@startup.io` | `Recruiter@123456` | Awaiting placement approval (UC-04 test account) |
| **Student 1** | `maya.rao@hiretrack.edu` | `Student@123456` | CSE (9.2 CGPA), resume uploaded, interview scheduled |
| **Student 2** | `rohan.verma@hiretrack.edu` | `Student@123456` | ISE (8.5 CGPA), resume uploaded |
| **Student 3** | `ananya.sen@hiretrack.edu` | `Student@123456` | ECE (7.2 CGPA), profile edge cases & eligibility testing |

---

## 🧪 Comprehensive Automated Test Suites

HireTrack enforces 100% passing test coverage across 119 automated tests:

### Server Suite (`npm run test:server` — 85 Passed)
- `tests/unit_services.test.js` (17 tests) — Pure eligibility engine logic and status transition matrix.
- `tests/health.test.js` (2 tests) — Database status and 404 handler integrity.
- `tests/auth.test.js` (17 tests) — Registration, login, password hash exclusion, and RBAC guards.
- `tests/student.test.js` (12 tests) — Profile allowlisting, resume validation, and completeness tracking.
- `tests/recruiter_jobs.test.js` (11 tests) — Pending recruiter blocking, job CRUD, and resource ownership.
- `tests/applications.test.js` (15 tests) — Application creation, concurrent double-apply prevention, and recruiter updates.
- `tests/interviews_admin.test.js` (11 tests) — Interview scheduling, admin metrics aggregation, and audit logs.

### Client Suite (`npm run test:client` — 34 Passed)
- `src/__tests__/smoke.test.jsx` (2 tests) — App branding and portal smoke tests.
- `src/__tests__/components.test.jsx` (4 tests) — Reusable UI primitives (Button, Card, StatusBadge, Timeline).
- `src/__tests__/auth_guards.test.jsx` (8 tests) — Route guards, unauthorized redirection, and role routing.
- `src/__tests__/student_ui.test.jsx` (5 tests) — Student dashboard, eligibility evaluation, and resume upload error states.
- `src/__tests__/recruiter_ui.test.jsx` (8 tests) — Recruiter metrics, job publish guards, applicant tables, and ConfirmDialogs.
- `src/__tests__/admin_ui.test.jsx` (7 tests) — Admin overview StatCards, pipeline breakdown, recruiter approval (UC-04), and user governance.

---

## 🔄 End-to-End Demo Script (`DEVELOPMENT_ROADMAP.md` §6)

You can run the automated script with `npm run verify:demo` or follow these steps in the browser:

1. **Step 1 — Sign in as Admin:**
   - Go to `/login` $\to$ click the **Demo Admin** pill (`admin@hiretrack.edu` / `Admin@123456`).
   - Land on `/admin/dashboard` $\to$ verify 5 persisted StatCards and the Applications Funnel breakdown.
2. **Step 2 — Admin Approves Pending Recruiter (UC-04):**
   - Navigate to `/admin/recruiters` $\to$ locate `NextGen AI Labs` (`recruiter.pending@startup.io`).
   - Click **Review Details** to inspect company description, address, and contact person.
   - Click **Approve** $\to$ confirm via the modal $\to$ status transitions to `approved`.
3. **Step 3 — Recruiter Creates & Publishes Campus Drive:**
   - Log out and sign in as `recruiter.approved@google.com` (or the newly approved recruiter).
   - Navigate to `/recruiter/jobs/new` $\to$ fill in job title, salary, deadline, and eligibility criteria (Min CGPA: 8.0, Branches: CSE, ISE).
   - Click **Publish Campus Drive** $\to$ job status becomes `published`.
4. **Step 4 — Student Verifies Profile & Resume:**
   - Log out and sign in as Student (`maya.rao@hiretrack.edu`).
   - Navigate to `/student/profile` $\to$ check profile completeness bar (100%) and view attached PDF resume.
5. **Step 5 — Student Discovers Job & Applies:**
   - Navigate to `/student/jobs` $\to$ find the published drive.
   - Click on the job card $\to$ observe the green *"You are eligible to apply"* banner.
   - Click **Apply for this Position** $\to$ review the snapshot confirmation modal $\to$ submit application once.
6. **Step 6 — Recruiter Shortlists Candidate & Schedules Interview:**
   - Sign back in as Recruiter $\to$ navigate to `/recruiter/jobs` $\to$ click **Applicants**.
   - Review Maya Rao's academic record and resume link.
   - Click **Update Status** $\to$ choose **Shortlist** $\to$ confirm.
   - Click **Interview** $\to$ select date/time, choose `Online`, enter Google Meet URL $\to$ click **Schedule & Notify**.
7. **Step 7 — Student Tracks Interview Details:**
   - Sign back in as Student $\to$ navigate to `/student/applications`.
   - Open application details $\to$ observe status is `interview_scheduled`, with interview date/time, Google Meet URL, and the chronological timeline.
8. **Step 8 — Admin Observes Updated Placement Metrics:**
   - Sign in as Admin $\to$ view `/admin/dashboard`.
   - Observe live counts: `Active Jobs`, `Applications`, and `statusBreakdown.interview_scheduled` reflect the changes made in the session.

---

## 🌐 Production Deployment Guide

### 1. Database — MongoDB Atlas
1. Create a free M0 cluster on [MongoDB Atlas](https://www.mongodb.com/atlas).
2. Under **Database Access**, create a user with read/write permissions.
3. Under **Network Access**, add `0.0.0.0/0` (allow from anywhere) or specific host IP addresses.
4. Copy the connection string and set `MONGODB_URI` in your production environment.

### 2. Backend — Render / Railway
1. Create a new **Web Service** pointing to the repository.
2. Configure settings:
   - **Root Directory:** `server`
   - **Environment:** `Node`
   - **Build Command:** `npm install`
   - **Start Command:** `npm start`
   - **Health Check Path:** `/api/v1/health`
3. Add Environment Variables:
   - `NODE_ENV=production`
   - `PORT=5000`
   - `MONGODB_URI=<Your-Atlas-URI>`
   - `CLIENT_URL=https://your-frontend.vercel.app`
   - `JWT_SECRET=<Generate-32-Char-Secret>`
   - `CLOUDINARY_CLOUD_NAME=<optional>`
   - `CLOUDINARY_API_KEY=<optional>`
   - `CLOUDINARY_API_SECRET=<optional>`

### 3. Frontend — Vercel / Netlify
1. Create a new project on [Vercel](https://vercel.com) pointing to the repository.
2. Configure settings:
   - **Framework Preset:** `Vite`
   - **Root Directory:** `client`
   - **Build Command:** `npm run build`
   - **Output Directory:** `dist`
3. Environment Variables:
   - `VITE_API_BASE_URL=https://your-backend.onrender.com/api/v1`
4. The included `client/vercel.json` provides automatic SPA route rewrite rules to `/index.html` preventing 404 errors on page reload.

### 4. Media Storage — Cloudinary
1. Create a Cloudinary account and copy your Cloud Name, API Key, and API Secret.
2. Provide these credentials in `server/.env`.
3. If omitted or during local development, HireTrack automatically switches to its built-in `LocalDevStorage` adapter without throwing errors.

---

## 🚀 HireTrack v3 Extension & Legacy Freeze Plan

HireTrack v3 introduces an enterprise-grade multi-organization foundation, verified student directories with batch onboarding, institutional job opportunity management, deterministic advisory eligibility evaluations, and student-reported external application tracking—engineered additively on top of v1 without rewriting or breaking legacy capabilities.

### 🚩 Feature Flags Configuration

All v3 modules are governed by feature flags with runtime querying at `GET /api/v1/config/features`:

| Flag | Recommended Pilot Value | Description |
| :--- | :--- | :--- |
| `V3_OPPORTUNITIES_ENABLED` | `true` | Enables institutional opportunities, eligibility engine, and student application tracking |
| `V3_MOCK_TESTS_ENABLED` | `true` | Campus mock assessment module (Single Choice, Multi-Select, Short Answer with auto-grading) |
| `V3_AI_INTERVIEWS_ENABLED` | `true` | AI interview simulation module (structured rubric scoring, bounded turns) |
| `V3_HUMAN_MOCK_ENABLED` | `true` | Human mock interviewer slot scheduling and audited evaluation release |
| `V3_READINESS_ENABLED` | `true` | Placement readiness dashboard and transparent domain gap summaries |
| `V3_AMBASSADORS_ENABLED` | `true` | Student placement ambassador management, deduplicated referrals, and certification |
| `LEGACY_RECRUITER_FLOW` | `false` | Hides legacy recruiter portal from navigation while preserving backend APIs |
| `ALLOW_PUBLIC_STUDENT_SIGNUP` | `false` | Disables open self-signup; onboards students via verified staff CSV batch import |

### 🛠️ Operation & Hardening CLI Tools (Chunk V12)

| Command | Description |
| :--- | :--- |
| `npm run seed:v3-demo` | Seeds synthetic institutional demo dataset (Org, Staff, Students, Opportunities, Tests, Ambassadors - 0 real PII) |
| `npm run privacy:retention` | Scans expired transcripts, answers, and audit logs according to retention policy (add `--execute` to purge) |
| `npm run perf:audit` | Runs index and query execution benchmark (`explain('executionStats')`) across critical collections |
| `npm run backup` | Exports JSON snapshots and schema manifest for all collections to `backups/` |
| `npm run restore -- --dir <path>` | Verifies and restores database records from a backup snapshot (add `--execute` to restore live) |

### 📚 Operational Runbooks & Governance Documentation

- [Backup, Restore, Rollback & Deployment Runbook](file:///c:/Users/rajat/Downloads/HireTrack_Documentation_Pack/docs/v3/BACKUP_ROLLBACK_PLAN.md)
- [Data Privacy, Protection & Retention Policy](file:///c:/Users/rajat/Downloads/HireTrack_Documentation_Pack/docs/v3/DATA_PRIVACY_RETENTION.md)
- [Pilot Rollout Strategy & Legacy Architecture Decision](file:///c:/Users/rajat/Downloads/HireTrack_Documentation_Pack/docs/v3/PILOT_ROLLOUT_DECISION.md)
- [SRS Section 8 Acceptance Criteria Report & UAT Checklist](file:///c:/Users/rajat/Downloads/HireTrack_Documentation_Pack/docs/v3/UAT_CHECKLIST_ACCEPTANCE_REPORT.md)

### 🔒 Legacy Freeze & Compatibility Mandate

1. **Zero Deletions:** Legacy models (`Job`, `Application`, `Notification`, `AuditLog`) and endpoints (`/api/v1/jobs`, `/api/v1/applications`) remain completely untouched and operational.
2. **Non-Colliding Routing:** v3 student application tracking endpoints are mounted at `/api/v1/opportunities/:id/application-status` and `/api/v1/students/me/job-applications`, preserving `/api/v1/applications` for legacy in-app recruiter pipelines.
3. **Student-Reported Application Tracking (Chunk V5):**
   - **Data Integrity:** Compound unique index on `(studentProfileId, jobOpportunityId)` guarantees exactly one active record per student per opportunity; subsequent updates append to `statusHistory[]` without duplicate submissions.
   - **Labeling Standard:** All student-reported submissions are explicitly marked `unverified (student-reported)` across student and admin portals until staff verification.
   - **Audit Compliance:** Placement coordinators verify student records with mandatory justification reasons via `PATCH /admin/applications/:id/verification`, persisting actor and reason to `AuditLog`.
   - **External Portal Integration:** Non-gating click tracking via `POST /opportunities/:id/application-link-click` increments engagement counters without blocking external employer application links.

---

## 📌 Known Limitations & Deferred Items (P1 / P2 Scope)

In accordance with `DEVELOPMENT_ROADMAP.md` and the MVP charter:
- **Email Dispatching:** Real external SMTP/SES email delivery is intentionally deferred. All alerts, status changes, and interview invites are tracked in-app via the chronological `ApplicationTimeline` and application status details.
- **Multi-College Tenancy:** The MVP is engineered for a single college institution. Multi-tenant partitioning is reserved for future enterprise phases.
- **Payment Processing:** No fees are levied on campus placements.
- **WebSockets / Push Notifications:** Polling and manual refresh on demand are utilized instead of persistent socket connections to preserve minimal resource overhead.
- **Third-Party Calendar Sync:** Calendar links (Google Meet, room details) are displayed as interactive URLs; direct Google Calendar API write synchronization is deferred.

---

## 🛡️ License

Developed for the placement administration and campus recruitment of HireTrack College. Released under the ISC License.
