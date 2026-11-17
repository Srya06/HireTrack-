# HireTrack --- Database Schema

**Database:** MongoDB\
**ODM:** Mongoose\
**Naming:** Collection names are shown in lowercase plural form.
ObjectId references are used for relationships.

## 1. Entity relationship overview

``` mermaid
erDiagram
    USER ||--o| STUDENT_PROFILE : has
    USER ||--o| RECRUITER_PROFILE : has
    USER ||--o{ JOB : creates
    USER ||--o{ APPLICATION : submits
    JOB ||--o{ APPLICATION : receives
    APPLICATION ||--o{ INTERVIEW : has
    USER ||--o{ NOTIFICATION : receives
    USER ||--o{ AUDIT_LOG : performs

    USER {
      ObjectId _id
      string name
      string email
      string passwordHash
      string role
      string accountStatus
    }
    STUDENT_PROFILE {
      ObjectId userId
      string studentId
      string branch
      number cgpa
      number graduationYear
      string[] skills
      object resume
    }
    RECRUITER_PROFILE {
      ObjectId userId
      string companyName
      string designation
      string approvalStatus
    }
    JOB {
      ObjectId recruiterId
      string title
      string companyName
      string status
      number minCgpa
      string[] eligibleBranches
      number[] eligibleGraduationYears
    }
    APPLICATION {
      ObjectId studentId
      ObjectId jobId
      string status
      object[] statusHistory
    }
    INTERVIEW {
      ObjectId applicationId
      date scheduledAt
      string mode
      string status
    }
```

## 2. Collections

### 2.1 `users`

Common authentication identity.

  -----------------------------------------------------------------------
  Field                   Type                    Rules
  ----------------------- ----------------------- -----------------------
  `_id`                   ObjectId                Primary key

  `name`                  String                  Required, trimmed

  `email`                 String                  Required, lowercase,
                                                  unique, indexed

  `passwordHash`          String                  Required, never
                                                  returned by API

  `role`                  String                  Enum: `student`,
                                                  `recruiter`, `admin`

  `accountStatus`         String                  Enum: `active`,
                                                  `pending`, `suspended`,
                                                  `rejected`

  `lastLoginAt`           Date                    Optional

  `createdAt`,            Date                    Mongoose timestamps
  `updatedAt`                                     
  -----------------------------------------------------------------------

Public registration may create `student` or `recruiter` accounts only.
Recruiters start as `pending`. Admin is seeded securely.

### 2.2 `studentprofiles`

  ---------------------------------------------------------------------------------------------------------
  Field                   Type                    Rules
  ----------------------- ----------------------- ---------------------------------------------------------
  `_id`                   ObjectId                Primary key

  `userId`                ObjectId                Required, unique ref `User`

  `studentId`             String                  Required, unique

  `phone`                 String                  Optional; validate format

  `branch`                String                  Required

  `graduationYear`        Number                  Required; sensible year range

  `cgpa`                  Number                  Required; institution-configured range, default 0--10

  `skills`                String\[\]              Default empty

  `bio`                   String                  Optional, length-limited

  `resume`                Object                  `{url, publicId, fileName, mimeType, size, uploadedAt}`

  `createdAt`,            Date                    Timestamps
  `updatedAt`                                     
  ---------------------------------------------------------------------------------------------------------

Indexes: `{ userId: 1 }` unique; `{ studentId: 1 }` unique;
`{ branch: 1, graduationYear: 1, cgpa: -1 }`.

### 2.3 `recruiterprofiles`

  Field                      Type       Rules
  -------------------------- ---------- -----------------------------------------
  `_id`                      ObjectId   Primary key
  `userId`                   ObjectId   Required, unique ref `User`
  `companyName`              String     Required
  `website`                  String     Optional URL
  `designation`              String     Optional
  `contactPhone`             String     Optional
  `description`              String     Optional
  `approvalStatus`           String     Enum: `pending`, `approved`, `rejected`
  `reviewedBy`               ObjectId   Optional ref `User`
  `reviewedAt`               Date       Optional
  `createdAt`, `updatedAt`   Date       Timestamps

Indexes: `{ userId: 1 }` unique; `{ approvalStatus: 1, createdAt: -1 }`.

### 2.4 `jobs`

  ---------------------------------------------------------------------------
  Field                       Type                    Rules
  --------------------------- ----------------------- -----------------------
  `_id`                       ObjectId                Primary key

  `recruiterId`               ObjectId                Required ref `User`,
                                                      indexed

  `title`                     String                  Required

  `companyName`               String                  Required

  `description`               String                  Required

  `location`                  String                  Required or `Remote`

  `employmentType`            String                  Enum: `full_time`,
                                                      `internship`,
                                                      `contract`, `other`

  `ctc`                       String                  Optional display text,
                                                      e.g. `4–6 LPA`

  `minCgpa`                   Number                  Optional

  `eligibleBranches`          String\[\]              Empty means all
                                                      configured branches

  `eligibleGraduationYears`   Number\[\]              Empty means all years

  `requiredSkills`            String\[\]              Default empty

  `applicationDeadline`       Date                    Required

  `status`                    String                  Enum: `draft`,
                                                      `published`, `closed`,
                                                      `archived`

  `adminReviewStatus`         String                  Enum: `not_required`,
                                                      `pending`, `approved`,
                                                      `rejected` (optional
                                                      policy)

  `createdAt`, `updatedAt`    Date                    Timestamps
  ---------------------------------------------------------------------------

