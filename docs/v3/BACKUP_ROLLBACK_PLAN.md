# HireTrack v3 — Backup, Restore, Rollback & Deployment Runbook

> **Scope:** Operational procedures for snapshot backups, point-in-time disaster recovery, zero-downtime rollbacks, staging vs. production deployment, and environment variable configurations.

---

## 1. Automated Snapshot Backup & Restore Procedures

HireTrack includes automated JSON snapshot backup and restoration utilities located in [`server/src/scripts/backupRestore.js`](file:///c:/Users/rajat/Downloads/HireTrack_Documentation_Pack/server/src/scripts/backupRestore.js).

### 1.1 Snapshot Creation

To snapshot all registered Mongoose collections into timestamped JSON files with schema validation manifests:

```bash
# From workspace root
npm run backup

# Or inside server/
npm --prefix server run backup -- --dir backups/snapshot-YYYY-MM-DD-HHmmss
```

**Manifest Output:**
- `manifest.json`: Stores `createdAt`, `schemaVersion: 'v3.0.0'`, and collection-by-collection counts and file sizes.
- Individual JSON snapshots: `User.json`, `StudentProfile.json`, `JobOpportunity.json`, `MockTest.json`, `AuditLog.json`, etc.

### 1.2 Snapshot Integrity Verification (Dry-Run Restore)

Before executing any database restore, verify JSON syntax and model schema alignment without writing to the database:

```bash
npm run restore -- --dir backups/snapshot-2026-11-21-190000
```

### 1.3 Live Restore Execution

To restore a validated snapshot into MongoDB:

```bash
npm run restore -- --dir backups/snapshot-2026-11-21-190000 --execute
```

---

## 2. Production Disaster Recovery & Atlas PITR

For production MongoDB Atlas clusters:
1. **Continuous Cloud Backups:** Enable Point-in-Time Recovery (PITR) with 1-minute granularity and 7-day retention.
2. **Scheduled Snapshots:**
   - Daily snapshots retained for 7 days.
   - Weekly snapshots retained for 4 weeks.
   - Monthly snapshots retained for 12 months.
3. **Recovery Time Objective (RTO):** $< 30$ minutes to restore cluster snapshot.
4. **Recovery Point Objective (RPO):** $< 5$ minutes via write-ahead oplog replay.

---

## 3. Rollback Runbook (Zero-Downtime Rollback Plan)

### 3.1 Architecture Compatibility Guarantee
All HireTrack v3 models and schema enhancements were engineered to be **100% strictly additive**:
- Legacy v1 collections (`users`, `studentprofiles`, `recruiterprofiles`, `jobs`, `applications`, `interviews`) are preserved without renaming or dropping fields.
- v3 collections (`jobopportunities`, `mocktests`, `aimockinterviewsessions`, etc.) are independent.
- If a rollback to v1 or an earlier v3 chunk is necessary, **no database rollback or schema reversion is required**—the legacy codebase continues to function against the database without error.

### 3.2 Step-by-Step Code Rollback Execution

1. **Identify Stable Commit / Tag:**
   ```bash
   git log --oneline -n 5
   ```
2. **Revert or Checkout Target State:**
   ```bash
   # In staging or production release branch
   git checkout tags/v3.0.0-pilot  # Or stable commit hash
   ```
3. **Rebuild Client Frontend:**
   ```bash
   npm --prefix client run build
   ```
4. **Restart API Server:**
   ```bash
   pm2 restart hiretrack-api  # Or systemctl restart hiretrack-api / docker restart
   ```
5. **Verify Smoke Endpoints:**
   ```bash
   curl -I https://hiretrack.edu/api/v1/health
   ```

---

## 4. Staging vs. Production Environment Comparison

| Operational Area | Staging Environment | Production Environment |
| :--- | :--- | :--- |
| **Domain & URLs** | `https://staging.hiretrack.edu` | `https://hiretrack.edu` |
| **Client Origins** | `http://localhost:5173,https://staging.hiretrack.edu` | `https://hiretrack.edu` (strictly enforce CORS) |
| **Database** | Shared cluster or Mongo Atlas M0/M2 | Dedicated Replica Set (Mongo Atlas M10+ with PITR) |
| **Demo Data** | Seeded with synthetic data (`npm run seed:v3-demo`) | Clean institutional student import; zero mock seeds |
| **AI Interview Engine**| `AI_PROVIDER=MOCK` (deterministic tests) | `AI_PROVIDER=OPENAI` or `GEMINI` with valid token quota |
| **Rate Limiting** | Generous limits for automated integration suites | Strict per-IP rate limiters (100 req/15m general, 5 req/15m auth, 10 req/15m referrals) |
| **Log Output** | Verbose `morgan('dev')` request logs | Clean JSON access logs; no PII, answers, or credentials |

---

## 5. Complete Environment Variables Reference

Below is the definitive environment variable reference for both Server and Client:

### Server Environment (`server/.env`)

```ini
# --- Runtime ---
NODE_ENV=production
PORT=5000
API_PUBLIC_URL=https://hiretrack.edu

# --- Database ---
MONGODB_URI=mongodb+srv://<user>:<password>@cluster0.example.mongodb.net/hiretrack?retryWrites=true&w=majority

# --- Security & JWT ---
JWT_SECRET=super_secret_high_entropy_random_32_character_string_here
JWT_EXPIRES_IN=7d
CLIENT_URL=https://hiretrack.edu

# --- Feature Flags (Chunk V0 / V12) ---
LEGACY_RECRUITER_FLOW=false
ALLOW_PUBLIC_STUDENT_SIGNUP=false
V3_OPPORTUNITIES_ENABLED=true
V3_MOCK_TESTS_ENABLED=true
V3_AI_INTERVIEWS_ENABLED=true
V3_HUMAN_MOCK_ENABLED=true
V3_AMBASSADORS_ENABLED=true

# --- AI Mock Interview Provider ---
AI_PROVIDER=MOCK             # Options: MOCK | OPENAI | GEMINI
AI_MODEL=gpt-4o-mini         # Or gemini-1.5-flash
AI_API_KEY=your_llm_api_key

# --- File Storage & Uploads ---
STORAGE_PROVIDER=LOCAL       # Options: LOCAL | CLOUDINARY | S3
MAX_RESUME_SIZE_MB=5
CLOUDINARY_CLOUD_NAME=
CLOUDINARY_API_KEY=
CLOUDINARY_API_SECRET=
```

### Client Environment (`client/.env`)

```ini
VITE_API_BASE_URL=https://hiretrack.edu/api/v1
```

