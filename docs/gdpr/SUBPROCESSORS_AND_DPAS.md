# Subprocessors and DPAs (operator checklist)

This file is referenced by `docs/gdpr/README.md` and `docs/gdpr/ROPA.md`, but the repository does not hardcode vendor choices. Use this as an **operator-maintained checklist**.

## Subprocessor transparency source of truth

- **Primary list**: `docs/SUBPROCESSORS.md`
- Keep `docs/SUBPROCESSORS.md` updated when you change hosting/DB/storage vendors or add any third-party SaaS (logs, analytics, support, email).

## DPA / contract checklist (operator must complete)

For each subprocessor you use in production, record:

- vendor legal name
- service/category (hosting, DB, storage, logging, etc.)
- data types processed
- processing locations/regions
- DPA link/reference and execution status
- cross-border transfer safeguards (if applicable)
- security commitments relevant to your DPIA (encryption, access controls, incident notification)

### Status

- **TODO**: complete for your actual deployment environment.

