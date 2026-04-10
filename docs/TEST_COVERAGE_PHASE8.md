# Phase 8 (Audit and Hardening) – Test Coverage

This document describes what the Phase 8 tests cover, what they do **not** cover, and notable edge cases.

---

## 1. What the tests cover

### 1.1 `src/lib/api-error.test.ts` – `handleApiError`

- **401**: When `err` is `Error("Unauthorized")`, returns a response with status 401 and body `{ error: "Unauthorized" }`.
- **403**: When `err` is `Error("Forbidden")`, returns 403 and body `{ error: "Forbidden" }`.
- **Re-throw**: When the error message is anything else (e.g. `"Something went wrong"`), the function re-throws so the caller or framework can handle it.
- **Non-Error**: When the value is not an `Error` instance (string, `null`, number), the function re-throws.
- **Undefined**: Passing `undefined` causes a re-throw (edge case for malformed catch blocks).

### 1.2 `src/lib/validations/audit.test.ts` – audit query validation

- **Defaults**: Empty object parses to `page: 1`, `limit: 50`; `entityType`, `entityId`, `action` remain undefined.
- **entityType**: All allowed values (`Customer`, `CustomerContact`, `InsuredObject`, `Insurer`, `Policy`, `Document`, `Activity`, `Task`) are accepted; invalid values (e.g. `"Invalid"`) are rejected.
- **action**: All allowed values (`CREATE`, `UPDATE`, `UPLOAD`, `DELETE`) are accepted; invalid (e.g. `"PATCH"`) rejected.
- **entityId**: Valid CUID accepted; short or non-CUID strings rejected.
- **Pagination**: `page` and `limit` are coerced from strings; `page < 1` rejected; `limit > 100` rejected; `limit === 100` accepted.
- **Full query**: Combination of all optional fields with valid values parses correctly.
- **Enums**: Standalone `auditEntityTypeEnum` and `auditActionEnum` accept/reject the same values as in the schema.

### 1.3 `src/modules/audit/service.test.ts` – audit service

**logAuditEvent**

- Calls `prisma.auditEvent.create` with `tenantId`, `userId`, `action`, `entityType`, `entityId`, and optional `metadata`.
- Passes `metadata` through when provided.
- Does **not** throw when `prisma.auditEvent.create` throws (failures are swallowed and only logged to console).
- Supports all four actions: `CREATE`, `UPDATE`, `UPLOAD`, `DELETE`.

**listAuditEvents**

- Always includes `tenantId` in the Prisma `where` clause (tenant isolation).
- Uses default `page: 1`, `limit: 50` and correct `skip`/`take`.
- Adds `entityType`, `entityId`, and `action` to `where` when provided.
- Applies pagination (`skip`, `take`) from `page` and `limit`.
- Combines multiple filters in a single query.
- Returns `{ events, total }` from the service.

### 1.4 `src/app/api/audit/route.test.ts` – GET /api/audit

- **401**: When `requireAuth` rejects with `"Unauthorized"`, the handler returns 401 and does not call `listAuditEvents`.
- **400**: Invalid query (e.g. `entityType=Invalid`, `limit=101`) returns 400 with `error: "Invalid query"` and `details`; `listAuditEvents` is not called.
- **200**: When the user is authenticated and the query is valid, returns 200 with `events` and `total`; `listAuditEvents` is called with the current user’s `tenantId` and the parsed query.
- **Query forwarding**: Parsed query params (e.g. `entityType`, `action`, `page`, `limit`) are passed through to `listAuditEvents`.
- **Auth**: Any authenticated tenant user may call the route; tests use a mocked `requireAuth` user.

### 1.5 `src/app/api/customers/route.test.ts` – audit wiring (Phase 8)

- After a **successful** POST create customer, `logAuditEvent` is called once with:
  - `tenantId`, `userId` from the auth user
  - `action: "CREATE"`, `entityType: "Customer"`
  - `entityId` = created customer’s `id`
  - `metadata: { name: created customer name }`

This confirms the customers route is wired to audit; other routes (contacts, policies, documents, etc.) follow the same pattern but are not individually tested for audit calls.

---

## 2. What the tests do **not** cover

- **Real database**: All tests use mocks (Prisma, auth, audit). No integration tests against a real DB.
- **Real auth/session**: No real NextAuth session or JWT; `requireAuth` is mocked.
- **Audit logging in other routes**: Only the customers POST route is tested for calling `logAuditEvent`. Contacts, insured objects, insurers, policies, documents, activities, tasks (create/update/delete) are not tested for audit calls.
- **handleApiError in other routes**: No test that e.g. GET /api/customers or GET /api/audit actually uses `handleApiError` in their catch block; we only test `handleApiError` in isolation.
- **logAuditEvent console.error**: When Prisma fails, the service logs to `console.error`; that side effect is not asserted.
- **Audit list response shape**: We do not assert the exact shape of each event (e.g. that `createdAt` is a string in JSON); we only check `events` and `total` and a couple of fields.
- **Concurrent audit writes**: No tests for multiple simultaneous `logAuditEvent` calls or ordering.
- **Validation schema default for missing page/limit in URL**: We test the schema with an empty object; we do not test the route when `page` or `limit` is omitted from the URL (the schema receives `undefined` and applies defaults).

---

## 3. Edge cases and design choices

| Area | Edge case / choice | How it’s handled in tests |
|------|--------------------|----------------------------|
| **handleApiError** | Non-Error (e.g. `throw 404`) | Test verifies re-throw. |
| **handleApiError** | `undefined` in catch | Test verifies re-throw. |
| **logAuditEvent** | Prisma throws | Test verifies no throw; console.error not asserted. |
| **listAuditQuerySchema** | `entityId` empty string | Not explicitly tested; schema uses `.optional()`, so `""` may fail CUID. |
| **GET /api/audit** | Cross-tenant token | Not tested; tenant isolation is enforced in the audit service via `tenantId`. |
| **Pagination** | `page=0` or negative | Schema rejects (tested). |
| **Pagination** | `limit=0` | Schema has `.min(1)`, so rejected (could add an explicit test). |
| **Metadata** | Deeply nested or array | Only plain object metadata is tested; Prisma JSON supports more (not asserted). |
| **Audit ordering** | `orderBy: createdAt desc` | Service test does not assert order; we only check that findMany is called with `orderBy: { createdAt: "desc" }` indirectly via the combined-filters test. |

---

## 4. How to run the Phase 8 tests

```bash
npm test
```

To run only Phase 8–related tests (by path or name):

```bash
npm test -- api-error audit
```

This runs:

- `src/lib/api-error.test.ts`
- `src/lib/validations/audit.test.ts`
- `src/modules/audit/service.test.ts`
- `src/app/api/audit/route.test.ts`
- and the updated `src/app/api/customers/route.test.ts` (including the audit wiring test).

---

## 5. Summary

| File | Purpose |
|------|--------|
| `api-error.test.ts` | Central error handler: 401/403 vs re-throw, and non-Error/undefined. |
| `validations/audit.test.ts` | Audit list query: defaults, entityType/action/entityId, pagination, enums. |
| `modules/audit/service.test.ts` | logAuditEvent (create + no throw on failure); listAuditEvents (tenant + filters + pagination). |
| `app/api/audit/route.test.ts` | GET /api/audit: auth, validation, success, query forwarding. |
| `app/api/customers/route.test.ts` | One extra test: POST create calls logAuditEvent with correct args. |

Together these tests give good coverage of the Phase 8 audit and error-handling behavior in isolation and at the route level, with known gaps (other routes’ audit wiring, real DB, and a few schema edge cases) documented above.
