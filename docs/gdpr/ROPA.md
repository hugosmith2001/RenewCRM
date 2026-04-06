## Records of Processing Activities (RoPA) — SafekeepCRM (draft)

This RoPA is a working draft aligned to the current SafekeepCRM codebase (Next.js + NextAuth + Prisma/Postgres + local/S3-style document storage).

### 1) Parties and roles

- **Service provider**: SafekeepCRM (the operator of the SaaS)
- **Tenants**: Brokerages/organizations using the system
- **Data roles**
  - **Processor (primary)**: SafekeepCRM processes *tenant customer data* on tenant instructions (tenant is Controller).
  - **Controller (platform data)**: SafekeepCRM is Controller for platform operational data (user accounts, authentication, security logs/audit).

### 2) System overview

- **Application**: Next.js web app + API routes
- **Auth**: NextAuth sessions/cookies; credentials stored as bcrypt hashes
- **Database**: Postgres via Prisma
- **Documents**: file uploads stored locally or in S3-compatible object storage (implementation-dependent)
- **Audit**: `AuditEvent` table (security/traceability; must avoid embedding personal data in metadata)

### 3) Processing activities (high-level)

#### A. Platform user account management (Controller activity)

- **Purpose**: provide access to SafekeepCRM, manage identities and roles, maintain security
- **Categories of data subjects**: tenant staff users (app users)
- **Categories of personal data**:
  - identifiers: email, name/display name
  - auth/security: password hash, session identifiers, access tokens/cookies (where applicable), login timestamps/IPs if logged
  - authorization: roles, tenant membership
- **Lawful basis (typical)**: contract (service delivery), legitimate interests (security)
- **Recipients**:
  - internal support/admins as required to operate service
  - infrastructure subprocessors (hosting/DB/logging) per `SUBPROCESSORS_AND_DPAS.md`
- **Transfers**: depends on hosting region; document in `SUBPROCESSORS_AND_DPAS.md`
- **Retention**:
  - accounts: for duration of contract + a defined post-termination period
  - security/audit data: per `BACKUPS.md` and any audit log retention policy (minimize by design)
- **Security measures**:
  - TLS in transit
  - least privilege access; secrets management
  - hashed passwords (bcrypt)
  - secure cookies/session defaults; rotation policies as implemented

#### B. Tenant CRM data processing (Processor activity)

- **Purpose**: provide CRM functionality (customers, contacts, policies, tasks/activities, documents)
- **Categories of data subjects**:
  - tenant customers (individuals)
  - contacts at customer organizations
  - potentially other individuals referenced in notes/documents
- **Categories of personal data**:
  - identifiers: name, email, phone, address
  - relationship/business context: assignments/ownership within tenant
  - free-text notes: activity/task notes may contain arbitrary PII and potentially special-category data
  - documents: uploaded files + metadata
- **Lawful basis**: determined by tenant/controller; Safekeep processes under DPA and instructions
- **Recipients**:
  - tenant users (per RBAC/tenant isolation)
  - infrastructure subprocessors (hosting/DB/object storage) per `SUBPROCESSORS_AND_DPAS.md`
- **Transfers**: depends on hosting region; document safeguards in `SUBPROCESSORS_AND_DPAS.md`
- **Retention**:
  - governed by tenant policy and/or system defaults (future Phase 4)
  - backups retention per `BACKUPS.md`
- **Security measures**:
  - tenant isolation by `tenantId` scoping
  - RBAC enforcement
  - document storage access controls (signed URLs / authenticated access pattern, if implemented)
  - audit logging for security actions, with PII-minimized metadata

#### C. Security monitoring and audit logging (Controller activity for platform security)

- **Purpose**: detect abuse, support investigations, provide traceability and administrative oversight
- **Categories of data subjects**: app users; indirectly tenant customers via entity IDs (avoid direct identifiers in audit)
- **Categories of personal data**:
  - user IDs, tenant IDs, action type, entity IDs
  - metadata (strictly non-PII; IDs and enums only)
- **Lawful basis (typical)**: legitimate interests (security), legal obligation where applicable
- **Recipients**: internal admins; hosting/logging providers
- **Retention**: defined security log retention window; keep as short as feasible consistent with security needs
- **Security measures**:
  - role-restricted access to audit views
  - redaction policy for logs and audit metadata

### 4) Special considerations

- **Free-text fields** are high-risk by default. They must not be copied into logs/audit metadata.
- **Documents** are first-class personal data; must have explicit lifecycle and access controls.
- **Backups** may temporarily retain deleted data until backup retention expires; see `BACKUPS.md`.

### 5) What to update when the product changes

Update this RoPA when you add:

- new data categories/fields (especially new identifiers)
- analytics/monitoring tools
- email/SMS providers
- exports/DSAR tooling
- retention and purge automation

