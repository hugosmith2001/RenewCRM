# GDPR plan (canonical)

The canonical, maintained GDPR plan for this repository is:

- `docs/GDPR_PLAN.md`

If you’re looking for end-user privacy information inside the app, use:

- `Settings → Privacy notice (app users)` (`src/app/dashboard/settings/privacy/page.tsx`)

This root-level file is retained for history but may be stale.

---

## Quick verdict (current state)

**Strengths already present**

- **Tenant isolation + RBAC**: roles and tenant checks exist in API routes/services.
- **Credential security**: passwords are stored as bcrypt hashes.
- **Some audit logging**: `AuditEvent` exists, and some CRUD operations log events.

**Major gaps to close**

- **Data subject rights (DSAR)**: no reliable *export/portability* and *erasure/anonymization* workflows.
- **Retention / storage limitation**: no retention periods, purge logic, or deletion queues.
- **Document storage security**: default local filesystem storage with no encryption controls defined by the app.
- **PII in logs/audit metadata**: audit metadata and error logs can unintentionally store PII.
- **Operational GDPR requirements**: DPAs, RoPA, breach process, transfer safeguards, backup deletion.

---

## Inventory: what personal data you process (start here)

Create a “data inventory” document for what you store and why. For this repo, at minimum:

- **Users**: email, display name, password hash, role, active flag, tenant membership.
- **Customers**: name, email, phone, address, owner broker assignment.
- **Contacts**: name, email, phone, title.
- **Activities / Tasks**: free-text fields that may contain arbitrary PII (and potentially special-category data).
- **Policies**: policy number, dates, insurer, linked insured objects (can still be personal data when linked to a person).
- **Documents**: files uploaded + metadata + storage keys.
- **Audit events**: actions, user IDs, entity IDs, metadata JSON.

Deliverable:

- `DATA_INVENTORY.md` (or similar) with:
  - **Data category**
  - **Where stored** (table/model)
  - **Purpose**
  - **Lawful basis** (you decide; see below)
  - **Retention**
  - **Who can access** (roles)
  - **Processors/subprocessors**

---

## GDPR Role Model (Controller vs Processor)

Renew CRM acts in **two roles at the same time**, depending on the data category:

- **Renew CRM as Processor (tenant customer data)**: for each tenant (brokerage), Renew CRM processes the tenant’s **Customer/Contact/Policy/Document/Activity** data on the tenant’s behalf. The tenant is the **Controller** for that data.
- **Renew CRM as Controller (platform operational data)**: Renew CRM is the controller for:
  - **user accounts**
  - **authentication**
  - **logs/audit/security data**

Implications (keep these explicit in product + docs):

- **DSAR flows differ** depending on subject type and role:
  - tenant customer data: controller (tenant) requests/approves; Renew CRM provides tooling as processor assistance
  - Renew CRM user/auth/security data: Renew CRM handles as controller
- **Legal basis differs per data category**:
  - tenant customer data: tenant/controller determines lawful basis; Renew CRM relies on DPA + instructions
  - Renew CRM operational data: typically **contract** (service delivery) + **legitimate interests** (security), plus **legal obligations** where applicable
- **Responsibilities differ (tenant vs Renew CRM)**:
  - tenant: privacy notices to their customers, DSAR responses, retention rules/legal holds for their customers
  - Renew CRM: security controls, subprocessor transparency, processor assistance, and controller duties for platform operational data

---

## Decide your GDPR “position” (controller vs processor)

Renew CRM can be:

- **Processor** for your customers (e.g., brokerages) who are the **controllers** of their customers’ personal data; or
- **Controller** if you run the brokerage yourself and the CRM is internal.

This choice affects:

- Contract terms (DPA vs privacy notice)
- DSAR handling responsibilities and response timelines
- Subprocessor transparency

Deliverables:

- **DPA template** (if you’re a processor)
- **Privacy policy** (if you’re a controller for some data—at minimum for your app users)

---

## Data Protection by Design & Default

Make GDPR “the default outcome” in product behavior (not a checklist people can bypass):

- **Minimal data collection**: only collect fields required for core CRM workflows; keep optional fields optional.
- **Role-based access by default**: deny-by-default access to exports, deletion, and documents unless explicitly granted.
- **Avoid unnecessary duplication** of personal data (especially in logs/audit/export metadata).
- **“My data” views reduce exposure**: prefer workflow/UI patterns that show users only the records they own/are assigned, reducing broad tenant-wide browsing.
- **Secure defaults in UI and APIs**:
  - always scope by `tenantId`
  - default responses return only fields needed for the UI
  - never leak data via logs, error messages, or debug endpoints

Acceptance criteria:

- New data fields have a documented purpose + lawful basis + retention in the inventory.
- Default roles cannot export or erase personal data unless explicitly granted.
- APIs enforce tenant scoping and return minimal fields by default.

---

## Prioritized implementation roadmap

### Phase 0 — Governance, paper trail, and deployment prerequisites (1–3 days)

**Goal**: make sure you can legally operate while you build features.

- **RoPA (Records of Processing Activities)**: document purposes, categories, recipients, transfers, retention.
- **Data Processing Agreements**:
  - Hosting provider
  - Managed Postgres provider
  - Object storage provider
  - Email/SMS provider (if/when added)
  - Error tracking/logging provider (if/when added)
- **Data residency and transfers**:
  - Decide where you host (EU/EEA vs US).
  - If data leaves EU/EEA, document safeguards (e.g., SCCs + TIAs).
- **Breach response process**:
  - Detection sources (logs, alerts)
  - Severity criteria
  - 72-hour notification workflow (controller obligation)
  - Internal escalation contacts and templates
- **Backups**:
  - Retention period
  - Encryption
  - Restore testing
  - Deletion semantics (how “erasure” interacts with backups)

**DPIA (Data Protection Impact Assessment)**

Because Renew CRM processes insurance-related personal data, includes document handling, and is multi-tenant, you should complete a DPIA before broad production rollout.

- What it includes:
  - **risk identification** (confidentiality, tenant isolation, unauthorized access, document leakage, excessive retention)
  - **mitigation measures** (encryption, signed URLs, RBAC, tenant isolation testing, retention defaults, audit minimization)

Acceptance criteria:

- You can answer: “Where is data stored?”, “Who can access it?”, “How long is it retained?”, “How do we respond to incidents?”
- A DPIA exists with identified risks and mitigations mapped to product/infra controls.

---

### Phase 1 — Security baseline upgrades (highest risk reduction) (2–7 days)

**Goal**: implement “appropriate technical and organizational measures” (GDPR Art. 32).

1) **Transport security**
- Ensure HTTPS everywhere; add HSTS at the edge.
- Confirm cookies are `Secure`, `HttpOnly`, and `SameSite` appropriately for NextAuth.

2) **At-rest encryption**
- Database: enable provider-managed encryption at rest (or disk encryption).
- Documents:
  - Prefer S3-compatible storage with **server-side encryption** (SSE-KMS if available).
  - If local storage remains, ensure volume encryption and strict filesystem permissions.

3) **Least privilege + secrets management**
- Separate credentials per environment.
- Rotate secrets; avoid long-lived admin creds.
- Ensure object storage keys are scoped to required buckets/prefixes only.

4) **Logging and PII minimization**
- Adopt structured logging with **PII redaction**.
- Define what’s allowed in `AuditEvent.metadata` (whitelist non-PII fields).
- Avoid logging raw errors that may contain PII, tokens, or SQL fragments.

Audit logging purpose:

- `AuditEvent` is for **security** and **traceability**.
- `AuditEvent` is **not** for storing personal data.
- Metadata must avoid PII (store **IDs** instead of names/emails; never store free-text notes/bodies).

5) **Access controls and admin safeguards**
- Add safeguards for ADMIN actions:
  - optional MFA (if feasible)
  - session invalidation on password change
  - rate limiting for login and sensitive endpoints

Acceptance criteria:

- Document storage is encrypted at rest in production.
- Logs/audit do not inadvertently store sensitive PII.
- Auth cookies/sessions follow secure defaults and are verified in production.

---

### Phase 2 — Data minimization + controlled free-text risk (2–5 days)

**Goal**: reduce risk of storing unnecessary data (GDPR Art. 5(1)(c)).

- **UI/UX guidance**:
  - Explicitly warn users not to store special-category data in Activities/Tasks notes unless required.
  - Provide “structured fields” for common needs to avoid free-text.
- **Optional content scanning / classification** (lightweight):
  - Flag likely sensitive entries (IDs, health terms, etc.) for review.
- **Role-based access to notes/documents**:
  - Ensure STAFF access is appropriate for your typical deployments.

#### Free-text risk policy (treat as high-risk by default)

Free-text fields (Activities, Tasks, notes) may contain **sensitive/special-category data**. Treat all free-text as **high-risk by default**.

Rules:

- Never include free-text in logs or audit metadata.
- Include free-text in exports (it is part of the subject’s personal data).
- Handle free-text carefully in erasure/anonymization:
  - delete it when deleting the underlying entity
  - if retention/legal hold requires keeping the record: redact/anonymize free-text and restrict processing

Optional future:

- Add a “sensitive” flag / restricted visibility mode for notes.

Acceptance criteria:

- You have clear user guidance and internal policy for what can be stored in free-text.
- Sensitive text isn’t unnecessarily exposed to roles that don’t need it.
- Free-text never appears in logs/audit metadata; exports include it when fulfilling access/portability.

