## GDPR/Security adversarial review (implementation assumed complete)

Scope: this review maps the promises in `GDPR_PLAN.md` to concrete enforcement points in the current codebase, and highlights **specific break paths** (tenant isolation, RBAC, DSAR, documents, retention/legal-hold, logging).

Severity scale: **Critical / High / Medium / Low**

---

## Findings

### 1) Restriction-of-processing is only enforced on one endpoint (easy bypass)

- **Severity**: **Critical**
- **Affected area**: DSAR restriction enforcement across customer-scoped data
- **Concrete files/flows**:
  - Restriction check exists only in `src/app/api/customers/[id]/route.ts` via `isBlockedByRestriction(...)`
  - Other customer-scoped endpoints do **not** check `restrictedAt` at all:
    - `src/app/api/customers/[id]/activities/route.ts`
    - `src/app/api/customers/[id]/tasks/route.ts`
    - `src/app/api/customers/[id]/documents/route.ts`
    - `src/app/api/customers/[id]/documents/[documentId]/route.ts`
    - `src/app/api/customers/[id]/documents/[documentId]/download/route.ts`
    - (and similarly contacts/policies/insured objects routes under `src/app/api/customers/[id]/...`)
- **Exact risk**: A “restricted” subject is still fully readable/processable through adjacent endpoints even if `/api/customers/:id` is blocked. This defeats GDPR Art. 18 restriction semantics and creates a false sense of enforcement.
- **Likely exploit/failure scenario**:
  - Admin applies restriction via DSAR (sets `restrictedAt`).
  - A **BROKER/STAFF** user continues to:
    - read historical free-text PII via `/api/customers/:id/activities`
    - download files via `/api/customers/:id/documents/:documentId/download`
    - create new processing artifacts (tasks/activities) against that customer.
- **Recommended fix**:
  - Centralize restriction checks in service-layer helpers (preferred) or a shared route guard.
  - For every customer-scoped route, load the customer (or at minimum `restrictedAt`) and apply `isBlockedByRestriction(user.role, customer)`.
  - Extend the restriction model to documents/contacts/etc. if they can be accessed without loading the customer record.

---

### 2) DSAR erasure/restriction execution does not check legal hold (legal-hold bypass)

- **Severity**: **Critical**
- **Affected area**: DSAR execution (“erase” / “restrict”) vs legal hold
- **Concrete files/flows**:
  - `src/modules/dsar/execute.ts` performs updates/anonymization in:
    - `restrictSubject(...)`
    - `eraseOrAnonymizeSubject(...)`
  - Neither function checks `legalHold` flags before modifying the subject.
  - Retention code treats `legalHold` as a block for purge (`src/modules/retention/service.ts`), but DSAR execution bypasses it entirely.
- **Exact risk**: A subject under legal hold can be anonymized/disabled through DSAR execution, potentially destroying evidence and violating legal retention/hold obligations.
- **Likely exploit/failure scenario**:
  - A tenant Admin (or compromised admin session) initiates a DSAR ERASE on a customer under `legalHold=true`.
  - `eraseOrAnonymizeSubject` nulls identifiers and free-text, and marks restricted—despite the hold.
  - This can irreversibly remove critical data required for disputes/fraud/regulatory compliance.
- **Recommended fix**:
  - Add explicit `legalHold` checks in DSAR execution:
    - For CUSTOMER/CONTACT/USER, load the entity and fail with a deterministic error (e.g. `409 LegalHold`) if `legalHold=true`.
    - Ensure the API routes map this to a clear operator-facing response and require an explicit “override” workflow (ideally impossible without elevated break-glass controls).

---

### 3) DSAR “restriction of processing” is not wired into most processing pathways

