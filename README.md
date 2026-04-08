Renew CRM – Settings MVP Implementation Plan
This README specifies a strict, least‑privilege implementation plan for the Settings MVP, grounded in the current Renew CRM codebase.

It does not include implementation code; it defines routes, APIs, permissions, schemas, model changes, safeguards, and phases.

1. Scope & Non‑Goals
In scope

Account Settings for all authenticated users:
Profile (update own display name).
Password (change own password).
Organization Settings for ADMIN only:
Brokerage (update tenant name; slug read‑only).
Team (list/create/update users within tenant, with explicit safeguards).
Introduction of User.isActive for active/inactive lifecycle, not deletion.
Non‑goals for MVP

No email change or verification flows.
No password reset via email/magic links.
No BROKER access to Brokerage or Team pages/APIs.
No configuration pages (e.g. Insurers) under Settings.
No hard delete for users (only active/inactive).
No tenant slug updates via UI or backend.
2. Core Rules & Safeguards
Role permissions

Account (Profile, Password): all authenticated roles (ADMIN, BROKER, STAFF).
Organization (Brokerage, Team): ADMIN only in MVP.
Do not assume BROKER == ADMIN; do not widen Organization permissions beyond ADMIN.
Tenant derivation

Rule: No Settings route or API should accept tenantId from client input when it can be derived from the session.
Tenant must always be derived from SessionUser.tenantId via getCurrentUser() / requireAuth() / requireRole().
Any tenantId in the database queries must be sourced from the session, not the request body/query.
Tenant slug

Tenant.slug is read‑only in both UI and backend for MVP.
No API should accept slug as an updatable field.
Brokerage UI may display slug but never provide a field to edit it.
Temp‑password creation (MVP‑only shortcut)

When creating users via Settings:
Never store plaintext temp passwords in the database.
Never log temp passwords (no console.log, no audit metadata).
Only expose a generated temp password once at creation time, and only if absolutely necessary.
Clearly document in UI copy and code comments that this is a temporary MVP shortcut to be replaced by a token/email‑based invite.
Last‑admin safeguards

An ADMIN must not be able to:
Demote themselves (e.g. to BROKER or STAFF) if they are the last active ADMIN in the tenant.
Deactivate themselves (isActive = false) if they are the last active ADMIN in the tenant.
Any user update API must:
Count active admins in the tenant before applying changes to role/isActive.
Reject changes that would result in zero active admins.
Inactive users

Once User.isActive is introduced:
Inactive users must not be able to log in.
The auth layer (NextAuth credentials callback) must eventually:
Check isActive === true before authenticating.
Treat isActive === false as invalid credentials.
This check can be implemented after the MVP UI, but must be explicitly noted as required follow‑up.
3. Recommended Routes (App Router)
All routes are under src/app/dashboard/settings, using a shared layout.

Layout

src/app/dashboard/settings/layout.tsx
Uses getCurrentUser() from @/modules/auth.
Redirects unauthenticated users to /login.
Renders navigation:
Account
Profile → /dashboard/settings/profile
Password → /dashboard/settings/password
Visible for any authenticated role.
Organization
Brokerage → /dashboard/settings/brokerage
Team → /dashboard/settings/team
Visible only when user.role === ADMIN (MVP).
Pages

src/app/dashboard/settings/page.tsx
Index; uses getCurrentUser() and:
Redirects any authenticated user to /dashboard/settings/profile.
No longer enforces ADMIN/BROKER gate (Account is for all).
src/app/dashboard/settings/profile/page.tsx
Account → Profile (all authenticated).
src/app/dashboard/settings/password/page.tsx
Account → Password (all authenticated).
src/app/dashboard/settings/brokerage/page.tsx
Organization → Brokerage (ADMIN only; link hidden for others and backend‑guarded).
src/app/dashboard/settings/team/page.tsx
Organization → Team (ADMIN only; backend‑guarded).
4. API Structure (New Settings‑Scoped Endpoints)
All endpoints live in src/app/api and use requireAuth / requireRole / assertTenantAccess from @/modules/auth.

4.1 Account APIs
Profile

src/app/api/me/profile/route.ts
PATCH:
Guard: requireAuth().
Validate body with updateProfileSchema.
Update current user:
where: { id: user.id }.
data: { name } only.
Response: minimal shape ({ name } or { id, name, email }), never passwordHash.
Password