---

### Phase 3 — DSAR (data subject rights) end-to-end (5–15 days)

**Goal**: implement a repeatable DSAR workflow (access, portability, rectification, erasure, restriction, objection).

You need to support at least:

1) **Right of access (Art. 15)**
- Provide a way to collect and export all personal data about a subject.
- Practical implementation:
  - “Export data” feature for a customer/contact:
    - customer profile + contacts
    - activities + tasks
    - policies + insured objects as applicable
    - document metadata + optionally files (zip)
    - audit events: decide whether to include (often yes, but minimize)

2) **Right to portability (Art. 20)**
- Export in a structured, commonly used format:
  - JSON + CSV summaries
  - Documents in original formats where feasible

3) **Right to rectification (Art. 16)**
- Already largely covered via edit forms; ensure completeness.

4) **Right to erasure (Art. 17)**
- Implement **subject deletion/anonymization** that is safe:
  - Delete documents from storage
  - Delete or anonymize activities/tasks text containing subject data (policy decision)
  - Decide what must be retained for legal obligations (insurance/regulatory) and implement restriction instead of deletion where required.

5) **Restriction of processing (Art. 18)**
- Add a “restricted” state:
  - Prevent further processing except storage + necessary actions.

6) **Objection (Art. 21) / marketing**
- If you ever add marketing/email campaigns, implement opt-out/consent flags. (Not currently in repo.)

**Key design choices to decide**

- **Subject identity model**:
  - A “data subject” may be the **Customer** (private person) or a **Contact person** under a Customer (company).
  - A “data subject” may also be an **app User** (your customers’ staff).
- **Erasure vs anonymization**:
  - For insurance contexts you may need to **retain** some records for legal reasons.
  - Use anonymization/pseudonymization where deletion is not lawful/possible.
- **Audit log handling**:
  - Do you retain audit logs for security? Usually yes, but keep metadata non-PII.
  - Consider storing only IDs and action types, not names/emails.

#### Productized DSAR workflow (admin tooling, not manual DB work)

DSAR must be handled via **admin tooling** (UI + API) with a durable workflow and audit trail—never by manual database edits in production.

Workflow:

1) **Request intake**
2) **Identity verification**
3) **Scope selection (Customer, Contact, User)**
4) **Action (export, erase, restrict)**
5) **System output (export bundle + audit trail)**
6) **Admin confirmation + response**

Operational details (make these implementation requirements):

- **Identity verification** depends on the role model:
  - tenant customer data: verified tenant admin/controller request (processor assistance)
  - Renew CRM user/auth/security data: Renew CRM handles as controller
- **Export format**:
  - JSON (complete, structured)
  - CSV summaries (human-friendly)
  - files (documents) included where feasible as a ZIP (or time-limited download links)
- **Erasure vs anonymization decision rules**:
  - erase (delete) when no lawful retention applies and deletion is safe
  - anonymize/pseudonymize when you must retain the record (insurance/regulatory, disputes, fraud/security), removing direct identifiers and redacting free-text
  - restrict when legal hold applies: freeze processing and limit access
- Every DSAR run produces an **audit trail** (operator ID + timestamps + affected entity IDs) without embedding personal data in metadata.

Acceptance criteria:

- Admin can export a subject’s data and provide it to controller/requestor.
- Admin can execute an erasure/anonymization workflow with clear outcomes and logs.
- There is an internal runbook and a test plan for DSAR flows.
- Export output is predictable (JSON + CSV + files) and generated by product workflows, not manual queries.

### Phase 4 — Retention, deletion, and “right to be forgotten” support (3–10 days)

**Goal**: make retention enforceable (GDPR Art. 5(1)(e)).

Implement:

- **System default retention policies** (baseline compliance; tenants may override):
  - inactive customers: default purge/anonymize after X years inactivity (choose X)
  - documents after policy end: default delete after X years post-policy end (choose X) unless legal hold applies
  - audit logs: default retain Y months/years for security/traceability (choose Y) with strict metadata minimization
  - application logs: short retention by default (days/weeks), with PII redaction
- **Tenant overrides**:
  - tenants/controllers may override defaults (within allowed bounds), but **defaults apply even if tenant never configures anything**
- **Soft delete + purge queues** where appropriate:
  - `deletedAt` (soft delete) + scheduled purge
  - “legal hold” flag to block purge where required
- **Scheduled job runner**:
  - nightly purge job to remove expired data
  - purge documents from object storage
- **Backups alignment**:
  - document how deletions propagate (or do not) to backups
  - set backup retention to a reasonable minimum

Backups + deletion interaction (explicit limitation):

