# Internationalization plan (Swedish default, English optional)

## Goal

- Make **Swedish (`sv`) the default language** across the app UI.
- Allow users to **switch to English (`en`)** (persisted per user/device).
- Avoid changing behavior/URLs unless desired; keep auth + dashboard routing intact.

Non-goals for this phase:

- Translating user-entered free text (notes/descriptions).
- Translating database-stored domain values (we’ll translate *labels*, not underlying enum codes).

## Current state (what I saw in the codebase)

- App is **Next.js 15 App Router**.
- No i18n library detected yet (no `next-intl`, `next-i18next`, `i18next`, etc).
- Many UI strings are hardcoded in:
  - `src/components/layout/Sidebar.tsx` (nav labels)
  - `src/components/layout/TopBar.tsx` (“Sign out”)
  - `src/lib/constants/labels.ts` (status/type label maps)
  - Various dashboard pages/forms (e.g. customers list, tasks, renewals, filters, empty states)
- API endpoints return English `error` strings (e.g. “Customer not found”, “Validation failed”).

## Recommended approach

Use **`next-intl`** with App Router and locale routing via a `[locale]` segment.

Why:

- Solid fit for App Router, server components, and client components.
- Keeps translations in message files and avoids “string hunt” later.
- Supports locale detection, formatting, and typed messages (optional).

### Locale strategy

- **Supported locales**: `sv` (default), `en`.
- **Default**: `sv`.
- **Persistence**: store chosen locale in a cookie (e.g. `locale=sv|en`).
- **Switch UI**: small language toggle in `TopBar` (and/or `Settings → Profile`).

### Routing options (pick one)

**Option A (recommended): Locale segment in URLs**

- Routes become `/sv/dashboard/...` and `/en/dashboard/...`.
- Middleware ensures:
  - If no locale prefix, redirect to `/sv/...`.
  - Respect `locale` cookie when deciding redirect target.
- Advantages: robust, works for SSR, sets `<html lang>`, clear semantics.
- Trade-off: URLs change; you’ll update internal links.

**Option B: Keep URLs unchanged; locale only via cookie**

- Routes stay `/dashboard/...`.
- Middleware only sets a cookie; you load messages based on cookie.
- Advantages: no URL changes.
- Trade-offs: harder to reason about SSR caching, language-specific metadata, and external linking.

Given you want Swedish as “standard” but switchable, **Option A is the cleanest long-term**.

## High-level implementation steps (do not execute yet)

This is organized as **phases** so you can implement incrementally and keep the app working at each checkpoint.

## Phased rollout plan (recommended)

### Phase 0 — Decisions & conventions (no code)

Deliverables:

- Pick routing strategy: **Option A** (locale in URL) vs Option B (cookie-only).
- Confirm glossary “tone” choices (formal vs casual) and a few key contentious terms (e.g. Policies/Försäkringar vs Policys).
- Lock **message conventions** up front:
  - **Plural**: ICU plural blocks
  - **Interpolation**: named placeholders (`{name}`, `{count}`, etc)
  - **Key naming**: `nav.*`, `common.*`, `errors.*`, etc

Definition of done:

- This `I18N_PLAN.md` reflects the chosen options and conventions (so later implementation is mechanical).

### Phase 1 — Add i18n foundation (minimal surface area)

Deliverables:

- Add `next-intl`.
- Add message files:
  - `src/messages/sv.json` (default)
  - `src/messages/en.json`
- Add request-time locale/message loader (`src/i18n/request.ts` or equivalent).

Definition of done:

- App can load with Swedish messages available, even if most UI still uses hardcoded text.

### Phase 2 — Locale routing + `<html lang>` (Option A)

Deliverables:

- Introduce `/sv/...` and `/en/...` route structure (via `[locale]` segment).
- Locale-aware layout sets `<html lang={locale}>` and provides the translation provider.
- Middleware handles:
  - redirect from non-prefixed paths → `/sv/...` (or cookie-selected)
  - compatibility with auth flow (login redirects, callback URLs)

Definition of done:

- Visiting `/dashboard` (or `/`) lands on `/sv/...` consistently.
- `/en/...` works and renders (even if still English strings in many places).

### Phase 3 — Language switcher (cookie + route-preserving navigation)

Deliverables:

- Add a language toggle (recommended in `TopBar`, optionally also in Settings).
- Persist choice in cookie (`locale=sv|en`).
- Switching language keeps the user on the “same” page in the other locale.

