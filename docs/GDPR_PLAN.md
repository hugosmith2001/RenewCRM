# GDPR plan for Renew CRM (operator-facing)

## Who this is for

This is an **operator/admin** plan for making a deployment defensible: product controls, operational controls, and the evidence trail.

If you need an **end-user summary**, link users to the in-app **Privacy notice**: `Settings → Privacy notice (app users)`.

## Plain-language summary

- Renew CRM is built to support privacy/security controls (tenant isolation, audit logging, retention/purge foundations).
- Some important end-to-end features are **not productized yet** (notably DSAR export/portability bundles and a full DSAR workflow).
- Operator setup matters: you must complete subprocessors, backup retention, incident response, and any cross-border transfer safeguards.
- This plan is repo-grounded: it references what exists in code today and what still needs to be implemented or finalized.

---

This plan is **grounded in the current Renew CRM codebase** (Next.js + Auth.js/NextAuth + Prisma/Postgres + local filesystem document storage with optional encryption). It is designed to:

- avoid reinventing work already implemented,
- surface existing controls in **account-facing Settings**,
- close the remaining GDPR gaps with repo-specific, testable changes.

---

## 1) Executive summary

### Current posture (based on repo audit)

Renew CRM already implements several meaningful GDPR/security primitives:

- **Tenant isolation (data model + query scoping)** using `tenantId` across core models.
- **RBAC (role-gated settings/pages/routes)** and admin-only areas.
- **Audit logging** (`AuditEvent`) with **metadata allowlisting** to reduce PII leakage.
- **Retention + purge foundations**:
  - soft delete markers (`deletedAt`)
  - **legal hold** and **restriction of processing** fields (`legalHold`, `restrictedAt`)
  - nightly purge job + immediate customer purge endpoint that deletes document blobs first
- **Document storage security baseline**:
  - downloads are mediated by authenticated server routes (no public object URLs)
  - local filesystem storage with optional **AES-256-GCM at-rest encryption**
  - production guardrails prevent accidental unencrypted local storage
- **Auth/session hardening**:
  - secure cookie settings, JWT sessions, session invalidation on password change
  - best-effort rate limiting for auth and high-risk endpoints

What remains missing or only partially implemented is mostly **DSAR/portability**, **subject-centric tooling**, and **operational completion** (subprocessors, transfers, backup retention, incident handling).

### Biggest “visibility” issue

The product already contains several GDPR-related docs and Settings pages, but some linked documents were missing and some controls were not clearly explained to end users/admins. This plan prioritizes making the existing controls **visible, accurate, and defensible**.

---

## 2) Current GDPR posture (what’s implemented vs missing)

### Already implemented (code)

- **Tenant isolation primitives**
  - `tenantId` on major models: `Tenant`, `User`, `Customer`, `CustomerContact`, `Policy`, `Document`, `Activity`, `Task`, `AuditEvent`
  - file: `prisma/schema.prisma`

- **Audit logging**
  - model: `AuditEvent` (`prisma/schema.prisma`)
  - service: `src/modules/audit/service.ts` (metadata allowlist + tenant-scoped listing)
  - API: `src/app/api/audit/route.ts`

- **Retention/purge**
  - models: `Customer.deletedAt`, `Document.deletedAt`, `legalHold`, `restrictedAt`
  - purge engine: `src/modules/retention/service.ts`
  - job: `src/jobs/purge-nightly.ts`
  - immediate purge route: `src/app/api/customers/[id]/purge/route.ts`
  - UI entry point: `src/app/dashboard/customers/[id]/PurgeCustomerButton.tsx`

- **Document storage security (local)**
  - storage adapter + traversal protections + key hashing in logs: `src/lib/storage.ts`
  - production guardrails for local-in-prod and encryption: `src/lib/config.ts`
  - document download route: `src/app/api/customers/[id]/documents/[documentId]/download/route.ts`

