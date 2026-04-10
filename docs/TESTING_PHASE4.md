# Phase 4 (Insured Objects) – Test Coverage

## What the tests cover

- **Insured object validation (Zod)**  
  `createInsuredObjectSchema`: minimal (type + name), full input with description, all enum types (PROPERTY, VEHICLE, PERSON, BUSINESS, EQUIPMENT, OTHER), empty-string coercion for description, rejection of empty/missing name, missing type, name max 255, description max 2000, invalid type, null/undefined body. Boundary: name/description at exact max length.  
  `updateInsuredObjectSchema`: empty object, single/multiple partial fields, rejection of invalid type, name length, empty name.

- **Insured object service**  
  Tenant-scoped CRUD with **mocked Prisma**: list by customer (empty when customer missing, ordered by type then name), get-by-id (found, not found), create (customer missing returns null, success with type/name/description, description omitted → null), update (not found returns null, partial fields, empty data object), delete (not found returns false, success returns true). All queries use `tenantId` in `where` for isolation.

- **API routes**  
  - **GET/POST /api/customers/[id]/insured-objects**: 401 when unauthenticated, 404 when customer not found, 200 with list (including empty), 201 with created object when valid; POST 400 on validation (missing type, empty name) and when `createInsuredObject` returns null. `assertTenantAccess` and correct `tenantId`/`customerId` passed to service.
  - **PATCH/DELETE /api/customers/[id]/insured-objects/[objectId]**: 401 when not authenticated, 404 when object not found, 400 when object belongs to different customer, 400 on PATCH validation (e.g. empty name), 200 PATCH with updated object, 204 DELETE. Tenant and customer consistency asserted.

## What the tests do not cover

- **Real database** – No PostgreSQL; Prisma is mocked. No integration tests or migrations.
- **Real auth/session** – NextAuth and session are not exercised; `requireAuth` and `assertTenantAccess` are mocked.
- **UI** – No component or E2E tests for `InsuredObjectsSection`, `InsuredObjectForm`, or customer detail page.
- **Middleware** – No tests for route protection or redirects.
- **Concurrency** – No tests for simultaneous create/update/delete or list consistency.
- **Role matrix** – Not applicable; solo-broker app uses `requireAuth()` without per-user roles.
- **Malformed JSON** – POST/PATCH with invalid JSON body is not explicitly tested (may throw before validation).

## Edge cases explicitly tested

- **Service**  
  - List returns `[]` when customer does not exist for tenant (no Prisma findMany call).  
  - Create returns `null` when customer missing; description optional and stored as `null` when omitted.  
  - Update with empty object `{}` passes `data: {}` to Prisma.  
  - Delete only runs when object exists for tenant.

- **Validation**  
  - All six enum values accepted for create; invalid type and wrong-case type (e.g. `"vehicle"`) rejected.  
  - Name 255 chars accepted, 256 rejected; description 2000 accepted, 2001 rejected.  
  - Update partial: empty object valid; empty name in partial rejected.

- **API**  
  - 401 vs 403: Unauthorized and Forbidden from auth are mapped to correct status codes.  
  - Object “belongs to different customer”: URL customerId vs object’s customerId mismatch returns 400.  
  - Create 400 when service returns null (e.g. customer missing or DB error).

## Edge cases not tested

- **Unicode / special characters** in name or description (e.g. emoji, RTL).
- **Exact boundary** for description 2000 with multi-byte characters.
- **POST with no body** or non-JSON body (e.g. `request.json()` throw).
- **Idempotency** of create or delete.
- **Ordering** of list (type asc, name asc) with real data.
- **Cascading delete** when customer is deleted (schema-level; not exercised in tests).

## How to run

```bash
npm run test
```

To run only Phase 4 insured-object tests:

```bash
npm run test -- insured-object
```

Phase 4 test files:

- `src/lib/validations/insured-objects.test.ts`
- `src/modules/insured-objects/service.test.ts`
- `src/app/api/customers/[id]/insured-objects/route.test.ts`
- `src/app/api/customers/[id]/insured-objects/[objectId]/route.test.ts`
