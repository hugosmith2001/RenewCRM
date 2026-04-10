# Plan: Remove roles (solo-broker product)

**Status:** Phases 1–5 are implemented in the codebase (DB migration, Prisma schema, auth/session, settings UI, tests). Use Phase 7 for deploy verification.

This codebase was briefly wired for **ADMIN / BROKER / STAFF** (settings nav, JWT/session `role`, Prisma `User.role`). For a **broker-only** deployment, that layer should be removed again so every authenticated user is treated the same: a broker using their tenant.

Use this document as a checklist. Work top to bottom; after each phase, run `npm run test` and smoke-test login + settings.

---

## Why you might see HTTP 500 right now

Typical causes when “roles” are half-applied:

| Situation | What breaks |
|-----------|-------------|
| **DB never migrated** `20260410180000_restore_user_role` | Prisma expects a `role` column that does not exist → queries fail at runtime. |
| **Code deployed without matching DB** | Same: schema/client and database out of sync. |
| **JWT/session still carries `role` but DB column removed** | Less common, but session callback or `getCurrentUser` can throw if types/runtime assume `role` is always present. |

**First diagnostic:** compare `prisma/schema.prisma` to the actual DB (`npx prisma migrate status` or inspect `User` columns). Fix drift before ripping roles out, or finish removal in one pass so schema, DB, and app agree.

---

## Phase 1 — Database1. **Add a new migration** (do not edit old migrations) that:
   - `ALTER TABLE "User" DROP COLUMN IF EXISTS "role";`
   - `DROP TYPE IF EXISTS "UserRole";`  
   (Order: drop column first, then enum type.)

2. **Apply** on every environment: `npx prisma migrate deploy` (or `migrate dev` locally).

3. **Regenerate client:** `npx prisma generate`.

This returns you to the same DB shape as after `20260406170000_drop_user_role`, but keeps history honest (restore migration stays in the chain; the new migration removes the column again).

---

## Phase 2 — Prisma schema

In `prisma/schema.prisma`:

- Remove the `UserRole` enum block.
- Remove the `role` field from `User`.

Run `npx prisma generate` again after editing.

---

## Phase 3 — Auth and session (no `role` in JWT/session)

Remove all `role` plumbing:

| File | Action |
|------|--------|
| `src/auth.ts` | Stop returning `role` from `authorize`. Remove `token.role` assignment in the JWT callback. Remove `role` from the `findUnique` `select` used for session refresh. Drop `UserRole` import. |
| `src/auth.config.ts` | In the `session` callback, remove `session.user.role` (and any default like `"ADMIN"`). |
| `src/types/next-auth.d.ts` | Remove `role` from `Session["user"]` and from `JWT`. Remove `UserRole` import if unused. |
| `src/modules/auth/session.ts` | Remove `role` from `SessionUser` and from the object returned by `getCurrentUser()`. |

**Operational note:** After deploy, existing sessions are still valid as long as the session shape only loses `role`; users do not have to re-login unless you change something else in the token. If you want a clean slate, bump `sessionVersion` in a one-off script (optional).

---

## Phase 4 — UI / RSC (settings)

| File | Action |
|------|--------|
| `src/app/dashboard/settings/layout.tsx` | Show the Organisation / Mäklarkontor block for **every** authenticated user (remove `user.role === "ADMIN"` wrapper). |
| `src/app/dashboard/settings/brokerage/page.tsx` | Remove the redirect for non-ADMIN. Keep only unauthenticated → `/login`. |
| `src/app/dashboard/settings/data-processing/page.tsx` | Remove the redirect for non-ADMIN. Keep only unauthenticated → `/login`. |

Search for any other `user.role` or `role ===` in `src/app` and delete those branches.

---

## Phase 5 — Tests

Update tests so they no longer pass or assert `role` on mocked users (unless the mock type still allows extra fields harmlessly).

**Files that currently mention roles** (as of this plan):

- `src/auth.test.ts` — remove `role` from JWT mock DB rows; drop `role` from `toMatchObject` if present.
- `src/auth.config.test.ts` — remove expectations and examples that set/copy `role` on session.
- `src/app/dashboard/settings/layout.test.tsx` — replace ADMIN/BROKER/STAFF cases with a single behaviour: org links visible for all authenticated users (or delete the “only ADMIN” / “hide for STAFF/BROKER” tests).
- `src/app/dashboard/settings/brokerage/page.test.tsx` — remove “non-admin redirect” test; keep unauthenticated + happy path.
- `src/app/dashboard/settings/data-processing/page.test.tsx` — same as brokerage.
- `src/app/dashboard/settings/profile/page.test.tsx`, `privacy/page.test.tsx` — drop `role` from mocks.
- `src/app/api/me/profile/route.test.ts`, `src/app/api/me/password/route.test.ts` — drop `role` from mocks if still present.

Run: `npm run test` until green.

---

## Phase 6 — Documentation cleanup (optional but recommended)

Grep the repo for `ADMIN`, `BROKER`, `STAFF`, `requireRole`, `UserRole`:

- `README.md`, `docs/*.md`, `User_Auth.md` — align wording with **solo broker**: no role matrix, no “ADMIN-only organisation” unless you reintroduce roles later.

This avoids future contributors re-adding RBAC from stale docs.

---

## Phase 7 — Verification

Do this on **each environment** you care about (local, staging, production).

1. **Prisma / database**
   - Run `npx prisma migrate status`.
   - Expected: no pending migrations; message equivalent to database being up to date with `schema.prisma` (including **no** `User.role` / `UserRole` enum if solo-broker migrations are applied).
   - If you see **P3005** (*The database schema is not empty*) on `migrate deploy`, the database was created or changed outside Prisma’s migration history. Fix by [baselining](https://www.prisma.io/docs/guides/migrate/developing-with-prisma-migrate/baselining) or using a fresh dev DB — not a bug in the role-removal migrations themselves.

2. **Automated**
   - `npm run test` — all pass.
   - `npm run build` — succeeds.

3. **Manual smoke**
   - Log in → **Inställningar** shows **Organisation** → **Mäklarkontor**.
   - Open `/dashboard/settings/brokerage` and `/dashboard/settings/data-processing` — no HTTP 500, no redirect loops (only unauthenticated users should go to `/login`).

**Checklist**

- [ ] `npx prisma migrate status` clean on the target database.
- [ ] `npm run test`
- [ ] `npm run build`
- [ ] Manual smoke (step 3 above)

---

## Summary

**Goal:** One role in practice — **signed-in broker for a tenant**.  
**Mechanism:** No `User.role` column, no `role` in JWT/session, no conditional settings UI or redirects based on role.  
**Your 500** is most likely schema/DB mismatch around `role`; finishing this plan aligns code and database and removes the feature entirely.