src/app/api/me/password/route.ts
POST:
Guard: requireAuth().
Validate body with changePasswordSchema.
Fetch DB user by id from session; do not trust client‑provided IDs.
Verify currentPassword with existing bcrypt compare (from auth module).
Hash newPassword with existing hash function.
Update passwordHash only.
Response: success/failure; no password details.
4.2 Organization APIs – Brokerage
src/app/api/tenant/route.ts
GET:
Guard: requireAuth().
Use getCurrentTenant(); if null, return 404 or 403.
Response: minimal { name, slug }.
PATCH:
Guard: requireRole([Role.ADMIN]).
Validate body with updateTenantSchema.
Update only:
where: { id: user.tenantId } (from session).
data: { name }.
No slug in schema or update; slug remains read‑only.
4.3 Organization APIs – Team (Settings‑Scoped)
Do not overload the existing generic /api/users dropdown endpoint.
Instead, introduce Settings‑scoped endpoints.

Admin list

src/app/api/settings/users/route.ts
GET:
Guard: requireRole([Role.ADMIN]).
Query:
where: { tenantId: user.tenantId }.
Select: id, name, email, role, isActive.
Response: full team list for the tenant, including roles and active status.
Create user (temp‑password, MVP‑only)

src/app/api/settings/users/route.ts
POST:
Guard: requireRole([Role.ADMIN]).
Validate body with createUserSchema.
Generate a random temp password; never stored or logged in plaintext.
Hash temp password immediately and store only the hash in passwordHash.
Create user with:
tenantId: user.tenantId (from session).
email, role, optional name.
isActive: true by default.
Response:
Must not include passwordHash.
If you choose to expose the temp password at all, do it once in the response body, with clear warnings, and never log it.
Update user (role/name/isActive)

src/app/api/settings/users/[id]/route.ts
PATCH:
Guard: requireRole([Role.ADMIN]).
Fetch the target user by id path param.
Enforce tenant scoping:
assertTenantAccess(currentUser, targetUser.tenantId).
Validate body with updateUserSchema (name, role, isActive as optional fields).
Last‑admin safeguards:
Before applying changes that:
Demote a user from ADMIN to BROKER or STAFF, or
Set isActive from true to false for an ADMIN,
Compute:
activeAdminCount = count(User where tenantId = currentUser.tenantId AND role = ADMIN AND isActive = true).
If targetUser.id === currentUser.id and activeAdminCount === 1, reject the update (cannot demote/deactivate last active admin).
Apply updates only if safeguards pass.
Response: updated user (without passwordHash).
5. Role Permissions (Settings Context)
Account

/dashboard/settings/profile, /dashboard/settings/password.
/api/me/profile, /api/me/password.
Guard: requireAuth() (any authenticated user).
Roles: ADMIN, BROKER, STAFF.
Organization – Brokerage

/dashboard/settings/brokerage.
/api/tenant (GET open to all authenticated for read; PATCH ADMIN only).
UI nav: only visible for ADMIN.
Backend guard for updates: requireRole([Role.ADMIN]).
Organization – Team

/dashboard/settings/team.
/api/settings/users (GET, POST).
/api/settings/users/[id] (PATCH).
UI nav: only visible for ADMIN.
Backend guard: requireRole([Role.ADMIN]) on all Team endpoints.
BROKER is explicitly excluded from Organization APIs in MVP.
6. Editable vs Read‑Only Fields (MVP)
Editable

Profile
User.name (self only).
Password
User.passwordHash via password change flow (self only).
Brokerage
Tenant.name (ADMIN only).
Team
User.name (ADMIN can edit others).
User.role (ADMIN can change roles, subject to last‑admin safeguards).
User.isActive (ADMIN can deactivate/reactivate users, subject to last‑admin safeguards).
Read‑only

Tenant.slug (displayed but not editable).
User.email (may be shown but not editable in Settings MVP).
User.id, User.tenantId (never client‑editable).
Any data used to derive tenant or auth (no overrides from client).
Lifecycle

No hard delete for User; use isActive to represent inactive users.
7. Prisma / Model Changes
User lifecycle flag

Update User model in prisma/schema.prisma:
Add: isActive Boolean @default(true).
Use this in:
Settings Team APIs (list, update).
Future: auth/login checks (see below).
No change to Tenant beyond using existing name and slug:

