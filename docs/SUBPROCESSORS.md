# Subprocessors (SafekeepCRM)

This document is intended for the **SafekeepCRM operator** (service provider). It is a repository-grounded starting point for subprocessor transparency and should be completed with your actual deployment choices.

## How to use this file

- **Confirmed in repo** means the capability exists in the codebase (e.g. Postgres via Prisma), but the exact vendor may still depend on where you deploy.
- **Operator must fill** means the repository does not specify the vendor; you must complete it for your environment.

## Confirmed categories implied by the repository

### Application hosting / runtime

- **Category**: hosting / application runtime (Next.js)
- **Repo grounding**: Next.js app (`next` dependency), server-rendered pages and API routes under `src/app/`
- **Operator must fill**:
  - hosting vendor (e.g. your own servers, managed platform)
  - region(s) and data residency

### Database

- **Category**: database hosting (PostgreSQL)
- **Repo grounding**:
  - Prisma datasource `provider = "postgresql"` in `prisma/schema.prisma`
  - `DATABASE_URL` required in `src/lib/config.ts`
- **Operator must fill**:
  - Postgres vendor (self-hosted vs managed)
  - region(s), backups/snapshots, and encryption-at-rest configuration

### Object/document storage

- **Category**: document storage (local filesystem today; S3-compatible reserved)
- **Repo grounding**:
  - Local filesystem storage implementation in `src/lib/storage.ts`
  - Storage config in `src/lib/config.ts` (supports `STORAGE_DRIVER=local`; `s3` is reserved but not implemented and will fail fast)
  - Storage security guidance in `docs/STORAGE_SECURITY.md`
- **Operator must fill**:
  - whether production uses local filesystem storage (explicitly allowed via `STORAGE_ALLOW_LOCAL_IN_PROD=true`) or a future object storage implementation
  - if local-in-prod is used: volume encryption, filesystem permissions, backup retention, and deletion semantics

### Authentication/session cookie provider

- **Category**: authentication/session management (software component)
- **Repo grounding**: Auth.js / NextAuth (`next-auth` dependency, `src/auth.ts`, `src/auth.config.ts`, `src/middleware.ts`)
- **Note**: this is a software library, not an external subprocessor by itself. The operator’s hosting platform and any identity providers (not present here) may be subprocessors.

## Not currently present (do not list as subprocessors unless you add them)

The current repository does **not** include code-grounded integrations for:

- analytics / tracking scripts (e.g. GA, Segment, PostHog)
- third-party error monitoring (e.g. Sentry)
- customer support chat widgets
- outbound email delivery vendors (no mail provider integration is present in `src/`)

If you add any of the above, update this document and your customer-facing disclosures.

## Update policy (recommended)

- Update this file when:
  - you change hosting/DB/storage vendors or regions
  - you add any third-party SaaS that processes production data (logs, analytics, support, email)
- Keep a dated change log below for customer notice purposes.

### Change log

- **TBD**: operator to maintain

