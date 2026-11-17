# HireTrack --- Testing Strategy and Test Cases

## 1. Testing objectives

Verify that HireTrack's critical placement workflows function correctly,
role boundaries are enforced, data integrity is preserved and the UI
communicates system states clearly.

## 2. Test levels

-   **Unit:** eligibility rules, status transitions, validators and
    utility functions.
-   **API integration:** routes, database operations, authentication and
    authorization.
-   **Frontend component:** forms, route guards, tables and status
    rendering.
-   **End-to-end/manual:** full student--recruiter--admin workflow.
-   **Security checks:** role escalation, resource ownership, duplicate
    application and unsafe uploads.

## 3. Test environment

Use a dedicated test database, never production data. Use test accounts
for all three roles. Keep secrets in environment variables. Mock
Cloudinary in automated tests or use a dedicated test account.

## 4. Critical test cases

  -----------------------------------------------------------------------
  ID                      Scenario                Expected result
  ----------------------- ----------------------- -----------------------
  AUTH-01                 Register with valid     Account and student
                          student data            profile created

  AUTH-02                 Register with existing  `409` conflict; no
                          email                   duplicate user

  AUTH-03                 Public registration     Rejected
                          requests admin role     

  AUTH-04                 Login with wrong        `401`; no token
                          password                

  AUTH-05                 Access protected route  `401`
                          without token           

  AUTH-06                 Student calls admin     `403`
                          endpoint                

  STU-01                  Student updates own     Profile saved
                          profile                 

  STU-02                  Student attempts to     `403` or `404`
                          edit another profile    

  STU-03                  CGPA outside configured Validation error
                          range                   

  REC-01                  Pending recruiter       `403`
                          creates/publishes job   

  REC-02                  Admin approves          Approval status updated
                          recruiter               

  JOB-01                  Approved recruiter      Job created
                          creates valid job       

  JOB-02                  Recruiter edits another `403` or `404`
                          recruiter's job         

  JOB-03                  Student lists jobs      Only published, open,
                                                  non-expired jobs shown

  APP-01                  Eligible student        Application created
                          applies                 with `applied` status

  APP-02                  Same student applies    `409`; only one
                          twice to same job       application exists

  APP-03                  Ineligible student      Rejected with clear
                          applies                 reason

  APP-04                  Apply to closed/expired Rejected
                          job                     

  APP-05                  Student views another   `403` or `404`
                          student's application   

  APP-06                  Recruiter views         Applicant list returned
                          applicants for own job  

  APP-07                  Recruiter views         `403` or `404`
                          applicants for another  
                          recruiter's job         

  APP-08                  Recruiter sets valid    Status and history
                          status transition       updated

  APP-09                  Recruiter sets invalid  Validation/conflict
                          status transition       response

  INT-01                  Recruiter schedules     Interview created
                          interview for own       
                          applicant               

  INT-02                  Unrelated recruiter     `403` or `404`
                          schedules interview     

  ADM-01                  Admin views overview    Counts reflect database
                                                  records

  ADM-02                  Non-admin accesses      `403`
                          admin overview          

  FILE-01                 Upload valid resume     File metadata saved and
                                                  URL returned

  FILE-02                 Upload disallowed       Rejected safely
                          type/oversized file     
  -----------------------------------------------------------------------

## 5. Unit test targets

### Eligibility service

Test: - branch matches; - branch mismatch; - graduation year matches; -
graduation year mismatch; - CGPA exactly equals minimum; - CGPA below
minimum; - no branch/year criteria means unrestricted for those
dimensions; - missing student profile fields fail safely when criteria
require them.

### Status transition service

Test every permitted transition in `DATABASE_SCHEMA.md`, plus invalid
transitions from terminal states.

### Validation

Test invalid email, weak/empty password, malformed ObjectId, invalid
date, invalid enum and excessive text length.

## 6. API integration test approach

Use Jest/Vitest with Supertest. Create test users and records in a test
database before each suite. Authenticate as each role and assert: - HTTP
status; - response shape; - database side effects; - forbidden access
does not mutate data.

Always test both authorized and unauthorized paths for sensitive
resources.

## 7. Manual end-to-end checklist

-   [ ] Admin can sign in.
-   [ ] Admin can approve recruiter.
-   [ ] Approved recruiter can publish a job.
-   [ ] Student can register/sign in.
-   [ ] Student can complete profile and attach resume.
-   [ ] Student can discover eligible job.
-   [ ] Student can apply once.
-   [ ] Recruiter can view applicant and shortlist.
-   [ ] Student can see new status.
-   [ ] Admin metrics update.
-   [ ] Mobile navigation and core forms remain usable.
-   [ ] Refreshing a protected route behaves correctly.
-   [ ] API and UI show useful error states.

## 8. Security test checklist

-   [ ] Password hashes never appear in responses.
-   [ ] Admin role cannot be self-assigned.
-   [ ] JWT secret is not committed.
-   [ ] Protected endpoints reject missing/expired tokens.
-   [ ] Resource ownership is checked server-side.
-   [ ] Request fields are allowlisted to prevent mass assignment.
-   [ ] Authentication endpoints are rate-limited.
-   [ ] Resume upload size and file types are restricted.
-   [ ] CORS allows only configured origins in production.
-   [ ] Logs do not contain passwords, tokens or file contents.

## 9. Exit criteria

All critical tests pass; no known critical authorization or
data-integrity issue remains; the demo script completes; setup
instructions work on a clean environment. Record deferred tests and
known issues in the README.
