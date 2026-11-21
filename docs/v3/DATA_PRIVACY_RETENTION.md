# HireTrack v3 — Data Privacy, Protection & Retention Policy

> **Compliance Reference:** General Data Protection Regulation (GDPR) / Digital Personal Data Protection (DPDP) Principles  
> **Effective Version:** HireTrack 3.0.0

---

## 1. Principles of Data Collection & Minimization

HireTrack operates strictly under the principle of **data minimization**—collecting only the minimum data elements necessary to facilitate campus placements, skills benchmarking, and mock interview preparation:

### 1.1 Data Collected
- **Student Profile:** Full Name, Institutional Email, Contact Phone, Roll/Student Code, Degree, Branch, Graduation Year, CGPA, 10th/12th percentages, Backlogs count, Technical Skills, and Resume PDF.
- **Assessment Engine:** Question choices, time taken, autograded scores, topic-wise proficiency metrics.
- **AI Mock Interviews:** Turn-by-turn conversational practice responses, rubric evaluations (Technical Depth, Problem Solving, Communication).
- **Campus Ambassadors:** Ambassador motivation statement, unique referral codes, participant name, institutional email, phone, and college name.

### 1.2 Strictly Prohibited & Excluded Data
HireTrack **never** collects, processes, or stores:
- Financial or payment credentials (no fees, deposits, or card details).
- Sensitive identity documents (passports, national ID cards, biometric proofs).
- Speculative or guaranteed employment contracts (no placement promises).

---

## 2. Retention Periods & Organization Policy Defaults

Data retention is managed per organization through [`InstitutePolicy`](file:///c:/Users/rajat/Downloads/HireTrack_Documentation_Pack/server/src/models/institutePolicy.model.js) under the `policyKey: 'dataRetention'`:

| Data Category | Default Retention Period | Justification | Post-Retention Action |
| :--- | :--- | :--- | :--- |
| **Student Profiles & Records** | **365 days** post-graduation | Verification and alumni placement accreditation audits | Soft-archived or hard deleted upon formal request |
| **Mock Test Attempt Answers** | **180 days** | Benchmark trend analysis and student progress review | Answer payloads purged; summary score retained |
| **AI Interview Turns & Transcripts** | **90 days** | Immediate practice review and feedback coaching | Transcripts and turn text permanently purged |
| **Audit Logs** | **730 days (2 years)** | Security compliance, tamper-evident action verification | Purged via automated retention script |

### 2.1 Configuring Retention Policies (Staff Admin)

Organization administrators can inspect and tune retention timelines via the dedicated policy API:

```http
GET /api/v1/admin/policies/retention
Authorization: Bearer <ORG_ADMIN_TOKEN>
```

```http
PATCH /api/v1/admin/policies/retention
Authorization: Bearer <ORG_ADMIN_TOKEN>
Content-Type: application/json

{
  "profileRetentionDays": 365,
  "interviewTranscriptRetentionDays: 60,
  "assessmentAttemptRetentionDays": 120,
  "auditLogRetentionDays": 730
}
```

---

## 3. Automated Retention Purge Script

HireTrack includes an automated retention maintenance job at [`server/src/scripts/privacyRetention.js`](file:///c:/Users/rajat/Downloads/HireTrack_Documentation_Pack/server/src/scripts/privacyRetention.js).

### 3.1 Dry-Run Scan (Audit Only)
```bash
npm run privacy:retention
```
Scans all organizations, evaluates active retention policies against record timestamps, and logs expired candidate counts without modifying database records.

### 3.2 Purge Execution
```bash
node server/src/scripts/privacyRetention.js --execute
```
Permanently removes expired transcripts, answers, and audit logs. Records an immutable audit log entry `RETENTION_PURGE_EXECUTED`.

---

## 4. Student Data Portability & Export (Right of Access)

Under data protection regulations, students have the right to obtain a portable machine-readable copy of their personal records.

### 4.1 Student Self-Service API
```http
GET /api/v1/students/me/data-export
Authorization: Bearer <STUDENT_TOKEN>
```
Returns a complete JSON archive of:
1. User account and profile metadata (with password hash stripped).
2. All external job applications and status timeline.
3. Mock test attempts and scoring metrics (with answer keys stripped).
4. AI mock interview session feedback and scores.
5. Human mock interview bookings and released evaluations.
6. Campus ambassador activity and referral stats.

### 4.2 Administrator CLI Export
```bash
node server/src/scripts/privacyRetention.js --export-student <STUDENT_USER_ID>
```
Writes a formatted file `student-export-<STUDENT_ID>-<TIMESTAMP>.json` for compliance review.

