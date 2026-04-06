# DSAR Export (Access & Portability)

This document describes the **productized DSAR export** workflow implemented in Phase 3B for SafekeepCRM.

## Supported subject types

- **Customer** (`CUSTOMER`)
- **Contact** (`CONTACT`)

User exports (`USER`) are **not implemented yet** (see limitations).

## Admin workflow (MVP)

1. Create a DSAR request (`EXPORT`) via admin DSAR tooling.
2. Move the DSAR request to **APPROVED** (identity verification + approval happens in product process).
3. Generate the export (synchronous MVP).
4. Download the structured JSON and optional CSV summaries.

## API endpoints (admin-only)

- **Generate export**
  - `POST /api/admin/dsar/:id/export`
  - Requires DSAR request: `requestType=EXPORT` and `status=APPROVED`

- **Check export status/result**
  - `GET /api/admin/dsar/:id/export`

- **Download export output**
  - JSON: `GET /api/admin/dsar/:id/export/download?format=json`
  - CSV: `GET /api/admin/dsar/:id/export/download?format=csv&file=<filename>`

All endpoints enforce:

- **Role check**: `ADMIN` only
- **Tenant isolation**: export reads/writes are scoped by `tenantId`

## Export output formats

### Canonical JSON (portability)

The canonical export is a **structured JSON** object with stable keys:

- `formatVersion` (currently `1`)
- `exportType` (`DSAR_ACCESS_PORTABILITY`)
- `exportedAt` (ISO timestamp)
- `tenantId`
- `subject` (`{ type, id }`)
- `includedCategories` (explicit categories included)
- `files` (whether any blobs are bundled)
- `data` (shaped export data)

### CSV summaries (human-friendly)

CSV summaries are provided when it’s clearly useful for reviewing:

- Customer export: `customer.csv`, `contacts.csv`, `activities.csv`, `tasks.csv`, `policies.csv`, `insured_objects.csv`, `documents.csv`
- Contact export: `contact.csv`

CSV is intentionally “summary style” rather than a full relational dump.

## Export scope (grounded in current Prisma model)

### Customer export includes

From `Customer`:

- **Customer profile**: name, type, email, phone, address, status, ownerBrokerId, created/updated timestamps
- **Linked contacts**: `CustomerContact[]`
- **Activities**: `Activity[]` (includes free-text `body` if present)
- **Tasks**: `Task[]` (includes free-text `description` if present)
- **Policies**: `Policy[]` with `insurer` and linked insured objects (via `PolicyInsuredObject`) and policy-linked document metadata
- **Insured objects**: `InsuredObject[]`
- **Document metadata**: `Document[]` (name, type, mimeType, sizeBytes, createdAt, policyId)

### Contact export includes

From `CustomerContact`:

- **Contact profile**: name, email, phone, title, isPrimary, created/updated timestamps
- **Linked customer reference**: customer `id` and `name`

Contact exports **do not include** customer activities/tasks/documents/policies because the current data model does **not** link those entities directly to a specific contact, so attribution would be unsafe.

## Privacy / safety decisions

- **Audit metadata**: only IDs/enums are logged (no names/emails/free text).
- **Free text in exports**: included when it is part of the subject’s data (`Activity.body`, `Task.description`).
- **Audit events**: excluded from exports (these are security/operational logs, not subject data in this product model).

## Known limitations (MVP)

- **No document file bundling**: exports include **document metadata only**. Document blobs are not zipped/embedded yet.
- **Synchronous generation**: export generation runs inline on the request. Large tenants may require a background-job architecture later.
- **User export not implemented**: the app supports `DsarSubjectType.USER`, but exporting “user data” needs careful scoping (auth/security data vs tenant customer data).

