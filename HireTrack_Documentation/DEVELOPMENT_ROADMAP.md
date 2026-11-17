# HireTrack --- Development Roadmap

## 1. Delivery strategy

The first objective is a demonstrable single-college MVP in a 24-hour
focused sprint. Prioritize an end-to-end workflow over feature breadth.
Do not start optional integrations until the core path works.

## 2. 24-hour implementation plan

  ------------------------------------------------------------------------
                   Time budget Phase                 Deliverable
  ---------------------------- --------------------- ---------------------
                    0--2 hours Foundation            Repo, client/server
                                                     setup, MongoDB
                                                     connection, env
                                                     config, health
                                                     endpoint

                    2--5 hours Authentication        Register/login,
                                                     password hashing,
                                                     JWT, role middleware,
                                                     seed admin

                    5--8 hours Student               Profile view/edit,
                                                     resume upload or
                                                     controlled fallback

                   8--12 hours Recruiter/jobs        Recruiter profile
                                                     approval, job CRUD,
                                                     publish/close

                  12--15 hours Applications          Job listing,
                                                     eligibility
                                                     validation, apply,
                                                     duplicate prevention

                  15--18 hours Admin                 Recruiter approvals,
                                                     user/job lists,
                                                     summary metrics

                  18--20 hours UX polish             Responsive layouts,
                                                     empty/loading/error
                                                     states, status
                                                     timeline

                  20--24 hours Verification          Critical tests, bug
                                                     fixes,
                                                     deployment/demo,
                                                     README
  ------------------------------------------------------------------------

This is a time budget, not a guarantee. If behind schedule, defer
interview scheduling, notifications, charts beyond basic counts and
file-storage polish.

## 3. Implementation milestones

### Milestone 0 --- Repository and environment

-   Create `client/` and `server/`.
-   Configure `.gitignore`, `.env.example` and scripts.
-   Connect MongoDB.
-   Add `/api/v1/health`.
-   Verify client can call API.

**Exit criteria:** frontend and backend start locally; database
connection is confirmed.

### Milestone 1 --- Authentication and access control

-   User model and profile models.
-   Register/login endpoints.
-   Password hashing and JWT.
-   `protect` and `authorizeRoles` middleware.
-   Admin seed script.
-   Frontend auth context and protected routes.

**Exit criteria:** student, recruiter and admin can sign in; role
restrictions work.

### Milestone 2 --- Student experience

-   Student profile form and view.
-   Resume upload integration or documented temporary fallback.
-   Profile completion and validation.

**Exit criteria:** student can save and retrieve their own profile.

### Milestone 3 --- Recruiter and job management

-   Recruiter profile and pending approval.
-   Admin recruiter approval.
-   Job model and CRUD.
-   Publish/close workflow.

**Exit criteria:** only approved recruiter can publish; recruiter can
only edit own jobs.

### Milestone 4 --- Application workflow

-   Public/authenticated job list and detail.
-   Server-side eligibility service.
-   Application create/list/detail.
-   Unique student/job index.
-   Recruiter applicant list and status changes.
-   Student status timeline.

**Exit criteria:** a student applies once; recruiter updates status;
student sees the update.

### Milestone 5 --- Admin and reporting

-   Admin users/recruiters/jobs pages.
-   Approval and account status actions.
-   Overview metrics from MongoDB aggregation/count queries.

**Exit criteria:** admin can moderate and see real persisted counts.

### Milestone 6 --- Hardening and delivery

-   Run critical tests.
-   Validate authorization and duplicate prevention.
-   Responsive UI pass.
-   Configure deployment environment.
-   Seed demo data.
-   Complete README and screenshots.

**Exit criteria:** clean setup, successful demo flow and no known
critical security defect.

## 4. Prioritized backlog

### P0 --- Must ship

-   Auth and roles.
-   Student profile.
-   Recruiter approval.
-   Job CRUD and listing.
-   Application submission and duplicate prevention.
-   Recruiter applicant review and status update.
-   Admin moderation and summary.
-   Basic responsive UI.

### P1 --- If time permits

-   Resume upload via Cloudinary.
-   Interview scheduling.
-   Application status timeline.
-   In-app notifications.
-   Search and filters.
-   Recharts dashboard.

### P2 --- Future release

-   Multi-college tenancy.
-   Placement drives with registration windows.
-   Email notifications.
-   Advanced reports/export.
-   Audit log UI.
-   Bulk student import.
-   Calendar integration.
-   AI-assisted resume feedback (with transparent, non-decisive use).

## 5. Suggested Git workflow

-   `main`: stable demo-ready code.
-   `develop`: integration branch if working with a team.
-   `feature/auth`, `feature/jobs`, `feature/applications`, etc.
-   Use small commits with meaningful messages.
-   Do not commit `.env`, uploaded resumes or generated secrets.

## 6. Demo script

1.  Sign in as admin.
2.  Approve a pending recruiter.
3.  Sign in as recruiter and create/publish a job.
4.  Sign in as student and complete profile.
5.  Browse job and apply.
6.  Sign in as recruiter and shortlist the student.
7.  Return to student and show updated application status.
8.  Return to admin and show updated platform metrics.

## 7. Scope protection

If a feature threatens the core demo, defer it. A working end-to-end
workflow with sound authorization is more valuable than many
disconnected screens.