Definition of done:

- User can switch `sv` ↔ `en` and see immediate effect on translated strings that exist.

### Phase 4 — Translate shared UI + core navigation first

Deliverables:

- Replace hardcoded labels in shared layout components:
  - `Sidebar` nav labels
  - `TopBar` actions (sign in/out, etc)
- Replace shared enum/status label strings:
  - Convert `src/lib/constants/labels.ts` to either:
    - codes → message keys, or
    - codes → functions that resolve via translator

Definition of done:

- Navigation + global chrome is fully localized in `sv` and `en`.

### Phase 5 — Translate “high traffic” pages and reusable copy

Recommended order (based on where strings are concentrated):

- Customers list + customer workspace pages
- Tasks + renewals (lists, filters, empty states)
- Activities + documents
- Settings pages (privacy/data-processing copy)

Definition of done:

- Main day-to-day workflow pages are localized end-to-end (titles, buttons, tables, filters, empty states).

### Phase 6 — Plurals, interpolation, and count-driven UI strings

Deliverables:

- Convert any count-driven strings to ICU plural patterns (and avoid string concatenation).
- Standardize core patterns:
  - `customers.count`: `{count, plural, one {# kund} other {# kunder}}`
  - `search.matches`: `{count, plural, one {# träff} other {# träffar}}`
  - `confirm.deleteCustomer`: `Ta bort {name}?`

Definition of done:

- No visible “broken Swedish” like “0 kund”, and placeholders render safely.

### Phase 7 — Error handling localization (API + UI contract)

Deliverables:

- Choose pattern:
  - **Recommended**: API returns stable error codes, UI maps to localized copy.
- Update API responses + UI mapping accordingly.

Definition of done:

- Errors are consistently localized and do not “leak” English into Swedish flows (or vice versa).

### Phase 8 — Metadata & secondary surfaces

Deliverables:

- Localize:
  - page titles (browser tab)
  - meta descriptions
  - breadcrumbs (if used)
  - empty states and toast notifications (verify completeness)
- Ensure metadata is derived from the same message keys.

Definition of done:

- Swedish locale yields Swedish titles/descriptions; English yields English.

### Phase 9 — Tests & regression hardening

Deliverables:

- Update tests asserting English strings to be locale-aware.
- Add smoke tests:
  - default redirect to `/sv/...`
  - language toggle preserves route and updates labels
  - basic metadata expectations per locale (optional but valuable)

Definition of done:

- CI green; tests are stable across locales.

## Translation glossary (key terminology)

This is a proposed baseline glossary for the “core product vocabulary” I saw in navigation, tables, forms, and privacy/compliance pages. We can refine tone (formal/informal) once you confirm preference.

### Navigation & core modules

| English | Swedish (standard) | Notes |
|---|---|---|
| Dashboard | Översikt | Common CRM nav label |
| Customers | Kunder | |
| Customer | Kund | |
| Renewals | Förnyelser | Insurance policy renewals |
| Policies | Försäkringar | Could also be “Policys” in some orgs; recommend Swedish |
| Policy | Försäkring | |
| Documents | Dokument | |
| Tasks | Uppgifter | |
| Task | Uppgift | |
| Activities | Aktiviteter | |
| Settings | Inställningar | |
| Profile | Profil | |
| Password | Lösenord | |
| Privacy & compliance | Integritet & regelefterlevnad | Shorter alt: “Integritet & efterlevnad” |
| Brokerage | Mäklarkontor | Or “Förmedlarfirma” depending on domain preference |
| Sign out | Logga ut | |
| Sign in | Logga in | |

### Common UI actions

| English | Swedish (standard) |
|---|---|
| Add customer | Lägg till kund |
| Create customer | Skapa kund |
| Save changes | Spara ändringar |
| Cancel | Avbryt |
| Delete | Ta bort |
| Delete customer? | Ta bort kund? |
| Create task | Skapa uppgift |
| Previous | Föregående |
| Next | Nästa |
| View | Visa |
| Action | Åtgärd |
| Loading… | Laddar… |
| No matches | Inga träffar |

### Filters, tables, and fields

