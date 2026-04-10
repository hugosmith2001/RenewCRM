# Settings: Technical and Product Proposal

**Current product (solo broker):** The live app treats every authenticated user as a broker for their tenant. There is **no** `User.role`, no `requireRole`, and **no** “ADMIN-only organisation” in code. Organisation (Mäklarkontor) and account settings are available to all signed-in users; see `README.md` and `docs/REMOVE_ROLES_SOLO_BROKER_PLAN.md`.

The sections below mix **historical** product reasoning (written when RBAC was considered) with ideas that are only relevant if you **reintroduce** multi-role tenants. Use judgment when reading tables that mention ADMIN/BROKER/STAFF.

---

This document proposes a coherent information architecture and implementation plan for the **Settings** area of Renew CRM (multi-tenant B2B CRM for insurance brokers). It is based on analysis of the current codebase and does **not** include implementation—only the proposal.

---

## 1. Problems with Current Settings

### 1.1 Structure and UX

- **Single placeholder page**: `/dashboard/settings` is one page with a single `DetailSection` and the text “Settings content will go here.” There is no information architecture—no sections, no sub-navigation, no clear place for account vs organization vs configuration.
- **No sub-routes**: Everything would have to live on one long page, which does not scale and makes deep-linking and breadcrumbs impossible.
- **Unclear scope**: The page description says “Manage your account and organization” but there is no way to manage either. Users cannot edit profile, change password, or manage the brokerage/team.

### 1.2 Access (updated for solo broker)

- **Today**: Account and organisation settings are available to **any authenticated user** (`requireAuth()`). There is no separate STAFF/BROKER/ADMIN matrix in the UI or session.
- **If you reintroduce roles later**: You would again split “my account” vs “organisation admin” and gate APIs with explicit role checks plus schema support.

### 1.3 Missing Backend and Data

- **No profile or password APIs**: The app has no server actions or API routes to update the current user’s name or to change password. Auth is NextAuth Credentials with `passwordHash` in the DB; no update path exists.
- **No tenant (brokerage) update**: The `Tenant` model has `name` and `slug`, but there are no APIs or UI to read/update them. `getCurrentTenant()` exists in `@/modules/auth` but is only used where needed, not in Settings.
- **Users list only**: `GET /api/users` returns tenant users for dropdowns (e.g. customer owner). There is no invite user, update user (name/role), or deactivate user flow. `listTenantUsers` in the auth module is read-only.

### 1.4 Configuration Not in Settings

- **Insurers**: Create/list is via `GET/POST /api/insurers` and the policies module (`listInsurers`, `createInsurer`, etc.). Insurers are used in policy forms and renewals but are not exposed as a “Settings → Insurers” config area.
- **Document types**: `DocumentType` is a Prisma enum (e.g. POLICY_DOCUMENT, CONTRACT, ID_DOCUMENT). There is no tenant-level configuration for labels or custom types; everything is code-defined.
- **Workflow**: No workflow or renewal settings exist in the schema or UI.

### 1.5 Summary

| Issue | Impact |
|-------|--------|
| Single page, no IA | Poor scalability and UX as features are added |
| No sub-routes | No deep links, no clear mental model |
| (Historical) STAFF locked out | Addressed by solo-broker model: no separate staff role |
| No profile/password APIs | Cannot implement account management |
| No tenant APIs | Cannot implement brokerage settings |
| Users API read-only | Cannot implement team management |
| Config (insurers, etc.) elsewhere | Settings does not feel like the “control panel” for the org |

---

## 2. Proposed Settings Architecture

### 2.1 Principles

- **Account** = things the signed-in user does for themselves (profile, password). Available to **all authenticated users**.
- **Organization** = brokerage (and optionally team in a multi-user future). In the **current** app, brokerage is available to all authenticated users; team flows are not implemented here.
- **Configuration** = optional later (insurers, document types, workflow).

Access control **today**: `requireAuth()` and tenant scoping; **no** `requireRole`. If roles return, reintroduce guards consistently in API and UI.

### 2.2 URL and Section Structure

Use **nested routes** under `/dashboard/settings` so each area has a clear URL and can be linked and guarded independently:

```
/dashboard/settings                    → Settings index (overview / redirect)
/dashboard/settings/profile            → Account → Profile
/dashboard/settings/password            → Account → Password
/dashboard/settings/brokerage           → Organization → Brokerage  (all authenticated)
/dashboard/settings/team                → Organization → Team        (not in current tree; future if multi-user)
/dashboard/settings/insurers           → Configuration → Insurers   (later; elsewhere in app today)
```

Optional later: `/dashboard/settings/document-types`, `/dashboard/settings/workflow`, etc.

### 2.3 Information Architecture