- **Auth/session security**
  - main auth config: `src/auth.ts`, `src/auth.config.ts`, `src/modules/auth/session.ts`
  - docs: `docs/AUTH_SECURITY.md`, `docs/COOKIE_NOTICE.md`

### Implemented but not consistently surfaced (visibility/polish)

- **Controller vs processor explanation**
  - partially described in Settings pages, but needs clearer separation of:
    - tenant-controlled customer data vs operator-controlled account/security data
  - files: `src/app/dashboard/settings/privacy/page.tsx`, `src/app/dashboard/settings/data-processing/page.tsx`

- **Retention transparency**
  - retention logic and purge behavior exist, but the user-facing Settings experience should clearly summarize:
    - default retention windows
    - legal hold and restriction effects
    - limitations with backups
  - files: `docs/RETENTION_AND_PURGE.md`, `src/modules/retention/service.ts`

### Partially implemented (true-but-incomplete)

- **Restriction of processing (Art. 18)**
  - schema fields exist (`restrictedAt`, `restrictionReason`) and are enforced to block purge
  - broader “restrict processing” behavior across all reads/writes depends on per-route/service enforcement
  - file: `prisma/schema.prisma`, `src/modules/retention/service.ts`

- **Subprocessor transparency**
  - operator-oriented starting docs exist but require operator completion (vendors/regions/transfers)
  - file: `docs/SUBPROCESSORS.md`, `docs/gdpr/SUBPROCESSORS_AND_DPAS.md`

### Missing (not implemented in product)

- **DSAR export / data portability bundles**
  - no end-to-end “export a subject’s data” workflow (JSON/CSV + documents zip/links)
  - no subject-centric admin workflow with verification + audit trail

- **Erasure/anonymization workflows**
  - purge exists (retention-driven and immediate purge for customers), but there is no generalized DSAR “erase/anonymize this subject now” workflow with rules, scope selection, and operator-friendly output.

- **Legal hold/restricted processing UI & governance**
  - schema supports legal hold / restriction, but there is no consistent Settings/admin UX for applying, reviewing, and evidencing these states.

---

## 3) Existing controls already present (evidence list)

### Product/UI

- Privacy notice (app users): `src/app/dashboard/settings/privacy/page.tsx`
- Tenant admin processing overview: `src/app/dashboard/settings/data-processing/page.tsx`
- In-app docs viewer: `src/app/dashboard/settings/docs/[...path]/page.tsx`

### Docs (repo-grounded)

- Cookie notice: `docs/COOKIE_NOTICE.md`
- Auth/session security: `docs/AUTH_SECURITY.md`
- Storage security: `docs/STORAGE_SECURITY.md`
- Retention & purge: `docs/RETENTION_AND_PURGE.md`
- Subprocessors: `docs/SUBPROCESSORS.md`
- Governance drafts: `docs/gdpr/ROPA.md`, `docs/gdpr/DPIA.md`, `docs/gdpr/INCIDENT_RESPONSE.md`, `docs/gdpr/BACKUPS.md`
- Lawful basis overview: `docs/LAWFUL_BASIS.md`

---

## 4) Gaps still to close (repo-specific)

### High priority (product)

- **DSAR export tooling**
  - subject scope: customer, contact person, and (operator-controlled) user account data
  - output: JSON + CSV summaries; documents as time-limited links or a zip (within constraints)
  - strict tenant isolation and role gating

- **DSAR erasure/anonymization tooling**
  - clear decision rules:
    - delete where lawful and safe
    - restrict/hold where retention is required
    - redact free-text where deletion is not possible but identifiers must be removed

### High priority (visibility)

- **Settings/Privacy transparency**
  - explicit controller vs processor separation
  - rights and request paths that match actual product capabilities
  - retention summary and limitations (including backups)

### High priority (ops / non-code)

- Complete vendor-specific entries:
  - subprocessors list (hosting/DB/storage/logging/monitoring)
  - regions and transfer safeguards (SCCs/TIAs if applicable)
  - backup retention settings and restore testing cadence

---

## 5) Priority roadmap

