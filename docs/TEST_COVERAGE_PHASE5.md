# Phase 5 (Policies) – Test Coverage

This document describes what the Phase 5 tests cover, what they do **not** cover, and notable edge cases.

---

## 1. What the tests cover

### Validation (`lib/validations/`)

| File | Coverage |
|------|----------|
| **insurers.test.ts** | `createInsurerSchema`: valid name; empty/missing name rejected; max length 255 (reject 256, accept 255); null/undefined body. `updateInsurerSchema`: empty object; partial name; reject empty name in partial. |
| **policies.test.ts** | `createPolicySchema`: minimal input (insurerId, policyNumber, start/end date); full input (premium, renewalDate, status, insuredObjectIds); premium coercion (string→number, empty→undefined); reject negative premium; reject endDate &lt; startDate; accept startDate = endDate; reject empty insurerId/policyNumber; invalid dates; invalid status; all four statuses accepted; policyNumber max 100; null/undefined. `updatePolicySchema`: empty object; partial fields; reject endDate &lt; startDate when both provided; accept only startDate or only endDate; reject negative premium; accept insuredObjectIds. |

### Service (`modules/policies/service.test.ts`)

| Function | Coverage |
|----------|----------|
| **listInsurers** | Returns list ordered by name; empty array when none. |
| **getInsurerById** | Returns insurer when found for tenant; null when not found. |
| **createInsurer** | Creates with trimmed name. |
| **listPoliciesByCustomerId** | Empty array when customer missing; policies with insurer + insuredObjects when customer exists; correct `where`/`include`/`orderBy`. |
| **getPolicyById** | Returns policy with relations when found; null when not found. |
| **createPolicy** | null when customer missing; null when insurer missing; create without insured objects; create with insuredObjectIds filtered to same customer/tenant (only valid IDs used in `insuredObjects.create`). |
| **updatePolicy** | null when policy not found; null when new insurerId provided but insurer not found; updates only provided fields; replaces insuredObjectIds (deleteMany + createMany with valid IDs for that customer). |
| **deletePolicy** | false when policy not found; deletes and returns true when exists. |

All service tests use **mocked Prisma** (no real DB). Tenant isolation is asserted via `where: { tenantId }` (and customerId where relevant) in the expected calls.

### API routes

| Route | Coverage |
|-------|----------|
| **GET/POST /api/insurers** | 401/403 on auth failure; 200 + insurers array (GET); 400 on validation (missing/empty name); 201 + created insurer (POST). |
| **GET/POST /api/customers/[id]/policies** | 401/403; 404 when customer not found; 200 + policies (premium serialized to number); empty array; 400 on validation (missing policyNumber, endDate &lt; startDate); 400 when createPolicy returns null; 201 + created policy with serialized premium. |
| **GET/PATCH/DELETE /api/customers/[id]/policies/[policyId]** | 401; 404 when policy not found; 400 when policy belongs to different customer; 200 GET with insuredObjectIds and premium; 400 on PATCH validation (dates); 200 PATCH with updated policy; 204 DELETE and deletePolicy called. |

Auth and dependencies are **mocked** (no real session, no real DB). Role checks are implied by `requireRole` being called; we do not assert STAFF vs BROKER vs ADMIN for insurers/policies in these tests.

---

## 2. What the tests do **not** cover

- **Real database**: No integration tests against PostgreSQL. Prisma is fully mocked in service tests.
- **Real auth/session**: No NextAuth or cookies; `requireRole` and `assertTenantAccess` are mocks.
- **UI**: No tests for `PoliciesSection`, `PolicyForm`, or any React components.
- **E2E**: No Playwright/Cypress or full user flows.
- **Insurer update/delete**: No API or service tests for updating or deleting insurers (only create and list exist in the app).
- **Policy list authorization by role**: We don’t assert that only ADMIN/BROKER/STAFF can GET policies; we only assert 401/403 when `requireRole` rejects.
- **Decimal handling**: Premium is asserted as a number in API tests; we don’t test Prisma `Decimal` serialization edge cases (e.g. very large or precise values).
- **Concurrency**: No tests for concurrent create/update of policies or insured object links.
- **Audit**: No tests that policy create/update/delete are written to an audit log (audit is Phase 8).

---

## 3. Edge cases and limitations

- **Boundary lengths**: Validation tests use 255/256 for insurer name and 100/101 for policy number; we don’t exhaustively test Unicode or multi-byte boundaries.
- **Dates**: We use ISO date strings and `new Date(...)`; timezone and “invalid but parseable” dates are not explicitly tested.
- **Premium**: Coercion from string and empty string is tested; we don’t test very large numbers or rounding (Decimal(12,2)).
- **insuredObjectIds**: Service test verifies that only IDs belonging to the same customer/tenant are passed to `insuredObjects.create`; we don’t test duplicate IDs or empty array vs undefined in create/update.
- **Policy “belongs to customer”**: API tests assert 400 when `policy.customerId !== customerId`; we don’t test the reverse (wrong policyId in URL but correct customer).
- **PATCH with no body / empty JSON**: Not explicitly tested; implementation may still call update with empty data.

---

## 4. How to run the Phase 5 tests

```bash
npm test -- --run src/lib/validations/insurers.test.ts src/lib/validations/policies.test.ts src/modules/policies/service.test.ts src/app/api/insurers/route.test.ts "src/app/api/customers/[id]/policies/route.test.ts" "src/app/api/customers/[id]/policies/[policyId]/route.test.ts"
```

Or run all tests in the project:

```bash
npm test -- --run
```

---

## 5. Summary

| Layer | Files | Tests | Purpose |
|-------|-------|-------|---------|
| Validation | insurers.test.ts, policies.test.ts | 33 | Zod schemas: valid/invalid inputs, refinements, coercion. |
| Service | service.test.ts | 19 | Tenant-scoped CRUD with mocked Prisma; customer/insurer/object validation. |
| API | insurers/route.test.ts, policies/route.test.ts, policies/[policyId]/route.test.ts | 30 | Status codes, auth, validation, serialization (premium, insuredObjectIds). |

**Total: 82 tests** for Phase 5 (policies and insurers). They give confidence in validation, service logic, and API behavior under mocked auth and DB; they do not replace integration or E2E tests.
