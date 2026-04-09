# DPIA – draft (operator-facing)

## Who this is for

This document is for **operators/admins** completing a DPIA. It is not meant to be customer-facing.

For end users, link to the in-app **Privacy notice**: `Settings → Privacy notice (app users)`.

## Plain-language summary

- A DPIA is a structured way to identify privacy/security risks and document mitigations.
- This draft maps risks to controls that exist in the repo (tenant isolation, auth/session hardening, retention/purge foundations, storage controls) plus operator infrastructure requirements.

---

This is a **repo-grounded draft DPIA** for Renew CRM. It maps risks and mitigations to **controls that exist in this repository**, plus operator/infrastructure requirements.

## 1) Processing overview (system description)

- **Product**: multi-tenant CRM (Next.js) with Auth.js/NextAuth, Prisma/Postgres, and document storage.
- **Core data**: customers/contacts/policies/insured objects, tasks/activities (free-text), documents, audit events.
- **Roles**:
  - tenant customer data: tenant as controller; operator as processor
  - platform accounts/auth/security: operator as controller

Repo grounding: `prisma/schema.prisma`, `docs/AUTH_SECURITY.md`, `docs/STORAGE_SECURITY.md`.

## 2) Necessity and proportionality

The features in this repository require storing:

- identifiers and contact details for CRM workflows
- work-tracking data (tasks/activities)
- documents (potentially sensitive depending on tenant usage)
- security/audit data to protect the system

Data minimization caveats in the repo:

- free-text fields (`Activity.body`, `Task.description`) can contain arbitrary PII and should be treated as high-risk.

Repo grounding: `prisma/schema.prisma` comments and models.

## 3) Risk assessment (high-level)

### Risk A: Cross-tenant data leakage

- **Impact**: unauthorized disclosure across organizations
- **Likelihood**: medium without consistent enforcement; highest risk in APIs and document download paths
- **Mitigations in repo**:
  - pervasive `tenantId` modeling (`prisma/schema.prisma`)
  - authorization helpers used by API routes (`src/modules/auth/session.ts`)
  - tenant-scoped audit listing (`src/modules/audit/service.ts`)
  - tests exist across API routes (see `docs/TEST_COVERAGE_PHASE*.md`)

### Risk B: Unauthorized document access / document URL leakage

- **Impact**: exposure of uploaded files
- **Mitigations in repo**:
  - downloads are mediated through an authenticated server route (no public URLs by default)
  - storage keys are traversal-protected and not logged in raw form (`src/lib/storage.ts`)

### Risk C: Excessive retention / inability to delete

- **Impact**: regulatory non-compliance; increased breach impact
- **Mitigations in repo**:
  - default retention windows + purge engine with tenant overrides
  - legal hold and restriction block destructive purge
  - purge deletes document blobs first, then DB records (prevents orphan DB references)

Repo grounding: `src/modules/retention/service.ts`, `docs/RETENTION_AND_PURGE.md`.

### Risk D: PII in logs and audit metadata

- **Impact**: uncontrolled secondary processing; harder DSAR compliance
- **Mitigations in repo**:
  - audit metadata allowlist blocks arbitrary keys (`src/modules/audit/service.ts`)
  - storage deletion logs hash of key, not path (`src/lib/storage.ts`)

Residual risk:

- application logs may still contain PII depending on logging usage and platform configuration

### Risk E: Authentication compromise / account takeover

- **Impact**: unauthorized access to tenant data
- **Mitigations in repo**:
  - secure cookie settings, JWT sessions, session invalidation on password change
  - brute-force mitigation (best-effort in-memory rate limiting)

Repo grounding: `docs/AUTH_SECURITY.md`, `src/lib/rate-limit.ts`.

## 4) Measures and evidence (what to verify)

Operator should be able to demonstrate:

- configured HTTPS/HSTS at the edge (infra)
- encryption-at-rest for DB (infra) and documents (local encryption enabled or object storage SSE/KMS when implemented)
- retention job execution and logs; purge outcomes (counts + failures)
- access control model and admin-only enforcement for privileged pages/routes

## 5) Gaps (repo reality)

- DSAR export bundles and subject-centric portability are not productized.
- “Restricted processing” behavior is not universally enforced across all CRUD flows unless explicitly checked in each service.
- S3-compatible storage is reserved but not implemented (local storage must be explicitly allowed in production).

