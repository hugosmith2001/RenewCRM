# Cookie notice (Renew CRM)

This notice describes cookie usage that is **actually implemented in this repository**.

## What cookies Renew CRM uses today

Renew CRM uses **essential cookies** to support authentication and session security via Auth.js / NextAuth v5.

- **Session cookie**: `authjs.session-token`
  - **Purpose**: keep the user signed in and authorize authenticated requests
  - **Scope**: set for the application path `/`
  - **Security flags (configured in `src/auth.config.ts`)**:
    - `HttpOnly: true`
    - `SameSite: lax`
    - `Secure: true` in production

The password-change route also clears `__Secure-authjs.session-token` as a best-effort sign-out (`src/app/api/me/password/route.ts`) because Auth.js may apply the `__Secure-` prefix automatically when `Secure` cookies are enabled.

## What Renew CRM does not include by default

Based on the current `package.json` dependencies and `src/` code:

- No analytics/tracking libraries are included by default.
- No advertising cookies or marketing tags are included by default.
- No cookie consent banner is implemented (because there are no non-essential cookie categories implemented in-app).

## If you add non-essential cookies later

If you add analytics, error monitoring, chat widgets, or other third-party scripts that set cookies, update:

- this notice to list the new cookie categories and tools
- the UI to collect consent **before** setting non-essential cookies (where required)
- `docs/SUBPROCESSORS.md` for any new vendors involved