- **Severity**: **High**
- **Affected area**: Post-restriction mutation controls (write paths)
- **Concrete files/flows**:
  - DSAR restriction sets `restrictedAt` on subjects (`src/modules/dsar/execute.ts`).
  - Create/update routes for customer-linked entities do not block on restriction:
    - Create activity: `src/app/api/customers/[id]/activities/route.ts` (`POST`)
    - Create task: `src/app/api/customers/[id]/tasks/route.ts` (`POST`)
    - Upload document: `src/app/api/customers/[id]/documents/route.ts` (`POST`)
    - Other customer-linked writes under `src/app/api/customers/[id]/...`
- **Exact risk**: The system continues “processing” after restriction, which is the opposite of the intended GDPR control. Even if reads are later blocked, **writes still create new personal data** and operational artifacts.
- **Likely exploit/failure scenario**:
  - Admin restricts a customer after a DSAR request.
  - Broker continues adding activities and uploading correspondence documents, creating new regulated personal data while the subject is meant to be frozen.
- **Recommended fix**:
  - Enforce restriction checks on **all write endpoints** touching restricted subjects (and ideally most reads for non-admin).
  - Implement a shared guard like `requireNotRestrictedCustomer(user, customerId)` used in every customer-scoped handler/service call.

---

### 4) DSAR exports are stored as full PII blobs in the database, with no retention/purge coverage

- **Severity**: **High**
- **Affected area**: PII minimization, data-at-rest risk, retention
- **Concrete files/flows**:
  - DSAR export generation writes `exportJson` and `exportCsv` (full PII and free-text) to DB:
    - `src/modules/dsar/export.ts` (`prisma.dsarExport.update({ exportJson, exportCsv ... })`)
  - Retention purge does **not** address DSAR export rows:
    - `src/modules/retention/service.ts` only purges `document`, `customer`, and `auditEvent`.
  - DSAR export download endpoint serves the stored blob:
    - `src/app/api/admin/dsar/[id]/export/download/route.ts`
- **Exact risk**: DSAR exports become a long-lived, high-value PII cache (including activity/task free-text) in the primary database and backups, increasing breach impact and making “storage limitation” hard to defend.
- **Likely exploit/failure scenario**:
  - A tenant generates DSAR exports repeatedly.
  - Months later, an attacker with DB read access (SQL injection elsewhere, credential leak, backup access) gets **complete subject dossiers** from `dsarExport` without needing to traverse the relational model.
- **Recommended fix**:
  - Do not store full export payloads indefinitely in DB.
  - Prefer:
    - streaming/on-demand generation, or
    - storing encrypted export artifacts in object storage with **short TTL**, and only storing a pointer + checksum in DB.
  - Add explicit retention for DSAR artifacts (requests/actions/exports) and purge them automatically.

---

### 5) DSAR export is explicitly incomplete for CONTACT, and USER DSAR export is unimplemented

- **Severity**: **High**
- **Affected area**: DSAR completeness (access/portability)
- **Concrete files/flows**:
  - Contact export intentionally excludes large categories:
    - `src/modules/dsar/export.ts` `buildContactExport(...)` adds `exclusions` noting customer-scoped activities/tasks/documents/policies cannot be attributed to a contact.
  - User export is not implemented:
    - `src/modules/dsar/export.ts` throws `UserExportNotImplemented`
    - API surfaces this in `src/app/api/admin/dsar/[id]/export/route.ts` (returns `501`)
- **Exact risk**: The DSAR feature can produce a response that looks “successful” operationally while omitting personal data a subject is entitled to receive (especially where contacts are the real data subjects in B2B customer records, and where users request platform-operational data).
- **Likely exploit/failure scenario**:
  - A data subject is represented primarily as a `CustomerContact`.
  - Admin runs CONTACT export and provides it, unaware that documents/correspondence and activity notes about that contact (embedded in customer-scoped free text) are missing.
  - Result: under-delivery DSAR, regulatory risk, and potential dispute.
