# GDPR/Security Verification Plan (SafekeepCRM)

This plan verifies the GDPR/security work **already implemented** in SafekeepCRM (Next.js + Auth.js/NextAuth v5 + Prisma/Postgres + local document storage with optional encryption). It is grounded in the current repository’s routes, modules, and docs (not aspirational future features).

## Scope and principles

- **Primary goals**: prevent cross-tenant data leakage, harden auth/session behavior, ensure PII-safe logging/audit, secure document access/storage, validate DSAR workflows, and enforce retention/purge.
- **Evidence standard**: tests must fail when a GDPR/security regression is introduced (e.g., removing `tenantId` scoping, logging PII, bypassing restriction/holds).
- **Test type guidance**
  - **Unit tests**: pure functions, validation, metadata sanitizers, permission gates, error mapping.
  - **Integration tests**: API routes with a real database and (ideally) real storage in a temp directory; verify tenant scoping and lifecycle behaviors end-to-end within the service boundary.
  - **End-to-end/manual tests**: browser + deployed env assertions (cookies, HTTPS/HSTS, runtime behavior, log sinks, scheduled jobs, backups).

---

## 1) Tenant isolation

### What should be tested

- **All data access paths are tenant-scoped**
  - Service queries use `where: { tenantId, ... }` and exclude soft-deleted data (`deletedAt: null`) where expected (e.g., `Customer`, `Document`).
  - Representative modules: `src/modules/customers/service.ts`, `src/modules/documents/service.ts`, `src/modules/audit/service.ts`, `src/modules/dsar/*`, `src/modules/retention/service.ts`.
- **API routes never accept “tenantId” from the client**
  - Tenant context must come from session (`requireRole`/`requireAuth` in `src/modules/auth/session.ts`) and be applied server-side.
- **Explicit tenant checks for resources fetched without tenant in query**
  - When a route/service fetches a record and then checks tenant, verify `assertTenantAccess(user, resourceTenantId)` is always reached and enforced.
  - Example pattern exists in `src/app/api/customers/[id]/route.ts`.
- **Cross-tenant ID guessing is denied**
  - If an authenticated user supplies a valid ID from another tenant, the system must respond with 403/404 (preferably 404 for existence-hiding when feasible; the code currently uses a mix).

### Why it matters

Tenant isolation failures are typically the **highest-severity** SaaS security issue: it is a direct confidentiality breach and often a reportable incident under GDPR.

### Test type

- **Unit test**:
  - Assert that services include `tenantId` in Prisma `where` clauses for “get by id” and “list” methods (via Prisma mock expectations).
  - Verify `assertTenantAccess` behavior (`src/modules/auth/session.ts`).
- **Integration test**:
  - Seed two tenants with overlapping entity IDs in different tables; validate API routes never return cross-tenant rows.
- **E2E/manual test**:
  - Use two real accounts in two tenants; attempt to access objects by copying URLs/IDs across tenants in the UI and API.

### Important edge cases

- **Soft-deleted data**: ensure `deletedAt` items are excluded from normal reads/lists (e.g., `Customer.getCustomerById` uses `deletedAt: null`).
- **Nested includes**: ensure includes don’t accidentally pull cross-tenant relations (Prisma relations here are tenant-bound by foreign keys, but still verify).
- **Admin tooling**: DSAR and retention endpoints are admin-only and tenant-scoped; verify they cannot be used to act on other tenants.

### Failure conditions (GDPR/security problem)

- Any API response includes an entity whose `tenantId` differs from the caller’s session tenant.
- Any route accepts a `tenantId` from the client and uses it for authorization/scoping.
- Any DSAR/retention/audit query is not tenant-scoped (especially because these can bulk-access sensitive data).

---

## 2) Auth/session hardening

Repository grounding:
- Auth.js/NextAuth v5 credentials auth in `src/auth.ts`, edge-safe config in `src/auth.config.ts`, middleware gate in `src/middleware.ts`.
- Session invalidation via `User.sessionVersion` and JWT callback refresh/invalidation in `src/auth.ts`.
- Cookie settings: HttpOnly, SameSite=Lax, Secure in prod (`src/auth.config.ts`), and trustHost safeguards (`trustHost`).
- Rate limiting: best-effort in-memory limiter (`src/lib/rate-limit.ts`) applied in middleware and password route; documented limitation in `docs/AUTH_SECURITY.md`.

