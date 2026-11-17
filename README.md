# HireTrack — Single-College Placement Management System (MVP)

HireTrack is an end-to-end placement management platform built for single-college campus hiring operations. It coordinates the core workflow across three distinct roles:
1. **Placement Cell Administration (`admin`)** — Moderates recruiters, tracks live placement metrics, and manages user accounts.
2. **Corporate Recruiters (`recruiter`)** — Registers company profile, posts campus drives, screens applicants, downloads resumes, and schedules interview rounds.
3. **Graduating Students (`student`)** — Builds verified profile, uploads resumes, discovers eligible opportunities with real-time rule checks, and tracks application stages.

---

## 🛠 Technology Stack

- **Backend:** Node.js LTS, Express.js (ES Modules), Mongoose ODM, MongoDB (Atlas / in-memory test fallback).
- **Frontend:** React 18, Vite, Tailwind CSS, React Router v6, Axios, Lucide React, Recharts.
- **Security:** JWT authentication, bcryptjs password hashing, Helmet, CORS whitelisting, rate limiting on `/auth`, role-based access control (RBAC), and strict field allowlisting.
- **Testing:** Jest + Supertest (server suite, 85 tests) & Vitest + React Testing Library (client suite, 6 tests).

---

## 🚀 Quick Start Guide

### Prerequisites
- Node.js LTS (v18 or higher)
- npm

### 1. Environment Configuration

The repository includes pre-configured environment templates:

- **Server configuration** (`server/.env`):
  ```env
  NODE_ENV=development
  PORT=5000
  MONGODB_URI=mongodb+srv://<username>:<password>@cluster0.fhe4q4q.mongodb.net/hiretrack?retryWrites=true&w=majority
  CLIENT_URL=http://localhost:5173
  JWT_SECRET=your_jwt_secret_key_2026
  JWT_EXPIRES_IN=1d
  MAX_RESUME_SIZE_MB=5
  ```

- **Client configuration** (`client/.env`):
  ```env
  VITE_API_BASE_URL=http://localhost:5000/api/v1
  ```

*(Note: Sensitive credentials are kept exclusively in `.env` and excluded from git version control).*

---

### 2. Starting the Application

#### Terminal 1 — Start the Express API Backend
```bash
cd server
npm run dev
# Server starts at http://localhost:5000
```

#### Terminal 2 — Start the React Vite Frontend
```bash
cd client
npm run dev
# Client runs at http://localhost:5173
```

---

## 🔑 Default Roles & Demo Accounts

For immediate local exploration, you can use the one-click demo fill buttons on the Login page (`/login`) or the seeded credentials:

| Role | Email | Password | Permissions & Notes |
| :--- | :--- | :--- | :--- |
| **Admin** | `admin@hiretrack.edu` | `Admin@HireTrack2026!` | Full moderation, pending recruiter approval, metrics |
| **Recruiter** | `recruiter@google.com` | `Recruiter123!` | Job posting (requires approval), applicant management |
| **Student** | `student@hiretrack.edu` | `Student123!` | Profile & resume management, apply to jobs |

To re-seed the administrator account:
```bash
cd server
npm run seed:admin
```

---

## 🧪 Running Automated Tests

HireTrack has complete automated test coverage across unit services, API routes, security boundaries, and React components.

### Server Test Suite (Jest + Supertest — 85 Passing Tests)
```bash
cd server
npm test
```
Tests include:
- `tests/unit_services.test.js` — Pure eligibility engine and status transition validation.
- `tests/health.test.js` — Server uptime and database connectivity.
- `tests/auth.test.js` — Registration, login, JWT protection, password hashing, and role security.
- `tests/student.test.js` — Profile CRUD, resume upload, and completeness calculation.
- `tests/recruiter_jobs.test.js` — Pending recruiter blocking, job CRUD, and ownership boundaries.
- `tests/applications.test.js` — Application flow, duplicate prevention, and candidate status updates.
- `tests/interviews_admin.test.js` — Interview scheduling, admin moderation, and audit logs.

### Client Test Suite (Vitest + React Testing Library — 6 Passing Tests)
```bash
cd client
npm test
```
Tests include:
- `src/__tests__/smoke.test.jsx` — Smoke test verifying health connection, branding, and role portals.
- `src/__tests__/components.test.jsx` — Reusable components (Button, StatusBadge, JobCard, ApplicationTimeline).

---

## 🔄 Core Demo Workflow

1. **Admin Approves Recruiter:**
   - Sign in as Admin (`admin@hiretrack.edu`).
   - Navigate to **Pending Recruiters** (`/admin/recruiters`).
   - Click **Approve** on a pending corporate partner registration.

2. **Recruiter Publishes Job Drive:**
   - Sign in as Recruiter.
   - Navigate to **Post New Job** (`/recruiter/jobs/new`).
   - Enter job details, set minimum CGPA and eligible branches (e.g. CSE, ISE).
   - Click **Publish Campus Drive**.

3. **Student Applies:**
   - Sign in as Student.
   - Check **Profile & Resume** (`/student/profile`) to ensure resume is uploaded.
   - Navigate to **Browse Jobs** (`/student/jobs`), click on the published drive.
   - Observe real-time eligibility evaluation and click **Apply for this Position**.

4. **Recruiter Progresses Candidate:**
   - Recruiter navigates to **My Jobs** $\to$ **Applicants** (`/recruiter/jobs/:id/applicants`).
   - View candidate qualification and attached resume.
   - Click **Update Status** to advance candidate to `shortlisted`.
   - Click **Interview** to schedule a technical round (moves status to `interview_scheduled`).

5. **Student & Admin Real-Time Verification:**
   - Student navigates to **My Applications** $\to$ **History** to view the chronological timeline and interview invite details.
   - Admin navigates to **Dashboard Overview** (`/admin/dashboard`) to view live counts and updated placement statistics.