- **Recommended fix**:
  - Model subject linkage explicitly (e.g. associate activities/documents/tasks to contacts when applicable, or implement a search-based “subject mention” capture process).
  - Implement USER export for the controller-side platform operational data (account, sessions, audit/security events as appropriate).
  - Add automated DSAR completeness tests that assert inclusion rules by subject type.

---

### 6) Document download is not “restricted-aware” and does not check legal-hold intent

- **Severity**: **High**
- **Affected area**: Unsafe document access/download paths under DSAR restriction/legal-hold semantics
- **Concrete files/flows**:
  - Document download endpoint:
    - `src/app/api/customers/[id]/documents/[documentId]/download/route.ts`
    - Authorizes by role and tenant, but **does not** check:
      - the parent customer’s `restrictedAt` (restriction-of-processing)
      - any restriction/hold semantics for the document itself beyond `deletedAt` filtering in `getDocumentById(...)`
- **Exact risk**: After a DSAR restriction is applied, non-admin roles can still exfiltrate restricted personal data via document downloads. If legal hold is intended to restrict access (often the case operationally), there is no enforcement path here either.
- **Likely exploit/failure scenario**:
  - Admin restricts customer.
  - Broker uses previously visible document IDs (from earlier UI/API responses) and continues downloading files directly.
- **Recommended fix**:
  - For every document operation (list/get/download/upload/delete), enforce restriction by checking the parent customer’s `restrictedAt` (or duplicating restriction state onto documents).
  - Decide and enforce how `legalHold` should affect access (at minimum: it should block purge; optionally: it should restrict non-admin access).

---

### 7) DSAR execution “erasure” is implemented as anonymization without a policy gate (can violate retention expectations)

- **Severity**: **Medium**
- **Affected area**: Erasure vs anonymization decisioning
- **Concrete files/flows**:
  - `src/modules/dsar/execute.ts` `eraseOrAnonymizeSubject(...)` always anonymizes and sets `restrictedAt`, and soft-deletes documents.
  - There is no explicit policy decision point (“delete vs anonymize vs restrict due to statutory retention”), and no linkage to retention category configuration.
- **Exact risk**: Operators can execute “erase” that (a) does not fully erase (keeps records), while (b) also may erase too much when retention is required—because legal hold/retention lawfulness is not evaluated here.
- **Likely exploit/failure scenario**:
  - Tenant expects DSAR ERASE to delete everything (including documents) quickly; system only soft-deletes docs and keeps DB rows with `[ERASED]` placeholders.
  - Or the inverse: tenant has statutory retention and should restrict, but DSAR erasure wipes free-text and identifiers anyway.
- **Recommended fix**:
  - Add a DSAR policy engine / decision step:
    - require operator to select “erase vs anonymize vs restrict” with explicit rationale
    - enforce legal hold and retention rules programmatically before action.

---

### 8) DSAR notes/actions can become an unbounded PII sink (verification details, emails, free-text)

- **Severity**: **Medium**
- **Affected area**: Accidental PII storage in admin workflow metadata
- **Concrete files/flows**:
  - DSAR creation stores `notes` and action `note` fields verbatim:
    - `src/modules/dsar/service.ts` (`notes`, `dsarRequestAction.note`)
    - `src/modules/dsar/execute.ts` records execution notes/reasons
- **Exact risk**: Admin operators may paste identity-verification details, emails, document numbers, or sensitive context into notes. This creates extra PII beyond the primary record, often with weaker access patterns and unclear retention.
- **Likely exploit/failure scenario**:
  - Operator writes “Verified by passport #…” or includes email/phone in DSAR notes.
  - Those values persist indefinitely and may show up in DSAR admin screens and DB backups.
- **Recommended fix**:
  - Add UI/backend validation and guidance for notes (e.g. disallow obvious high-risk patterns, limit length, and provide structured fields for verification method without identifiers).
  - Put DSAR notes under the same retention window as DSAR artifacts and purge them.

---

### 9) Retention purge is best-effort and can fail without strong operational visibility/alerts

