# AGENTS.md --- HireTrack Development Instructions

This file defines project-wide instructions for AI coding agents and
human contributors. Follow it before changing code.

## 1. Project context

HireTrack is a single-college placement management system built with the
MERN stack: - MongoDB + Mongoose - Express.js + Node.js - React + Vite -
Tailwind CSS

User roles: `student`, `recruiter`, `admin`.

The immediate goal is a secure, demonstrable MVP. Multi-college tenancy
is a future enhancement, not part of the current implementation.

## 2. Source-of-truth documents

Before implementing a feature, consult: - `PRD.md` for product scope and
priorities. - `SRS.md` for behavior and requirements. -
`ARCHITECTURE.md` for component boundaries. - `TECH_STACK.md` for
approved technologies. - `DATABASE_SCHEMA.md` for data models and
constraints. - `API_DOCUMENTATION.md` for endpoint contracts. -
`UI_UX_GUIDELINES.md` for interface conventions. -
`DEVELOPMENT_ROADMAP.md` for delivery order. - `TESTING.md` for expected
verification.

If code and documentation conflict, do not silently invent behavior.
Identify the conflict and propose the smallest change consistent with
the MVP.

## 3. General engineering rules

1.  Keep the implementation in JavaScript unless the project owner
    explicitly changes the stack.
2.  Keep frontend and backend separated into `client/` and `server/`.
3.  Use ES modules consistently within each package.
4.  Keep route, controller, service, model and middleware
    responsibilities separate.
5.  Put business rules in backend services, not only in React.
6.  Validate all external input on the server.
7.  Use allowlists for update operations; never spread arbitrary
    `req.body` into database updates.
8.  Use async/await and centralized error handling.
9.  Keep functions small and name them for their behavior.
10. Avoid unnecessary abstractions, microservices and dependencies
    during the MVP sprint.

## 4. Security rules --- mandatory

-   Never store plaintext passwords. Hash with bcrypt/bcryptjs.
-   Never return `passwordHash`.
-   Never hardcode secrets or commit `.env`.
-   Never allow public signup to create an admin.
-   Never trust client-provided role, user ID, recruiter ID or ownership
    claims.
-   Derive the acting user from verified authentication middleware.
-   Enforce role authorization and resource ownership on every protected
    operation.
-   Validate ObjectIds and all query/body/route parameters.
-   Restrict CORS, request size, upload file size and file types.
-   Rate-limit authentication endpoints.
-   Do not log passwords, tokens, resume contents or secrets.
-   Do not expose private resumes through public listing endpoints.

## 5. Domain rules

-   Recruiter accounts begin pending and require admin approval.
-   Only approved recruiters can publish jobs.
-   Students can apply only to published, open, non-expired jobs.
-   Eligibility checks happen on the server.
-   One student can have only one application per job; enforce with a
    MongoDB unique compound index.
-   Recruiters can manage only their own jobs and applicants.
-   Students can view only their own profile and applications.
-   Application status changes must follow the transition table in
    `DATABASE_SCHEMA.md`.
-   Append status history whenever an application status changes.
-   Admin account provisioning must use a controlled seed/setup process.

## 6. Frontend rules

-   Use React functional components and hooks.
-   Use React Router for route navigation.
-   Keep API calls in `services/`, not scattered through UI components.
-   Keep authentication state centralized.
-   Frontend route guards improve UX but do not replace backend
    authorization.
-   Build reusable form, button, card, status badge and layout
    components.
-   Every data screen must include loading, empty, error and success
    states.
-   Make layouts responsive and keyboard accessible.
-   Never hardcode dashboard metrics; load them from the API.

## 7. Backend rules

Suggested organization:

``` text
server/
  src/
    config/
    controllers/
    middleware/
    models/
    routes/
    services/
    utils/
    validators/
    app.js
    server.js
```

-   `app.js` configures Express and routes.
-   `server.js` connects to MongoDB and starts the server.
-   Controllers handle HTTP concerns.
-   Services implement business logic and ownership checks.
-   Models define schema validation and indexes.
-   Middleware handles authentication, roles, validation and errors.
-   Keep API routes under `/api/v1`.

## 8. API conventions

-   Use consistent success/error response shapes from
    `API_DOCUMENTATION.md`.
-   Use correct HTTP status codes.
-   Paginate list endpoints.
-   Do not return internal stack traces in production.
-   Do not reveal whether a private resource exists when doing so would
    leak information; `404` can be used for unauthorized resource
    ownership cases.

## 9. Database rules

-   Use Mongoose schemas with timestamps.
-   Normalize email to lowercase.
-   Add unique indexes for email, student identifier and
    `(jobId, studentId)` applications.
-   Use references for unbounded one-to-many relationships.
-   Store resume metadata and storage identifiers, not file bytes.
-   Add indexes for common filters and list queries.
-   Do not remove or weaken a unique constraint to bypass an application
    bug.

## 10. Testing rules

For every new business rule: 1. Add or update a unit test. 2. Add API
integration tests for allowed and denied access where applicable. 3.
Verify the database side effect. 4. Update `TESTING.md` if a critical
workflow changes.

Do not mark a feature complete based only on a successful frontend
render.

## 11. Git and delivery

-   Keep `main` in a runnable state.
-   Use focused commits.
-   Do not commit build output, node_modules, `.env` or uploaded user
    files.
-   Update README setup instructions when environment variables or
    scripts change.
-   Before declaring completion, run lint/test/build scripts that exist
    and report any that could not be run.

## 12. Agent workflow

Before editing: 1. Inspect the current repository structure and package
scripts. 2. Read the relevant documentation. 3. Identify the smallest
set of files required. 4. State assumptions if a requirement is
ambiguous.

While editing: 1. Make incremental changes. 2. Preserve existing working
behavior. 3. Avoid unrelated refactors. 4. Add validation and tests
alongside functionality.

After editing: 1. Run relevant tests and builds. 2. Summarize changed
files. 3. Report test results honestly. 4. List remaining risks or
deferred work. 5. Update documentation if contracts or behavior changed.

## 13. Scope guard

Do not implement multi-college tenancy, AI resume ranking, payments,
microservices, advanced messaging or third-party HR integrations in the
MVP unless the project owner explicitly reprioritizes the roadmap.
