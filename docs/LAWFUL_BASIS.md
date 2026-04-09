# Lawful basis overview (operator-facing)

## Who this is for

This document is for **operators/admins** deploying Renew CRM and completing their compliance package.

If you need an **end-user summary**, link users to the in-app **Privacy notice**: `Settings → Privacy notice (app users)`.

## Plain-language summary

- Renew CRM supports a **multi-tenant** setup: your organization controls what customer data is entered and how it’s used.
- For **tenant customer data**, the tenant is usually the **controller** and the Renew CRM operator is usually a **processor**.
- For **platform operational data** (accounts, authentication, security/audit), the Renew CRM operator is usually a **controller**.
- The lawful basis depends on the data and purpose; common bases for platform operations are **contract** and **legitimate interests (security)**.
- This is a **repo-grounded overview**, not legal advice; adapt it to your actual deployment and counsel review.

---

This document summarizes **typical lawful bases** for processing implied by the current Renew CRM repository. It is written for the **Renew CRM operator** (service provider) and should be reviewed with counsel for your actual deployment.

Important:

- Renew CRM is a **multi-tenant CRM**. Depending on the data category, the operator may act as a **processor** (tenant customer data) and a **controller** (platform account/auth/security data).
- Tenants/controllers are responsible for determining the lawful basis for **their** customer data and for providing appropriate notices to their customers.

## Role split used in this repo

### Tenant customer data (operator as processor, tenant as controller)

Examples in this repo:

- Customers, contacts, policies, insured objects
- Tasks and activities (including free-text)
- Documents and document metadata

Repo grounding: Prisma models in `prisma/schema.prisma` and API routes under `src/app/api/customers/**`.

Lawful basis:

- The **tenant/controller** determines the lawful basis (commonly contract, legitimate interests, or legal obligations depending on the tenant’s business).
- The operator relies on the **data processing agreement (DPA)** + tenant instructions for processor activities.

### Platform operational data (operator as controller)

Examples in this repo:

- User accounts and authentication (`User`, Auth.js / NextAuth)
- Security and operational audit data (`AuditEvent`)
- Security controls (rate limiting, session invalidation)

Repo grounding:

- Auth: `src/auth.ts`, `src/auth.config.ts`, `src/modules/auth/session.ts`, `docs/AUTH_SECURITY.md`
- Audit: `src/modules/audit/service.ts`, `src/app/api/audit/route.ts`

Typical lawful bases:

- **Contract** (GDPR Art. 6(1)(b)): to provide the SaaS to tenant customers and enable user access
- **Legitimate interests** (GDPR Art. 6(1)(f)): to secure the service (audit logging, abuse prevention, incident investigation)
- **Legal obligations** (GDPR Art. 6(1)(c)) where applicable: e.g., security and compliance duties depending on jurisdiction and sector

## Purpose limitation (what the repo implements)

The current repository supports these purposes in code:

- **Provide CRM features** for a tenant: create/update customer records, manage policies, upload/download documents, manage tasks/activities.
- **Secure the platform**: authenticate users, restrict access by role, rate limit high-risk endpoints, log audit events.
- **Enforce retention/purge**: apply default retention periods with optional tenant overrides and execute purge with legal-hold/restriction checks.

Repo grounding:

- Retention and purge: `src/modules/retention/service.ts`, `src/jobs/purge-nightly.ts`, `docs/RETENTION_AND_PURGE.md`

## Notes on consent and cookies

This repository currently documents and implements **essential cookies** for authentication/session security only. It does **not** include analytics or advertising cookies by default.

Repo grounding: `docs/COOKIE_NOTICE.md`, `src/auth.config.ts`.

If you add analytics, support widgets, error monitoring, or other third-party scripts, you may need:

- consent/opt-in handling (where required)
- updated cookie disclosures and subprocessor transparency

