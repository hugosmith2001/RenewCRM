# Customer privacy & security overview (Renew CRM)

This document is intended for **customers evaluating or using Renew CRM** (vendor due diligence). It summarizes what the product does with data, at a high level, without requiring you to read implementation details.

If you’re an end user of the application, the primary in-app notice is: **Settings → Privacy notice (app users)**.

---

## What Renew CRM is

Renew CRM is a CRM used by a brokerage to manage customer relationships and related work (customers/contacts, policies, tasks/activities, and documents).

## What data is processed

Typical categories processed when using the product:

- **User account data**: account identifiers such as email and name (used for login and access).
- **Customer and contact details**: names and contact details (email/phone/address).
- **Work records**: tasks and activity notes (may contain personal data depending on what users enter).
- **Policy-related records**: policy information and insurer-related metadata.
- **Documents**: uploaded files and related metadata.
- **Security and audit data**: records used to secure and operate the service (e.g., action types, entity IDs, timestamps).

## Who is responsible for the data (controller vs processor, practical view)

- The **brokerage using Renew CRM** is typically the **controller** for customer data entered into the CRM.
- The Renew CRM **service operator** typically acts as a **processor** for that customer data to provide and secure the service.
- For **platform operational data** (accounts, authentication, security/audit), the operator typically acts as the **controller**.

## How documents are protected

- Documents are not exposed as public links by default.
- Downloads are mediated by authenticated server routes (the app checks access before returning bytes).
- Storage should be configured with **encryption at rest** and restricted access (operator responsibility).

More details: `docs/STORAGE_SECURITY.md`.

## Retention and deletion (high-level)

- The product supports **soft deletion** and **scheduled purge** to remove data after retention windows.
- **Legal hold** / **restriction of processing** can block destructive deletion where required.
- **Backups may temporarily retain deleted data** until backup retention expires (backup retention is operator-managed).

More details: `docs/RETENTION_AND_PURGE.md` and `docs/gdpr/BACKUPS.md`.

## Cookies

- Renew CRM uses **essential cookies** for authentication and session security.
- The current repository does **not** include analytics/advertising cookies by default.

More details: `docs/COOKIE_NOTICE.md`.

## Subprocessors (vendors)

Depending on deployment, the operator may use vendors for hosting, database, storage, logging/monitoring, etc.

More details: `docs/SUBPROCESSORS.md`.

## Incident response (what happens if something goes wrong)

The operator maintains an incident response process for containment, investigation, and notification obligations (depending on roles and impact).

More details: `docs/gdpr/INCIDENT_RESPONSE.md`.

