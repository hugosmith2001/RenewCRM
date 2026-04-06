# DSAR Runbook (Admin operations)

This runbook is for **admins/operators** handling DSAR requests in SafekeepCRM.

It is intentionally operational (what to do in-product), not legal advice.

## Roles and scope

- **Who can run DSAR**: `ADMIN` within a tenant.
- **Tenant isolation**: DSAR requests and execution are tenant-scoped; never run DSAR actions from another tenant session.
- **Notes**: DSAR notes are **operational-only**. Do **not** paste personal data into DSAR notes.

## Intake and identity verification

Before approving any DSAR request:

- Verify requester identity using your organization’s process (e.g. known email channel, account ownership, verified ID procedure).
- Confirm you are acting on the correct **tenant** and correct **subject**.
- Record only **non-PII** operator notes (e.g. “verified via existing support ticket #1234”).

## Subject scoping rules (current product model)

DSAR subjects are referenced by:

- `CUSTOMER`: `Customer.id`
- `CONTACT`: `CustomerContact.id`
- `USER`: `User.id` (export not implemented; restriction/erasure supported operationally)

Be careful with attribution:

- Contact exports do **not** include customer-level activities/tasks/documents/policies unless the data model explicitly links them to a contact.

## Workflow states

DSAR statuses:

- `PENDING` → `IN_REVIEW` → `APPROVED` → `PROCESSING` → `COMPLETED`
- Failure path: `PROCESSING` → `FAILED` (then optionally retry to `PROCESSING`)
- Terminal: `COMPLETED`, `REJECTED`

Invalid transitions are blocked by the backend.

## Approval flow

Typical operator flow:

1. Open **Settings → Admin → DSAR**.
2. Open the DSAR request detail.
3. Click **Move to review**.
4. Verify identity and scope.
5. Click **Approve** (only after verification is complete).

If the request is invalid or cannot be fulfilled, use **Reject** and record a brief operational note elsewhere (ticketing system), not in DSAR notes.

## Export process (requestType = EXPORT)

Prerequisites:

- DSAR request must be **APPROVED**.

Steps:

1. Click **Export**.
2. Wait for completion.
3. Download:
   - **JSON** (canonical portability payload)
   - optional **CSV** summaries for review

Operator notes:

- Export includes free-text fields (`Activity.body`, `Task.description`) when present.
- Export is tenant-scoped and shaped (not raw DB dumps).
- Document blobs are not bundled in the MVP export; only metadata is included.

## Restriction of processing (requestType = RESTRICT)

Prerequisites:

- DSAR request must be **APPROVED**.

Steps:

1. Confirm retention/legal hold requirements.
2. Click **Restrict**.

Expected outcome:

- The subject is marked restricted (`restrictedAt`, `restrictedByUserId`, `restrictionReason`).
- Non-admin access should be blocked where restriction is enforced.

## Erasure / anonymization (requestType = ERASE)

Prerequisites:

- DSAR request must be **APPROVED**.

Steps:

1. Confirm identity verification.
2. Confirm retention/legal hold (some insurance records may require retention; prefer restriction/anonymization over deletion if required).
3. Click **Erase / anonymize** and confirm.

Current operational behavior (MVP):

- **Customer**:
  - deletes customer documents (storage + DB record)
  - redacts customer activities/tasks free-text bodies/descriptions
  - anonymizes customer and contact direct identifiers (name becomes `[ERASED]`, contact fields nulled)
  - marks subject as restricted for safety
- **Contact**: anonymizes contact identifiers and marks restricted
- **User**: deactivates user and changes email to `erased+<id>@example.invalid`, marks restricted, invalidates sessions

## Response handling

- Provide exports via secure channels appropriate for your organization.
- Do not email exports in plaintext if they contain sensitive content.
- Keep the audit trail in-product; keep customer communications in your support/ticketing system.

## Failure handling

If export or execution fails:

- DSAR status moves to `FAILED` (or remains actionable based on the error).
- Investigate without using manual DB edits.
- Fix the underlying issue (permissions, missing subject, storage deletion errors).
- Use **Retry processing** only after the issue is resolved.

## Audit trail expectations

- DSAR request lifecycle is tracked internally via `DsarRequestAction`.
- External audit logging records DSAR actions with **IDs/enums only** (no personal data payloads).

