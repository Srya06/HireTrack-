# HireTrack v3 — Pilot Rollout Strategy & Legacy Architecture Decision

> **Target Audience:** Project Stakeholders & System Owner  
> **Status:** Pending Owner Formal Review & Approval (NO DATA DELETED)

---

## 1. Executive Summary

As HireTrack completes Chunk V12, the platform is prepared to transition from open self-service recruitment (v1 MVP) to an **institution-governed campus placement and career readiness operating system (v3)**.

To conduct a secure and controlled institutional pilot, we present the strategy for toggling the two primary migration flags and the data governance policy for legacy v1 records.

---

## 2. Recommended Pilot Flag Toggles

### 2.1 Flip `LEGACY_RECRUITER_FLOW=false`
* **Current State (`true`):** Recruiters can register publicly, submit job postings directly, and review internal student applications.
* **Proposed Pilot State (`false`):**
  - The Recruiter portal links and recruiter application forms are hidden from the frontend navigation shell.
  - The placement cell staff (`PLACEMENT_COORDINATOR` and `ORG_ADMIN`) manage curated external **Job Opportunities** ([`JobOpportunity`](file:///c:/Users/rajat/Downloads/HireTrack_Documentation_Pack/server/src/models/jobOpportunity.model.js)) with external career application URLs.
  - Students track their external applications via self-reported entries labelled `"unverified (student-reported)"`.
  - **Backward Compatibility:** All existing legacy `/api/v1/jobs` and `/api/v1/applications` routes remain intact and fully functional for backend API clients and automated regression test suites.

### 2.2 Flip `ALLOW_PUBLIC_STUDENT_SIGNUP=false`
* **Current State (`true`):** Any internet user can self-register a student account with arbitrary email addresses.
* **Proposed Pilot State (`false`):**
  - Public `/register` role selector hides student self-registration or redirects to the institution portal login.
  - Student accounts are onboarded securely through **Institution CSV Batch Import** (`POST /api/v1/admin/students/import`) by verified placement staff with pre-validated master academic records (USN/Roll number, CGPA, graduation cohort).
  - Invited students activate their accounts via secure one-time activation tokens.

---

## 3. Legacy v1 Data Preservation Strategy (Zero Deletion)

> [!IMPORTANT]
> **Strict Anti-Data-Loss Commitment:** Not a single row or collection will be dropped, truncated, or deleted without explicit written authorization from the system owner.

We propose **Option A: In-Place Read-Only Archival**:

1. **Retain All Collections:** All 6 legacy collections (`users`, `studentprofiles`, `recruiterprofiles`, `jobs`, `applications`, `interviews`) remain in MongoDB.
2. **Read-Only Accessibility:** Legacy recruiter profiles and jobs are preserved for historical audit trails and accreditation reporting.
3. **Cold Snapshot Backup:** Prior to pilot launch, a cold JSON snapshot will be archived via:
   ```bash
   npm run backup -- --dir backups/legacy-v1-archive
   ```
4. **No Destructive Operations:** MongoDB collections are never dropped; no `dropCollection()` or `deleteMany({})` operations are scheduled.

---

## 4. Owner Decision & Sign-Off Matrix

Please indicate your decision for the pilot deployment:

| Decision Item | Proposed Default | Owner Selection |
| :--- | :--- | :--- |
| **Set `LEGACY_RECRUITER_FLOW=false`** | Recommended (`false`) | [ ] Approve &nbsp;&nbsp; [ ] Keep Active (`true`) |
| **Set `ALLOW_PUBLIC_STUDENT_SIGNUP=false`** | Recommended (`false`) | [ ] Approve &nbsp;&nbsp; [ ] Keep Active (`true`) |
| **Legacy Data Archival Policy** | Option A (In-Place Read-Only) | [ ] Option A &nbsp;&nbsp; [ ] Other |
| **Legacy Route Deletion** | Do NOT delete (Keep for regression)| [ ] Approved (Keep routes active) |

*(Sign-off signature or reply confirmation required before flipping production environment variables.)*

