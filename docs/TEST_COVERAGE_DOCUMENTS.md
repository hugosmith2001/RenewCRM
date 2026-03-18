# Phase 6 Documents – Test Coverage

This document describes what the document-module tests cover, what they do **not** cover, and notable edge cases.

---

## 1. What the tests cover

### 1.1 Service layer (`src/modules/documents/service.test.ts`)

| Function | Covered behavior |
|----------|------------------|
| **listDocumentsByCustomerId** | Returns `[]` when customer not found (tenant-scoped lookup). Returns documents with correct `where` and `orderBy` when customer exists. |
| **listDocumentsByPolicyId** | Returns `[]` when policy not found. Returns documents filtered by `policyId` and `tenantId` when policy exists. |
| **getDocumentById** | Returns document when found (with `include: policy`). Returns `null` when not found. Tenant isolation via `where: { id, tenantId }`. |
| **createDocument** | Returns `null` when customer not found; when `policyId` is set, returns `null` if policy not found or policy belongs to another customer. On success: creates DB record with placeholder `storageKey`, calls `buildStorageKey` and `storagePut`, updates record with final `storageKey`, returns document. Correct `policyId` (including `null`) and metadata passed to `create`. |
| **getDocumentStream** | Delegates to `storageGetStream` with the given key. |
| **deleteDocument** | Returns `false` when document not found (no DB or storage calls). When found: calls `storageDelete` with document’s `storageKey`, then deletes DB record; returns `true`. |

All service tests use **mocked** Prisma, storage, and customer/policy modules. No real DB or filesystem.

### 1.2 Validation (`src/lib/validations/documents.test.ts`)

| Schema | Covered behavior |
|--------|------------------|
| **documentTypeEnum** | Accepts all allowed types (`POLICY_DOCUMENT`, `CONTRACT`, `ID_DOCUMENT`, `CORRESPONDENCE`, `OTHER`). Rejects invalid type. |
| **createDocumentMetadataSchema** | Minimal input (name only) with default `documentType: "OTHER"`. Full input with `policyId`. All document types. Rejects empty or missing name, name longer than 255 chars. Accepts name length 255. Rejects invalid `documentType`. Rejects `policyId: ""` (min length 1). Accepts name with spaces (trimming is done in service). |

### 1.3 API routes

**GET/POST `/api/customers/[id]/documents`** (`route.test.ts`)

- **GET:** 401 when unauthenticated; 404 when customer not found; 200 with documents array (or empty array); `assertTenantAccess` and `listDocumentsByCustomerId(tenantId, customerId)` called as expected.
- **POST:** 401/403 (upload requires ADMIN or BROKER); 404 when customer not found; 400 when no file, file too large (>20 MB), or disallowed MIME type; 400 when metadata validation fails (e.g. invalid `documentType`); 400 when `createDocument` returns null; 201 with created document and correct args to `createDocument` when upload succeeds. FormData built with `File` and fields (name, documentType, optional policyId).

**GET/DELETE `/api/customers/[id]/documents/[documentId]`** (`[documentId]/route.test.ts`)

- **GET:** 401 when unauthenticated; 404 when document not found; 400 when document’s `customerId` ≠ URL `id`; 200 with document body when authorized and customer matches.
- **DELETE:** 401 when unauthenticated; 403 for STAFF (delete requires ADMIN or BROKER); 404 when document not found; 400 when document belongs to another customer; 204 and `deleteDocument(tenantId, documentId)` when authorized.

**GET `/api/customers/[id]/documents/[documentId]/download`** (`download/route.test.ts`)

- 401 when unauthenticated; 404 when document not found; 400 when document belongs to another customer; 200 with body stream and headers (`Content-Type`, `Content-Disposition`, `Content-Length`) when authorized; 404 when `getDocumentStream` throws `"File not found"`.

All route tests mock auth, customer, and document services. No real HTTP, DB, or storage.

---

## 2. What the tests do **not** cover