Do not add or modify slug behavior for MVP.
Auth follow‑up (not in first code drop but required)

In the NextAuth credentials callback or wherever login checks happen:
After fetching the user by email within tenant:
Ensure user.isActive === true.
If false, behave as “invalid credentials” and deny login.
This ensures inactive users cannot log in once Settings starts toggling isActive.
8. Validation Schemas
Add new schemas in src/lib/validations/settings.ts (or similar) using zod to match existing patterns.

Profile

updateProfileSchema:
name: z.string().trim().min(1).max(100) (or similar).
Password

changePasswordSchema:
currentPassword: z.string().min(1).
newPassword: z.string().min(8) with optional strength rules.
confirmNewPassword: z.string().min(8).
Refinement: newPassword === confirmNewPassword.
Optional refinement: newPassword !== currentPassword.
Tenant

updateTenantSchema:
name: z.string().trim().min(1).max(150).
No slug field at all.
Team

createUserSchema:
email: z.string().email().
role: z.nativeEnum(Role) (or equivalent).
name: z.string().trim().min(1).max(100).optional().
updateUserSchema:
name: z.string().trim().min(1).max(100).optional().
role: z.nativeEnum(Role).optional().
isActive: z.boolean().optional().
Each schema should export both schema and type (export type XxxInput = z.infer<typeof xxxSchema>).

9. Safeguards Summary
Tenant & auth

Derive tenantId exclusively from session; never trust client‑supplied tenant IDs.
Use requireAuth / requireRole on all Settings APIs.
Use assertTenantAccess when updating users by ID.
Slug & sensitive fields

Do not accept slug in any Settings API payload.
Never return or log passwordHash.
Avoid returning unnecessary internal identifiers.
Temp‑password creation

Generate random temp passwords; hash immediately.
No plaintext storage or logging.
Expose at most once at creation time with clear “temporary shortcut” labeling.
Last active admin

Any update that demotes or deactivates an ADMIN must:
Verify that there is more than one active admin in the tenant.
If target is current user and they are the last active admin, reject the change.
Inactive users

Login logic must eventually enforce isActive.
Non‑admin dropdowns/assignments should generally exclude inactive users.
10. Phased Implementation Order

Phase 0 – Layout & Routing (no mutations)

Add settings/layout.tsx with role‑aware nav (Account for all auth; Organization for ADMIN only).
Adjust settings/page.tsx to redirect authenticated users to /dashboard/settings/profile.
Create placeholder pages for Profile, Password, Brokerage, Team.

Phase 1 – Account → Profile

Add updateProfileSchema and type.
Implement PATCH /api/me/profile with requireAuth() and Prisma update on User.name.
Implement /dashboard/settings/profile using shared form/layout components.

Phase 2 – Account → Password

Add changePasswordSchema and type.
Implement POST /api/me/password with requireAuth(), bcrypt compare/hash.
Implement /dashboard/settings/password UI form.

Phase 3 – User Lifecycle Support

Add isActive Boolean @default(true) to User.
Migrate DB.
No UI yet; just ensure the field exists for later phases.

Phase 4 – Organization → Brokerage (ADMIN only)

Add updateTenantSchema.
Implement GET/PATCH /api/tenant:
GET guarded by requireAuth(), returns { name, slug }.
PATCH guarded by requireRole([Role.ADMIN]), updates name only.
Implement /dashboard/settings/brokerage UI.

Phase 5 – Organization → Team (ADMIN only, with temp password)

Add createUserSchema and updateUserSchema.
Implement:
GET /api/settings/users for admin team list (tenant‑scoped).
POST /api/settings/users to create users with temp passwords (shortcut).
PATCH /api/settings/users/[id] with last‑admin safeguards and tenant checks.
Implement /dashboard/settings/team UI (list, invite, edit).

Phase 6 – Auth Hardening & Inactive Enforcement

Update auth/login logic to:
Check user.isActive === true.
Deny login otherwise.
Optionally update non‑admin dropdowns to hide inactive users.

Phase 7 – Future Enhancements (post‑MVP)

Replace temp‑password invites with token/email flows.
Consider expanding limited Organization permissions to BROKER via a separate proposal.
Add audit logging for Settings changes if needed.
This plan keeps the Settings MVP tightly scoped, minimizes risky changes, and aligns with strict multi‑tenant safety and least‑privilege principles, while fully reusing the existing auth, routing, validation, and UI architecture.