# FIX.md — Glance Code Audit

A senior-level audit of the `glance/` codebase. Items are grouped by theme and ordered
by severity within each group. Check items off as we work them one by one.

Legend: `[ ]` todo · `[✅]` done

---

## 🔴 P0 — Broken / data-loss bugs (app does not work as written)

- [✅] **`bookmarks.tag` is `NOT NULL` but inserts never supply it.**
  ~~`lib/db/schema.sql:12` declares `tag TEXT NOT NULL`, but `createBookmark` and
  `updateBookmark` never write `tag`.~~
  **Fixed:** dropped the redundant `tag` column from `schema.sql` + `seed.sql` (with an
  idempotent `ALTER TABLE ... DROP COLUMN IF EXISTS tag` migration). The label is now derived
  solely from the joined category name (`mapRow` → `category_name`) — single source of truth.

- [✅] **`category_id` is `NOT NULL` *and* `ON DELETE SET NULL` — a self-contradiction.**
  **Fixed:** `category_id` is now nullable in `schema.sql` (true "uncategorized"), matching the
  `ON DELETE SET NULL` behaviour and the UI copy. Added a migration
  `ALTER COLUMN category_id DROP NOT NULL` for existing databases.

- [✅] **Schema migration disagrees with `CREATE TABLE`.**
  **Fixed:** `schema.sql` now has one authoritative `CREATE TABLE` plus idempotent migrations,
  including a `DO $$ ... $$` block that adds the `bookmarks_category_id_fkey` foreign key only
  if missing — so fresh and migrated databases converge on the same constraints.

- [✅] **Category filtering from the sidebar is dead code.**
  **Fixed:** replaced the fragile `window` CustomEvent bus with a tiny shared store
  (`lib/category-filter.ts`) that persists the selection across navigation, mounted
  `CategorySidebar` inside `Sidebar`, and wired `app/page.tsx` to read the active category via
  `useActiveCategory()`. Selecting a category now filters the grid (and routes home first when
  on another page). _Note: `Sidebar` was concurrently extended with Clerk auth; the wiring sits
  above the ACCOUNT section._

- [✅] **`createBookmark` allows an empty/invalid `categoryId` → raw FK error.**
  **Fixed:** added `resolveCategory()` in `lib/db/bookmarks.ts` — an empty selection becomes
  `NULL` (uncategorized) and a non-empty id is verified to exist, throwing a clean
  "Selected category no longer exists" (surfaced as a friendly 400) instead of a raw FK
  violation. Applied to both create and update.

---

## 🟠 P1 — Production hardening & security

- [✅] **SSRF in `/api/preview`.**
  ~~`api/preview/route.ts:151` fetches **any** user-supplied URL server-side with no
  allow/deny list.~~
  **Fixed:** added `lib/ssrf.ts` with `safeFetch()` — it DNS-resolves the hostname and rejects
  any address in a private/loopback/link-local/reserved range (10/8, 127/8, 169.254/16 cloud
  metadata, 172.16/12, 192.168/16, CGNAT, multicast, IPv6 ULA/link-local + IPv4-mapped, etc.),
  blocks `localhost`/`.local`/`.internal` names, restricts to http/https, and **follows
  redirects manually**, re-validating every hop (capped at 5) so a public host can't bounce us
  to an internal one. The preview route's GET + HEAD fallback both route through `safeFetch`;
  an `SsrfError` short-circuits to a generic `400` with no internal-host probe. Residual
  DNS-rebinding TOCTOU window is documented in the module header (would need connect-time IP
  pinning to fully close).

- [ ] **Internal error messages leaked to clients.**
  Every route returns `error.message` verbatim (`api/bookmarks/route.ts:9,41`, categories,
  `[id]` routes). DB/connection errors can expose schema, host, and credentials hints.
  Log server-side; return a generic message + stable error code to the client.

- [ ] **`<iframe>` embeds arbitrary third-party sites without `sandbox`.**
  `faux-browser.tsx:82,94`. Embedded pages run with full privileges. Add a restrictive
  `sandbox` (e.g. `allow-scripts allow-same-origin` only as needed) and keep
  `referrerPolicy="no-referrer"`. Weigh whether live framing is worth the risk vs. a
  screenshot service.

