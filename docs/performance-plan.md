# Performance plan (RenewCRM)

Goal: make the app feel “instant” by reducing server/DB latency, request count, and client hydration cost.

This plan is ordered by ROI and safety. Each step includes what to measure, what to change, and where.

---

## 0) Establish a baseline (no changes yet)

### What to measure
- **RSC request count & duration** on the slow pages (Chrome DevTools → Network).
- **TTFB** for the slowest requests (DevTools → Timing).
- **Server-side duration** per route (Vercel logs/analytics).
- **DB query count & duration** per request (Prisma logs or explicit timing).

### Where
- Likely pages: `src/app/dashboard/customers/[id]/page.tsx` (customer detail), `src/app/dashboard/page.tsx`, `src/app/dashboard/documents/page.tsx`
- Related API routes (customer page typically triggers these):
  - `src/app/api/customers/[id]/documents/route.ts`
  - `src/app/api/customers/[id]/tasks/route.ts`
  - `src/app/api/customers/[id]/activities/route.ts`
  - `src/app/api/customers/[id]/contacts/route.ts`
  - `src/app/api/customers/[id]/insured-objects/route.ts`

### Output artifacts
- Save a screenshot of Network timings before/after changes.
- Note the slowest 3 routes and their median durations.

---

## 1) Fix “many medium-slow requests” by collapsing fetches

### Why
Multiple RSC fetches at 350–800ms each makes the page feel slow even if JS is small.

### Approach A (preferred): single server load in page
- In `src/app/dashboard/customers/[id]/page.tsx` (and any nested server components), fetch all needed data in **one place**, in **parallel**:
  - Use `Promise.all([...])` for the required service calls.
  - Pass results down as props to client components.

### Approach B: create one aggregation endpoint
- Add: `src/app/api/customers/[id]/overview/route.ts`
  - Returns `{ customer, documents, tasks, activities, contacts, insuredObjects, policies }` (only what UI needs).
- Update the customer page to call **only** `/api/customers/[id]/overview`.

### Files to change/create
- Change: `src/app/dashboard/customers/[id]/page.tsx` (and any subcomponents that currently trigger separate loads)
- Optional add: `src/app/api/customers/[id]/overview/route.ts`

### Success criteria
- Reduce RSC fetch count for customer page from ~5–6 to **1–2**.
- Improve “time to interactive feel” by ~30–60% on that page.

---

## 2) Ensure DB work is parallel and not “waterfall”

### What to do
- Replace sequential awaits with `Promise.all` where independent.
- Avoid patterns like:
  - `for (...) await prisma...` (N+1)
  - fetch IDs then loop to fetch each record

### Where to look
- Service modules:
  - `src/modules/documents/service.ts`
  - `src/modules/customers/*`
  - `src/modules/tasks/*`
  - `src/modules/activities/*`
- Any API route doing multiple reads before responding.

### Success criteria
- Fewer total queries per request.
- Lower p95 duration for the affected route.

---

## 3) Add/verify the right DB indexes (huge ROI if missing)

### Why
Most pages filter on tenant/customer + “not deleted” + order by createdAt.

### What to add (typical, confirm with actual Prisma queries)
Create compound indexes for common patterns (examples):
- `Document(tenantId, customerId, deletedAt, createdAt)`
- `Task(tenantId, customerId, status, dueDate)` (if you sort/filter by these)
- `Activity(tenantId, customerId, createdAt)`
- `Customer(tenantId, deletedAt, name)` (if you sort by name)

### Where
- Prisma schema: `prisma/schema.prisma` (add `@@index([...])`)
- Migration will be generated after schema changes.

### Success criteria
- DB time drops significantly on list endpoints.
- “same query, same filters” becomes consistently fast under load.

---

## 4) Reduce cross-region latency (often the main culprit)

### Why
If Vercel runs in one region and DB in another, every request pays extra RTT.

### What to do
- Put **Vercel functions** and **DB** in the **same region**.
- Put **S3** in a nearby region too (or at least avoid worst-case RTT).

### Implementation notes (Next.js / Vercel)
- If the DB is in **Neon eu-central-1**, prefer **Vercel `fra1` (Frankfurt)**.
- Pin the hottest server work close to the DB:
  - Add `export const preferredRegion = "fra1";` to:
    - `src/app/dashboard/customers/[id]/page.tsx`
    - `src/app/api/customers/[id]/**/route.ts` (the customer detail page’s API calls)
  - For Node-specific routes (streams, S3, etc.) keep `export const runtime = "nodejs";` and add `preferredRegion` alongside it.

### Where
- Vercel project settings (region / function location)
- DB provider settings (Neon region)
- S3 bucket region (AWS)

### Success criteria
- Median TTFB drops by 100–300ms on affected routes.

---

## 5) Add caching where it’s safe

### Server-side caching options
- For server components that render lists:
  - Use short revalidation windows (e.g. 10–30 seconds) where acceptable.
- For API routes that return list data:
  - Add a cache layer (in-memory per instance is limited on serverless; consider Upstash/Redis if needed).

### Implementation notes (Next.js)
- Prefer **Next server cache + tags** for short-lived list caching:
  - Use `unstable_cache(..., { revalidate: 10–30, tags: [...] })` in service-layer list functions.
  - Tag caches by `tenantId` + entity scope (e.g. `customerId`) to avoid cross-tenant data.
  - On writes (POST/PATCH/DELETE), call `revalidateTag(...)` for the affected tags.

### Where
- Server components under `src/app/dashboard/**`
- API routes under `src/app/api/**`

### Guardrails
- Never cache sensitive, user-specific data across tenants.
- Key caches by `tenantId` (and any filters) at minimum.

---

## 6) Optimize client bundle/hydration (secondary here, but still helps)

### What to do
- Prefer server components; keep client components small.
- Avoid sending large JSON blobs to the browser.
- Lazy-load heavy UI sections (tabs, modals).

### Implementation notes (in this repo)
- Split heavy form code from list UIs:
  - Use `next/dynamic` for `*Form` components so they only load when “Add/Edit” is opened.
  - Keep the list rendering lightweight so the page hydrates faster.

### Where
- Components in `src/app/dashboard/**` that are marked `"use client"`
- Especially the customer detail page and any large tables.

---

## 7) Observability improvements (to keep it fast)

### What to add
- Route-level timing logs around storage + DB operations (safe metadata only).
- Optional: add a simple per-request “query count” in dev.

### Where
- API routes (wrap handler blocks)
- DB/service layer (e.g. `src/modules/**/service.ts`)
- Logging utility: `src/lib/logger.ts`

---

## Suggested execution order (1–2 days)

1. Baseline timings (Network + Vercel logs) for the slowest page(s).
2. Collapse fetches on the customer page (Step 1) and re-measure.
3. Parallelize service queries and remove N+1 (Step 2) and re-measure.
4. Add/verify indexes (Step 3) and re-measure.
5. Align regions (Step 4) if needed.
6. Add light caching (Step 5) for safe lists.
7. Client/hydration optimizations (Step 6) last.

