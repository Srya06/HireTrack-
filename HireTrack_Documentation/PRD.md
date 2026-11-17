# HireTrack --- Product Requirements Document (PRD)

**Version:** 1.0\
**Status:** MVP baseline\
**Product:** Single-college placement management platform\
**Target delivery:** 24-hour implementation sprint

## 1. Product summary

HireTrack is a web-based placement management platform for one college.
It centralizes campus recruitment activities by connecting students,
recruiters and the college placement administrator. Students maintain
academic profiles, discover eligible opportunities and track
applications. Recruiters publish openings and manage applicants. The
placement administrator oversees accounts, job postings, placement
drives and platform-wide activity.

The first release is intentionally single-college. The data model should
avoid assumptions that make future multi-college expansion difficult,
but college tenancy, tenant administration and cross-college discovery
are out of scope for the MVP.

## 2. Problem statement

Placement activity is often distributed across spreadsheets, email,
messaging groups and separate recruiter communications. This makes it
difficult to: - keep student academic and resume information current; -
communicate job eligibility consistently; - track applications and
selection stages; - give recruiters a clear applicant workflow; -
produce reliable placement activity reports.

HireTrack provides one shared source of truth for these workflows.

## 3. Goals and success measures

### Product goals

1.  Provide secure, role-specific access for students, recruiters and
    placement admins.
2.  Allow recruiters to publish jobs with clear eligibility
    requirements.
3.  Allow students to discover jobs and submit applications.
4.  Allow recruiters to review applicants and update application
    statuses.
5.  Allow the placement admin to moderate recruiters and jobs and
    monitor placement activity.
6.  Provide a usable, responsive interface on desktop and mobile.

### MVP success criteria

-   A student can register, sign in, complete a profile and upload a
    resume.
-   An approved recruiter can create, edit, publish and close a job.
-   A student can see jobs and apply only once to a given job.
-   The system records an application and its status history.
-   A recruiter can view applicants and move them through defined
    stages.
-   An admin can approve recruiters, manage users/jobs and view summary
    metrics.
-   Unauthorized users cannot access protected role-specific endpoints.
-   Core flows pass the test cases in `TESTING.md`.

## 4. Users and personas

### Student

A current student seeking campus opportunities. Needs a profile,
eligibility clarity, easy application and transparent status tracking.

### Recruiter

A company representative authorized by the placement cell. Needs to
publish vacancies, define criteria and efficiently review candidates.

### Placement Admin

A placement-cell staff member. Needs control over platform access,
recruiter approvals, job moderation, placement drives and reporting.

## 5. MVP scope

### In scope

-   Email/password registration and login.
-   JWT-based authentication and role-based authorization.
-   Student profile: name, email, USN/student identifier,
    department/branch, graduation year, CGPA, skills and resume URL.
-   Recruiter profile and admin approval.
-   Job creation and management by approved recruiters.
-   Job fields: title, description, company, location, employment type,
    package/CTC text, deadline, eligible branches, minimum CGPA,
    graduation years and required skills.
-   Job search and basic filters.
-   Student application submission and duplicate prevention.
-   Application status workflow: Applied, Under Review, Shortlisted,
    Interview Scheduled, Selected, Rejected, Withdrawn.
-   Recruiter applicant list and status updates.
-   Basic interview scheduling metadata.
-   Admin dashboard with counts and management lists.
-   Basic in-app notifications for key events if time permits; otherwise
    show status updates in dashboards.
-   Responsive UI, validation, error states and README setup
    instructions.

### Out of scope for 24-hour MVP

-   Multi-college tenancy and cross-college recruitment.
-   AI resume scoring, automated candidate ranking or generative AI.
-   Video interviews or integrated meeting rooms.
-   Payment processing.
-   Native mobile apps.
-   Complex email/SMS delivery infrastructure.
-   Advanced analytics/BI and predictive placement insights.
-   Automated university ERP integration.
-   Full applicant tracking integrations with external HR systems.