### Phase A — Visibility and truthfulness (1–2 days)

- Update Settings pages to:
  - explain controller vs processor roles clearly
  - link to **existing** repo docs for cookies, retention, auth, storage, subprocessors
  - describe rights and request paths without over-claiming DSAR tooling

### Phase B — DSAR export MVP (3–10 days)

- Add an admin-only “Export data” workflow:
  - export for a specific `Customer` (and related contacts/policies/documents/tasks/activities)
  - output as JSON + CSV (and optionally document download links)
  - generate audit event entries for export operations (IDs only)

### Phase C — DSAR erasure/anonymization MVP (5–15 days)

- Add an admin-only workflow to:
  - purge a customer now (already exists) and expand to contacts/users as needed
  - apply restriction of processing and legal holds with operator-visible evidence

### Phase D — Storage evolution (when needed)

- Implement S3-compatible driver (currently reserved but intentionally fails fast) only when required for production scale/controls.

---

## 6) Product/UI visibility improvements (what to show)

In Settings:

- **Privacy notice (app users)**:
  - data categories processed
  - who to contact (tenant admin for tenant customer data; operator contact path for platform data)
  - cookies summary
  - rights overview mapped to implemented capabilities (edit/rectify, retention purge behavior, restriction/hold semantics)

- **Data processing (tenant admins)**:
  - repo-grounded links to: cookies, subprocessors, lawful basis, retention/purge, auth/security, storage security, governance drafts

---

## 7) Operational / non-code requirements

Operator must maintain:

- `docs/SUBPROCESSORS.md` (vendors/regions change log)
- transfer safeguards (if EU/EEA data leaves region)
- platform log retention settings and evidence
- DB/storage backup retention + restore testing + deletion interaction documentation
- incident response ownership and on-call/escalation

---

## 8) Acceptance criteria (definition of done)

### Transparency

- Settings pages link only to documents that exist under `docs/`.
- Settings wording does not claim DSAR export/erasure functionality unless implemented.
- Users can identify:
  - what data is processed
  - who controls tenant customer data
  - where to request rights actions

### Controls

- Retention purge runs successfully and logs outcomes (counts, categories, failures).
- Audit metadata stays within allowlisted keys (no arbitrary PII in `AuditEvent.metadata`).
- Document deletion semantics remain “delete blob first, then DB row”.

### Ops evidence

- Subprocessor list is completed for the deployment environment.
- Backup retention is set, documented, and restore tests are recorded.

---

## 9) File-by-file references (quick index)

### Settings privacy & compliance UI

- `src/app/dashboard/settings/privacy/page.tsx`
- `src/app/dashboard/settings/data-processing/page.tsx`
- `src/app/dashboard/settings/docs/[...path]/page.tsx`

### Auth/session

- `src/auth.ts`
- `src/auth.config.ts`
- `src/modules/auth/session.ts`
- `docs/AUTH_SECURITY.md`
- `docs/COOKIE_NOTICE.md`

### Storage/documents

- `src/lib/storage.ts`
- `src/lib/config.ts`
- `docs/STORAGE_SECURITY.md`
- `src/app/api/customers/[id]/documents/[documentId]/download/route.ts`

### Audit logging

- `src/modules/audit/service.ts`
- `src/app/api/audit/route.ts`
- `prisma/migrations/20250314200000_phase8_audit/migration.sql`

### Retention and purge

- `src/modules/retention/service.ts`
- `src/jobs/purge-nightly.ts`
- `docs/RETENTION_AND_PURGE.md`
- `prisma/migrations/20260406160000_phase4_retention_purge_foundation/migration.sql`

### Operator-facing governance docs

- `docs/SUBPROCESSORS.md`
- `docs/gdpr/ROPA.md`
- `docs/gdpr/DPIA.md`
- `docs/gdpr/INCIDENT_RESPONSE.md`
- `docs/gdpr/BACKUPS.md`
- `docs/gdpr/SUBPROCESSORS_AND_DPAS.md`

