# DSAR Test Plan (Operator + Engineering)

This test plan covers DSAR functionality end-to-end: UX, API guards, tenant isolation, and operational safety.

## Pre-test setup

- Create two tenants: `TenantA`, `TenantB`
- In each tenant create:
  - at least 1 admin and 1 non-admin user
  - at least 1 customer with contacts, activities (with free-text), tasks (with free-text), policies, documents
- Ensure document storage is configured (local or S3-compatible) and downloads work.

## UX smoke tests (admin)

- **List view**
  - Navigate to **Settings → Admin → DSAR**
  - Confirm list loads and shows request type, subject type/ref, and status
- **Detail view**
  - Open a DSAR request
  - Confirm subject reference is visible and status badge is correct
  - Confirm history entries appear after each action

## Role enforcement tests

- **Non-admin cannot access**
  - As `BROKER` or `STAFF`, attempt to load:
    - `/dashboard/settings/admin/dsar`
    - `/api/admin/dsar`
  - Expect: blocked/redirected in UI, `403` (or auth error) on API
- **Admin can access**
  - As `ADMIN`, confirm UI and API endpoints succeed

## Tenant isolation tests

- **Cross-tenant request visibility**
  - In `TenantA`, create DSAR request for a `TenantA` subject
  - In `TenantB`, confirm it is not listed and cannot be fetched by ID
- **Cross-tenant subject execution blocked**
  - Attempt to execute `restrict/erase/export` for a DSAR request ID from another tenant session
  - Expect: not found / forbidden (no data leak)

## Workflow transition safety tests

- **Invalid transitions rejected**
  - Attempt `PENDING → COMPLETED` using `PATCH /api/admin/dsar/:id`
  - Expect: `409 Invalid status transition`
- **Cannot export before approval**
  - Create `EXPORT` DSAR request and keep it `PENDING`
  - Call `POST /api/admin/dsar/:id/export`
  - Expect: `409 DSAR request must be APPROVED to export`
- **Cannot execute destructive action twice**
  - Approve an `ERASE` DSAR request and execute it
  - Attempt to execute again
  - Expect: blocked because status is terminal (not `APPROVED`)

## Export correctness tests (EXPORT)

- **Content includes expected categories**
  - Confirm JSON includes `includedCategories` and stable keys (`formatVersion`, `subject`, `data`)
- **Free-text present**
  - Ensure `Activity.body` and `Task.description` appear in export output when present
- **Document metadata present**
  - Confirm document records appear in export JSON/CSV metadata
- **Download endpoints**
  - Download JSON
  - Download at least one CSV file
  - Confirm content disposition is attachment and filenames are safe

## Restriction tests (RESTRICT)

- Create a `RESTRICT` DSAR request, approve, execute.
- Confirm subject has:
  - `restrictedAt` set
  - `restrictedByUserId` set
  - `restrictionReason` set (if provided)
- Confirm restricted entities are blocked for non-admin users in flows that enforce restriction.

## Erasure/anonymization tests (ERASE)

- **Customer**
  - Create an `ERASE` DSAR request for a customer, approve, execute.
  - Confirm:
    - customer name becomes `[ERASED]` and direct identifiers are removed
    - contacts linked to customer are anonymized
    - customer documents are deleted (storage + DB)
    - activities/tasks free-text is redacted
- **Contact**
  - Confirm contact fields are anonymized
- **User**
  - Confirm:
    - `isActive = false`
    - email changed to `erased+<id>@example.invalid`
    - session invalidation occurs (sessionVersion increment)

## Failure mode tests

- **Storage deletion failure**
  - Simulate `storageDelete` failure (e.g. by misconfiguring storage in a test env)
  - Execute `ERASE` for customer with docs
  - Expect: DSAR is marked `FAILED`, and operator can investigate without manual DB edits

## Regression checks

- Confirm audit metadata for DSAR actions remains **IDs/enums only** (no names/emails/free-text).
- Confirm no raw storage keys/paths are exposed in DSAR screens or responses.

