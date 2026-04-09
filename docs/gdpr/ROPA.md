# Records of Processing Activities (RoPA) – draft (operator-facing)

## Who this is for

This document is for **operators/admins** building their RoPA. It is not meant to be customer-facing.

For end users, link to the in-app **Privacy notice**: `Settings → Privacy notice (app users)`.

## Plain-language summary

- A RoPA is an internal record of **what data is processed**, **why**, **where it’s stored**, and **who receives it**.
- This draft is grounded in the repository, but it is not complete until the operator fills in **vendors, regions, and operational practices**.

---

This is a **repo-grounded draft** RoPA for Renew CRM. It is not legally complete until the operator fills in the **actual deployment vendors, regions, and operational practices**.

## 1) Controller/processor split (core assumption)

- **Tenant customer data**: tenant is typically the **controller**; Renew CRM operator is a **processor**.
- **Platform operational data** (accounts/auth/security): Renew CRM operator is typically the **controller**.

Repo grounding:

- Tenant isolation via `tenantId` fields across models in `prisma/schema.prisma`.
- Auth model and session handling in `src/auth.ts`, `src/auth.config.ts`, `src/modules/auth/session.ts`.
- Audit logging in `src/modules/audit/service.ts`.

## 2) Processing activities (by data category)

### A. Accounts & access (operator as controller)

- **Data subjects**: tenant users (staff using the app)
- **Personal data**: email, name (optional), password hash, tenant membership, role, session token data
- **Purpose**: authenticate users; authorize access; administer tenant
- **Lawful basis (typical)**: contract; legitimate interests (security)
- **Storage**: Postgres via Prisma (`User` in `prisma/schema.prisma`)
- **Recipients**: operator’s hosting/DB provider(s)
- **Retention**:
  - account lifetime while active
  - security/audit retention per `docs/RETENTION_AND_PURGE.md`
- **Security measures**:
  - secure cookies; JWT sessions; session version invalidation; rate limiting
  - repo grounding: `docs/AUTH_SECURITY.md`

### B. CRM records (operator as processor)

- **Data subjects**: tenant customers and contacts
- **Personal data**: names, contact details, addresses; policy-related personal data; insured objects; free-text notes
- **Purpose**: provide CRM workflows for the tenant/controller
- **Lawful basis**: determined by tenant/controller; operator relies on DPA + instructions
- **Storage**: Postgres via Prisma (`Customer`, `CustomerContact`, `Policy`, `InsuredObject`, `Activity`, `Task`)
- **Recipients**: operator’s hosting/DB provider(s)
- **Retention**:
  - default retention + purge implemented (see `docs/RETENTION_AND_PURGE.md`)
  - tenant overrides supported
- **Security measures**:
  - tenant isolation (`tenantId` scoping)
  - role enforcement in backend routes
  - audit logging for changes

### C. Documents (operator as processor)

- **Data subjects**: tenant customers/contacts; may include special-category data depending on uploaded content
- **Personal data**: document bytes + filename/metadata + association to customer/policy
- **Purpose**: store and retrieve documents for CRM workflows
- **Lawful basis**: tenant/controller determination; operator as processor
- **Storage**:
  - metadata in Postgres (`Document`)
  - bytes in storage backend referenced by `Document.storageKey`
  - current implementation is local filesystem with optional encryption-at-rest in app (`src/lib/storage.ts`)
- **Retention**:
  - soft delete (`Document.deletedAt`) + purge job deletes blob then DB row
- **Security measures**:
  - downloads via authenticated server route (no public URLs)
  - local encryption option (AES-256-GCM when enabled)
  - repo grounding: `docs/STORAGE_SECURITY.md`, `src/lib/storage.ts`

### D. Security/audit logging (operator as controller)

- **Data subjects**: tenant users (and indirectly, entities they act on)
- **Personal data**: IDs and timestamps; metadata is intentionally restricted to avoid embedding PII
- **Purpose**: security investigations, traceability, operational debugging
- **Lawful basis (typical)**: legitimate interests; legal obligations (where applicable)
- **Storage**: Postgres (`AuditEvent`)
- **Retention**: default 2 years with purge (`docs/RETENTION_AND_PURGE.md`)
- **Security measures**: metadata allowlist in `src/modules/audit/service.ts`

## 3) Subprocessors and transfers

- **Subprocessor list (operator-maintained)**: `docs/SUBPROCESSORS.md`
- **Operator checklist**: `docs/gdpr/SUBPROCESSORS_AND_DPAS.md`

Operator must fill:

- hosting/DB/storage vendor(s)
- regions/data residency
- cross-border transfer safeguards (SCCs/TIAs, if applicable)

## 4) Data subject rights (implementation reality)

What the product supports today (repo-grounded):

- **Access control**: roles and tenant isolation are enforced in backend helpers/routes.
- **Restriction/hold flags** exist in the schema (`restrictedAt`, `legalHold`) and are enforced for purge; broader “restricted processing” behavior is not universal across all read/write flows unless implemented in each service.
- **Deletion/purge**:
  - soft delete markers exist (`deletedAt`)
  - purge job exists and deletes data after retention windows

What is not productized yet:

- end-to-end DSAR export bundles (portable export for a subject)
- structured DSAR workflow (request intake, verification, operator actions, response packaging)

## 5) Operator actions required

- Complete vendor/region/subprocessor entries.
- Validate retention windows match your legal/sector obligations.
- Ensure platform log retention and backup retention are configured and documented.

