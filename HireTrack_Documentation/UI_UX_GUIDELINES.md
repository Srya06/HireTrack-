# HireTrack --- UI/UX Guidelines

## 1. Product experience principles

1.  **Clarity first:** users should immediately understand what action
    is available and what happens next.
2.  **Role-specific simplicity:** each role sees only relevant
    navigation and actions.
3.  **Status transparency:** applications and jobs use consistent,
    readable status labels.
4.  **Trust:** clearly show eligibility, deadlines and recruiter/company
    information.
5.  **Responsive by default:** tables become cards or horizontally
    scrollable layouts on small screens.
6.  **Accessible interaction:** keyboard navigation, visible focus and
    meaningful labels.

## 2. Visual direction

Use a clean, modern campus-career SaaS aesthetic. Prefer a light neutral
canvas, white cards, dark slate text and one consistent blue/indigo
primary accent. Use semantic colors only for status feedback; do not
rely on color alone.

Suggested tokens (adjust consistently in Tailwind config): - Background:
`slate-50` - Surface: `white` - Primary: `indigo-600` - Primary hover:
`indigo-700` - Main text: `slate-900` - Secondary text: `slate-500` -
Borders: `slate-200` - Success: `emerald-600` - Warning: `amber-600` -
Danger: `rose-600` - Info: `sky-600`

Typography: use a readable sans-serif such as Inter or system UI. Use a
clear hierarchy: page title, section title, card title, body, helper
text.

## 3. Information architecture

### Public

-   Landing page
-   Login
-   Register (student/recruiter)
-   Access denied / not found

### Student

-   Overview
-   Find Jobs
-   Job Details
-   My Applications
-   Application Details / Status Timeline
-   My Profile
-   Resume

### Recruiter

-   Overview
-   My Jobs
-   Create/Edit Job
-   Applicants
-   Applicant Details
-   Interview Schedule
-   Company Profile

### Admin

-   Overview
-   Students
-   Recruiters / Pending Approvals
-   Jobs / Placement Drives
-   Applications
-   Reports

## 4. Dashboard layouts

### Shared shell

-   Sidebar on desktop; drawer/menu on mobile.
-   Top bar with page title, user menu and notification indicator.
-   Main content area with consistent max width and spacing.
-   Breadcrumbs for deeper management pages where helpful.

### Student dashboard

Prioritize: - profile completion indicator; - active opportunities
count; - application status summary; - recent applications; -
recommended/eligible job list (rule-based filters only for MVP).

### Recruiter dashboard

Prioritize: - active job count; - total applicants; - applicants
requiring review; - upcoming interviews; - recent applicants and job
performance.

### Admin dashboard

Prioritize: - student count; - approved/pending recruiter count; -
active jobs; - total applications and selections; - pending approvals
and recently created jobs.

## 5. Key screens and interactions

### Job listing

Each job card should show role title, company, location, employment
type, CTC text (if supplied), deadline and key eligibility. Provide
search and filters. Use a clear "View details" action.

### Job details

Show full description, eligibility criteria, skills, deadline and
recruiter/company identity. Display a clear eligible/ineligible state
when profile data allows it. The server remains the authority when the
student applies.

### Apply flow

Use a confirmation step summarizing job and resume. Prevent repeated
clicks while submitting. Show success and route to application details.
Explain validation failures in plain language.

### Application tracking

Use consistent status labels and a chronological timeline. Show
interview date/time and instructions when scheduled. Do not expose
internal recruiter notes unless explicitly intended for the student.

### Recruiter applicant table

Show name, branch, CGPA, graduation year, application date and status.
Resume access must be authorized. Provide status actions with
confirmation where consequential.

### Admin moderation

Use clear pending/approved/rejected states. Confirm suspension,
rejection or job closure. Show who performed an action if audit data is
available.

## 6. Component standards

Build reusable components: - `Button` variants: primary, secondary,
outline, danger, ghost. - `Input`, `Select`, `Textarea`, `FormField`. -
`Card`, `StatCard`, `Modal`, `ConfirmDialog`. - `StatusBadge`. -
`DataTable` with loading, empty and error states. - `Pagination`. -
`JobCard`, `ApplicantRow`, `ApplicationTimeline`. - `DashboardLayout`
and role-specific navigation.

## 7. States every screen must handle

-   Initial loading/skeleton.
-   Empty state with a useful next action.
-   Validation error.
-   API/network error with retry where appropriate.
-   Success confirmation.
-   Disabled/submitting state.
-   Unauthorized or unavailable resource state.

## 8. Responsive guidelines

-   Desktop: persistent sidebar and multi-column dashboard cards.
-   Tablet: collapsible sidebar and reduced grid columns.
-   Mobile: single-column content, menu drawer, stacked forms and
    card-based lists.
-   Avoid tiny click targets; aim for approximately 44px touch target
    height.
-   Ensure long job titles and company names wrap safely.

## 9. Accessibility checklist

-   Every input has a visible or programmatic label.
-   Buttons have descriptive names.
-   Keyboard users can reach all controls.
-   Focus ring is visible.
-   Text and controls have sufficient contrast.
-   Status includes text, not color alone.
-   Images have meaningful alt text or are decorative.
-   Modals trap focus and close predictably.
-   Validation errors are associated with their fields.

## 10. UX copy examples

-   Empty applications: "You haven't applied to any jobs yet. Explore
    current opportunities."
-   Pending recruiter: "Your recruiter account is awaiting
    placement-cell approval."
-   Ineligible job: "You don't currently meet this job's listed
    eligibility criteria."
-   Duplicate application: "You've already applied for this
    opportunity."
-   Upload error: "Upload a PDF or DOC/DOCX resume within the allowed
    file size."
