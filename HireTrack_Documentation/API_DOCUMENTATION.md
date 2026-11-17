# HireTrack --- API Documentation

**Base URL (development):** `http://localhost:5000/api/v1`\
**Format:** JSON, except multipart resume upload\
**Authentication:** `Authorization: Bearer <accessToken>`

## 1. Conventions

### Success response

``` json
{
  "success": true,
  "message": "Request completed",
  "data": {}
}
```

### Error response

``` json
{
  "success": false,
  "message": "Validation failed",
  "errors": [{ "field": "email", "message": "Email is invalid" }]
}
```

### HTTP status codes

-   `200` success
-   `201` created
-   `400` invalid input
-   `401` missing/invalid authentication
-   `403` insufficient role or permission
-   `404` resource not found
-   `409` duplicate/conflicting operation
-   `422` semantically invalid request (optional convention)
-   `429` rate limit exceeded
-   `500` unexpected server error

List endpoints should support `page` and `limit` query parameters and
return pagination metadata.

## 2. Authentication

  ------------------------------------------------------------------------
  Method            Endpoint           Access            Purpose
  ----------------- ------------------ ----------------- -----------------
  POST              `/auth/register`   Public            Register student
                                                         or recruiter

  POST              `/auth/login`      Public            Sign in

  GET               `/auth/me`         Authenticated     Get current user
                                                         and role profile

  POST              `/auth/logout`     Authenticated     Client/session
                                                         logout;
                                                         invalidate
                                                         refresh session
                                                         if implemented
  ------------------------------------------------------------------------

### Register request

``` json
{
  "name": "Asha Rao",
  "email": "asha@example.com",
  "password": "StrongPassword123",
  "role": "student",
  "studentProfile": {
    "studentId": "1XX22CS001",
    "branch": "CSE",
    "graduationYear": 2027,
    "cgpa": 8.4
  }
}
```

For recruiter registration, send `role: "recruiter"` and a
`recruiterProfile` containing company name and contact details. Public
registration must reject `admin`.

### Login request

``` json
{ "email": "asha@example.com", "password": "StrongPassword123" }
```

### Login response data

``` json
{
  "user": { "id": "USER_ID", "name": "Asha Rao", "email": "asha@example.com", "role": "student" },
  "accessToken": "JWT"
}
```

Never return `passwordHash`.

## 3. Student endpoints

  -----------------------------------------------------------------------------------
  Method            Endpoint                      Access            Purpose
  ----------------- ----------------------------- ----------------- -----------------
  GET               `/students/me`                Student           Get own profile

  PATCH             `/students/me`                Student           Update own
                                                                    profile

  POST              `/students/me/resume`         Student           Upload/replace
                                                                    resume (multipart
                                                                    field `resume`)

  GET               `/students/me/applications`   Student           List own
                                                                    applications
  -----------------------------------------------------------------------------------

Profile update example:

``` json
{
  "branch": "CSE",
  "graduationYear": 2027,
  "cgpa": 8.6,
  "skills": ["JavaScript", "React", "SQL"]
}
```

## 4. Jobs

  ------------------------------------------------------------------------------
  Method            Endpoint                 Access            Purpose
  ----------------- ------------------------ ----------------- -----------------
  GET               `/jobs`                  Authenticated or  Browse published
                                             public per policy open jobs

  GET               `/jobs/:jobId`           Authenticated     Job details and
                                                               eligibility
                                                               summary

  POST              `/jobs`                  Approved          Create job
                                             Recruiter         

  PATCH             `/jobs/:jobId`           Owning            Update job
                                             Recruiter/Admin   

  PATCH             `/jobs/:jobId/publish`   Owning approved   Publish job
                                             Recruiter/Admin   

  PATCH             `/jobs/:jobId/close`     Owning            Close job
                                             Recruiter/Admin   

  GET               `/jobs/mine`             Recruiter         List recruiter's
                                                               jobs
  ------------------------------------------------------------------------------

Job creation example:

``` json
{
  "title": "Graduate Software Engineer",
  "description": "Build and maintain web applications.",
  "companyName": "Example Technologies",
  "location": "Bengaluru",
  "employmentType": "full_time",
  "ctc": "4–6 LPA",
  "minCgpa": 7.0,
  "eligibleBranches": ["CSE", "ISE", "AIML"],
  "eligibleGraduationYears": [2027],
  "requiredSkills": ["JavaScript", "SQL"],
  "applicationDeadline": "2026-12-15T18:30:00.000Z",
  "status": "draft"
}
```

