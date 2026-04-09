## Who this is for

This document is for **operators/admins and implementers** who need to understand how authentication and sessions work in this repository.

For end users, this is usually too technical; link users to the in-app **Privacy notice**: `Settings → Privacy notice (app users)`.

## Plain-language summary

- Renew CRM uses **secure sign-in sessions** to keep accounts protected.
- It uses **essential cookies** for session security (see `docs/COOKIE_NOTICE.md`).
- It includes protections like **secure cookie flags**, **session invalidation on password change**, and **basic rate limiting**.

---

## Auth/session model (current)

Renew CRM uses **Auth.js / NextAuth v5** with the **Credentials provider** and **JWT-based sessions**.

- **NextAuth config**:
  - Full config + Credentials authorization: `src/auth.ts`
  - Edge-safe subset for middleware: `src/auth.config.ts`
- **Session strategy**: JWT (`session.strategy = "jwt"`)
- **Route protection**:
  - UI navigation is gated by middleware: `src/middleware.ts`
  - API routes use backend authorization helpers: `src/modules/auth/session.ts`

## Cookie/session protections

Configured in `src/auth.config.ts`:

- **HttpOnly**: session cookie is `httpOnly: true`
- **SameSite**: explicitly set to `lax`
- **Secure**: enabled when `NODE_ENV === "production"`
- **Session lifetime**: `maxAge = 30 days`, `updateAge = 24 hours`
- **Trusted host behavior**:
  - `trustHost` is enabled in development
  - in production it is enabled only when:
    - `VERCEL=1`, or
    - `AUTH_TRUST_HOST=true`

## Password change session invalidation

Implemented via **session versioning**:

- Prisma `User` has a `sessionVersion` integer (`prisma/schema.prisma`).
- On successful password change (`POST /api/me/password`):
  - `passwordHash` is updated
  - `sessionVersion` is incremented
  - the API response also clears common session cookies as a best-effort immediate sign-out
- On every JWT callback after sign-in (`src/auth.ts`):
  - the current user is loaded from DB
  - if `sessionVersion` differs from the JWT’s `sessionVersion`, the token is rejected (user is effectively signed out)
  - tenant membership is refreshed from DB to avoid stale access

## Rate limiting (Phase 1)

Lightweight in-memory rate limiting (no infra dependency) is implemented in `src/lib/rate-limit.ts`.

Applied in:

- **Auth endpoints**: `POST /api/auth/*` via middleware (basic brute-force protection; keyed by IP)
- **Password change**: `POST /api/me/password`
  - middleware (keyed by IP)
  - API route (keyed by userId + IP)
- **Tenant updates**: `PATCH /api/tenant` via middleware (keyed by IP)

### Limitations

- The limiter is **per runtime instance** (not shared across regions/containers), so it is a **best-effort first pass**.
  - For stronger guarantees, move to a shared store (Redis / Upstash / etc.) or a gateway/WAF.

## Privileged endpoints and authorization (current repo)

The current repository implements **authentication** and **tenant scoping** (`tenantId`) for access control. It does not
currently include a complete, consistently enforced **role-based access control (RBAC)** layer.

Key examples:

- Tenant update: `PATCH /api/tenant` (authenticated; tenant-scoped)
- Audit log access: `GET /api/audit` (authenticated; tenant-scoped)

## Guidance for future hardening

- Add distributed rate limiting (shared store) for auth endpoints and high-risk document downloads.
- Consider adding a short TTL / rotation strategy for JWTs if session revocation needs to be faster without DB checks.