- **Severity**: **Medium**
- **Affected area**: Retention/purge logic observability and “silent failure”
- **Concrete files/flows**:
  - Purge execution logs failures and returns counts:
    - `src/modules/retention/service.ts` (`executePurgeForTenant(...)`)
  - Storage deletion may become a partial-failure mode (blob delete fails; DB row retained; repeated attempts depend on scheduling/ops).
  - There is no built-in alerting/escalation mechanism tied to `result.failed` or `failures`.
- **Exact risk**: Retention policy can “look implemented” while silently accumulating failures (especially storage delete failures), leaving personal data retained longer than configured without anyone noticing.
- **Likely exploit/failure scenario**:
  - Storage permissions change, disk becomes read-only, or path issues cause `storageDelete` failures.
  - Purge job continues to run and logs errors, but no on-call/monitor picks it up.
  - Data is retained indefinitely, violating GDPR Art. 5(1)(e).
- **Recommended fix**:
  - Emit structured metrics/events for purge outcomes (failed counts by reason), and alert on non-zero failures.
  - Persist purge runs in a DB table (tenantId, startedAt, result, failures) to provide evidence for auditors.

---

### 10) Production configuration can explicitly weaken document protections (local storage + optional encryption)

- **Severity**: **Medium**
- **Affected area**: Deployment hardening / “secure by default”
- **Concrete files/flows**:
  - `src/lib/config.ts` allows:
    - local storage in production when `STORAGE_ALLOW_LOCAL_IN_PROD=true`
    - unencrypted local storage in production when `STORAGE_LOCAL_UNENCRYPTED_OK_IN_PROD=true`
  - `src/lib/storage.ts` encrypts only if local encryption is enabled; otherwise raw files are stored.
- **Exact risk**: A single environment variable can downgrade the system to storing raw PII documents unencrypted at rest on local disk. This is a realistic misconfiguration risk during incident response, migrations, or “temporary” workarounds.
- **Likely exploit/failure scenario**:
  - Ops enables `STORAGE_ALLOW_LOCAL_IN_PROD=true` to unblock a deploy.
  - They also set (or forget to remove) `STORAGE_LOCAL_UNENCRYPTED_OK_IN_PROD=true`.
  - Documents are now plaintext on disk; compromise of the host or backup snapshots yields full document contents.
- **Recommended fix**:
  - Make unencrypted-local-in-prod a **hard fail** (remove the override) unless you have a formal break-glass process.
  - Prefer S3-compatible storage with SSE-KMS once implemented; until then, require local encryption for production with a strongly managed key.

---

## Top 10 issues to fix before production

1) **Enforce restriction-of-processing across all customer-scoped endpoints** (read/write), not just `GET/PATCH/DELETE /api/customers/:id`.
2) **Block DSAR ERASE/RESTRICT when `legalHold=true`** (and require explicit, auditable override workflow if ever allowed).
3) **Make document download/list/upload/delete restriction-aware** by checking the parent customer’s restriction state (and define legal-hold access semantics).
4) **Stop storing full DSAR export payloads indefinitely in the primary DB**; move to short-lived encrypted artifacts and add DSAR artifact retention/purge.
5) **Fix DSAR completeness gaps**: CONTACT exports are materially incomplete; USER export is unimplemented.
6) **Add a DSAR decision/policy gate** for “erase vs anonymize vs restrict” to align with retention obligations and avoid accidental over/under deletion.
7) **Add operational visibility for retention purge** (persisted runs + alerts on failures) so purge can’t fail silently.
8) **Constrain DSAR notes/actions to avoid becoming a PII sink**, and purge them under a defined retention window.
9) **Revisit “unencrypted local storage in prod” overrides**; make insecure settings impossible without a formal break-glass control.
10) **Audit all customer-scoped routes for consistent enforcement** (tenant scoping is generally present, but restriction and legal-hold semantics are not consistently applied).