### What should be tested

- **Credential validation and account activation**
  - In `src/auth.ts` authorize: invalid schema → null; wrong password → null; inactive user (`isActive=false`) → null.
- **Session claims are set and refreshed**
  - `session.user.id`, `.tenantId`, `.role` are present after login (via `session` callback in `src/auth.config.ts` and JWT callback in `src/auth.ts`).
  - On subsequent requests, JWT callback loads DB user and refreshes `tenantId/role/sessionVersion` (prevents stale privileges).
- **Session invalidation on password change**
  - `POST /api/me/password` increments `sessionVersion` and clears cookies best-effort (`src/app/api/me/password/route.ts`).
  - JWT callback rejects tokens when `dbUser.sessionVersion !== token.sessionVersion` (returns `{}`).
- **Authorization gates are enforced in APIs**
  - `requireRole([...])` throws for disallowed roles (`src/modules/auth/session.ts`).
  - Admin-only endpoints: `/api/admin/dsar/**`, `/api/admin/retention`.
  - Audit visibility: `/api/audit` limited to ADMIN/BROKER (`src/app/api/audit/route.ts`).
- **Rate limiting is applied to sensitive endpoints**
  - `/api/auth/*` POST is limited by IP in middleware (`src/middleware.ts`).
  - `/api/me/password` has edge rate limit + server-side rate limit keyed by `userId+ip` (`src/app/api/me/password/route.ts`).

### Why it matters

Session handling mistakes can enable account takeover, privilege escalation, or persistent access after credential changes—high risk under GDPR’s security obligations (Art. 32) and breach reporting.

### Test type

- **Unit test**
  - `requireRole` and `assertTenantAccess` throw on forbidden.
  - `handleApiError` maps `Unauthorized`/`Forbidden` to 401/403 (`src/lib/api-error.ts`).
  - JWT callback behavior for session invalidation and role refresh (mock Prisma user lookup in `src/auth.ts`).
- **Integration test**
  - Login → access a protected API → change password → confirm protected API access fails until re-auth.
  - Confirm role change in DB takes effect in subsequent requests without re-login.
- **E2E/manual test**
  - In a deployed environment, inspect cookies:
    - `authjs.session-token` is **HttpOnly** and **Secure** (prod), **SameSite=Lax**, `path=/`.
  - Validate redirect behavior for protected pages via middleware.

### Important edge cases

- **Multi-region/multi-instance**: rate limit is per instance; verify expected behavior and document residual risk.
- **Trust host configuration**: in production, `trustHost` depends on `VERCEL` or `AUTH_TRUST_HOST=true`; verify the deployment sets this correctly.
- **Session lifetime**: `maxAge=30 days`, `updateAge=24 hours`; verify that long-lived sessions meet your threat model.

### Failure conditions (GDPR/security problem)

- Password change does not invalidate prior sessions (old token continues to work).
- User deactivation (`isActive=false`) does not terminate access.
- A STAFF user can access admin-only endpoints or audit log.
- Cookie flags are missing in production (e.g., not Secure/HttpOnly).

---

## 3) Logging and audit PII safety

Repository grounding:
- App logging: `src/lib/logger.ts` does structured JSON logs with deep redaction by key patterns (e.g., `email`, `phone`, `token`, `authorization`, `cookie`, `body`, `name`, `notes`, etc.) and hides stack traces in production.
- Audit trail: `src/modules/audit/service.ts` enforces an **allowlist** of metadata keys and strips values to scalar primitives; drops everything else. Audit events stored in `AuditEvent.metadata` (Prisma).

### What should be tested

- **Logger redaction**
  - Any context keys matching sensitive patterns are replaced with `"[REDACTED]"`, including nested structures and arrays.
  - Error objects are logged without stack traces in production mode.
  - Circular references do not crash logging (`"[Circular]"`).
- **Audit metadata allowlist**
  - Only approved keys (IDs/enums/flags) are stored (e.g., `customerId`, `documentType`, `status`, `requestType`).
  - Keys like `email`, `name`, `body`, `notes` do **not** persist in `AuditEvent.metadata`.