- [ ] **No rate limiting + fan-out fetches on the preview endpoint.**
  Every `BookmarkCard` calls `useWebsitePreview` (`bookmark-card.tsx:14`), so rendering the
  grid fires one server fetch per card, each hitting an external site. With N bookmarks
  that's N outbound requests on every home load. Add caching/dedupe (shared cache keyed by
  URL) and rate limiting, or precompute previews at write time.

- [ ] **`previewImage` stored as a base64 data URL in a `TEXT` column.**
  `image-slot` produces data URLs that get persisted directly (`bookmarks.ts:90`). Rows
  balloon to hundreds of KB and ship on every `getBookmarks()`. Upload to object storage and
  store a URL, or at minimum cap size and validate it's an image.

- [ ] **Running unreleased preview dependencies.**
  `package.json` pins `next: 16.3.0-preview.3`, `eslint-config-next: 16.3.0-preview.3`,
  `react: 19.2.7`. Preview/unreleased builds are not production-safe. Pin to stable releases
  before shipping.

- [ ] **DB client created at module scope with no pooling strategy.**
  `lib/db/index.ts:12`. In a serverless/edge deploy this can exhaust Postgres connections.
  Confirm deploy target; use a pooled connection string (e.g. Neon pooler) and/or guard the
  singleton against HMR duplication in dev.

- [ ] **`<img>` for untrusted external preview images.**
  `faux-browser.tsx:114`, `add-screen.tsx:151`. Bypasses `next/image` optimization and loads
  arbitrary remote origins. Use `next/image` with a configured `remotePatterns` allowlist, or
  proxy images.

---

## 🟣 P2 — Single source of truth (design system) ← *priority per request*

The root `CLAUDE.md` declares the source of truth: **one accent, `#a855f7`, no gradients.**
The code only half-migrated to it, and the old cyan→purple system still lives in parallel.

- [ ] **`#a855f7` is hardcoded across ~8 components instead of a token.**
  Found in `sidebar.tsx`, `chip.tsx`, `button.tsx`, `bookmark-card.tsx`, `detail-screen.tsx`,
  `add-screen.tsx`, `category-screen.tsx`, `category-sidebar.tsx`. Add a single
  `--color-glance-accent: #a855f7` token in `globals.css` and reference it everywhere
  (`bg-glance-accent`, etc.). One change point.

- [ ] **`theme.ts` / `globals.css` / `styles.ts` still encode the old gradient system.**
  `theme.ts:13-15,30` and `globals.css:13-17` define `focus:#7c5cff`, `cyan:#00d4ff`,
  `purple:#7c5cff`, and `gradients.accent`. `styles.ts:30` `focusRing` uses
  `rgba(124,92,255,…)`. These contradict the source of truth. Reconcile: replace accent/focus
  with `#a855f7`, drop or repurpose the cyan token, remove the accent gradient.

- [ ] **Two conflicting design-system docs.**
  Root `CLAUDE.md` (purple, solid) vs. `glance/CLAUDE.md` (cyan→purple gradient). Update
  `glance/CLAUDE.md` so there is exactly one source of truth.

- [ ] **Faux-browser skeleton still paints brand gradients.**
  `faux-browser.tsx` uses per-item `gradient`/`heroTint` (`:131,166,225`) and `add-screen.tsx:146`
  hardcodes `linear-gradient(135deg,#00d4ff,#7c5cff)`. Decide whether per-brand tints survive
  the "solid accent" rule; if not, route them through the accent token.

- [ ] **Tag pills + focus ring off-system.**
  `styles.ts:35-39` (`tagPill`/`tagPillLg`) and the purple-tag tokens are `#7c5cff`-based with
  `#b8a8ff` text; `detail-screen.tsx:231` "Open site" link is yellow `#ffe680`. Align to the
  accent or document them as intentional exceptions.

