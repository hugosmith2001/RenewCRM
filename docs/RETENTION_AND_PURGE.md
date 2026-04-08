# Retention and purge (Phase 4)

SafekeepCRM implements **default retention policies** with optional **tenant/controller overrides**, plus an enforceable **scheduled purge** workflow.

This document covers:

- default retention policies (system baseline)
- tenant overrides (bounded)
- soft delete, legal hold, and purge behavior
- object storage deletion behavior and limitations
- backups and restore behavior (explicit limitations)
- what remains operational/infrastructure-dependent

---

## Default retention policies (system baseline)

These defaults apply **even if a tenant never configures anything**.

- **Inactive customers** (`INACTIVE_CUSTOMER`): **7 years**
  - **Anchor date**: most recent of `Customer.updatedAt`, latest `Activity.createdAt`, latest `Document.createdAt`, latest `Policy.updatedAt`
  - **Applies to**: customers marked `INACTIVE` or soft-deleted (`deletedAt` set)
  - **Purge action**: hard delete customer (cascades related rows) after deleting all customer document blobs

- **Documents after policy end** (`DOCUMENT_POST_POLICY_END`): **7 years**
  - **Anchor date**: `Document.deletedAt` (if soft-deleted) otherwise `Policy.endDate` (if linked)
  - **Purge action**: delete blob from storage, then delete document row

- **Audit events** (`AUDIT_EVENT`): **2 years**
  - **Anchor date**: `AuditEvent.createdAt`
  - **Purge action**: bulk delete old audit rows (IDs-only metadata is enforced separately)

### Application logs (not app-enforced)

Application/runtime logs (stdout/stderr, platform logs, reverse proxy logs) must be managed by **infrastructure retention**. The application:

- redacts sensitive keys in structured logs (`src/lib/logger.ts`)
- does **not** control log sink retention (that is a platform concern)

Recommended operational default:

- **application logs**: **14–30 days** retention (short, justified, documented)

---

## Tenant overrides (minimal, real)

Tenants/controllers can override retention durations (in days) within bounded ranges. Overrides are stored in `RetentionPolicyOverride`.

- If an override exists: the purge logic uses it (clamped/bounded)
- If no override exists: the **system default** applies

API:

- `GET /api/retention` – list effective policies + bounds
- `POST /api/retention` – set/update an override

---

## Purge model

### Soft delete

SafekeepCRM uses soft delete markers on:

- `Customer.deletedAt`
- `Document.deletedAt`

User-initiated deletes set `deletedAt` and remove the record from standard list/get flows. **Hard deletion** happens later, via purge.

### Legal hold

Purge is blocked when:

- `Customer.legalHold = true`, or
- `Customer.restrictedAt` is set (restriction of processing)

Documents are blocked when:

- `Document.legalHold = true`

### Scheduled purge job

Nightly purge entrypoint:

- `npm run purge:nightly`
- implementation: `src/jobs/purge-nightly.ts`

The job:

- processes tenants independently
- deletes document blobs before hard-deleting rows
- logs **IDs, counts, timestamps, categories** only
- surfaces partial failures via exit code \(non-zero when failures occur\)

---

## Object storage deletion behavior

Document purge attempts:

1. `storageDelete(storageKey)` (no raw keys are logged; only a hash is emitted on failure)
2. then `DELETE FROM Document ...`

Customer purge:

- deletes **all document blobs** for the customer first
- only then hard-deletes the customer (DB cascade removes related rows)

### Consistency limitation

True DB+storage atomicity is not possible with the current stack. The system prefers:

- **never deleting the DB row if storage deletion fails**, to avoid “lost file but still referenced” vs “orphaned blob” ambiguity
- explicit failure logging for operational follow-up

---

## Backups and deletion (explicit limitation)

**Backups may temporarily retain deleted data until backup retention expires.**

Requirements:

- backup retention must be **short and justified** (business continuity vs privacy risk)
- restores must not silently reintroduce previously deleted DSAR subjects into production

Recommended restore posture:

- restore into an **isolated environment** (not production)
- run **purge reconciliation** (execute retention purge and DSAR reconciliation) before any production import
- if production restore is unavoidable, require an explicit “privacy reconciliation” step before reopening access

---

## Operational limitations (infra/provider-dependent)

The application cannot enforce:

- platform log retention duration
- database snapshot retention at the provider level
- object storage versioning retention (if enabled)
- provider-level replication caches

You must configure these in your infrastructure and document them as part of your GDPR evidence trail.