Indexes: `{ status: 1, applicationDeadline: 1 }`;
`{ recruiterId: 1, createdAt: -1 }`; text index on
title/companyName/description if supported by chosen query design.

### 2.5 `applications`

  ----------------------------------------------------------------------------------------
  Field                   Type                    Rules
  ----------------------- ----------------------- ----------------------------------------
  `_id`                   ObjectId                Primary key

  `jobId`                 ObjectId                Required ref `Job`

  `studentId`             ObjectId                Required ref `User`

  `resumeSnapshot`        Object                  Resume URL/public ID/name at application
                                                  time

  `coverLetter`           String                  Optional, length-limited

  `status`                String                  Enum below

  `statusHistory`         Array                   `{status, changedBy, note, changedAt}`

  `appliedAt`             Date                    Default now

  `updatedAt`             Date                    Timestamp
  ----------------------------------------------------------------------------------------

Status enum: `applied`, `under_review`, `shortlisted`,
`interview_scheduled`, `selected`, `rejected`, `withdrawn`.

Critical unique index: `{ jobId: 1, studentId: 1 }` unique. Additional
indexes: `{ studentId: 1, appliedAt: -1 }`;
`{ jobId: 1, status: 1, appliedAt: -1 }`.

### 2.6 `interviews`

  -----------------------------------------------------------------------
  Field                   Type                    Rules
  ----------------------- ----------------------- -----------------------
  `_id`                   ObjectId                Primary key

  `applicationId`         ObjectId                Required ref
                                                  `Application`

  `scheduledBy`           ObjectId                Required ref `User`

  `scheduledAt`           Date                    Required, future date
                                                  for new schedules

  `mode`                  String                  Enum: `online`,
                                                  `in_person`, `phone`

  `locationOrLink`        String                  Optional; validate
                                                  based on mode

  `notes`                 String                  Optional

  `status`                String                  Enum: `scheduled`,
                                                  `completed`,
                                                  `cancelled`,
                                                  `rescheduled`

  `createdAt`,            Date                    Timestamps
  `updatedAt`                                     
  -----------------------------------------------------------------------

Index: `{ applicationId: 1, scheduledAt: 1 }`.

### 2.7 `notifications` (Should-have)

  ----------------------------------------------------------------------------
  Field                   Type                    Rules
  ----------------------- ----------------------- ----------------------------
  `_id`                   ObjectId                Primary key

  `userId`                ObjectId                Required ref `User`, indexed

  `type`                  String                  e.g. `application_status`,
                                                  `interview_scheduled`,
                                                  `job_update`

  `title`                 String                  Required

  `message`               String                  Required

  `link`                  String                  Optional internal route

  `readAt`                Date                    Null until read

  `createdAt`             Date                    Timestamp
  ----------------------------------------------------------------------------

Index: `{ userId: 1, readAt: 1, createdAt: -1 }`.

### 2.8 `auditlogs` (Should-have)

  Field            Type       Rules
  ---------------- ---------- ----------------------------------------
  `_id`            ObjectId   Primary key
  `actorId`        ObjectId   Required ref `User`
  `action`         String     Required
  `resourceType`   String     Required
  `resourceId`     ObjectId   Optional
  `metadata`       Mixed      Allowlisted non-sensitive details only
  `createdAt`      Date       Timestamp

Do not store passwords, tokens, resume contents or sensitive personal
data in metadata.

## 3. Relationships and cardinality

-   One User has at most one StudentProfile or RecruiterProfile,
    depending on role.
-   One Recruiter creates many Jobs.
-   One Student submits many Applications.
-   One Job receives many Applications.
-   One Application may have multiple Interview records over time.
-   One User may receive many Notifications.
-   One User may perform many AuditLog actions.

## 4. Validation and integrity rules

1.  Normalize email to lowercase before saving.
2.  Enforce unique email and student identifier.
3.  Enforce unique `(jobId, studentId)` application pair at database
    level.
4.  Validate CGPA against the college's scale (MVP assumes 0--10; make
    configurable if required).
5.  Validate deadline and interview dates.
6.  Validate enum values in Mongoose and API request schemas.
7.  Check recruiter ownership before job/applicant operations.
8.  Check student ownership before profile/application operations.
9.  Use pagination for unbounded lists.
10. Store resume file metadata and external storage references, not
    binary data.

## 5. Application status transition policy

Allowed common transitions: - `applied` → `under_review`, `shortlisted`,
`rejected`, `withdrawn` - `under_review` → `shortlisted`, `rejected`,
`withdrawn` - `shortlisted` → `interview_scheduled`, `selected`,
`rejected`, `withdrawn` - `interview_scheduled` → `selected`,
`rejected`, `withdrawn` - `selected`, `rejected`, `withdrawn` are
terminal for the MVP.

The service must validate transitions; clients must not directly set
arbitrary statuses.

## 6. Future multi-college changes

Add `colleges` collection and `collegeId` references to users, profiles,
jobs and placement drives. Add tenant-scoped compound indexes and
require tenant context on all reads/writes. The current schema does not
include active multi-tenant behavior.
