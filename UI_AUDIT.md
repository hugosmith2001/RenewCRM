# UI audit – theme tokens, consistency, B2B fit

Internal B2B SaaS for insurance brokers. Design goals: professional, minimal, information-dense, calm, operational. Fonts and colors must stay flexible via a centralized theme/token system.

---

## 1. Problems found

### A. Hardcoded copy / overridden props

| Location | Issue |
|----------|--------|
| **`src/components/forms/FormActions.tsx`** | When `loading` is true, button label is always `"Saving…"` and ignores `submitLabel`. Callers cannot show "Creating…", "Signing in…", etc. |

**Fix:** Use a `loadingLabel` prop (optional, default e.g. "Saving…") when loading, and only fall back to that when no custom label is needed; or always show `submitLabel` and optionally add `loadingLabel` for override. Recommended: add optional `loadingLabel?: string` and use it when loading (default `"Saving…"` so existing behaviour stays), and document that callers can pass e.g. `loadingLabel="Creating…"` for create flows.

---

### B. Theme tokens defined but not used

| Location | Issue |
|----------|--------|
| **`src/styles/theme.css`** | Defines `--form-input-padding-x` and `--form-input-padding-y`. |
| **`tailwind.config.ts`** | These are **not** in `theme.extend.spacing`, so Tailwind has no `p-form-input-*`-style utilities. |
| **`src/components/forms/input-classes.ts`** | Uses `px-3 py-2` (same numeric values) instead of theme spacing. Changing padding globally requires editing this file. |

**Fix:** In `tailwind.config.ts` under `theme.extend.spacing`, add e.g. `"form-input-x": "var(--form-input-padding-x)"` and `"form-input-y": "var(--form-input-padding-y)"`. In `input-classes.ts`, replace `px-3 py-2` with `px-form-input-x py-form-input-y` (or one token if you prefer a single padding value).

---

### C. Spacing / layout not tokenized (medium impact)

These use raw Tailwind spacing (`p-4`, `px-4`, `py-3`, `mb-6`, `gap-3`, etc.) instead of theme-driven values. The theme already has `content-x`, `content-y`, `form-*`; it does not define section/card/table tokens. Result: changing "all section padding" or "all card padding" later requires editing many files.

| File | Current | Suggestion |
|------|---------|------------|
| **`src/components/layout/DetailSection.tsx`** | Header: `px-4 py-3`, body: `p-4` | Add to theme e.g. `--section-header-padding-x/y`, `--section-body-padding`, map in Tailwind, use here. |
| **`src/components/layout/PageHeader.tsx`** | `mb-6`, `gap-2`, `mt-1` | Add e.g. `--page-header-margin-bottom`, `--page-header-gap` (or reuse a generic stack token) and use. |
| **`src/components/ui/table.tsx`** | TH: `px-4 py-2`, TD: `px-4 py-3` | Add e.g. `--table-cell-padding-x`, `--table-cell-padding-y` and use. |
| **`src/components/ui/ConfirmDialog.tsx`** | `p-4` (outer overlay and modal) | Use a shared token for modal padding (e.g. same as section body). |
| **`src/components/ui/empty-state.tsx`** | `p-6`, `mt-1`, `mt-4`, `gap-2` | Use theme spacing where possible; consider card/section padding token for `p-6`. |
| **`src/components/ui/toolbar.tsx`** | `gap-3` | Add e.g. `--toolbar-gap` or reuse an existing spacing token. |
| **`src/components/forms/FormLayout.tsx`** | Card: `p-6`, embedded: `p-4` | Map to theme tokens (e.g. section/card padding). |
| **`src/components/forms/FormError.tsx`** | `px-4 py-3` | Use theme spacing (e.g. form or section padding). |

Adding a small set of section/card/table tokens and using them in these components will keep spacing flexible and consistent.

---

### D. Badge shape