- **Real storage** – No tests write or read from the filesystem or S3. Storage is mocked; `storagePut` / `storageDelete` / `storageGetStream` behavior and error paths (e.g. disk full, permission errors) are not exercised.
- **Real database** – No integration tests against PostgreSQL. Constraint violations, cascades, and transaction behavior are not tested.
- **End-to-end upload** – No test performs a full request → FormData → `createDocument` → storage → DB in one flow with real dependencies.
- **Storage module (`src/lib/storage.ts`)** – No unit tests for `storagePut`, `storageGet`, `storageGetStream`, `storageDelete`, `buildStorageKey`, or `ensureDirForKey`. These are thin wrappers around `fs`; testing them would require a temp directory or further mocking.
- **Download stream consumption** – Download route test only checks status, headers, and that `getDocumentStream` was called; it does not read the response body to verify content.
- **UI** – No tests for `DocumentsSection` (form, list, download link, delete). No React Testing Library or E2E tests.
- **Concurrent uploads / race conditions** – No tests for multiple uploads or create-then-update races.
- **Very large or binary files** – File-too-large is tested with a 21 MB payload; actual streaming of large files and binary correctness are not tested.
- **MIME type spoofing** – Allowed types are checked via `file.type`; there is no test that a file with a misleading extension/type is rejected (browser/Node behavior may vary).

---

## 3. Edge cases and caveats

### 3.1 Handled in tests

- **Customer not in tenant** – Service and routes assume `getCustomerById(tenantId, id)` returns null; 404 or empty list as appropriate.
- **Policy not found or wrong customer** – `createDocument` returns null when `policyId` is set but policy is missing or `policy.customerId !== customerId`; API returns 400.
- **Document for another customer** – GET/DELETE/download check `doc.customerId === customerId` and return 400 if not.
- **Missing file in form** – POST checks `file` presence and size; returns 400 with “A file is required” when missing or size 0.
- **File size boundary** – 20 MB limit; test uses 21 MB to assert 400.
- **Metadata validation** – Invalid `documentType` and (in validation tests) empty/long name and empty `policyId` are rejected.
- **Storage missing file** – Download route catches `Error("File not found")` from `getDocumentStream` and returns 404.

### 3.2 Not exercised (known gaps)

- **Empty string `policyId`** – API does `(formData.get("policyId") as string)?.trim() || undefined`, so `""` becomes `undefined` and is not sent to the schema; schema test still checks that `policyId: ""` fails if parsed directly.
- **Name length 255** – Validated in schema test; not sent through the full POST route (would require FormData with that name).
- **Unicode / special characters in name** – Not tested (display, storage key, or `Content-Disposition`).
- **`formData.get("file")` not a File** – Route checks `file instanceof File`; no test with a string or blob in place of file.
- **Stream errors after response start** – If `storageGetStream` succeeds but the stream errors mid-read, the client may see a truncated or failed response; not tested.

### 3.3 Role behavior

- **GET list/document/metadata/download** – Allowed for ADMIN, BROKER, STAFF (`requireRole([ADMIN, BROKER, STAFF])`). Tested via 401 when `requireRole` throws.
- **POST upload** – Allowed only for ADMIN, BROKER. STAFF gets 403. Tested in route test.
- **DELETE** – Allowed only for ADMIN, BROKER. STAFF gets 403. Tested in route test.

---

## 4. Summary

| Area | Files | Tests | Coverage summary |
|------|-------|-------|------------------|
| Service | `service.test.ts` | 14 | List by customer/policy, get, create (success + null cases), stream, delete; all with mocks. |
| Validation | `documents.test.ts` | 13 | documentType enum, create metadata (defaults, boundaries, invalid values). |
| API list/upload | `documents/route.test.ts` | 13 | GET/POST auth, 404, 400 (no file, size, type, validation, createDocument null), 201. |
| API get/delete | `[documentId]/route.test.ts` | 9 | GET/DELETE auth, 404, 400 wrong customer, 200/204 success. |
| API download | `download/route.test.ts` | 5 | GET auth, 404, 400 wrong customer, 200 + headers, 404 on File not found. |

**Total: 54 tests**, all unit tests with mocks. No integration or E2E tests for the documents feature.
