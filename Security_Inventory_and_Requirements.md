# Asset & System Inventory, Data Classification, and Security Requirements

## 1️⃣ Asset & System Inventory

| # | Asset / Component | Why It Needs Protection | Notes / References |
|---|-------------------|------------------------|--------------------|
| A1 | **Source Code (HTML, CSS, JS, PHP, Node.js)** | Reveals business logic, exposes potential vulnerabilities, and constitutes intellectual property. | `frontend/*`, `JS/*`, `Backend/api/*`, `server.js`, `package.json` |
| A2 | **Database (MySQL)** | Stores all operational data (faculty records, schedules, credentials). A breach would expose personal & academic information. | `schema.sql` |
| A3 | **API End‑points (e.g., `faculty_analytics.php`, `faculty` CRUD APIs)** | Provide programmatic access to data; must be guarded against unauthorized calls. | `Backend/api/*` |
| A4 | **Web Server / Application Server** | Hosts the web app; if compromised, attackers can inject malicious code or take the service down. | Runs on Node.js (`server.js`) and possibly Apache/PHP. |
| A5 | **User Authentication Service (login, session handling)** | Controls who can access the system; compromised credentials lead to full system takeover. | `loginLockInfo` in `app.common.js`, token handling. |
| A6 | **Static Assets (logos, UI images, style sheets)** | Minor impact, but tampering could be used for phishing or defacement. | `style/*`, `Frontend/*` |
| A7 | **Backup & Log Files** | Contain historical data and audit trails; leakage could reveal sensitive information. | Usually stored on the server (not in repo). |
| A8 | **Deployment Environment (Docker / VM / Cloud VM)** | Underlying OS & runtime; a breach could allow lateral movement to other services. | Not visible in repo but part of the production stack. |
| A9 | **Third‑party Libraries (Chart.js, Tailwind CDN, Lucide icons, etc.)** | Vulnerable libraries could be exploited to gain code execution. | Referenced via CDN in HTML. |

---

## 2️⃣ Data Classification & Security Objectives

| # | Data Type | Classification | Confidentiality (Who may view?) | Integrity (How to protect?) | Availability (How to keep accessible?) | Rationale |
|---|-----------|----------------|----------------------------------|-----------------------------|----------------------------------------|-----------|
| D1 | **Faculty personal data** (name, ID, employment type, educational attainment, active flag) | **Restricted** | System admins, academic aides, faculty managers only | Digital signatures / DB constraints; audit logs; immutable fields for IDs | Critical PII; misuse could lead to identity theft or misuse of academic records. |
| D2 | **User credentials** (username, password hash, auth token) | **Restricted** | Authentication service only; never exposed to UI | Strong hashing (bcrypt/argon2), salting, rate‑limited login, MFA optional | Direct path to system compromise. |
| D3 | **Schedule / load assignments** (courses, times, rooms, sections) | **Confidential** | Faculty, schedulers, admins | Integrity checks via DB foreign keys; versioning of schedule changes | Incorrect schedules disrupt teaching operations. |
| D4 | **Program & course catalog** (program names, subjects, units) | **Internal** | All logged‑in users (faculty, staff) | Read‑only for most users; changes logged and approved | Valuable but not personally identifying. |
| D5 | **Analytics counts** (total faculty, active/inactive counts, employment breakdown) | **Internal** | All authenticated users (dashboard view) | Prevent tampering by generating on‑the‑fly from DB | Used for reporting; inaccurate figures damage decision‑making. |
| D6 | **System logs & audit trails** | **Confidential** | Admins, security auditors | Append‑only storage, hash chaining, restricted read access | Required for incident investigation; must not be altered. |
| D7 | **Static UI assets (icons, CSS, JS libraries)** | **Public** | Everyone (including unauthenticated visitors) | Served over HTTPS; integrity SRI tags where possible | Publicly visible; low impact if altered but could be used for phishing. |
| D8 | **Backup files** | **Restricted** | Backup admin, disaster‑recovery team | Encrypted at rest; access controls; regular integrity verification | Contain all other data; must be protected equivalently. |

