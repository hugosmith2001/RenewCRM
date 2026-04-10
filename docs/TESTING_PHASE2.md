# Phase 2 (Customers) – Test Coverage

## What the tests cover

- **Customer validation (Zod)**  
  Create/update/list query schemas: valid inputs, required vs optional fields, enums (type, status), empty-string coercion for email/phone/address, pagination defaults and limits, and rejection of invalid types, statuses, and lengths.

- **Customer service**  
  Tenant-scoped CRUD with **mocked Prisma**: get-by-id (found, not found, wrong tenant), list with search/filters/pagination, create with minimal and full payloads, update (partial, not found, clearing owner), delete (success, not found). All calls are asserted to use the correct `tenantId` in queries.

- **API routes**  
  - **GET/POST /api/customers**: 401 when `requireAuth` fails, 400 for invalid query or body, 200 with list and 201 with created customer when auth and validation succeed. List and create are called with the current user’s `tenantId`.
  - **GET/PATCH/DELETE /api/customers/[id]**: 401 when unauthenticated; 404 when customer is missing; 400 on invalid PATCH body; 200/204 on success. `assertTenantAccess` is checked for GET; update/delete are called only after a successful tenant-scoped get.

## What the tests do not cover

- **Real database** – No PostgreSQL; Prisma is mocked. No integration tests or migrations.
- **Real auth/session** – NextAuth and session are not exercised; `requireAuth` and `assertTenantAccess` are mocked.
- **UI** – No component or E2E tests for the customer list, detail, or forms.
- **Middleware** – No tests for route protection or redirects.
- **Concurrency / race conditions** – No tests for simultaneous updates or deletes.
- **Search behavior** – Only that the service is called with the right `where`; no assertion on actual DB search semantics (e.g. case-insensitivity is assumed).

## Edge cases explicitly tested

- Empty string for optional fields (email, phone, address) is coerced to `undefined` in create.
- List query: page/limit defaults, coercion from string (e.g. `page: "3"`), rejection of `page < 1`, `limit > 100`, search length > 200.
- Get/update/delete return `null` or 404 when the customer does not exist or is for another tenant (service uses `tenantId` in `where`).
- PATCH with partial body only updates provided fields.
- API returns 401 for “Unauthorized” and 403 for “Forbidden” from auth helpers.

## How to run

```bash
npm run test
```

All Phase 2 tests are in:

- `src/lib/validations/customers.test.ts`
- `src/modules/customers/service.test.ts`
- `src/app/api/customers/route.test.ts`
- `src/app/api/customers/[id]/route.test.ts`