- **Audit retrieval is tenant-scoped and role-gated**
  - `/api/audit` uses `requireRole([ADMIN,BROKER])` and `listAuditEvents(tenantId, ...)`.

### Why it matters

Logs and audit trails commonly become “shadow databases” of personal data. Accidentally logging free text, documents, or identifiers can expand breach impact and violate data minimization.

### Test type

- **Unit test**
  - `logger` redaction behavior in `src/lib/logger.ts` (include nested keys, arrays, circular objects, Error).
  - `sanitizeAuditMetadata` behavior in `src/modules/audit/service.ts` via `logAuditEvent` (ensure PII keys are dropped).
  - Validation schemas under `src/lib/validations/audit.ts` (query parsing).
- **Integration test**
  - Trigger representative API actions (create/update/upload/delete) and assert corresponding `AuditEvent.metadata` contains only IDs/enums (no names/emails/free-text).
- **E2E/manual test**
  - Inspect production log sink configuration (where stdout/stderr is shipped). Ensure retention/permissions are appropriate and consistent with `docs/RETENTION_AND_PURGE.md` (ops-controlled).

### Important edge cases

- **PII disguised under unexpected keys**: allowlist is the main protection for audit metadata; ensure callers aren’t passing PII under “allowed” keys.
- **Error messages**: `handleApiError` logs unhandled errors; ensure thrown errors don’t include sensitive payloads (e.g., raw request bodies).

### Failure conditions (GDPR/security problem)

- Any audit event metadata contains personal data (emails, names, addresses, free-text bodies).
- Any application log line contains secrets/tokens/session cookies or document storage paths.
- Audit log is visible to STAFF or cross-tenant.

---

## 4) Storage/document access security

Repository grounding:
- Storage abstraction: `src/lib/storage.ts`
  - Prevents path traversal (`..`, absolute paths, prefix checks).
  - Local encryption optional: AES-256-GCM with a derived key, prefix `SKENC1:`; required/acknowledged for local-in-prod per `src/lib/config.ts`.
  - Logs storage key hashes (not raw paths) on delete failures.
- Document CRUD service: `src/modules/documents/service.ts`
  - Tenant-scoped reads.
  - Upload writes bytes to storage and updates `storageKey`.
  - Deletes are **soft deletes** (`deletedAt`) and blob removal happens via retention purge (Phase 4).
- Download route: `/api/customers/[id]/documents/[documentId]/download` (tested in `route.test.ts`).
- Storage guidance: `docs/STORAGE_SECURITY.md`.

### What should be tested

- **Authorization and tenant isolation on document routes**
  - Listing and viewing metadata allowed for ADMIN/BROKER/STAFF.
  - Upload/delete restricted to ADMIN/BROKER.
  - Download checks: authenticated + tenant match + document belongs to the URL customer ID (prevents mismatched-customer download).
- **No direct/public object URLs**
  - Confirm documents are served via authenticated server route, not direct paths.
- **Storage key safety**
  - `buildStorageKey` sanitizes filename.
  - `localPath` rejects traversal/absolute keys and enforces storage-root prefix.
- **Encryption-at-rest (local) behavior**
  - With `STORAGE_LOCAL_ENCRYPTION_ENABLED=true`, uploads are encrypted and downloads decrypt correctly.
  - With encryption enabled, `storageGetStream` buffers then decrypts (given 20MB constraint).
- **Deletion and purge coupling**
  - User delete sets `deletedAt` (soft delete).
  - Purge job deletes blob first then DB row (and logs IDs-only), with explicit failure accounting.

### Why it matters

Documents often contain the most sensitive data. Document leakage is high-impact; storage key/path issues can lead to arbitrary file reads/writes.

### Test type

- **Unit test**
  - `localPath` traversal rejection and prefix enforcement (`src/lib/storage.ts`).
  - `buildStorageKey` sanitization and length limits.
  - `storageDelete` failure logging does not include raw keys.
- **Integration test**
  - Use a temp storage directory + real `storagePut/storageGet/storageGetStream` to verify encryption and streaming.
  - Full route test (no mocks) for upload→list→download→delete→purge→download denied.
