# HireTrack --- Software Requirements Specification (SRS)

**Version:** 1.0\
**Standard structure:** IEEE-inspired, adapted for an MVP

## 1. Introduction

### 1.1 Purpose

This SRS defines the functional and quality requirements for HireTrack,
a single-college placement management web application. It is intended
for developers, testers, project reviewers and stakeholders.

### 1.2 Scope

HireTrack manages campus recruitment from student profile creation
through job application and recruiter selection updates. The system has
three roles: Student, Recruiter and Placement Admin. It is a
browser-based MERN application.

### 1.3 Definitions

-   **MERN:** MongoDB, Express.js, React.js and Node.js.
-   **USN:** University/college student identifier.
-   **Job:** A recruitment opportunity posted by a recruiter.
-   **Application:** A student's submission for a specific job.
-   **Placement Admin:** Authorized college placement-cell
    administrator.
-   **RBAC:** Role-based access control.
-   **JWT:** JSON Web Token used for API authentication.

## 2. Overall description

### 2.1 Product perspective

The product is a standalone client-server web application. React
communicates with an Express REST API over HTTPS in hosted environments.
Express uses Mongoose to persist data in MongoDB. Resume files are
stored in an external file-storage service; the database stores secure
file metadata and URLs.

### 2.2 Product functions

-   Authentication and role authorization.
-   Student academic profile and resume management.
-   Recruiter profile approval.
-   Job creation, publication and closure.
-   Job discovery and eligibility checking.
-   Application submission and tracking.
-   Applicant review and status management.
-   Interview scheduling.
-   Admin moderation and summary analytics.

### 2.3 User classes

  -----------------------------------------------------------------------
  User                                Permissions
  ----------------------------------- -----------------------------------
  Student                             Manage own profile, browse jobs,
                                      apply, view own applications

  Recruiter                           Manage own company profile/jobs,
                                      view applicants for own jobs,
                                      update application status

  Admin                               Manage platform users, approve
                                      recruiters, moderate jobs, view
                                      platform metrics
  -----------------------------------------------------------------------

### 2.4 Operating environment

-   Frontend: modern Chrome, Edge, Firefox and Safari.
-   Backend: supported Node.js LTS runtime.
-   Database: MongoDB.
-   Hosting: static frontend host and Node-compatible API host.
-   Development OS: Windows, macOS or Linux.

### 2.5 Constraints

-   The MVP is single-college.
-   Admin role cannot be selected during public signup.
-   All business authorization must be enforced on the server.
-   The API uses JSON except for multipart file upload endpoints.
-   The MVP does not guarantee enterprise-grade availability or
    compliance certification.

## 3. External interface requirements

### 3.1 User interface

The UI shall provide: - public landing, login and registration pages; -
role-specific dashboard layouts; - navigation with clear active
states; - forms with inline validation; - tables/cards for jobs and
applicants; - status badges and application history; - responsive
behavior and accessible labels.

### 3.2 Software interfaces

-   MongoDB through Mongoose.
-   Cloudinary (or equivalent) for resume files.
-   Optional Socket.IO transport for real-time notification updates.
-   Optional chart library for admin metrics.

### 3.3 Communication interfaces

-   REST API under `/api/v1`.
-   JSON request and response bodies.
-   Bearer JWT authentication.
-   HTTPS in production.
-   CORS restricted to configured frontend origin(s).

## 4. Functional requirements

### 4.1 Authentication

-   SRS-AUTH-01: A user shall register with name, email and password,
    plus role-specific required fields.
-   SRS-AUTH-02: The system shall normalize email addresses and prevent
    duplicate accounts.
-   SRS-AUTH-03: The system shall hash passwords using bcrypt or
    bcryptjs.
-   SRS-AUTH-04: The system shall issue a signed access token after
    successful login.
-   SRS-AUTH-05: The system shall reject expired, invalid or missing
    tokens on protected routes.
-   SRS-AUTH-06: The system shall derive role from the stored user
    record, not trust a role supplied by the client.

### 4.2 Student profile

-   SRS-STU-01: Students shall view and update their own profile.
-   SRS-STU-02: Student profile shall support student identifier,
    branch, graduation year, CGPA, skills and resume metadata.
-   SRS-STU-03: A student shall not modify another student's profile.
-   SRS-STU-04: The system shall validate CGPA and graduation year
    ranges.

### 4.3 Recruiter and jobs

-   SRS-REC-01: Recruiters shall submit company and contact details.
-   SRS-REC-02: New recruiter accounts shall have `pending` approval
    status.
