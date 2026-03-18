# Phase 7 (Activities & Tasks) – Test Coverage

This document describes what the Phase 7 tests cover, what they do not cover, and notable edge cases.

---

## 1. What the tests cover

### 1.1 API route tests (activities)

- **`/api/customers/[id]/activities` (GET, POST)**
  - **Auth:** 401 when `requireRole` throws `Unauthorized`, 403 when it throws `Forbidden`.
  - **Customer:** 404 when customer not found; 200 with activities array (or empty array); `assertTenantAccess` called with customer’s `tenantId`.
  - **POST:** 400 on validation failure (e.g. invalid `type`); 400 when `createActivity` returns `null`; 201 and created activity when valid, with `createActivity` called with `tenantId`, `customerId`, parsed data, and `user.id` as `createdById`.

- **`/api/customers/[id]/activities/[activityId]` (GET, PATCH, DELETE)**
  - **Auth:** 401/403; on 401, `getActivityById` is **not** called (short-circuit).
  - **Resource:** 404 when activity not found; 400 when activity’s `customerId` does not match URL `id`; `assertTenantAccess` called with activity’s `tenantId`.
  - **PATCH:** 400 on validation failure (e.g. invalid `type`); 200 and updated activity when valid, with `updateActivity` called with correct args.
  - **DELETE:** 204 and `deleteActivity` called with `tenantId` and `activityId`.

### 1.2 API route tests (tasks)

- **`/api/customers/[id]/tasks` (GET, POST)**
  - Same auth and customer patterns as activities (401/403, 404, 200 list/empty, `assertTenantAccess`).
  - **POST:** 400 on validation failure (e.g. empty `title`); 400 when `createTask` returns `null`; 201 and created task when valid, with `createTask` called with `tenantId`, `customerId`, and parsed data (no `user.id` – tasks don’t store creator in the same way).

- **`/api/customers/[id]/tasks/[taskId]` (GET, PATCH, DELETE)**
  - Same auth/resource patterns as activities: 401 (and `getTaskById` not called on 401), 404, 400 on wrong customer, 200 GET, 200 PATCH with validation 400, 204 DELETE with `deleteTask` called correctly.

### 1.3 Validation tests (activities)

- **`createActivitySchema`**
  - Accepts all valid types: `CALL`, `MEETING`, `EMAIL`, `NOTE`, `ADVICE`.
  - Optional `subject`/`body`; empty string coerced to `undefined`.
  - Rejects invalid type, missing type, `subject` > 500, `body` > 10000; accepts `subject` length 500.
  - Rejects `null`/`undefined` input.

- **`updateActivitySchema`**
  - Accepts empty object (partial); single/multiple partial fields; rejects invalid type and `subject` > 500.

### 1.4 Validation tests (tasks)

- **`createTaskSchema`**
  - Minimal input (title only); full input with description, dueDate, priority, status, assignedToUserId.
  - Defaults: `priority` MEDIUM, `status` PENDING.
  - All enum values for priority (LOW, MEDIUM, HIGH) and status (PENDING, IN_PROGRESS, DONE, CANCELLED).
  - Empty string coercion for description, dueDate, assignedToUserId (unassigned).
  - Rejects empty/missing title, title > 500, invalid priority/status, invalid CUID for assignee; rejects null/undefined body.
  - **dueDate:** Invalid date string (e.g. `"not-a-date"`) is coerced to `undefined` and accepted, not rejected.

- **`updateTaskSchema`**
  - Empty object; single/multiple partial fields; `dueDate: null` to clear; assignee empty string → undefined.
  - Rejects title > 500, empty title, invalid status.

### 1.5 Service tests (activities)

- **listActivitiesByCustomerId:** Returns `[]` when customer not in tenant; otherwise returns activities with `createdBy`, correct `where`/`orderBy` (createdAt desc).
- **getActivityById:** Returns activity when found for tenant, `null` when not found; correct `where` and `include`.
- **createActivity:** Returns `null` when customer not in tenant; creates with `createdById` when provided, `createdById: null` when not.
- **updateActivity:** Returns `null` when activity not in tenant; updates only provided fields (subject, type, body).
- **deleteActivity:** Returns `false` when activity not in tenant; deletes and returns `true` when found.

### 1.6 Service tests (tasks)

