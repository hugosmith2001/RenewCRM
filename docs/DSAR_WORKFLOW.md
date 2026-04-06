# DSAR Workflow (Foundation)

This document describes the **Phase 3A DSAR workflow foundation** in SafekeepCRM.

## Scope (Phase 3A)

- DSAR request tracking and lifecycle management
- Subject type + subject reference linkage
- Admin-only API endpoints for managing DSAR requests
- Operator action history (internal) and audit alignment (external audit log)

### Not in scope yet

- Full **export bundle generation**
- Destructive **erasure** implementation
- Full **restriction** enforcement in all read paths

## Supported request types

- **EXPORT**: prepare an export for the data subject (not generated yet in Phase 3A)
- **ERASE**: request erasure (not executed yet in Phase 3A)
- **RESTRICT**: request restriction of processing (not enforced yet in Phase 3A)

## Supported subject types

All DSAR requests are tenant-scoped.

- **CUSTOMER**: `Customer.id`
- **CONTACT**: `CustomerContact.id`
- **USER**: `User.id`

## Workflow states

DSAR requests use a simple lifecycle designed for repeatable, audited handling:

- **PENDING**
- **IN_REVIEW**
- **APPROVED**
- **PROCESSING**
- **COMPLETED**
- **FAILED**
- **REJECTED**

### Allowed transitions (Phase 3A)

- `PENDING` → `IN_REVIEW` | `REJECTED`
- `IN_REVIEW` → `APPROVED` | `REJECTED`
- `APPROVED` → `PROCESSING`
- `PROCESSING` → `COMPLETED` | `FAILED`
- `FAILED` → `PROCESSING` | `REJECTED`

`COMPLETED` and `REJECTED` are terminal in Phase 3A.

## Operator responsibilities

- Use the admin DSAR API to create and manage DSAR requests (no manual DB workflows).
- Keep operator notes **operational only** (avoid personal data). Notes exist to document decisions and processing steps.
- Move requests through lifecycle states intentionally; invalid transitions are rejected.

## Audit trail (alignment)

Two layers exist:

- **Internal DSAR history**: `DsarRequestAction` records request lifecycle actions (created / status changes / notes).
- **Audit log integration**: every DSAR request creation and status change emits an `AuditEvent` with:
  - operator user ID
  - action type (CREATE/UPDATE)
  - entity type `DsarRequest`
  - entity ID (DSAR request ID)
  - metadata limited to **IDs and enums only** (no personal data payloads)

## Admin API (Phase 3A)

All endpoints require **ADMIN** role and enforce tenant isolation.

- `GET /api/admin/dsar`
  - List DSAR requests (supports filters: `status`, `requestType`, `subjectType`, `subjectRefId`, plus paging)
- `POST /api/admin/dsar`
  - Create a DSAR request
- `GET /api/admin/dsar/:id`
  - Get request detail including action history
- `PATCH /api/admin/dsar/:id`
  - Transition request status (with optional operational note)