| File | Issue |
|------|--------|
| **`src/components/ui/badge.tsx`** | Uses `rounded-full` (pill). For a serious B2B look, a subtler radius can feel more operational. |

**Fix (optional):** Use theme radius: e.g. `rounded-md` (already in theme). If you want to keep pills as an option, add `--radius-pill: 9999px` (or similar) in `theme.css`, map in Tailwind, and use `rounded-pill` in the badge so the choice is global and easy to change.

---

### E. Landing and dashboard copy (tone)

| File | Issue |
|------|--------|
| **`src/app/page.tsx`** | Centered hero layout with large title ("Safekeep CRM") and single CTA "Sign in". For an internal B2B app this can feel like a marketing landing; consider a minimal, operational entry (e.g. small title + sign-in, or redirect to login when unauthenticated). |
| **`src/app/page.tsx`** | Subtitle "Insurance Broker CRM – Phase 1 auth ready." is dev/MVP language; for production, neutral operational copy is better. |
| **`src/app/dashboard/page.tsx`** | Description "Welcome to Safekeep CRM. Manage your customers from the Customers section." is welcoming/marketing; for internal tooling, a short operational line (e.g. "Use the sidebar to open Customers, Policies, or Settings.") fits better. |

**Fix:** Shorten and neutralise copy; avoid "welcome" and phase labels; keep layout minimal and information-oriented.

---

### F. File input styling (small)

| File | Issue |
|------|--------|
| **`src/app/dashboard/customers/DocumentsSection.tsx`** | File input uses `file:rounded` (Tailwind default radius). Rest of app uses theme radii (`rounded-md`). |

**Fix:** Use `file:rounded-md` so the file button respects the theme radius.

---

### G. Root layout does not apply global body styles

| File | Issue |
|------|--------|
| **`src/app/layout.tsx`** | Only renders `<html><body>{children}</body></html>`. Body font and background are set in `globals.css` via `@apply bg-background text-foreground font-sans ...`. |

**Fix:** No change required if `globals.css` is imported in a layout that wraps the app (it is in `layout.tsx`). Just confirming: `layout.tsx` imports `./globals.css`, so body tokens are applied. No action.

---

### H. Inconsistent use of theme radius

| File | Issue |
|------|--------|
| **`src/components/ui/ConfirmDialog.tsx`** | Modal uses `rounded-lg`. Theme has `--radius-lg` and Tailwind maps `rounded-lg` to it. So this is already theme-based. No change. |

---

## 2. Exact files to change

| Priority | File | Change |
|----------|------|--------|
| **High** | `src/components/forms/FormActions.tsx` | Add optional `loadingLabel` prop; when `loading`, show `loadingLabel ?? "Saving…"` (or keep "Saving…" as default). |
| **High** | `tailwind.config.ts` | In `theme.extend.spacing`, add `"form-input-x": "var(--form-input-padding-x)"`, `"form-input-y": "var(--form-input-padding-y)"`. |
| **High** | `src/components/forms/input-classes.ts` | Replace `px-3 py-2` with `px-form-input-x py-form-input-y`. |
| **High** | `src/app/page.tsx` | Tone down to minimal operational entry: smaller title, neutral copy, no "Phase 1"; optionally redirect unauthenticated users to `/login`. |
| **High** | `src/app/dashboard/page.tsx` | Replace welcome sentence with short, operational description. |
| **Medium** | `src/styles/theme.css` | Add optional tokens, e.g. `--section-header-padding-x`, `--section-header-padding-y`, `--section-body-padding`, `--page-header-margin-bottom`, `--table-cell-padding-x`, `--table-cell-padding-y` (and any shared card/modal padding you want). |
| **Medium** | `tailwind.config.ts` | Map the new spacing tokens in `theme.extend.spacing`. |
| **Medium** | `src/components/layout/DetailSection.tsx` | Use new section padding tokens for header and body. |
| **Medium** | `src/components/layout/PageHeader.tsx` | Use new page-header margin/gap tokens. |
| **Medium** | `src/components/ui/table.tsx` | Use new table-cell padding tokens for TH/TD. |
| **Medium** | `src/components/ui/ConfirmDialog.tsx` | Use shared modal/section padding token for inner `p-4`. |
| **Medium** | `src/components/ui/empty-state.tsx` | Use theme spacing (e.g. section/card padding) instead of `p-6`; use token for gaps/margins if available. |
| **Medium** | `src/components/forms/FormLayout.tsx` | Use theme padding tokens for card and embedded variants. |
| **Medium** | `src/components/forms/FormError.tsx` | Use theme padding (e.g. form or section) instead of `px-4 py-3`. |
| **Medium** | `src/components/ui/toolbar.tsx` | Use a theme gap token (e.g. `gap-form-row` or new `toolbar-gap`) instead of `gap-3`. |
| **Low** | `src/components/ui/badge.tsx` | Use `rounded-md` (or a new `rounded-pill` from theme) so badge shape is controlled by theme. |
| **Low** | `src/app/dashboard/customers/DocumentsSection.tsx` | Change `file:rounded` to `file:rounded-md`. |