- **E2E/manual test**
  - Verify production config refuses unsafe local storage unless explicitly allowed (`src/lib/config.ts`).
  - Verify filesystem permissions / container volume mounting are appropriate for `STORAGE_PATH`.

### Important edge cases

- **Customer/document mismatch**: route must reject when `document.customerId !== params.id` (already unit-tested in download route tests).
- **MIME sniffing**: current checks use `file.type`; confirm threat model and whether server-side sniffing is required (residual risk if not).
- **Partial failures**: purge may delete blob but fail DB delete (or vice versa); verify how ops detect and recover.

### Failure conditions (GDPR/security problem)

- A user can download a document from another tenant or another customer by ID guessing.
- Path traversal allows reading/writing outside `STORAGE_ROOT`.
- Production runs with local storage unencrypted without explicit acknowledgement (violates intended policy gates).

---

## 5) DSAR workflows (access/export, restriction, erasure/anonymization)

Repository grounding:
- Models: `DsarRequest`, `DsarRequestAction`, `DsarExport` in `prisma/schema.prisma`.
- Admin API:
  - `POST/GET /api/admin/dsar` (`src/app/api/admin/dsar/route.ts`)
  - `GET/PATCH /api/admin/dsar/:id` (`src/app/api/admin/dsar/[id]/route.ts`)
  - `POST/GET /api/admin/dsar/:id/export` and download (`src/app/api/admin/dsar/[id]/export/*`)
  - `POST /api/admin/dsar/:id/restrict` and `/erase` (`src/app/api/admin/dsar/[id]/*`)
- DSAR services:
  - Lifecycle + allowed transitions: `src/modules/dsar/service.ts`
  - Execution: `src/modules/dsar/execute.ts`
  - Export: `src/modules/dsar/export.ts`
- UI exists under `src/app/dashboard/settings/admin/dsar/**`.

### What should be tested

- **Role gating**: only ADMIN can access DSAR APIs and UI routes.
- **Tenant scoping**:
  - DSAR requests are created and queried with `tenantId=operator.tenantId`.
  - Subject existence checks are tenant-scoped (customer/contact/user).
- **Workflow status machine**
  - Allowed transitions only (`ALLOWED_STATUS_TRANSITIONS`).
  - Invalid transitions return 409 (`InvalidStatusTransition` mapped in route).
- **Export correctness and minimization**
  - Export is only allowed when requestType=EXPORT and status=APPROVED.
  - Export payload includes expected categories for CUSTOMER and limited scope for CONTACT (with documented exclusions).
  - Export **does not** bundle files (currently throws `ExportFilesNotSupported`) and clearly states this in JSON (`files.included=false`).
  - USER export is not implemented (`UserExportNotImplemented`) and must be handled as a known limitation.
- **Restriction execution**
  - Sets `restrictedAt/restrictedByUserId/restrictionReason` on subject, tenant-scoped.
  - Verify restricted entities become inaccessible for non-admin (enforced via `isBlockedByRestriction` checks in routes).
- **Erasure/anonymization execution**
  - CUSTOMER: soft-delete documents (via `deleteDocument`), redact activity/task free-text, anonymize identifiers (`[ERASED]`), and restrict.
  - CONTACT: anonymize contact identifiers and restrict.
  - USER: set `email` to `erased+<id>@example.invalid`, disable account, restrict, and increment `sessionVersion` to invalidate sessions.
- **Audit alignment (IDs-only)**
  - DSAR create/status changes/executions write audit events with IDs/enums only (as intended in `logAuditEvent` metadata allowlist).

### Why it matters

DSAR is core GDPR functionality. The main verification risks are: exporting the wrong tenant’s data, incomplete exports, unsafe deletes, and leaving restricted/erased subjects accessible.

### Test type

- **Unit test**
  - Status transition matrix: success paths + invalid transitions.
  - Export builder outputs stable keys and correct categories; ensure it never queries without tenant scoping.
  - Execution functions change only tenant-scoped rows and handle not-found correctly.
- **Integration test**
  - End-to-end DSAR (DB-backed): create request → approve → export → download JSON/CSV; create restrict/erase request → approve → execute → verify subject becomes restricted and identifiers removed.
  - Verify that DSAR actions do not accidentally store PII in `DsarRequest.notes` / `DsarRequestAction.note` (process discipline plus optional validation).