| Section | Sub-pages | Who can access | Purpose |
|---------|------------|----------------|---------|
| **Account** | Profile, Password | All authenticated users | Manage own identity and security |
| **Organization** | Brokerage (+ Team if built) | All authenticated (today) | Manage brokerage; team TBD |
| **Configuration** | Insurers (later: document types, workflow) | All authenticated (today) | Tenant-level reference data—much of this lives outside Settings |

### 2.4 Settings Index Page

- **Route**: `/dashboard/settings` (or `/dashboard/settings/profile` as default).
- **Content**: Short overview with links to Profile, Password, Brokerage, etc. No business logic; just navigation and maybe a “Quick links” card.
- **Layout**: Shared Settings layout with a **sidebar or tabs** for Account / Organization / Configuration so users always know where they are.

### 2.5 Section Descriptions (Product)

- **Account → Profile**: View and edit display name; show email (editing email can be Phase 2 or later, may require verification).
- **Account → Password**: Change password (current password + new password + confirm); validate and hash with same approach as login (`bcrypt`).
- **Organization → Brokerage**: View and edit tenant name and slug (if slug is editable); consider read-only slug to avoid breaking links.
- **Organization → Team**: List users in the tenant (name, email, role); invite new user (email + role + optional name); edit role/name; optional “deactivate” (no delete of users with data).
- **Configuration → Insurers**: List insurers for the tenant; add/edit/delete (or soft-disable). Reuse existing `Insurer` model and `listInsurers` / `createInsurer`; add update/delete in API and module.

---

## 3. Technical Implications

### 3.1 Data Models (Existing)

| Model | Use in Settings | Notes |
|-------|-----------------|--------|
| **User** | Profile, Password, (Team future) | `id`, `email`, `name`, `passwordHash`, `tenantId`, `isActive`, etc. **No `role`** in solo-broker schema. |
| **Tenant** | Brokerage | `id`, `name`, `slug`. No tenant-level “settings” JSON. |
| **Insurer** | Config → Insurers | `tenantId`, `name`. Already used by policies; CRUD exists for create, list; update/delete to be added. |
| **Role enum** | — | **Removed** for solo-broker deployments. |

No new Prisma models are required for basic settings. Optional later: invite tokens table if you add invite-by-email.

### 3.2 What Exists Today

| Capability | Exists | Where |
|------------|--------|-------|
| Session + current user | Yes | `auth()`, `getCurrentUser()`, JWT with `id`, `email`, `name`, `tenantId` |
| Current tenant | Yes | `getCurrentTenant()` |
| List tenant users | Yes | `listTenantUsers()`, `GET /api/users` (id, name, email only) |
| Tenant guard | Yes | `requireAuth()`, `assertTenantAccess()` |
| Insurers list/create | Yes | `GET/POST /api/insurers`, `listInsurers`, `createInsurer` |
| Insurer update/delete | No | Only in policies module for some operations; no dedicated update/delete API |
| Update user (name) | Yes | `PATCH /api/me/profile` |
| Change password | Yes | `POST /api/me/password` |
| Update tenant | Yes | `GET`/`PATCH /api/tenant` |
| Create user (invite) | No | — |
| Update user role | No | — |

### 3.3 New Backend / APIs Needed

- **Account**
  - **Profile**: Server action (or `PATCH /api/me`) to update current user’s `name`. Use `requireAuth()`, then `prisma.user.update({ where: { id: user.id }, data: { name } })`. No email change in Phase 1.
  - **Password**: Server action (or `POST /api/me/password`) to change password: body `{ currentPassword, newPassword }`, verify `currentPassword` with `compare()`, hash `newPassword` with `hash()`, update `passwordHash`. Use same `bcrypt` and validation pattern as login.

- **Organization**
  - **Brokerage**: `GET /api/tenant` and `PATCH /api/tenant` to update `name`. Guard with `requireAuth()`; slug remains read-only in MVP.
  - **Team**:  
    - List: already `GET /api/users`; extend to include `role` for Settings.  
    - Invite: `POST /api/users` with email, role, optional name; create user with random temp password or invite token (Phase 3 can start with “create user with temp password” and email instructions).  
    - Update: `PATCH /api/users/[id]` for name (and role **only if** you restore RBAC); tenant-scoped.  
    - Optional: deactivate (e.g. `isActive` flag or no login); can be Phase 4.

- **Configuration**
  - **Insurers**: `PATCH /api/insurers/[id]`, `DELETE /api/insurers/[id]` (or equivalent), tenant-scoped. Reuse existing `updateInsurer`/`deleteInsurer` if they exist in the policies module; otherwise add them and call from API.

### 3.4 UI Components to Reuse

