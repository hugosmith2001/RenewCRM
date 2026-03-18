# Settings: Technical and Product Proposal

This document proposes a coherent information architecture and implementation plan for the **Settings** area of Safekeep CRM (multi-tenant B2B CRM for insurance brokers). It is based on analysis of the current codebase and does **not** include implementation—only the proposal.

---

## 1. Problems with Current Settings

### 1.1 Structure and UX

- **Single placeholder page**: `/dashboard/settings` is one page with a single `DetailSection` and the text “Settings content will go here.” There is no information architecture—no sections, no sub-navigation, no clear place for account vs organization vs configuration.
- **No sub-routes**: Everything would have to live on one long page, which does not scale and makes deep-linking and breadcrumbs impossible.
- **Unclear scope**: The page description says “Manage your account and organization” but there is no way to manage either. Users cannot edit profile, change password, or manage the brokerage/team.

### 1.2 Access and Roles

- **All-or-nothing access**: Settings is gated to `ADMIN` and `BROKER` only. If we add “Account → Profile” or “Account → Password,” **STAFF** users would have no way to manage their own account without being given broker-level access.
- **No distinction by concern**: There is no separation between “my account” (all authenticated users) and “organization/configuration” (admins/brokers). That makes it harder to add account-level features without over-exposing Settings to STAFF.

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
| STAFF locked out | Cannot add “my account” without opening full Settings |
| No profile/password APIs | Cannot implement account management |
| No tenant APIs | Cannot implement brokerage settings |
| Users API read-only | Cannot implement team management |
| Config (insurers, etc.) elsewhere | Settings does not feel like the “control panel” for the org |

---

## 2. Proposed Settings Architecture

### 2.1 Principles

- **Account** = things the signed-in user does for themselves (profile, password). Available to **all roles** (ADMIN, BROKER, STAFF).
- **Organization** = brokerage and team. Available to **ADMIN** and **BROKER** only.
- **Configuration** = optional later (insurers, document types, workflow). **ADMIN** and **BROKER** (can be refined later).

Access control: keep using `requireRole` and existing session (`getCurrentUser()`). Add a Settings layout that restricts by role per section (e.g. sidebar hides “Organization” for STAFF).

### 2.2 URL and Section Structure

Use **nested routes** under `/dashboard/settings` so each area has a clear URL and can be linked and guarded independently:

```
/dashboard/settings                    → Settings index (overview / redirect)
/dashboard/settings/profile            → Account → Profile
/dashboard/settings/password            → Account → Password
/dashboard/settings/brokerage           → Organization → Brokerage  (ADMIN/BROKER)
/dashboard/settings/team                → Organization → Team        (ADMIN/BROKER)
/dashboard/settings/insurers           → Configuration → Insurers   (later, ADMIN/BROKER)
```

Optional later: `/dashboard/settings/document-types`, `/dashboard/settings/workflow`, etc.

### 2.3 Information Architecture

| Section | Sub-pages | Who can access | Purpose |
|---------|------------|----------------|---------|
| **Account** | Profile, Password | All authenticated users | Manage own identity and security |
| **Organization** | Brokerage, Team | ADMIN, BROKER | Manage brokerage details and users |
| **Configuration** | Insurers (later: document types, workflow) | ADMIN, BROKER | Tenant-level reference data and behaviour |

### 2.4 Settings Index Page

- **Route**: `/dashboard/settings` (or `/dashboard/settings/profile` as default).
- **Content**: Short overview with links to Profile, Password and (for ADMIN/BROKER) Brokerage and Team. No business logic; just navigation and maybe a “Quick links” card.
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
| **User** | Profile, Password, Team | `id`, `email`, `name`, `passwordHash`, `role`, `tenantId`. No `emailVerified` or `inviteToken` yet. |
| **Tenant** | Brokerage | `id`, `name`, `slug`. No tenant-level “settings” JSON. |
| **Insurer** | Config → Insurers | `tenantId`, `name`. Already used by policies; CRUD exists for create, list; update/delete to be added. |
| **Role** | Team, access control | Enum ADMIN, BROKER, STAFF. No change. |

No new Prisma models are required for Phases 1–4. Optional later: invite tokens table if we add invite-by-email.

### 3.2 What Exists Today

| Capability | Exists | Where |
|------------|--------|-------|
| Session + current user | Yes | `auth()`, `getCurrentUser()`, JWT with `id`, `email`, `name`, `tenantId`, `role` |
| Current tenant | Yes | `getCurrentTenant()` |
| List tenant users | Yes | `listTenantUsers()`, `GET /api/users` (id, name, email only) |
| Role guard | Yes | `requireRole([...])`, `assertTenantAccess()` |
| Insurers list/create | Yes | `GET/POST /api/insurers`, `listInsurers`, `createInsurer` |
| Insurer update/delete | No | Only in policies module for some operations; no dedicated update/delete API |
| Update user (name) | No | — |
| Change password | No | — |
| Update tenant | No | — |
| Create user (invite) | No | — |
| Update user role | No | — |

### 3.3 New Backend / APIs Needed

- **Account**
  - **Profile**: Server action (or `PATCH /api/me`) to update current user’s `name`. Use `requireAuth()`, then `prisma.user.update({ where: { id: user.id }, data: { name } })`. No email change in Phase 1.
  - **Password**: Server action (or `POST /api/me/password`) to change password: body `{ currentPassword, newPassword }`, verify `currentPassword` with `compare()`, hash `newPassword` with `hash()`, update `passwordHash`. Use same `bcrypt` and validation pattern as login.