- **listTasksByCustomerId:** Same “customer not in tenant → []” and “customer exists → list with assignee” pattern; correct `orderBy` (status asc, dueDate asc).
- **getTaskById:** Same as activities (found vs null, correct include).
- **createTask:** Returns `null` when customer missing; when assignee provided, returns `null` if assignee user not in tenant, otherwise creates with assignee; creates without assignee when `assignedToUserId` not provided.
- **updateTask:** Returns `null` when task not in tenant; when updating assignee, returns `null` if new assignee not in tenant, otherwise updates; “clear assignee” tested with `assignedToUserId: null` (not empty string, because validation coerces `""` to `undefined` and the route never sends a “clear” to the service with `""`).
- **deleteTask:** Same as activities (false when not found, true and delete when found).

---

## 2. What the tests do not cover

- **Real database:** All DB access is mocked (Prisma). No integration tests against PostgreSQL.
- **Real auth/session:** `requireRole` and `assertTenantAccess` are mocked; no NextAuth, cookies, or JWT.
- **STAFF role on write:** POST/PATCH/DELETE use `requireRole([Role.ADMIN, Role.BROKER])`; we do not assert that STAFF is rejected (only that 401/403 are returned when the mock throws).
- **API response shape in depth:** We check status codes and key fields (e.g. `id`, `type`, `subject`), not every field or exact JSON shape.
- **Concurrent updates / optimistic locking:** No tests for two users updating the same activity/task.
- **UI / E2E:** No tests for ActivitiesSection, TaskForm, etc.; only API and server-side logic.
- **PATCH with no-op:** No test that PATCH with empty body or unchanged data still returns 200 (implementation-dependent).
- **Malformed JSON body:** POST/PATCH with invalid JSON are not explicitly tested (NextRequest may throw or return 500).

---

## 3. Edge cases and caveats

- **401 short-circuit:** For GET one activity/task, when `requireRole` throws Unauthorized, the handler returns 401 **before** calling `getActivityById`/`getTaskById`. The tests assert that the get-by-id function is **not** called in that case.
- **Invalid dueDate string:** The task validation uses a preprocess that turns invalid date strings into `undefined`, so `dueDate: "not-a-date"` is accepted and stored as undefined. The tests document this as “coerces invalid date string to undefined” rather than “rejects invalid date”.
- **Clearing task assignee:** To clear assignee on update, the client must send `assignedToUserId: null`. Sending `""` is coerced to `undefined` by Zod, so the service never receives a “clear” instruction for empty string; the service test for clearing uses `null`.
- **createActivity returns null:** Only happens when customer is missing (tenant/customer check in service). We don’t test “customer exists but create failed” (e.g. DB error) because that’s an implementation/DB detail.
- **createTask returns null:** Can be “customer missing” or “assignee not in tenant”. The API route test only checks the “customer missing” path (mock returns null); the service test covers “assignee not in tenant”.
- **Tenant isolation:** Enforced by passing `tenantId` into services and by mocks; no cross-tenant test (e.g. wrong tenantId in URL or token) because auth is mocked.
- **PATCH updateTask returning null:** If the service returns `null` (e.g. assignee not in tenant on update), the route still returns `NextResponse.json(updated)` which would be `200` with `null` body. This edge case is not explicitly tested.

---

## 4. File list (Phase 7 tests)

| File | Description |
|------|-------------|
| `src/app/api/customers/[id]/activities/route.test.ts` | GET list, POST create activities |
| `src/app/api/customers/[id]/activities/[activityId]/route.test.ts` | GET, PATCH, DELETE one activity |
| `src/app/api/customers/[id]/tasks/route.test.ts` | GET list, POST create tasks |
| `src/app/api/customers/[id]/tasks/[taskId]/route.test.ts` | GET, PATCH, DELETE one task |
| `src/lib/validations/activities.test.ts` | createActivitySchema, updateActivitySchema |
| `src/lib/validations/tasks.test.ts` | createTaskSchema, updateTaskSchema |
| `src/modules/activities/service.test.ts` | Activities service CRUD + tenant/customer scope |
| `src/modules/tasks/service.test.ts` | Tasks service CRUD + assignee validation + tenant/customer scope |

Running `npm run test` runs these together with the rest of the project test suite.
