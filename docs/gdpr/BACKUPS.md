# Backups and restores – policy draft (operator-facing)

## Who this is for

This policy is for **operators/admins**. It’s not meant to be customer-facing.

If you need an end-user summary, link to the in-app **Privacy notice**: `Settings → Privacy notice (app users)`.

## Plain-language summary

- Backups are important for business continuity, but they can temporarily retain deleted data until backups expire.
- Operators must set a **short, justified backup retention** and document encryption, access controls, and restore testing.
- Restores should avoid silently re-introducing previously deleted data; do restores in isolation and run purge reconciliation.

---

This policy is **repo-grounded** and must be finalized by the operator based on the actual hosting providers used for:

- Postgres backups/snapshots
- document storage backups/versioning
- application logs

Repo grounding for deletion/retention expectations: `docs/RETENTION_AND_PURGE.md`, `src/modules/retention/service.ts`.

## Goals

- meet business continuity needs
- minimize privacy risk by limiting retention
- ensure deletions and DSAR outcomes are not silently reversed by restores

## Backup sources (implied by repo)

- **Database**: Postgres (Prisma) – backups are infrastructure-managed
- **Documents**:
  - current: local filesystem storage under `STORAGE_PATH`
  - future: S3-compatible storage (reserved but not implemented)

Repo grounding: `prisma/schema.prisma`, `src/lib/storage.ts`, `docs/STORAGE_SECURITY.md`.

## Retention guidance (operator must decide)

- keep backup retention **short and justified**
- document:
  - duration
  - encryption at rest
  - access controls
  - restore test cadence

## Restore posture (privacy-aware)

Preferred:

- restore into an **isolated environment**
- run retention purge reconciliation after restore before any re-import into production datasets

If production restore is unavoidable:

- record an incident/change ticket
- execute a “privacy reconciliation” step before reopening access:
  - run purge job
  - check for recently purged customers/documents that may have reappeared

## Explicit limitation

Backups can retain previously deleted personal data **until backup retention expires**. This limitation should be reflected in DSAR/erasure operational guidance.

