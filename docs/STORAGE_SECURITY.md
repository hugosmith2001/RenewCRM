## Who this is for

This document is for **operators/admins and implementers** configuring storage securely.

If you need a user-facing summary, link to the in-app **Privacy notice**: `Settings → Privacy notice (app users)`.

## Plain-language summary

- Documents you upload are stored securely and are **not publicly accessible by default**.
- Access is mediated by the app after sign-in (no default “public link” behavior).
- Production storage choices matter: use **encrypted-at-rest storage** and keep backup retention short and justified.

---

## Current storage model

Renew CRM stores document **metadata** in Postgres via Prisma (`Document` rows) and stores document **bytes** in a storage backend referenced by `Document.storageKey`.

- **Access model**: documents are downloaded via a server route (`/api/customers/:id/documents/:documentId/download`) that performs authentication + tenant isolation checks and **streams bytes back** to the client.
- **No public URLs**: the application does not expose direct/public object URLs by default.

### Local filesystem storage (current implementation)

The current implementation uses local filesystem storage rooted at `STORAGE_PATH` (default: `./storage` relative to the app working directory). Objects are stored under a per-tenant/per-document key: `tenantId/documentId/<sanitizedFilename>`.

Local storage is **development-friendly**, but it is not recommended for production unless you fully understand and accept the operational and security implications.

## Production requirements (recommended)

### Storage and encryption

- **Prefer encrypted-at-rest object storage** (S3 or S3-compatible) with server-side encryption enabled (SSE-S3 / SSE-KMS).
- **No public buckets**: do not configure storage for anonymous/public read.
- **Least privilege**: storage credentials should be scoped to:
  - a single bucket (or account/project)
  - a prefix dedicated to this application (and ideally per environment)
  - only the required operations (put/get/delete/list as needed)

### Access pattern

- **Signed URLs or server-authorized streaming only**.
- If you use signed URLs in the future, ensure URL generation is server-side and authorized after tenant isolation checks.

### Deletion and retention

- Ensure backups/snapshots align with retention requirements (GDPR deletion requests, legal hold, etc.).
- Deletion is currently “best-effort” across storage and database; infrastructure should provide observability and alerting for failures.

## Local filesystem notes (development + explicit override)

In production, Renew CRM refuses to start with local filesystem storage unless explicitly allowed:

- Set `STORAGE_ALLOW_LOCAL_IN_PROD=true` to acknowledge the risk.
- For production-local storage, **encryption is required** unless explicitly acknowledged:
  - `STORAGE_LOCAL_ENCRYPTION_ENABLED=true`
  - `STORAGE_LOCAL_ENCRYPTION_KEY=<32+ chars secret>`
  - (or as a last resort) `STORAGE_LOCAL_UNENCRYPTED_OK_IN_PROD=true`

Local filesystem storage risks include:

- node host compromise exposes all files
- filesystem snapshots/backups may retain deleted data
- access controls depend on OS-level permissions and deployment discipline

## Known limitations

- **S3-compatible storage is not implemented yet** in this codebase; configuration keys are reserved but will fail fast if selected.
- **Encryption guarantees depend on infrastructure** (disk encryption, object storage SSE/KMS configuration, backup retention).
- File deletion is not fully atomic across DB + storage; partial failure is handled explicitly and logged but can still leave the system inconsistent until repaired.