- **E2E/manual test**
  - UI flow with an ADMIN user: create DSAR, transition statuses, trigger export, download artifacts; run erase/restrict and observe app behavior.

### Important edge cases

- **Subject not found**: returns 404; verify no side effects (no DSAR request created/executed).
- **Restricted subject access**: verify non-admin routes consistently return 423 (Locked) where implemented (example: `src/app/api/customers/[id]/route.ts`).
- **Files in export**: currently not supported; verify operators understand how to fulfill portability with per-document download endpoints.

### Failure conditions (GDPR/security problem)

- DSAR exports include data from another tenant.
- DSAR erasure does not remove identifiers/free-text as expected, or leaves subject accessible to non-admin users.
- DSAR admin endpoints can be called by non-admin roles.
- DSAR audit trail stores personal data in metadata fields.

---

## 6) Retention/purge enforcement

Repository grounding:
- Defaults and bounds: `src/modules/retention/defaults.ts` (7 years inactive customer, 7 years post-policy-end documents, 2 years audit events; bounded overrides).
- Overrides: `src/modules/retention/overrides.ts` + `/api/admin/retention` (`src/app/api/admin/retention/route.ts`).
- Purge engine: `src/modules/retention/service.ts`
- Scheduled job entrypoint: `src/jobs/purge-nightly.ts` (IDs-only logs; per-tenant loop).
- Docs: `docs/RETENTION_AND_PURGE.md` (ops expectations).

### What should be tested

- **Effective policy calculation**
  - System defaults apply when no override exists.
  - Overrides are bounded and clamped for reads; out-of-bounds writes rejected.
- **Candidate selection**
  - Customers eligible when soft-deleted or status=INACTIVE; anchor based on latest activity/doc/policy/customer updates.
  - Documents eligible when soft-deleted or policy ended; anchor is `deletedAt` or `policy.endDate`.
  - Audit events eligible by cutoff date.
- **Hold and restriction semantics**
  - `legalHold=true` blocks purge for customers/documents.
  - `restrictedAt` blocks customer purge (treated as hold) and is surfaced as “blocked”.
- **Execution order and safety**
  - Purge deletes documents first (blob then DB) before deleting customers to avoid stranded blobs.
  - Customer purge deletes all document blobs first, then hard-deletes customer (cascade).
  - Explicit failure accounting and IDs-only logging.

### Why it matters

GDPR storage limitation (Art. 5(1)(e)) requires retention to be enforceable, not aspirational. Purge also ensures DSAR and user-initiated deletions complete at the storage layer.

### Test type

- **Unit test**
  - Override bounds and effective-policy output (`src/modules/retention/overrides.test.ts` already covers key behaviors).
  - Purge engine behavior (document purge, legal hold blocking, storage failure blocking) (`src/modules/retention/service.test.ts` exists).
- **Integration test**
  - With a real DB + temp storage directory:
    - Create a document, delete it (soft), advance clock, run purge, verify blob is gone and DB row deleted.
    - Create a customer with documents, mark INACTIVE, ensure purge deletes blobs then customer.
    - Set `legalHold=true` and verify purge does not delete.
  - Verify audit event purge respects tenant scoping and cutoff.
- **E2E/manual test**
  - Verify scheduler/cron actually runs `npm run purge:nightly` in production and failures alert.
  - Verify operational log retention and backup retention meet policy and are documented.

### Important edge cases

- **Time math**: ensure daylight savings / timezone boundaries don’t impact date anchors (most anchors are DateTime; policy end dates are `@db.Date`).
- **Partial purge**: storage delete succeeds but DB delete fails (or vice versa) — verify remediation steps exist.
- **Multi-tenant blast radius**: purge iterates all tenants; ensure it can’t accidentally act across tenants (it passes `tenantId` into every query).

### Failure conditions (GDPR/security problem)

- Soft-deleted documents remain downloadable (blob not purged and access controls do not block).
- Purge deletes data under legal hold or restriction-of-processing.
- Purge job logs include PII (names, emails, filenames, storage keys).
- Overrides allow “infinite retention” or out-of-bounds values.

---

## 7) Transparency/privacy pages and docs