- Backups may retain deleted data temporarily until backup retention expires.
- Requirements:
  - short backup retention consistent with business needs
  - restores must not reintroduce deleted data into production (restore to isolated env and/or run purge reconciliation)
  - document this behavior so DSAR expectations are accurate

Acceptance criteria:

- You can demonstrate configured retention periods and automated enforcement.
- Data and documents are deleted/purged according to policy.
- Restore procedures prevent previously deleted DSAR subjects from silently reappearing in production.

---

### Phase 5 — Transparency, consent, and lawful basis (2–7 days)

**Goal**: ensure “lawfulness, fairness, transparency” (Art. 5(1)(a)) and a defensible legal basis (Art. 6).

For a CRM, typical lawful bases are:

- **Contract** (to provide SaaS to your customers)
- **Legitimate interests** (security logging, fraud prevention)
- **Legal obligation** (accounting/regulatory retention) if applicable
- **Consent** mostly for marketing/optional tracking (avoid for core processing)

Implement:

- **In-app privacy notices**:
  - for app users (your customer’s employees)
  - for your customers (controllers) describing processing as a processor
- **Cookie disclosure** if you add analytics/non-essential cookies
- **Subprocessor list** and update policy

Acceptance criteria:

- Users and customers can access accurate privacy information.
- You can explain and document lawful bases per processing activity.

---

### Phase 6 — Ongoing compliance: monitoring and audits (ongoing)

- **Security monitoring**:
  - alerts for auth anomalies, spikes in downloads, admin changes
- **Periodic access review**:
  - verify roles/users per tenant
- **Pen testing / vulnerability management**
- **Change management**:
  - keep RoPA and privacy docs in sync with product changes

---

## Implementation checklist (what “GDPR-complete” means for this app)

Use this as your “definition of done”:

- **Data inventory**: complete, current, reviewed.
- **Lawful basis**: defined per processing activity.
- **Contracts**: DPAs and subprocessors documented.
- **Security**:
  - TLS + HSTS
  - encryption at rest for DB + docs
  - least privilege credentials
  - secure session/cookie configuration verified
  - audit logs minimized and protected
  - PII redaction in logs
- **DSAR**:
  - access/export implemented
  - portability format supported
  - erasure/anonymization implemented with legal-hold support
  - DSAR runbook + identity verification process
- **Retention**:
  - documented retention schedule
  - automated purge job(s)
  - backup retention documented and aligned
- **Breach readiness**:
  - incident response runbook
  - notification templates and responsibilities
- **Testing & evidence**:
  - test plan for DSAR/retention/security controls
  - audit trail demonstrating actions taken (without leaking PII)
  - tenant isolation tests and evidence

---

## Suggested work order (fastest path to “safe enough”)

1) Phase 0 (governance + hosting/DPAs)  
2) Phase 1 (storage encryption + logging redaction + cookie/session verification)  
3) Phase 3 (DSAR export + erasure/anonymization)  
4) Phase 4 (retention + purge)  
5) Phase 2 and Phase 5 (minimization + transparency)  
6) Phase 6 (ongoing)

---

## Notes specific to this repo (high-impact targets)

- **Documents**: default local disk storage needs a production-grade policy (S3 + SSE-KMS preferred).
- **Free text**: `Activity.body` / `Task.description` should be treated as sensitive by default; avoid including it in audit metadata; consider role restrictions.
- **Audit events**: keep `AuditEvent.metadata` non-PII; store IDs rather than names where possible.
- **Deletion coverage**: ensure deletions also delete documents from storage and handle related rows consistently.

---

## Documents: security + lifecycle model (implementation-ready)

Documents are **primary personal data**, not “just attachments”. Treat document handling as a first-class security and lifecycle surface.

Security:

- **Encrypted at rest** (S3 SSE-KMS or equivalent).
- **Access only via signed URLs** (no public access).
- **Access logging** for downloads (log by IDs; avoid filenames and free-text).

Lifecycle:

- Upload → storage → access → deletion.
- Deletion must:
  - remove from storage
  - confirm success (and retry/alert on failure)

Acceptance criteria:

- Documents are encrypted at rest, never public, and only accessible via signed URLs/authenticated streaming.
- Download access is logged by ID without storing personal data.
- Deletion removes blobs from storage and confirms success; failures are retried and observable.

---

## Tenant isolation testing

Verify and continuously re-verify no cross-tenant data leakage:

- Enforce `tenantId` in all queries/mutations (including exports and background jobs).
- Add automated tests for cross-tenant read/write attempts and assert denial.

Acceptance criteria:

- Automated tests cover cross-tenant access attempts for key entities (customers, contacts, policies, documents, activities, audit events).
- No API route/service returns data for the wrong `tenantId` under any role.

