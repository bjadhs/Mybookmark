# Admin-managed Pages — migration progress

Turning the hardcoded members-area pages (My Server, My Agents, Categories) into
**data-driven, admin-managed pages**. Each page now owns its sidebar label/icon,
a members-only `locked` toggle, an editable locked-screen (icon/title/desc/perks),
and — for new custom pages — editable content sections. This also fixes the bug
where editing the "locked page" settings appeared to do nothing (the per-feature
locked screens were hardcoded; they're now sourced from settings).

Route map: built-ins stay at `/server`, `/agents`, `/category`; custom pages live
at `/p/<slug>`.

## Status: ~80% — building the Settings "Pages" manager (task 8 of 9)

### Done
- [x] **Types** (`lib/types.ts`) — added `PageIconKey`, `PageSection`, `ManagedPage`;
  reshaped `SiteSettings` to `{ accent, serverName, showLockIcon, pages[] }`
  (removed flat `serverLabel`/`agentsLabel`/`lockedTitle`/`lockedSubtitle`/`perks`).
- [x] **Settings helpers** (`lib/settings.ts`) — `DEFAULT_PAGES` (3 built-ins seeded
  with the old witty locked copy), `FALLBACK_LOCKED`, tolerant `mergeSettings`
  (incl. legacy flat-field migration onto built-ins so existing DB customizations
  survive), `sanitizeSettingsPatch` for `pages` (icon/locked/sections validation,
  slug dedupe, reserved-slug + built-in protection), and helpers `pageById`,
  `pageRoute`, `navPages`, `slugify`. `PAGE_ICON_KEYS` exported.
- [x] **Icons** (`app/_icons/index.tsx`) — added `StarIcon` + `PAGE_ICONS` registry
  (PageIconKey → component) and imported `PageIconKey`.
- [x] **Locked page** (`app/locked/page.tsx`) — deleted hardcoded
  `FEATURES`/`FALLBACK`/`iconFor`/`FeatureKey`; now renders from
  `pageById(settings, feature)` with a generic fallback. **(bug fix)**
- [x] **Sidebar** (`app/_components/sidebar.tsx`) — replaced static `FEATURE_NAV`
  with `navPages(settings)`; icons via `PAGE_ICONS`, routes via `pageRoute`;
  guests on a `locked` page → `/locked?feature=<id>` (padlock gated by
  `showLockIcon`).
- [x] **Per-page access gate** (`lib/page-access.ts`, new) — `enforcePageAccess(id)`
  loads settings + current user, redirects guests on locked pages to `/locked`.
  - Converted `app/server/page.tsx`, `app/agents/page.tsx`,
    `app/agents/[id]/page.tsx` to async server gates.
  - Split `app/category/page.tsx` into a server gate +
    `app/_components/screens/category-screen-container.tsx` (client); `CategoryScreen`
    gained an optional `label` prop.
  - `proxy.ts` — removed `/server`,`/agents`,`/category` from the matcher; only
    `/settings` + `/add` stay middleware-protected (`/p/*` self-gates).
- [x] **Custom page route** — `app/p/[slug]/page.tsx` (server gate, `notFound()` for
  missing/built-in) + `app/_components/screens/custom-page.tsx` (renders label +
  sections).

### In progress
- [ ] **Settings "Pages" manager** (`app/_components/screens/settings-screen.tsx`)
  - Done so far: imports updated; `setPage`/`removePage`/`addPage` draft helpers added.
  - **Next:** replace the old "Navigation labels" + "Guest experience" `Section`s
    with a global `showLockIcon` toggle + a **Pages** section rendering a `PageCard`
    per page (label, icon picker, locked toggle, locked-screen subgroup with
    locked-icon picker + title + desc + reused `PerksEditor`; custom pages also get
    a `SectionsEditor` + Delete button) and an **Add page** button.
  - New sub-components to add at the bottom of the file: `PageCard`, `IconPicker`,
    `SectionsEditor`, and a `uniquePageId(existingIds)` helper.
  - Already swapped: `server-screen.tsx` / `agents-screen.tsx` now read
    `pageById(settings, "server"|"agents")?.label`.

### Remaining
- [ ] **Docs** — update `AUTH.md` (routes incl. `/p/[slug]`, built-ins now gated by
  `enforcePageAccess` not middleware, data-driven locked screens) and a `CLAUDE.md`
  note on the pages model.
- [ ] **Verify** — `npx tsc --noEmit` + `npx eslint` on changed files; manual smoke:
  (1) edit Server page locked title → shows at `/locked?feature=server` signed out;
  (2) add a custom locked page → sidebar + `/p/<slug>` for members, `/locked` for
  guests; (3) set a custom page `locked:false` → guest can open `/p/<slug>`;
  (4) `GET/PUT /api/settings` returns/accepts `pages` (PUT admin-only via `guardAdmin`).
  Dev server: never use ports 3000/3001 (reserved); Postgres (docker) must be up.

## Key files
- `lib/types.ts`, `lib/settings.ts`, `lib/page-access.ts` (new)
- `app/_icons/index.tsx`
- `app/locked/page.tsx`, `app/_components/sidebar.tsx`
- `app/server/page.tsx`, `app/agents/page.tsx`, `app/agents/[id]/page.tsx`,
  `app/category/page.tsx`, `app/p/[slug]/page.tsx` (new)
- `app/_components/screens/`: `settings-screen.tsx`, `server-screen.tsx`,
  `agents-screen.tsx`, `category-screen.tsx`, `category-screen-container.tsx` (new),
  `custom-page.tsx` (new)
- `proxy.ts`

Full design plan: `~/.claude/plans/here-is-claude-s-plan-piped-wave.md`