## 6. Functional requirements

  -----------------------------------------------------------------------
  ID                      Requirement             Priority
  ----------------------- ----------------------- -----------------------
  FR-01                   Users can register and  Must
                          log in securely.        

  FR-02                   The system enforces     Must
                          Student, Recruiter and  
                          Admin roles.            

  FR-03                   Students can view and   Must
                          update their profiles.  

  FR-04                   Students can upload or  Must
                          attach a resume.        

  FR-05                   Recruiter accounts      Must
                          require admin approval  
                          before publishing jobs. 

  FR-06                   Approved recruiters can Must
                          create, edit, publish   
                          and close jobs.         

  FR-07                   Students can browse and Must
                          filter published, open  
                          jobs.                   

  FR-08                   The system checks       Must
                          eligibility before      
                          accepting an            
                          application.            

  FR-09                   A student can submit at Must
                          most one active         
                          application per job.    

  FR-10                   Recruiters can view     Must
                          applicants for their    
                          own jobs.               

  FR-11                   Recruiters can update   Must
                          application status and  
                          schedule interviews.    

  FR-12                   Students can track      Must
                          application status and  
                          history.                

  FR-13                   Admins can              Must
                          approve/suspend         
                          recruiters and manage   
                          users/jobs.             

  FR-14                   Admins can view basic   Must
                          platform and placement  
                          metrics.                

  FR-15                   The system records      Should
                          important timestamps    
                          and audit-relevant      
                          changes.                

  FR-16                   Users receive in-app    Should
                          notifications for       
                          application events.     
  -----------------------------------------------------------------------

## 7. Non-functional requirements

-   **Security:** Passwords are hashed; secrets are environment
    variables; protected endpoints enforce ownership and roles.
-   **Privacy:** Student profile and resume data are visible only to the
    student, authorized recruiters for relevant applications and admins.
-   **Performance:** Typical API reads should target under 500 ms in
    local/demo conditions, excluding file upload and external services.
-   **Availability:** MVP is expected to run in a demonstrable hosted
    environment; no production SLA is promised.
-   **Usability:** Primary tasks should be understandable without
    training; provide loading, empty, success and error states.
-   **Responsiveness:** Support current desktop browsers and common
    mobile viewport widths.
-   **Maintainability:** Separate routes, controllers, models,
    middleware and frontend feature areas.
-   **Scalability:** Use indexed references and avoid embedding
    unbounded application lists in user documents.
-   **Accessibility:** Semantic controls, labels, keyboard focus
    visibility and adequate contrast.

## 8. Business rules

1.  Only approved recruiters may publish jobs.
2.  Only published and open jobs can receive applications.
3.  A student must have a minimally complete profile and resume before
    applying (the exact resume requirement can be configured; default:
    resume required).
4.  Eligibility is evaluated server-side using graduation year, branch
    and minimum CGPA where supplied.
5.  A student cannot apply twice to the same job.
6.  A recruiter can access applicants only for jobs owned by that
    recruiter.
7.  Admin actions can override normal job moderation rules and should be
    logged.
8.  Application status changes must follow the permitted workflow and
    retain a history record.
9.  A job cannot be applied to after its deadline or after it is closed.
10. Admin accounts are provisioned securely; public registration must
    not allow users to self-assign the Admin role.

## 9. Assumptions and dependencies

-   The college supplies the initial admin account and approved
    recruiter identities.
-   MongoDB is available locally or through a hosted MongoDB service.
-   Resume storage uses Cloudinary or an equivalent object-storage
    provider; local development may use a temporary local upload
    directory.
-   The college defines its branch names, graduation-year conventions
    and eligibility policies.
-   The first version uses a single institution-wide configuration.

## 10. Risks and mitigations

  -----------------------------------------------------------------------
  Risk                                Mitigation
  ----------------------------------- -----------------------------------
  24-hour schedule is too tight       Prioritize Must requirements; defer
                                      notifications and advanced
                                      reporting.

  Resume upload integration delays    Implement a storage adapter and
                                      allow a controlled URL/local
                                      development fallback.

  Incorrect eligibility checks        Centralize eligibility logic and
                                      unit-test boundary cases.

  Unauthorized access to applicant    Enforce ownership checks in server
  data                                middleware/controllers and test
                                      negative cases.

  Scope creep                         Treat out-of-scope features as
                                      future backlog.
  -----------------------------------------------------------------------

## 11. Release definition

The MVP is complete when the acceptance criteria in this document and
the critical test cases in `TESTING.md` pass, all three roles can
complete their main workflows, and setup instructions allow another
developer to run the project.