| English | Swedish (standard) |
|---|---|
| Search | Sök |
| Filter | Filtrera |
| Status | Status |
| Type | Typ |
| Date range | Datumintervall |
| Due date | Förfallodatum |
| Title | Titel |
| Description | Beskrivning |
| Name | Namn |
| Email | E-post |
| Phone | Telefon |
| Address | Adress |
| Customer | Kund |
| Policy number | Försäkringsnummer |
| Insurer | Försäkringsbolag |
| Premium | Premie |
| Start date | Startdatum |
| End date | Slutdatum |
| Renewal date | Förnyelsedatum |
| Owner | Ansvarig |
| Owner broker | Ansvarig mäklare | |
| Created | Skapad |
| Overview | Översikt | (section title) |
| Danger zone | Riskzon | Alt: “Farlig zon” (more literal) |

### Statuses and enum-like labels (seen in `src/lib/constants/labels.ts`)

| English | Swedish (standard) |
|---|---|
| Active | Aktiv |
| Pending | Väntande | Alt: “Pågående” depending on meaning |
| Expired | Utgången | |
| Cancelled | Avbruten | UI-friendly; alt: “Annullerad” (more formal) |
| In progress | Pågår | |
| Done | Klar | |
| Low | Låg | |
| Medium | Medel | |
| High | Hög | |
| Property | Fastighet | Alt: “Egendom” (broader) |
| Vehicle | Fordon | |
| Person | Person | |
| Business | Företag | |
| Equipment | Utrustning | |
| Other | Annat | |
| Call | Samtal | |
| Meeting | Möte | |
| Email | E-post | |
| Note | Anteckning | |
| Advice | Rådgivning | |
| Policy document | Försäkringsdokument | |
| Contract | Avtal | |
| ID document | ID-handling | |
| Correspondence | Korrespondens | |
| Admin | Admin | Could be “Administratör” if you prefer |
| Broker | Mäklare | |
| Staff | Personal | |

### Compliance, privacy, and data-handling terms (seen in settings pages + warnings)

| English | Swedish (standard) | Notes |
|---|---|---|
| Privacy notice | Integritetspolicy | In Swedish apps this is the common label |
| Data processing overview | Översikt över databehandling | |
| Controller | Personuppgiftsansvarig | GDPR term |
| Processor | Personuppgiftsbiträde | GDPR term |
| Lawful basis | Rättslig grund | GDPR term |
| Subprocessors | Underbiträden | GDPR term |
| Audit | Revision / Granskning | Pick one; “Granskning” is often UI-friendly |
| Security & audit | Säkerhet & granskning | |
| Cookies | Cookies | Often left untranslated |
| Essential cookies | Nödvändiga cookies | |
| Auth session cookie | Sessionscookie för inloggning | |
| Sensitive personal data | Känsliga personuppgifter | |

### Data retention / deletion terms (based on purge + retention modules)

| English | Swedish (standard) | Notes |
|---|---|---|
| Retention | Gallring | Common Swedish public-sector/data-retention term |
| Purge | Radera permanent | Clarifies irreversible deletion |
| Purge failed | Permanent radering misslyckades | |
| Legal hold | Rättslig spärr | Alt: “Juridisk spärr” |
| Restricted (customer) | Spärrad | Context-specific; could also be “Begränsad” |
| Cannot be deleted | Kan inte tas bort | |

## Open choices to settle before implementation

- **Tone**: formal (“E-post”, “Förnyelser”) vs more casual.
- **Policies translation**: “Försäkringar” vs “Policys”.
- **Audit translation**: “Granskning” vs “Revision”.
- **Routing**: locale prefix in URLs (recommended) vs cookie-only.

## Metadata & other “easy to miss” text surfaces

If we adopt locale-segment routing, we should localize not just visible page content but also:

- **Page titles** (browser tab title)
- **Meta descriptions**
- **Breadcrumb titles** (if/when you add them)
- **Empty states** and **toast messages**

Otherwise it’s common to end up with Swedish UI but still-English metadata (e.g. “Renew CRM – MVP”) which feels unfinished and affects share previews/SEO.

Implementation note (when we do it):

- Define per-route metadata with localized strings (e.g. `generateMetadata`) using the same message keys as the UI.
- Ensure `<html lang>` reflects `sv`/`en` so assistive tech and browser behaviors match the selected language.

## Suggested file/key naming conventions (when we implement)

- Message namespaces by feature:
  - `nav.*`, `auth.*`, `customers.*`, `policies.*`, `tasks.*`, `activities.*`, `documents.*`, `settings.*`, `common.*`, `errors.*`
- Avoid embedding punctuation/whitespace in keys.
- Keep message strings short and consistent across tables/forms.