- [ ] **Ambient background uses cyan/`#7c5cff` glows.**
  `ambient-background.tsx` (rgba 124,92,255 and 0,212,255). Decide if this stays as flavor or
  moves to the accent.

---

## 🔵 P3 — Shared logic / DRY (logic components needing separation) ← *priority per request*

- [ ] **Duplicate `Screen` & `SortKey` type definitions.**
  Defined in both `lib/types.ts:32-33` and `lib/theme.ts:74-83`. `home-screen.tsx:46`
  redundantly re-casts `sort as "recent" | "az" | "visits"`. Keep one canonical definition
  (`lib/types.ts`), have `theme.ts` import it, and delete the cast.

- [✅] **Duplicate input interfaces.**
  **Fixed (with P4):** all four interfaces collapsed to a single `BookmarkInput` (`z.infer` of
  `bookmarkInputSchema`) exported from `lib/schemas.ts`; `lib/db/bookmarks.ts` and
  `lib/hooks/use-bookmarks.ts` import it. `use-bookmarks` still re-exports
  `New`/`UpdateBookmarkInput` as aliases so `detail-screen.tsx` keeps working.

- [ ] **Duplicate `readJson` / `errorMessage` fetch helpers.**
  Copy-pasted in `use-bookmarks.ts:25-38` and `use-categories.ts:16-29`. Extract to a single
  `lib/api-client.ts`.

- [ ] **Duplicated category CRUD UI logic.**
  `category-screen.tsx` and `category-sidebar.tsx` reimplement the same add/rename/delete/
  edit-state machine. Extract a shared `useCategoryEditor` hook (or one component).

- [ ] **Repeated independent `useBookmarks` / `useCategories` fetches.**
  `useBookmarks` runs in `app/page.tsx` **and** `sidebar.tsx`; `useCategories` runs in
  `add-screen`, `detail-screen`, `category` page, and `category-sidebar`. Each mounts its own
  fetch → duplicate `/api/bookmarks` and `/api/categories` requests with no shared cache.
  Lift to a Context provider or adopt SWR/React Query for request dedupe + revalidation.

- [ ] **Dead `lib/data.ts` mock array (competing source of truth).**
  The static `bookmarks` array (`lib/data.ts`) duplicates the DB shape and is unused now that
  data comes from Postgres. Delete it (and keep only the `Bookmark` *type*) to avoid drift.

- [ ] **Dead `/api/state` route.**
  `api/state/route.ts` returns a hardcoded `{screen:"home"}` from the pre-router design and is
  unused. Remove it.

- [ ] **Gradient/tint helpers defined twice.**
  `gradientFromColors`/`heroTintFromColors` in `styles.ts:5-11` vs. inline duplicates in
  `utils.ts:14-17` (`deriveBookmark`). Use the helpers in one place.

---

## 🟢 P4 — Zod validation (currently absent) ← *priority per request*

`zod@4.4.3` is present transitively in the lockfile but **not** a declared dependency, and
**no schemas exist**. All validation is hand-rolled `typeof x === "string"` checks in the
route handlers.

