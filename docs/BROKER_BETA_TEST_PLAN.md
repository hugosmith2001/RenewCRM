# Broker Beta Test Plan (MVP)

This document explains how to let real insurance brokers test Renew CRM **without** running it locally, while keeping risk low and feedback high-signal.

## Goals

- **Get real broker usage**: validate workflows, usability, and missing features.
- **Keep risk low**: prevent accidental exposure of real customer data, minimize downtime, and reduce security/privacy mistakes.
- **Move fast**: deploy small changes frequently while tracking issues.

## Non-goals (for the beta)

- **No production promise**: this is a testing environment, not a live system for real customers.
- **No “perfect” security/compliance**: instead, meet a reasonable MVP baseline and document what’s not ready.

## Recommended approach (high level)

- **Host a “beta” environment** on the internet (HTTPS) with a real database.
- **Create a “broker onboarding” flow** (manual is fine for MVP): each broker gets their own tenant + test users.
- **Use synthetic/demo data only** (or tightly controlled real data if absolutely necessary).
- **Add a feedback loop** (form + issue tracker + weekly check-ins).
- **Monitor + log** enough to debug, but never collect sensitive data unnecessarily.

## Phase 0 — Decide your beta posture (1–2 hours)

- **Pick beta audience size**:
  - *Small beta (recommended)*: 3–5 brokers you know personally.
  - *Medium beta*: 10–20 brokers; expect significantly more support + stability work.
- **Define the test scope**:
  - What tasks brokers should try (e.g., “create a client, create a policy, add a task, upload a document, log an activity”).
  - What is explicitly out of scope (e.g., “do not store real client PII yet”).
- **Choose success criteria**:
  - Example: “3 brokers complete the end-to-end workflow in <15 minutes without assistance.”

## Phase 1 — Create a deployable “beta” environment (1–2 days)

### 1) Hosting options

Pick one. For an MVP beta, simplicity beats flexibility:

- **Vercel (recommended for Next.js)**:
  - Pros: fastest setup, SSL + domains easy, preview deploys.
  - Cons: background jobs/cron require add-ons or separate worker; some limits.
- **Render / Fly.io**:
  - Pros: full control, easier long-running processes.
  - Cons: slightly more setup/ops.
- **AWS/GCP/Azure**:
  - Pros: maximum control.
  - Cons: slowest to set up; more ops burden (not ideal for MVP beta).

### 2) Database

- Use a **managed Postgres** (recommended for Prisma apps).
- Keep **beta database separate** from any future production database.
- Enable:
  - **Automated backups**
  - **Encryption at rest** (managed providers usually offer this)
  - **IP/network restrictions** if supported

### 3) Environments and domains

- Create at least:
  - **Beta**: for brokers to use (stable).
  - **Preview/Staging**: for you to test changes before beta.
- Use clear domains:
  - Example: `beta.yourdomain.com` and `staging.yourdomain.com`
- Ensure:
  - **HTTPS only**
  - **Secrets stored in the host’s secret manager**, not in the repo.

### 4) Basic operational readiness

- **Error tracking**: choose one (Sentry or similar) so you can see crashes.
- **Uptime monitoring**: lightweight ping monitoring is enough for beta.
- **Logging**:
  - Log app errors and key events.
  - Avoid logging sensitive content (especially documents, passwords, or full customer details).

## Phase 2 — Broker onboarding & access (1–2 days)

### 1) Create a broker onboarding checklist (manual is fine)

For each broker tester:

- **Create a tenant** for their brokerage (isolated data).
- **Create at least 2 users**:
  - 1 Admin (for setup)
  - 1 Broker/Staff (day-to-day role)
- Provide:
  - Beta URL
  - Username(s)
  - Temporary password(s)
  - Instructions to change password on first login (or immediately after first access)

### 2) Provide a 10-minute “getting started” script

Send brokers a short checklist of actions to try (example):

- Log in
- Create a client/contact
- Create a policy
- Add a task with due date
- Upload a document
- Log an activity/note
- Find/edit the record later

### 3) Support channel

Pick one primary channel to avoid fragmentation:

- Email thread (simplest)
- WhatsApp/Signal group (fast)
- Slack (best for multiple brokers + you)

Set expectations:

- Your support hours
- How quickly you’ll respond
- What type of feedback is most helpful (screenshots, exact steps, expected vs actual)

## Phase 3 — Data safety rules (must-do for beta)

### 1) Demo data only (recommended)

Ask brokers to use:

- Fake names and fake policy numbers
- No real ID numbers
- No real addresses/phone numbers if possible

### 2) If real data is unavoidable

If a broker insists on using real customer info, set a strict boundary:

- **Minimize**: only the smallest set of fields needed.
- **Document consent/authority**: ensure they are allowed to process that data in a beta tool.
- **Retention**: define purge timing (example: “delete all beta data every 30 days”).

### 3) Documents are highest risk

For MVP beta, consider:

- Allowing only non-sensitive document types (or disabling uploads in beta if not ready)
- Clear UI text: “Do not upload documents containing national IDs / bank info / medical details”

## Phase 4 — Feedback loop that actually works (ongoing)

### 1) Collect structured feedback

Use a simple form with:

- What were you trying to do?
- What happened?
- What did you expect?
- Screenshot/video upload (optional)
- Severity (blocking / annoying / suggestion)

### 2) Turn feedback into a single backlog

Choose one:

- GitHub Issues
- Linear / Jira / Trello
- Notion database

Rule: **Every piece of feedback becomes a tracked item** (even if you close it).

### 3) Weekly cadence

- 20–30 minute call with each broker weekly (or biweekly).
- Ask:
  - “What did you try?”
  - “Where did you get stuck?”
  - “What would make you switch from spreadsheets tomorrow?”

## Phase 5 — Release process (so brokers aren’t surprised)

### 1) A “beta release” discipline

- Deploy at predictable times (e.g., evenings).
- Keep a short changelog:
  - What changed
  - What to re-test
  - Known issues

### 2) Protect broker testing from breaking changes

- Prefer additive changes over renames/removals.
- If you must change workflows, message brokers in advance.

## Phase 6 — Security baseline checklist (MVP-friendly)

Minimum baseline before inviting external brokers:

- **Authentication**: strong password policy; rate-limit login attempts if possible.
- **Session security**: secure cookies in production, HTTPS-only.
- **Authorization**: strict tenant isolation everywhere.
- **Secrets**: all secrets in the host secret manager; rotate if exposed.
- **Backups**: automated DB backups enabled.
- **Access control**: restrict admin access to your hosting and DB consoles.

## Phase 7 — Exit criteria (when to end beta / go to production)

Move toward a production launch when:

- Brokers can reliably complete the core workflow end-to-end.
- The top 10 issues are fixed (especially data loss / auth / tenant leakage).
- You have a retention/purge policy and can execute it.
- You have a minimal incident response path (how you detect, respond, and notify).

## What I would do next (recommended sequence)

- **Set up beta hosting + managed Postgres**
- **Create 3 broker tenants + accounts**
- **Send a 10-minute test script**
- **Run a 1-week beta sprint** (daily triage, 1–2 deploys/day)
- **Lock down a short roadmap** based on actual broker behavior