-   SRS-REC-03: Admins shall approve or reject recruiter access.
-   SRS-JOB-01: Approved recruiters shall create and manage their own
    jobs.
-   SRS-JOB-02: Jobs shall include title, description, company,
    location, employment type, eligibility and deadline.
-   SRS-JOB-03: Only published, open and non-expired jobs shall be
    discoverable as active opportunities.
-   SRS-JOB-04: Recruiters shall not edit jobs owned by another
    recruiter.

### 4.4 Applications

-   SRS-APP-01: Students shall apply to eligible jobs.
-   SRS-APP-02: The server shall check job status, deadline, eligibility
    and duplicate application.
-   SRS-APP-03: Application records shall store student, job, resume
    snapshot/reference, status and timestamps.
-   SRS-APP-04: Recruiters shall view applicants only for jobs they own.
-   SRS-APP-05: Recruiters shall update application status using
    permitted transitions.
-   SRS-APP-06: Students shall view their own application status and
    status history.
-   SRS-APP-07: The system shall retain a history entry for every status
    change.

### 4.5 Interview management

-   SRS-INT-01: Recruiters shall schedule an interview for an applicant.
-   SRS-INT-02: An interview shall include date/time, mode, optional
    location/link and notes.
-   SRS-INT-03: The application status shall be updated to
    `interview_scheduled` when appropriate.
-   SRS-INT-04: Students shall view interview details for their own
    applications.

### 4.6 Administration

-   SRS-ADM-01: Admins shall list, inspect and update user account
    status.
-   SRS-ADM-02: Admins shall approve/reject recruiters.
-   SRS-ADM-03: Admins shall moderate, publish, close or archive jobs.
-   SRS-ADM-04: Admins shall view summary counts for users, jobs,
    applications and selections.
-   SRS-ADM-05: Admin-only endpoints shall reject all non-admin users.

## 5. Data requirements

The system shall persist the entities described in `DATABASE_SCHEMA.md`:
User, StudentProfile, RecruiterProfile, Job, Application, Interview,
Notification and AuditLog. References shall be used for one-to-many
relationships. Unique indexes shall prevent duplicate email addresses
and duplicate student/job applications.

## 6. Non-functional requirements

-   NFR-01 Security: enforce authentication, RBAC, ownership and input
    validation.
-   NFR-02 Password storage: never store plaintext passwords.
-   NFR-03 Privacy: do not expose password hashes, private contact data
    or unrestricted resume URLs in public job listings.
-   NFR-04 Performance: paginate list endpoints and index common
    filters.
-   NFR-05 Reliability: return consistent errors and handle database
    failures gracefully.
-   NFR-06 Maintainability: use modular backend layers and feature-based
    frontend organization.
-   NFR-07 Compatibility: support current major desktop browsers and
    mobile responsive layouts.
-   NFR-08 Accessibility: labels, keyboard operation, focus indicators
    and semantic HTML.
-   NFR-09 Observability: log request failures and key admin actions
    without logging secrets.
-   NFR-10 Configuration: all credentials and environment-specific URLs
    shall be supplied through environment variables.

## 7. Use cases

### UC-01 Student applies for a job

**Preconditions:** Student is authenticated, profile is complete and job
is open.\
**Main flow:** Student opens job → reviews eligibility → selects Apply →
server validates profile, deadline, eligibility and duplicate status →
application is created → confirmation is shown.\
**Alternate flows:** Ineligible student receives a clear reason;
closed/expired job is rejected; duplicate application returns conflict.

### UC-02 Recruiter publishes a job

**Preconditions:** Recruiter is authenticated and approved.\
**Main flow:** Recruiter opens job form → enters job details and
criteria → submits → server validates → job is saved as draft or
published → job appears in student listings if published and open.\
**Alternate flow:** Pending recruiter receives forbidden response.

### UC-03 Recruiter shortlists an applicant

**Preconditions:** Recruiter owns the job and applicant has applied.\
**Main flow:** Recruiter opens applicant list → reviews profile/resume →
selects Shortlist → server checks ownership and transition →
status/history are updated → student sees new status.

### UC-04 Admin approves a recruiter

**Preconditions:** Admin is authenticated.\
**Main flow:** Admin opens pending recruiters → reviews company details
→ approves or rejects → recruiter status is persisted → recruiter is
informed in the dashboard.

## 8. Acceptance criteria

The project satisfies the SRS when all Must requirements in the PRD are
implemented, protected routes enforce authorization, critical use cases
work end-to-end, and the critical test suite passes.
