# Incident response (breach runbook) – draft (operator-facing)

## Who this is for

This runbook is for **operators/on-call responders**. It is not meant to be customer-facing.

If you need user-facing privacy information, link to the in-app **Privacy notice**: `Settings → Privacy notice (app users)`.

## Plain-language summary

- This document describes how the operator should respond to suspected security/privacy incidents.
- The first priorities are **containment**, **evidence preservation**, and **impact assessment**.
- Notification steps depend on whether the incident affects tenant customer data (processor context) or platform operational data (controller context).

---

This runbook is **repo-grounded** and intended for the **Renew CRM operator**. It must be adapted to your actual hosting/logging/monitoring stack.

## Scope

Incidents include:

- suspected credential stuffing / brute force on auth endpoints
- suspicious downloads or unusually high document access volume
- cross-tenant access bugs
- data deletion/purge failures leading to inconsistent state
- infrastructure compromise (DB/storage exposure)

Repo grounding:

- Auth protections: `docs/AUTH_SECURITY.md`, `src/lib/rate-limit.ts`
- Audit logging: `src/modules/audit/service.ts`, `src/app/api/audit/route.ts`
- Retention/purge failure logging: `src/modules/retention/service.ts`, `src/jobs/purge-nightly.ts`

## Immediate actions (first hour)

- **Contain**:
  - rotate secrets/credentials as needed (Auth secret, DB credentials, storage keys)
  - disable affected accounts (set `User.isActive=false`) and/or invalidate sessions (increment `User.sessionVersion`)
- **Preserve evidence**:
  - snapshot relevant logs (auth, audit, reverse proxy, application)
  - capture timestamps, tenant IDs, user IDs, entity IDs (avoid copying personal data)
- **Assess blast radius**:
  - identify affected tenant(s), entity types, time window
  - determine whether document bytes may have been exposed

## Triage checklist

- Was there **unauthorized access** to personal data?
- Did the event involve **tenant customer data** (operator as processor) or **platform operational data** (operator as controller)?
- Is there a credible risk to individuals (identity theft, fraud, confidentiality exposure)?

## Notifications (GDPR framing)

This repository cannot determine your legal duties, but operationally:

- If you are acting as **processor**, you typically notify the affected **tenant/controller** without undue delay.
- If you are acting as **controller** for platform operational data, you may have controller notification obligations.

Record:

- incident summary
- detection source
- time discovered and time contained
- data categories involved (avoid listing real identifiers in the runbook)
- mitigations applied and follow-ups

## Follow-ups (within days)

- root cause analysis and corrective actions
- patch release and regression tests
- update DPIA and RoPA if new risks/processing changes were identified
- document any subprocessor/security changes