- [✅] **Add `zod` to `package.json` dependencies** (don't rely on a transitive copy).
  **Fixed:** added `"zod": "^4.4.3"` to `dependencies` (matching the version already resolved
  in the lockfile).

- [✅] **Create `lib/schemas.ts` with canonical schemas** and derive types via `z.infer`:
  **Fixed:** `lib/schemas.ts` holds `bookmarkInputSchema` (title non-empty/capped, `url`
  trimmed→normalized→http(s)-validated via a shared `urlField`, `desc` capped, `categoryId`
  trimmed with existence verified in the DB layer, `previewImage` nullable + size-capped +
  data/http(s) check), `categoryInputSchema`, and `previewQuerySchema` (normalizes to a `URL`).
  `BookmarkInput`/`CategoryInput` are `z.infer`-derived and now back the DB + hook layers,
  replacing the duplicated hand-written input interfaces (resolves the P3 "Duplicate input
  interfaces" bullet too). Added an `InvalidInputError` so semantic rejections (missing
  category) surface as a clean `400` via `handleApiError` instead of a leaked `500`.

- [✅] **Validate at every API boundary with `safeParse`.**
  **Fixed:** `api/bookmarks/route.ts`, `api/bookmarks/[id]/route.ts`, `api/categories/route.ts`,
  `api/categories/[id]/route.ts`, and `api/preview/route.ts` now `safeParse` the request and
  return `400` via `validationError()` (in `lib/api-error.ts`), which flattens `zod` field
  errors (`z.flattenError`) into `{ error, fieldErrors }`.

- [✅] **Validate server responses on the client.**
  **Fixed:** `use-bookmarks.ts` and `use-categories.ts` now `bookmarksSchema.parse` /
  `categorySchema.parse` (plus `likeToggleSchema`) every response instead of casting, so a
  shape mismatch throws and is surfaced as an error rather than corrupting state.

- [✅] **Push `url` validation into a shared normalizer.**
  **Fixed:** `normalizeUrl`/`normalizeUrlString` live in `lib/schemas.ts` and are used by both
  the bookmark `urlField` (so stored URLs are normalized hrefs) and the preview route — one
  normalizer, consistent with `deriveDomain`.

---

## ⚪ P5 — TypeScript correctness & smaller bugs

- [ ] **`mapRow` reads columns that are never selected.**
  `bookmarks.ts:29` `row.description ?? row.desc` and `:27` `row.tag ?? row.category_name` —
  `desc`/`tag` are never in the SELECT list, so the fallbacks are dead and fragile. Tighten the
  row type (`postgres.Row`) and remove phantom fields.

- [ ] **`sort: "recent"` is a no-op and `last_visit` isn't a timestamp.**
  `use-filtered-bookmarks.ts:32` returns `0` for "recent" and relies on DB `created_at DESC`.
  `last_visit` is free text ("2h ago"), so true recency can't be computed. Store a real
  `last_visit TIMESTAMPTZ` and sort on it; render relative time in the UI.

- [ ] **`visits` never increments.**
  Opening a bookmark (`detail-screen.tsx:227`) doesn't record a visit; the "Most visited" sort
  is therefore static. Add a visit-count endpoint or increment on open.

- [ ] **Unused fields shipped to the client.**
  `mins`, `c1/c2/fg/glyph` are largely vestigial now that previews are real. Audit the
  `Bookmark` type and stop selecting/serializing what the UI doesn't use.

- [ ] **Placeholder account data contradicts real counts.**
  `sidebar.tsx:104-107` hardcodes "Ava Reyes / Pro · 218 saved" while the nav shows the real
  `total`. Replace with real (or clearly stubbed) data.

---

## ♿ P6 — Accessibility & UX

- [ ] **Clickable `<div>`s instead of buttons/links.**
  Nav items and logo (`sidebar.tsx:30,58-83`), bookmark cards (`bookmark-card.tsx:18`), and
  category rows are `<div onClick>` with no `role`, `tabIndex`, or keyboard handler. Use
  `<button>`/`<Link>` so they're keyboard- and screen-reader-accessible.

- [ ] **No route-level `loading.tsx` / `error.tsx` / `not-found.tsx`.**
  Each page hand-rolls loading/error blocks. Add App Router convention files for consistent
  Suspense + error boundaries.

- [ ] **Emoji/glyph icon buttons lack labels.**
  `category-sidebar.tsx:157,164` use `✎`/`✕` text with only `title`; add `aria-label`s.
  (CLAUDE.md also says "no emoji" — these violate it.)

- [ ] **Missing focus-visible styling on custom buttons.**
  Many interactive elements set `outline-none` (e.g. `input.tsx:19`) without a visible
  `:focus-visible` replacement beyond the accent ring. Verify keyboard focus is always visible.

---

### Suggested order of work
1. P0 (schema `tag` + `category_id`, dead category filter) — app is broken without these.
2. P4 Zod + P1 SSRF/error-leak — correctness & security gates.
3. P2 design-token unification (single source of truth).
4. P3 DRY/shared-logic extraction.
5. P5/P6 polish.