- **Layout**: `PageHeader`, `DetailSection` from `@/components/layout` (same as customer/dashboard pages).
- **Forms**: `FormLayout`, `FormField`, `FormActions`, `formInputClasses`, `formSelectClasses` from `@/components/forms`.
- **Buttons / UI**: `Button`, `ConfirmDialog` from `@/components/ui`.
- **Tokens**: All spacing and colors from `src/styles/theme.css` (e.g. `rounded-card`, `border-border`, `p-section-body`, `text-muted-foreground`). No new design system work.

New pieces:

- **Settings layout**: Implemented under `src/app/dashboard/settings/` with nav for Account and Organisation. No role-based hiding in solo-broker mode.
- **Settings index**: One simple page with links to Profile, Password, Brokerage, Team (and later Insurers).

### 3.5 Auth and Session

- **Profile name**: After update, the session may still show the old name until next login because name is stored in the JWT. Options: (1) accept “updated after next login,” or (2) in the server action, after `prisma.user.update`, call something that refreshes the session (e.g. reissue cookie or short-lived session refresh). Proposal: Phase 1 keep it simple (name refresh on next login).
- **Password**: No session invalidation required; user stays logged in. Optionally force re-login on password change for security; can be a later enhancement.
- **Tenant**: Session does not store tenant name/slug; they are loaded via `getCurrentTenant()` in RSC. No change.

### 3.6 Validation

- Reuse patterns from `src/lib/validations/` (e.g. `signInSchema`). Add:
  - `updateProfileSchema`: `name` optional string, max length.
  - `changePasswordSchema`: `currentPassword`, `newPassword`, `confirmNewPassword`; ensure new === confirm and strength rules if desired.
  - `updateTenantSchema`: `name`, optional `slug` with format rules.
  - User invite/update: email, optional name; add role enum **only if** RBAC returns.

---

## 4. Implementation Phases

### Phase 1: Account → Profile

- **Scope**: Current user can view and edit their display name.
- **Backend**: Server action (or `PATCH /api/me`) to update `User.name`; validation schema.
- **UI**: `/dashboard/settings/profile` with one `DetailSection`, form (name field + save). Reuse `FormLayout` (card), `FormField`, `FormActions`.
- **Access**: All authenticated users (no role check beyond `requireAuth()`).
- **Deliverable**: Settings has a real first subsection for all authenticated users.

### Phase 2: Account → Password

- **Scope**: Current user can change their password (current + new + confirm).
- **Backend**: Server action (or dedicated endpoint) with `changePasswordSchema`; verify current with `compare`, hash new with `hash`, update `passwordHash`.
- **UI**: `/dashboard/settings/password` with form (current, new, confirm). No “forgot password” in this phase (credentials-only).
- **Access**: All authenticated users.
- **Deliverable**: Account section is complete for MVP.

### Phase 3: Organization → Team (Users)

- **Scope**: List users, show role; invite (create user with email, role, optional name); edit user (name, role). No delete/deactivate in this phase if not needed.
- **Backend**: Extend `GET /api/users` as needed. Add `POST`/`PATCH` user endpoints tenant-scoped with `requireAuth()` (and role fields **only if** RBAC exists).
- **UI**: `/dashboard/settings/team` — list (table or list with role badges), “Invite user” button → form/modal; edit user → inline or small form. Reuse `DetailSection`, table or list styles, `FormLayout`/`FormField` for invite/edit.
- **Access**: All authenticated users unless you reintroduce RBAC and tighten this.
- **Deliverable**: Brokers can manage team members.

### Phase 4: Organization → Brokerage

- **Scope**: View and edit tenant name (and optionally slug if product agrees).
- **Backend**: `GET /api/tenant` (or rely on `getCurrentTenant()` in RSC) and `PATCH /api/tenant`; guard with `requireAuth()`.
- **UI**: `/dashboard/settings/brokerage` with form (name, maybe slug). One `DetailSection`.
- **Access**: All authenticated users (solo broker).
- **Deliverable**: Organization settings are complete for MVP.

### Phase 5: Configuration (Optional Later)

- **Insurers**: Add `PATCH`/`DELETE` for insurers if not present; add `/dashboard/settings/insurers` page (list + add/edit/delete). Reuse existing insurers API and policies module.
- **Document types**: Only if we move from enum to tenant-configurable list (new model or JSON); otherwise skip.
- **Workflow**: New feature; out of scope for this proposal.

---

## 5. Recommended next steps (solo broker)

1. **Keep docs aligned** with `requireAuth()` and no `User.role` unless you ship a migration to bring RBAC back.
2. **Settings layout** already lives at `src/app/dashboard/settings/layout.tsx`; extend with new links as you add pages (no role-based hiding unless product changes).
3. **Team / invite flows** remain future work; if you add them, document tenant scoping and whether roles return.

Historical detail below (profile/password/brokerage phases) can still guide sequencing for new features, but access control should match the current codebase: **authentication + tenantId from session**, not ADMIN/BROKER/STAFF gates.