Browse filters: `q`, `branch`, `graduationYear`, `employmentType`,
`page`, `limit`. Server must apply published/open/deadline conditions
regardless of client filters.

## 5. Applications

  -----------------------------------------------------------------------------------------------
  Method            Endpoint                                  Access            Purpose
  ----------------- ----------------------------------------- ----------------- -----------------
  POST              `/jobs/:jobId/applications`               Student           Apply to job

  GET               `/applications/me`                        Student           List own
                                                                                applications

  GET               `/jobs/:jobId/applications`               Owning            List applicants
                                                              Recruiter/Admin   for job

  GET               `/applications/:applicationId`            Owner Student,    Application
                                                              owning Recruiter  details
                                                              or Admin          

  PATCH             `/applications/:applicationId/status`     Owning            Change
                                                              Recruiter/Admin   application
                                                                                status

  PATCH             `/applications/:applicationId/withdraw`   Owning Student    Withdraw
                                                                                application
  -----------------------------------------------------------------------------------------------

Apply request:

``` json
{ "coverLetter": "I am interested in this role." }
```

The server obtains student identity and resume from the authenticated
account; do not trust a client-supplied `studentId`.

Status update:

``` json
{
  "status": "shortlisted",
  "note": "Selected for technical interview"
}
```

The server checks job ownership and allowed status transition, then
appends status history.

## 6. Interviews

  ------------------------------------------------------------------------------------------------------
  Method            Endpoint                                    Access               Purpose
  ----------------- ------------------------------------------- -------------------- -------------------
  POST              `/applications/:applicationId/interviews`   Owning Recruiter     Schedule interview

  GET               `/applications/:applicationId/interviews`   Application          List interviews
                                                                participants/Admin   

  PATCH             `/interviews/:interviewId`                  Owning               Reschedule/update
                                                                Recruiter/Admin      

  PATCH             `/interviews/:interviewId/cancel`           Owning               Cancel
                                                                Recruiter/Admin      
  ------------------------------------------------------------------------------------------------------

Create interview example:

``` json
{
  "scheduledAt": "2026-12-10T09:30:00.000Z",
  "mode": "online",
  "locationOrLink": "https://meet.example.com/room",
  "notes": "Technical round"
}
```

## 7. Admin endpoints

  -------------------------------------------------------------------------------------------------------
  Method            Endpoint                                    Access            Purpose
  ----------------- ------------------------------------------- ----------------- -----------------------
  GET               `/admin/overview`                           Admin             Summary metrics

  GET               `/admin/users`                              Admin             List users

  PATCH             `/admin/users/:userId/status`               Admin             Activate/suspend
                                                                                  account

  GET               `/admin/recruiters/pending`                 Admin             List pending recruiter
                                                                                  approvals

  PATCH             `/admin/recruiters/:recruiterId/approval`   Admin             Approve/reject
                                                                                  recruiter

  GET               `/admin/jobs`                               Admin             List/moderate jobs

  PATCH             `/admin/jobs/:jobId/status`                 Admin             Publish/close/archive
                                                                                  job
  -------------------------------------------------------------------------------------------------------

Admin overview response data example:

``` json
{
  "students": 420,
  "approvedRecruiters": 18,
  "activeJobs": 12,
  "applications": 860,
  "selectedStudents": 74
}
```

Metrics must be calculated from persisted records, not hardcoded values.

## 8. Notifications (Should-have)

  ---------------------------------------------------------------------------------------------
  Method            Endpoint                                Access            Purpose
  ----------------- --------------------------------------- ----------------- -----------------
  GET               `/notifications`                        Authenticated     List own
                                                                              notifications

  PATCH             `/notifications/:notificationId/read`   Owner             Mark read

  PATCH             `/notifications/read-all`               Authenticated     Mark all own
                                                                              notifications
                                                                              read
  ---------------------------------------------------------------------------------------------

## 9. Security and validation requirements

-   Validate all request bodies, params and query strings.
-   Enforce role and resource ownership on every protected endpoint.
-   Use rate limiting on authentication endpoints.
-   Restrict upload size and MIME types; verify file content where
    possible.
-   Never expose secrets or password hashes.
-   Avoid mass assignment: allowlist fields accepted by each update
    endpoint.
-   Do not trust user IDs, recruiter IDs or roles sent by the client.
-   Use consistent error middleware and do not return stack traces in
    production.

## 10. API implementation order

1.  Health check and auth.
2.  Student profile.
3.  Recruiter approval and job CRUD.
4.  Job listing and application submission.
5.  Applicant review/status updates.
6.  Interviews.
7.  Admin overview and moderation.
8.  Notifications if time remains.