---

## 3️⃣ Security Requirements & Acceptance Criteria

| # | Requirement Type | Requirement | Acceptance / Test Criteria |
|---|------------------|------------|----------------------------|
| S1 | **Functional – Authentication** | Users must authenticate with a username and password before accessing any protected UI or API. | *Test:* Attempt to access `/dashboard.html` without a valid session – should be redirected to login. Successful login creates a signed JWT / session cookie. |
| S2 | **Functional – Authorization** | Role‑based access control (RBAC) must enforce that only users with the *admin* or *academic‑aide* role can view or edit faculty analytics. | *Test:* Log in as a regular faculty user and verify “Faculty” cards are not clickable / API returns 403. |
| S3 | **Functional – Password Security** | Passwords must be stored using a strong adaptive hash (bcrypt with cost ≥12 or Argon2). | *Test:* Inspect the `faculty` table – password column contains hashes of appropriate length and algorithm identifier. |
| S4 | **Functional – Session Management** | Sessions expire after 30 min of inactivity; a “Logout” button must invalidate the session token. | *Test:* Remain idle >30 min; subsequent request redirects to login. Click “Logout” and verify token removal. |
| S5 | **Functional – Input Validation** | All client‑side inputs (e.g., load creation, faculty edits) must be validated server‑side to prevent injection. | *Test:* Submit malicious SQL in a POST to `/api/faculty`; API returns 400/validation error, DB remains unchanged. |
| S6 | **Functional – Audit Logging** | Every create, update, delete operation on faculty or schedules must be logged with user ID, timestamp, and before/after values. | *Test:* Perform an update; query `audit_log` table; entry exists and matches operation. |
| S7 | **Non‑Functional – Encryption In‑Transit** | All HTTP traffic must be protected with TLS 1.2+ (HTTPS). | *Test:* Access the app via `https://`; tools like `curl -v` show `TLS` handshake; no `http://` endpoints. |
| S8 | **Non‑Functional – Encryption At‑Rest** | Sensitive data (password hashes, backups) must be stored encrypted (e.g., MySQL `AES_ENCRYPT`, encrypted backup files). | *Test:* Export a backup; verify it is an encrypted archive. Verify `SELECT AES_DECRYPT(...)` works only with proper key. |
| S9 | **Non‑Functional – Rate Limiting** | Login endpoint must limit attempts to ≤5 per IP per 10 min to mitigate brute‑force. | *Test:* Simulate 6 rapid login failures; 6th request receives 429 Too Many Requests. |
| S10 | **Non‑Functional – Data Integrity Checks** | Database must enforce foreign‑key constraints for schedule → faculty, room, program relationships. | *Test:* Attempt to insert a schedule with a non‑existent `faculty_id`; DB rejects with FK error. |
| S11 | **Non‑Functional – Availability** | The web application must have 99.5 % uptime per month; monitored via health‑check endpoint `/health`. | *Test:* Automated monitoring pings `/health`; alerts fire if response >5 s or status ≠200. |
| S12 | **Non‑Functional – Back‑up & Recovery** | Nightly encrypted backups must be retained for 30 days; restoration tests run quarterly. | *Test:* Verify backup files exist, are encrypted, and a test restore restores a consistent DB snapshot. |
| S13 | **Non‑Functional – Secure Coding** | All third‑party libraries must be kept up‑to‑date; known CVEs must be addressed within 30 days. | *Test:* Run `npm audit` / `composer audit`; no high‑severity findings remain. |
| S14 | **Non‑Functional – Logging & Monitoring** | Security events (failed logins, privilege escalations) must be sent to a SIEM or central log store. | *Test:* Trigger a failed login; confirm entry appears in log aggregation system. |

---

*These tables can be used directly in your Capstone documentation or as a checklist during development and security testing.*
