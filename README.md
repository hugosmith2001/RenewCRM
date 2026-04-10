# Renew CRM

Insurance broker CRM (Next.js, Prisma, PostgreSQL). Deployments target a **solo-broker** model: one logical tenant per customer org, with **no per-user RBAC** in the application layer.

## Auth and tenancy

- **Session** (Auth.js / JWT): authenticated users carry `id`, `email`, `name`, and `tenantId`. There is **no `role`** claim and no `User.role` column in the database.
- **APIs**: Use `requireAuth()` from `@/modules/auth` for authenticated routes. Derive **`tenantId` from the session**; do not trust client-supplied tenant IDs for authorization.
- **Tenant scoping**: For resources keyed by ID (customers, policies, etc.), load the record and use `assertTenantAccess(sessionUser, resource.tenantId)` where appropriate.

Inactive users (`User.isActive === false`) cannot sign in; the credentials flow rejects them.

## Settings (`src/app/dashboard/settings`)

The shared layout redirects unauthenticated visitors to `/login`. **Account** and **Organisation** (Mäklarkontor) navigation entries are shown to **every** signed-in user.

| Route | Purpose |
|-------|---------|
| `/dashboard/settings` | Redirects to profile |
| `/dashboard/settings/profile` | Display name (`PATCH /api/me/profile`) |
| `/dashboard/settings/password` | Change password (`POST /api/me/password`) |
| `/dashboard/settings/privacy` | Privacy & compliance copy |
| `/dashboard/settings/brokerage` | Brokerage name (`GET`/`PATCH /api/tenant`; slug read-only) |
| `/dashboard/settings/data-processing` | Transparency overview (single-broker) |

Validation helpers for settings live under `src/lib/validations/settings.ts`.

## Useful commands

```bash
npm install
npx prisma migrate deploy   # or migrate dev locally
npx prisma generate
npm run dev
npm run test
npm run build
```

## Docs and history

- **`docs/REMOVE_ROLES_SOLO_BROKER_PLAN.md`** — checklist for removing ADMIN/BROKER/STAFF-style RBAC; use it before reintroducing roles.
- **`docs/SETTINGS_PROPOSAL.md`** — older product/IA proposal; **current behaviour** is solo-broker (see above). Sections on Team admin and `requireRole` are historical unless you bring multi-role back.
- **`User_Auth.md`** — manual auth and smoke-test style notes.

If you add multi-user tenants with roles again, you will need a deliberate schema migration, session/JWT shape, and updated API guards—do not copy old README role matrices without updating code and DB to match.
