## GDPR Phase 0 (Governance & prerequisites) — operator-facing

These documents are **operator/governance artifacts** (RoPA, DPIA, incident response, backups). They are not intended to be customer-facing.

For end users, link to the in-app **Privacy notice**: `Settings → Privacy notice (app users)`.

This folder contains the **Phase 0 deliverables** referenced by `GDPR_PLAN.md`: governance artifacts and operational prerequisites that let Renew CRM operate legally while product features are built.

### What’s in here

- `ROPA.md`: Records of Processing Activities (RoPA) draft for this repo’s current data model and architecture.
- `DPIA.md`: DPIA draft (risks + mitigations mapped to product/infra controls).
- `INCIDENT_RESPONSE.md`: breach/incident response runbook (incl. 72-hour notification workflow).
- `BACKUPS.md`: backups policy (retention, encryption, restore testing, and how erasure interacts with backups).
- `SUBPROCESSORS_AND_DPAS.md`: subprocessor/DPA checklist + data residency/transfers decision record.

### How to use

- Treat these as **living documents**. Update them whenever you add new data categories, processors, exports, retention rules, logging, analytics, or storage providers.
- Keep identifiers and examples **non-production** (no real customer data in docs).

