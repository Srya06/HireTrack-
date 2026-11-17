# HireTrack --- System Architecture

**Version:** 1.0\
**Architecture style:** Three-tier client/server, modular monolith
backend, REST API

## 1. Architecture overview

HireTrack uses a React single-page application, an Express API and
MongoDB. The backend is a modular monolith: one deployable API organized
into route, controller, service, model and middleware layers. This is
simpler and faster to deliver than microservices and is appropriate for
the MVP.

``` mermaid
flowchart TB
    U[Student / Recruiter / Admin]
    FE[React + Vite SPA]
    API[Express REST API]
    AUTH[Auth + RBAC Middleware]
    SVC[Business Services]
    DB[(MongoDB)]
    FILES[Cloudinary / File Storage]
    LOG[Application Logs]

    U --> FE
    FE -->|HTTPS JSON / multipart| API
    API --> AUTH
    AUTH --> SVC
    SVC --> DB
    SVC --> FILES
    API --> LOG
```

## 2. Logical components

### Frontend

-   `pages`: route-level screens.
-   `components`: reusable forms, tables, cards, dialogs and status
    badges.
-   `layouts`: public, student, recruiter and admin shells.
-   `context` or lightweight state store: authentication and session
    state.
-   `services`: API client and feature-specific API methods.
-   `routes`: protected route guards for navigation convenience. These
    are not a security boundary; backend authorization remains
    authoritative.

### Backend

-   `routes`: HTTP endpoint definitions and validation attachment.
-   `controllers`: translate HTTP requests into service calls and
    responses.
-   `services`: business rules such as eligibility and application
    transitions.
-   `models`: Mongoose schemas and indexes.
-   `middleware`: authentication, role authorization, ownership helpers,
    validation and error handling.
-   `config`: database, CORS, file storage and environment
    configuration.
-   `utils`: token generation, response helpers and constants.

### Database

MongoDB stores users, role-specific profiles, jobs, applications,
interviews, notifications and audit logs. Application and job references
avoid large embedded arrays. Use indexes for email, job filters,
application uniqueness and recruiter ownership.

### File storage

Resume binary files are stored in Cloudinary or equivalent object
storage. MongoDB stores the file URL, provider public ID, original
filename, MIME type, size and upload timestamp. Do not store large file
blobs in ordinary user documents.

## 3. Request flow

1.  User interacts with React.
2.  Frontend calls `/api/v1/...` using the shared API client.
3.  Express parses request and applies CORS, rate limiting and request
    logging.
4.  Protected routes validate the bearer token.
5.  RBAC middleware checks the authenticated user's stored role.
6.  Controller validates and delegates business logic to a service.
7.  Service performs authorization/ownership and business-rule checks.
8.  Mongoose reads or writes MongoDB.
9.  API returns a consistent JSON response.
10. Frontend updates the view and displays success/error feedback.

## 4. Authentication and authorization

-   Use short-lived signed JWT access tokens for the MVP.
-   Passwords are hashed with bcrypt/bcryptjs.
-   Store the JWT secret only in environment configuration.
-   The token identifies the user; the server loads the current account
    and role.
-   Role middleware protects broad route groups.
-   Ownership checks protect individual resources: recruiter can only
    manage their own jobs; student can only view their own applications.
-   Never accept `role: "admin"` from public registration. Seed the
    first admin through a controlled script or environment-protected
    setup process.
-   For a production hardening pass, prefer secure, HttpOnly, SameSite
    cookies with CSRF protection or a carefully designed refresh-token
    flow. Avoid persistent long-lived tokens in localStorage when
    practical.

## 5. Core domain workflows

### Job publication

Recruiter submits job → server verifies recruiter approval → validates
eligibility and deadline → stores job → job is listed only when status
is `published` and deadline has not passed.

### Application submission

Student submits application → server loads job and student profile →
checks open/deadline/eligibility/resume → checks duplicate → creates
application with `applied` status and initial history entry.

### Application status change

Recruiter requests a transition → server verifies job ownership and
valid transition → updates current status and appends status-history
entry in the same logical operation → student dashboard reflects the
update.

## 6. Deployment topology

``` mermaid
flowchart LR
    B[Browser]
    HOST[Frontend Host: Vercel]
    APIHOST[Node API Host: Render / equivalent]
    M[(MongoDB Atlas)]
    C[Cloudinary]

    B --> HOST
    B -->|API HTTPS| APIHOST
    APIHOST --> M
    APIHOST --> C
```

Frontend and API are separate deployments. Configure the API origin,
database URI, JWT secret and file-storage credentials as host
environment variables. Restrict CORS to the deployed frontend origin.

## 7. Architecture decisions

  -----------------------------------------------------------------------
  Decision                            Reason
  ----------------------------------- -----------------------------------
  Modular monolith                    Fast implementation, simpler
                                      deployment and debugging

  REST API                            Familiar, testable and sufficient
                                      for core workflows

  MongoDB + Mongoose                  Required MERN database and flexible
                                      profile/job documents

  Separate profile collections        Keeps role-specific fields out of a
                                      single overloaded user document

  Application collection              Supports status history, queries
                                      and unique student/job constraint

  External file storage               Avoids large binary files in
                                      MongoDB

  Single-college MVP                  Keeps authorization and admin
                                      workflows manageable
  -----------------------------------------------------------------------

## 8. Future multi-college evolution

When expanding, introduce a `College` collection and add a required
`collegeId` reference to tenant-owned users, jobs, drives and related
records. Enforce tenant scoping in a shared middleware/service layer.
Add College Admin role and tenant onboarding. Do not implement
cross-tenant access by trusting client-supplied college IDs. Existing
MVP data can be migrated to one default college.

## 9. Operational concerns

-   Add `/api/v1/health` for readiness checks.
-   Use structured logs and request IDs.
-   Do not log passwords, JWTs, resume contents or secrets.
-   Back up production MongoDB data.
-   Add pagination and indexes before scaling.
-   Set upload size/type limits.
-   Use HTTPS in hosted environments.