Repository grounding:
- In-app pages:
  - App user privacy notice: `src/app/dashboard/settings/privacy/page.tsx`
  - Admin data processing overview: `src/app/dashboard/settings/data-processing/page.tsx` (ADMIN-only, redirects non-admins)
- Repo docs referenced by UI: `docs/LAWFUL_BASIS.md`, `docs/COOKIE_NOTICE.md`, `docs/SUBPROCESSORS.md`, `docs/STORAGE_SECURITY.md`, `docs/gdpr/ROPA.md`.

### What should be tested

- **Access control and correctness**
  - `/dashboard/settings/data-processing` is visible only to ADMIN; others are redirected to `/dashboard/settings/privacy`.
  - The content remains consistent with implemented behaviors:
    - Cookies: essential auth cookie only (no analytics) consistent with `docs/COOKIE_NOTICE.md`.
    - Storage: documents served via server route, no public URLs; consistent with `docs/STORAGE_SECURITY.md`.
    - Audit: “IDs and timestamps” consistent with metadata allowlist.
- **Documentation completeness (operator obligations)**
  - Ensure the referenced docs exist and are coherent with current code:
    - lawful basis mapping, subprocessors list, storage security, retention/purge, DSAR runbook/test plan.

### Why it matters

Transparency is required under GDPR (fairness and transparency). Mismatches between product behavior and disclosures create compliance risk even if the technical controls are solid.

### Test type

- **Unit test**
  - Page tests already exist for settings pages (see `src/app/dashboard/settings/*/*.test.tsx`); extend/verify key access-control behaviors.
- **Integration test**
  - Ensure authenticated/non-authenticated navigation works as expected under middleware.
- **E2E/manual test**
  - Review pages in a deployed environment and validate links to docs/processes used operationally.

### Important edge cases

- **Non-admin UX**: ensure non-admins don’t see admin-only transparency details that could leak operational info (current behavior redirects).
- **Docs drift**: verify docs are updated when endpoints or behaviors change (set a release checklist item).

### Failure conditions (GDPR/security problem)

- Privacy/cookie notices claim controls that do not exist (or omit controls that do exist and materially affect users).
- Admin-only transparency pages are accessible to non-admins.

---

## Suggested execution order (highest-risk first)

1. **Tenant isolation integration tests** across core entities and routes (customers, documents/download, audit, DSAR, retention).
2. **Document access security**: download authorization + storage-key traversal protection + soft-delete behavior + purge effect on blob deletion.
3. **Auth/session hardening**: password change invalidates sessions; deactivated users blocked; role refresh; cookie flags in production.
4. **Logging/audit PII safety**: audit metadata allowlist + logger redaction; verify no PII leaks in representative flows.
5. **DSAR workflows**: status machine, export generation/download, restrict/erase execution, and post-DSAR access behavior.
6. **Retention/purge enforcement**: defaults/overrides, holds/restriction blocking, purge job operational readiness.
7. **Transparency pages/docs**: verify access control and truthfulness against current code and deployment.

---

## Biggest residual risks (not fully verifiable in-app)

- **Infrastructure encryption at rest and backups**: DB/storage encryption, snapshot policies, and backup retention are operational controls; the app can only gate “local-in-prod” and optionally encrypt local files. Verification requires infra evidence and audits.
- **Distributed rate limiting / WAF**: the implemented limiter is per runtime instance (best-effort). In a scaled deployment it may not reliably stop brute-force or high-volume download abuse without a shared store or gateway controls.
- **End-to-end coverage with real dependencies**: many existing tests mock Prisma/storage (e.g., document route tests). Without DB-backed and real-storage integration tests, regressions in migrations, constraints, file permissions, and stream behavior can slip through.
- **Log sink retention/access**: app redacts, but the storage/retention and access controls of whatever collects stdout/stderr are outside the codebase.
- **DSAR portability for document files**: DSAR export explicitly does not bundle files (`ExportFilesNotSupported`). Operationally, portability may require assembling file bundles outside the current DSAR export feature set.
- **User DSAR exports**: `UserExportNotImplemented` in DSAR export; controller obligations for platform user data require a separate export approach or additional implementation.
- **Legal hold correctness**: `legalHold` flags exist and are enforced by purge, but ensuring holds are applied appropriately is a process/control issue not fully testable by code alone.