- **Organization**
  - **Brokerage**: `GET /api/tenant` (or use `getCurrentTenant()` in RSC) and `PATCH /api/tenant` to update `name` (and optionally `slug` if we allow it). Guard with `requireRole([ADMIN, BROKER])` and `assertTenantAccess` if needed.
  - **Team**:  
    - List: already `GET /api/users`; extend to include `role` for Settings.  
    - Invite: `POST /api/users` with email, role, optional name; create user with random temp password or invite token (Phase 3 can start with “create user with temp password” and email instructions).  
    - Update: `PATCH /api/users/[id]` for name and role; tenant-scoped, ADMIN/BROKER only.  
    - Optional: deactivate (e.g. `isActive` flag or no login); can be Phase 4.

- **Configuration**
  - **Insurers**: `PATCH /api/insurers/[id]`, `DELETE /api/insurers/[id]` (or equivalent), tenant-scoped. Reuse existing `updateInsurer`/`deleteInsurer` if they exist in the policies module; otherwise add them and call from API.

### 3.4 UI Components to Reuse

- **Layout**: `PageHeader`, `DetailSection` from `@/components/layout` (same as customer/dashboard pages).
- **Forms**: `FormLayout`, `FormField`, `FormActions`, `formInputClasses`, `formSelectClasses` from `@/components/forms`.
- **Buttons / UI**: `Button`, `ConfirmDialog` from `@/components/ui`.
- **Tokens**: All spacing and colors from `src/styles/theme.css` (e.g. `rounded-card`, `border-border`, `p-section-body`, `text-muted-foreground`). No new design system work.

New pieces:

- **Settings layout**: A layout under `src/app/dashboard/settings/` that wraps all settings pages and renders a small **sidebar or tab nav** (Account | Organization | Configuration) so the Settings area feels consistent. Role-based: hide Organization (and Configuration) for STAFF.
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
  - User invite/update: email, role enum, optional name; reuse existing role type.

---

## 4. Implementation Phases

### Phase 1: Account → Profile

- **Scope**: Current user can view and edit their display name.
- **Backend**: Server action (or `PATCH /api/me`) to update `User.name`; validation schema.
- **UI**: `/dashboard/settings/profile` with one `DetailSection`, form (name field + save). Reuse `FormLayout` (card), `FormField`, `FormActions`.
- **Access**: All authenticated users (no role check beyond `requireAuth()`).
- **Deliverable**: Settings has a real first subsection; STAFF can use it.

### Phase 2: Account → Password

- **Scope**: Current user can change their password (current + new + confirm).
- **Backend**: Server action (or dedicated endpoint) with `changePasswordSchema`; verify current with `compare`, hash new with `hash`, update `passwordHash`.
- **UI**: `/dashboard/settings/password` with form (current, new, confirm). No “forgot password” in this phase (credentials-only).
- **Access**: All authenticated users.
- **Deliverable**: Account section is complete for MVP.

### Phase 3: Organization → Team (Users)

- **Scope**: List users, show role; invite (create user with email, role, optional name); edit user (name, role). No delete/deactivate in this phase if not needed.
- **Backend**: Extend `GET /api/users` to include `role`. Add `POST /api/users` (invite) and `PATCH /api/users/[id]` (update name/role); tenant-scoped, `requireRole([ADMIN, BROKER])`.
- **UI**: `/dashboard/settings/team` — list (table or list with role badges), “Invite user” button → form/modal; edit user → inline or small form. Reuse `DetailSection`, table or list styles, `FormLayout`/`FormField` for invite/edit.
- **Access**: ADMIN, BROKER only.
- **Deliverable**: Brokers can manage team members.

### Phase 4: Organization → Brokerage

- **Scope**: View and edit tenant name (and optionally slug if product agrees).
- **Backend**: `GET /api/tenant` (or rely on `getCurrentTenant()` in RSC) and `PATCH /api/tenant`; guard with `requireRole([ADMIN, BROKER])`.
- **UI**: `/dashboard/settings/brokerage` with form (name, maybe slug). One `DetailSection`.
- **Access**: ADMIN, BROKER only.
- **Deliverable**: Organization settings are complete for MVP.

### Phase 5: Configuration (Optional Later)

- **Insurers**: Add `PATCH`/`DELETE` for insurers if not present; add `/dashboard/settings/insurers` page (list + add/edit/delete). Reuse existing insurers API and policies module.
- **Document types**: Only if we move from enum to tenant-configurable list (new model or JSON); otherwise skip.
- **Workflow**: New feature; out of scope for this proposal.

---

## 5. Recommended Next Step

1. **Decide and document** the exact access rules (e.g. STAFF sees only Account; ADMIN/BROKER see Account + Organization; Configuration later).
2. **Introduce the Settings layout and routing** without new backend:
   - Add `src/app/dashboard/settings/layout.tsx` that renders a Settings sub-nav (Account / Organization / Configuration) and conditionally hides Organization (and Configuration) for STAFF using `getCurrentUser()`.
   - Add placeholder routes: `settings/page.tsx` (index with links), `settings/profile/page.tsx`, `settings/password/page.tsx`, `settings/team/page.tsx`, `settings/brokerage/page.tsx`.
3. **Implement Phase 1 (Profile)** end-to-end: validation schema, server action (or API), and profile page with form. This validates the layout, reuse of components, and auth flow.
4. Proceed with **Phase 2 (Password)**, then **Phase 3 (Team)**, then **Phase 4 (Brokerage)**, and optionally **Phase 5 (Insurers)** when needed.

This keeps the plan realistic: no big refactors, tenant and role checks reuse existing patterns, and the UI stays consistent with the existing design system and layout primitives.
