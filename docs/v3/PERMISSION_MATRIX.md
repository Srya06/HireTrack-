# HireTrack v3 — Organization & Permission Matrix

## 1. Organization Scoping Rules

- Every v3 document stores `organizationId` (ObjectId ref `Organization`, indexed) and UTC timestamps (`Organization.timezone` is used strictly for display and deadline-expiry rules).
- `attachOrganization` resolves `req.organizationId`, `req.organization`, `req.memberships`, and `req.membershipRoles` strictly from the authenticated user's active `OrganizationMembership` records in MongoDB.
- **Never trust client input for `organizationId`** (body, query, params, or headers are ignored).
- All v3 queries pass through `server/src/utils/orgScope.js` (`scopeOrg`, `findByIdInOrg`, `findOneInOrg`, `paginateInOrg`). Cross-organization access returns **`404 NOT_FOUND`**.

---

## 2. Role Permission Matrix (`OrganizationMembership.role`)

| Role | Workspace | Permitted Domains & Capabilities | Restrictions |
| :--- | :--- | :--- | :--- |
| **`ORG_ADMIN`** | Admin / Placement | Staff & role management (`GET/POST/PATCH /api/v1/admin/staff`), student bulk imports, student verification, institute policies, audit logs, organization reports | Cannot revoke or suspend own `ORG_ADMIN` membership (`400`). Scoped strictly to own `organizationId`. |
| **`PLACEMENT_COORDINATOR`** | Admin / Placement | Staff-published opportunities, advisory eligibility & overrides, external application reporting, student readiness, mock test & interview administration | Cannot manage `ORG_ADMIN`/staff roles (`403`) or institute-wide policies. |
| **`AMBASSADOR_COORDINATOR`** | Admin / Placement | Campus ambassador applications, verification, campaigns, referral moderation, certificates | Cannot manage staff roles, opportunities, or student imports (`403`). |
| **`INTERVIEWER`** | Interviewer | Own interviewer profile, own bookable slots, **assigned** human mock interview sessions and evaluations only | Cannot access unassigned sessions, other interviewers' slots, or admin endpoints (`403`). |
| **`STUDENT`** | Student | Own profile & resume, opportunity discovery, own advisory eligibility, own self-reported (`"unverified"`) application status, mock test attempts, own AI & human mock interviews, own readiness summary, optional `AmbassadorProfile` capability | Cannot view other students' records, answer keys, or staff/admin endpoints (`403`). |

> **Ambassador Note:** Ambassador is a **capability** (`AmbassadorProfile` linked to a student user), **not** an `OrganizationMembership` role.

---

## 3. Legacy v1 Role Compatibility

- `User.role` (`student | recruiter | admin`) remains untouched for all legacy v1 routes (`authorizeRoles`).
- Backfill mapping (`npm run migrate:v3-org-backfill`):
  - `student` $\to$ `OrganizationMembership(role: 'STUDENT', status: 'active')`
  - `admin` $\to$ `OrganizationMembership(role: 'ORG_ADMIN', status: 'active')`
  - `recruiter` $\to$ no v3 staff/student membership created (legacy recruiter portal stays gated behind `LEGACY_RECRUITER_FLOW`).

---

## 4. Chunk V1 API Contracts

- `GET /api/v1/me` and `GET /api/v1/auth/me` (authenticated): returns `{ user, profile, organization, memberships }`.
- `GET /api/v1/organizations/current` (authenticated + `attachOrganization`): returns `{ organization, memberships, capabilities }`.
- `GET /api/v1/admin/staff` (`ORG_ADMIN` only, paginated): query params `page`, `limit`, `role`, `status`, `q`.
- `POST /api/v1/admin/staff` (`ORG_ADMIN` only, audited `STAFF_ROLE_GRANTED`): body `{ email | userId, role }`; cross-org target user $\to$ `404`.
- `PATCH /api/v1/admin/staff/:id` (`ORG_ADMIN` only, audited `STAFF_ROLE_UPDATED`): body `{ status: 'active' | 'suspended' | 'revoked' }`; cross-org membership $\to$ `404`; self `ORG_ADMIN` revocation $\to$ `400`.