---

## 3. Concrete recommended fixes (short form)

1. **FormActions** – Add `loadingLabel?: string`; when `loading`, display `loadingLabel ?? "Saving…"`. Update call sites (e.g. CustomerForm) only if you want different labels (e.g. "Creating…").
2. **Form input padding** – Expose `--form-input-padding-x/y` in Tailwind spacing; switch `input-classes.ts` to `px-form-input-x py-form-input-y`.
3. **Section/card/table tokens** – Define a small set in `theme.css`, extend Tailwind spacing, then replace numeric padding/margins in DetailSection, PageHeader, table, ConfirmDialog, EmptyState, FormLayout, FormError, ListToolbar.
4. **Landing** – One-line title, one short operational line, single Sign in; remove "Phase 1 auth ready"; consider redirect to `/login` when not authenticated.
5. **Dashboard** – One short operational sentence instead of "Welcome to… Manage your customers from…".
6. **Badge** – Use `rounded-md` (or theme `rounded-pill`) so radius is theme-driven.
7. **DocumentsSection** – `file:rounded-md` on the file input.

---

## 4. Priority order

| Priority | What | Why |
|----------|------|-----|
| **Highest** | FormActions `loadingLabel` + form input padding tokens + input-classes | Correct behaviour and single source of truth for form controls; small, clear changes. |
| **High** | Landing and dashboard copy + layout tone | Aligns with "not a marketing landing" and "operational B2B" without touching design system. |
| **Medium** | Section/card/table/page-header spacing tokens and use in components | Makes future layout and density changes global and consistent. |
| **Lower** | Badge radius + file input radius | Polish and theme consistency; low risk. |

---

## 5. What is already in good shape

- **Colors and fonts** – No hex/rgb/hardcoded Tailwind color scale in components; semantic tokens from `theme.css` and Tailwind are used consistently.
- **Layout** – AppShell, Sidebar, TopBar use theme (content-x, content-y, topbar, sidebar). No hardcoded dimensions.
- **PageHeader** – Used consistently across list, detail, and form pages with back link, title, description, actions.
- **DetailSection** – Reused for Overview, Contacts, Policies, etc.; clear structure.
- **Forms** – FormField, FormLayout, FormError, formInputClasses, FormActions use theme colors and (where wired) theme spacing.
- **Tables** – TableShell, TH, TD use theme colors and borders; only cell padding is not yet tokenized.
- **Buttons / badges** – Variants and tones use theme; only badge radius and FormActions copy need small tweaks.
- **Navigation** – Sidebar + header pattern is consistent; no duplicate or conflicting nav.

Overall the codebase already follows a single theme and avoids template-like or flashy UI; the main gaps are tokenising the remaining spacing/padding and tightening copy and a couple of components (FormActions, badge, file input).
