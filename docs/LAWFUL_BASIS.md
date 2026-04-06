# Lawful basis notes (SafekeepCRM)

This document is a **repository-grounded** mapping of major processing activities to likely GDPR lawful basis categories. It is **not legal advice** and should be reviewed by counsel for your actual deployment and customer contracts.

Key constraint: SafekeepCRM is multi-tenant. For most CRM data, the **tenant organization** determines the lawful basis as the **controller**; the SafekeepCRM operator typically processes that data as a **processor** under contract/DPA and documented instructions.

## Activity 1: Provide authentication and account access (platform operational)

- **Activity**: User authentication, sessions, and access control
- **Data categories**:
  - user identifiers (email, optional name)
  - credentials (password hash)
  - authorization (role, tenant membership)
  - session/security data (session token/JWT claims)
- **System areas**:
  - `src/auth.ts`, `src/auth.config.ts`, `src/middleware.ts`
  - Prisma `User`, `Tenant`, `Role` (`prisma/schema.prisma`)
- **Likely lawful basis**: **Contract**
- **Notes/TODO**:
  - confirm contractual framing and privacy notice for platform users (operator responsibility)
  - confirm retention period for inactive accounts

## Activity 2: Tenant CRM data processing (customers/contacts/policies/tasks/activities)

- **Activity**: Store and present tenant CRM records
- **Data categories** (from Prisma models):
  - customer/contact identifiers and contact details (`Customer`, `CustomerContact`)
  - policy and insured-object records (`Policy`, `Insurer`, `InsuredObject`)
  - tasks/activities with optional free-text (`Task.description`, `Activity.body`)
- **System areas**:
  - API routes under `src/app/api/customers/**`
  - service modules under `src/modules/**`
  - Prisma models: `Customer`, `CustomerContact`, `Policy`, `InsuredObject`, `Activity`, `Task`
- **Likely lawful basis**: **Controller-dependent (tenant decides)**
  - tenant/controller may rely on **contract**, **legitimate interests**, **legal obligation**, or (more rarely) **consent** depending on their customer relationship and jurisdiction
- **Notes/TODO**:
  - operator should ensure DPA terms cover processing instructions and security measures
  - tenants should provide their own privacy notice to their customers/contacts

## Activity 3: Document upload, storage, and download

- **Activity**: Store document files and serve them back to authorized tenant users
- **Data categories**:
  - document bytes (may contain sensitive information depending on tenant usage)
  - document metadata (name, MIME type, size, storage key)
- **System areas**:
  - Prisma `Document` model
  - storage implementation: `src/lib/storage.ts` and `src/lib/config.ts`
  - API routes under `src/app/api/customers/[id]/documents/**`
- **Likely lawful basis**: **Controller-dependent (tenant decides)** for document content
- **Additional operator basis** (platform operations): **Contract** (service delivery)
- **Notes/TODO**:
  - confirm production storage choice and encryption-at-rest controls (`docs/STORAGE_SECURITY.md`)
  - confirm retention and purge rules for documents (Phase 4 foundation exists)

## Activity 4: Security logging and audit trail

- **Activity**: Record security/traceability events for actions on tenant resources
- **Data categories**:
  - user IDs, tenant IDs, action types, entity types/IDs, timestamps
  - optional metadata JSON (intended to avoid embedding personal data)
- **System areas**:
  - Prisma `AuditEvent` model
  - API route `src/app/api/audit/route.ts` and audit module (`src/modules/audit/**`)
  - log redaction: `src/lib/logger.ts`
- **Likely lawful basis**: **Legitimate interests**
- **Notes/TODO**:
  - confirm retention window for audit events (see retention foundations in Phase 4)
  - ensure audit metadata remains non-PII (IDs/enums rather than names/free-text)

## Activity 5: DSAR workflow and exports (processor assistance + platform operations)

- **Activity**: Track DSAR requests and (where configured) generate structured exports
- **Data categories**:
  - DSAR workflow records (request type/status, operator IDs, timestamps)
  - export payloads for subjects (JSON/CSV) where enabled
- **System areas**:
  - Prisma: `DsarRequest`, `DsarRequestAction`, `DsarExport`
  - DSAR admin UI under `src/app/dashboard/settings/admin/dsar/**`
  - DSAR modules under `src/modules/dsar/**`
- **Likely lawful basis**:
  - **Legal obligation** or **legitimate interests** for fulfilling/access management obligations (depends on operator role and jurisdiction)
  - **Controller-dependent** when acting as processor assisting a tenant/controller with their DSAR response
- **Notes/TODO**:
  - confirm operator vs tenant responsibilities in DPA/terms
  - ensure DSAR notes avoid personal data (repo already documents this intent in schema)

## Activity 6: Retention enforcement and purge jobs (platform operations)

- **Activity**: Enforce retention periods and purge eligible data (including document blobs)
- **Data categories**: any data scheduled for purge, plus job logs
- **System areas**:
  - retention overrides: `RetentionPolicyOverride` model
  - purge runner: `src/jobs/purge-nightly.ts` and `src/modules/retention/**`
- **Likely lawful basis**:
  - **Contract** (service delivery + data lifecycle obligations)
  - **Legal obligation** where retention is required by law/regulation (operator and/or tenant dependent)
- **Notes/TODO**:
  - confirm default retention periods and tenant override policy
  - confirm backup retention semantics (deleted data may persist in backups until expiry)

## Non-essential cookies / analytics (not present)

- **Current repo status**: no analytics/tracking code was found in `src/`, and no analytics dependencies are listed in `package.json`.
- **Likely lawful basis if added**: usually **Consent** (varies by jurisdiction and implementation).

