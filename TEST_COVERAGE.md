# Test Coverage – Phase 0 & Phase 1

This document describes what the current test suite covers, what it does not cover, and notable edge cases.

---

## Test Framework

- **Runner:** Vitest
- **Commands:** `npm run test` (single run), `npm run test:watch` (watch mode)
- **Config:** `vitest.config.ts` (Node environment, `@` path alias)

---

## What Is Covered

### Phase 0

| Area | File | What’s tested |
|------|------|----------------|
| **Health API** | `src/app/api/health/route.test.ts` | `GET /api/health` returns 200, JSON body `{ status: "ok", phase: 0 }`, and JSON content-type. |

### Phase 1

| Area | File | What’s tested |
|------|------|----------------|
| **Sign-in validation** | `src/lib/validations/auth.test.ts` | Zod `signInSchema`: valid email + password; required email/password; email format (invalid, empty, missing); non-string email; null/undefined input. |
| **Auth session helpers** | `src/modules/auth/session.test.ts` | `getCurrentUser`: null when no session or missing `user.id`/`user.tenantId`; returns `SessionUser` when session is complete; defaults `name` to null and `email` to `""` when missing. `getCurrentTenant`: null when no user; calls `prisma.tenant.findUnique` and returns tenant or null. `requireAuth`: throws `"Unauthorized"` when no user; returns user when present. `requireRole`: throws `"Unauthorized"` when not authenticated; throws `"Forbidden"` when role not in list; returns user when role allowed (single or multiple). `assertTenantAccess`: no throw when `resourceTenantId === user.tenantId`; throws `"Forbidden"` when different or empty. |
| **Auth config (edge)** | `src/auth.config.test.ts` | `authConfig`: sign-in page `/login`, JWT strategy. Session callback: copies `id`, `tenantId`, `role` from token to session when present; leaves session unchanged when token or session.user is missing any of those. |
| **Protected API** | `src/app/api/me/route.test.ts` | `GET /api/me`: 401 and `{ error: "Unauthorized" }` when `getCurrentUser()` is null; 200 and full user payload when authenticated; handles `name: null`. |

All of the above use **mocked** dependencies: `auth()`, `prisma`, and `getCurrentUser` are mocked. No real database or NextAuth session is used.

---

## What Is Not Covered

- **Middleware** – Redirect to `/login`, `callbackUrl`, and public vs protected paths are not tested. Would require integration or E2E tests (e.g. Playwright) with a running app.
- **Full auth flow** – No tests for `auth.ts` Credentials `authorize()` (DB lookup, bcrypt). That would need a real or test DB and/or heavier mocking of Prisma and bcrypt.
- **Login page (UI)** – No React Testing Library tests for the login form (submit, validation messages, redirect). Could be added with `jsdom` and RTL.
- **Dashboard** – No tests for dashboard layout or page (server components, auth redirect).
- **Sign-out** – No tests for the sign-out server action or cookie clearing.
- **Auth API routes** – No tests for `POST/GET /api/auth/[...nextauth]` (NextAuth internals).
- **Prisma schema / migrations** – No tests for schema or migration SQL; migrations are applied manually.
- **Seed script** – `prisma/seed.ts` is not tested; it’s run manually.
- **E2E** – No end-to-end tests (e.g. open `/login`, submit credentials, see dashboard).

---

## Edge Cases and Assumptions

### Validation (`signInSchema`)

- **Covered:** Empty string, missing field, invalid email formats, non-string email, null/undefined. No minimum password length in schema; any non-empty string is accepted.
- **Not covered:** Very long email/password (Zod/HTTP limits); sanitization or trimming (current schema does not trim).

### Session helpers

- **Covered:** Missing or partial session (no user, no id, no tenantId); `getCurrentTenant` when tenant is deleted (mock returns null); `requireRole` with one or many allowed roles; `assertTenantAccess` with same tenant, different tenant, empty string.
- **Assumption:** `auth()` is the only source of session; no tests for malformed or expired JWT (handled by NextAuth, not by these helpers).

### Auth config session callback

- **Covered:** Token with all fields; token missing `id`, `tenantId`, or `role`; missing `session.user`. Callback is invoked with plain objects in tests; real NextAuth may pass additional fields.

### API routes

- **Health:** Only `GET`; no headers or query params asserted.
- **Me:** Only `GET`; no tests for other methods or invalid requests. Session is simulated via mocking `getCurrentUser`, not real cookies.

### Security-related behavior not tested

- Rate limiting on login
- CSRF on auth endpoints
- Cookie flags (httpOnly, secure, sameSite)
- Exact error message for “wrong password” (no leak of “user not found” vs “bad password”)

---

## Running Tests

```bash
npm run test        # single run
npm run test:watch  # watch mode
```

Coverage (if needed later) can be enabled in `vitest.config.ts` and reported with `vitest run --coverage`.
