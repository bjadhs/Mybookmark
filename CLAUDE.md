# Glance — live-grid bookmark manager

A dark-mode bookmark app where every saved site renders as a **faux browser window**
(chrome bar + brand-tinted mini landing page) so the grid reads as "live previews".
Designed to be ported to **Next.js 16 + Tailwind CSS v4**.

## Important: 
Remind Bijaya to run docker container for postgres connection or check if db connection and let Bijaya know.

## Files (not to work on)
- `Glance.dc.html` — the whole app (single streaming Design Component: template + logic).
- `image-slot.js` — starter web component used for the drag-drop preview image in the Add form.

## Screens (state-driven, switched via `state.screen`)
- **home** — responsive grid of bookmark cards + search, category chips (with counts), sort (Recent / A–Z / Most visited). Clicking a card → visit.
- **add** — title / link / description / category fields + drag-drop preview image; a **live preview** card on the right updates as you type.
- **visit** — large faux-browser preview, brand favicon, domain pill, description, "fetching live preview" progress bar, and a real `Open site ↗` link (`target="_blank"`).

Data lives in `this.bookmarks` (static array) inside the logic class. Filtering/sorting/derived
style strings are computed in `renderVals()`.

## Design system (built from reference screenshots — no external DS project)
- **Base bg**: `#08080c` with a faint dot grid + soft purple/cyan corner glows (ambient "shuttle" background).
- **Cards / surfaces**: `#13131b`, hairline `rgba(255,255,255,.06)` borders, 18px radius. Faux-page viewport bg `#0e0e16`.
- **Accent gradient**: `linear-gradient(135deg,#00d4ff,#7c5cff)` (cyan→purple). Solid focus `#7c5cff`.
- **Tag chips**: active = accent gradient on dark text; inactive = `rgba(255,255,255,.04)` + hairline border. Purple tag pills use `rgba(124,92,255,.13)`.
- **Type**: `Space Grotesk` (display/headings), `Manrope` (body/UI). Both from Google Fonts.
- **Text**: primary `#ececf2`, muted `#7a7a8b`/`#9a9aab`, faint `#54546a`.
- **Icons**: inline stroke SVGs (no icon font, no emoji).

## Conventions
- This is a **Design Component** project: author/edit `Glance.dc.html` with `dc_write` / `dc_html_str_replace` / `dc_js_str_replace`. Styling is **inline only** (no stylesheets/classes); the only `<helmet><style>` is font links, resets, and `@keyframes`.
- Each bookmark gets derived fields in `renderVals()`: `gradient`, `heroTint` (low-opacity brand tint via `#rrggbbaa`), `onOpen` handler. Brand colors are per-item `c1`/`c2`/`fg`/`glyph`.
- Interactive but static data: search/filter/sort work; the Add form previews live but does not persist to the grid.

## Porting to Next.js / Tailwind v4
- Faux landing pages are pure-CSS skeletons — swap for real iframes or a screenshot service; card markup maps 1:1 to a `<BookmarkCard>`.
- Promote the accent gradient + surface colors to a Tailwind v4 `@theme` token block.
- Lift `this.bookmarks` to a DB/API.

# Dev server ports

Ports **3000** and **3001** are reserved by another application that is always running. NEVER start `npm run dev` (or `next dev`/`next start`) on those ports. Always pass an explicit alternative port, e.g. `npm run dev -- -p 3200`.

# Design System — Source of Truth

## Primary Accent Color
**`var(--accent)` — default Purple `#a855f7`**

The accent is now a single CSS variable, `--accent`, set on `<html>` at runtime
by `SettingsProvider` from the admin's theme choice (the `accent` site setting;
palette in `lib/settings.ts → ACCENTS`). **Always write accent surfaces as
`bg-[var(--accent)]` / `text-[var(--accent)]` / `border-[var(--accent)]`** (with
`/20` etc. opacity modifiers as needed) — never hard-code `#a855f7`, or theme
switching won't reach your element. Default stays purple, so the look is
unchanged out of the box. (Purple-tinted box-shadows using `rgba(168,85,247,…)`
are intentionally left static — shadows don't recolor with the theme.)

Use the accent for all accent/interactive elements:
- Logo icon background
- "+ New bookmark" button
- User avatar ("A" icon)
- Selected category/chip background
- Primary buttons (Edit, Save, etc.)
- Active nav item background tint
- Focus rings and highlights

## Color Usage
| Element | Class | Notes |
|---------|-------|-------|
| Logo icon | `bg-[var(--accent)]` | Solid accent |
| New bookmark button | `bg-[var(--accent)]` | Solid accent |
| User avatar | `bg-[var(--accent)]` | Solid accent |
| Selected chip/category | `bg-[var(--accent)] text-white` | Solid accent, white text |
| Primary button | `bg-[var(--accent)] text-white` | Solid accent, white text |
| Active nav item | `bg-[var(--accent)]/20 text-[var(--accent)]` | 20% opacity accent bg, accent text |
| Shadows | `rgba(168,85,247,0.4-0.5)` | Purple-tinted shadows (static) |

## Gradients
Avoid gradients for accent elements. Use solid `var(--accent)` instead.

## Background Colors
- Base: `#08080c`
- Surface: `#13131b`
- Viewport: `#0e0e16`
- Card hover: `rgba(255,255,255,0.04)`

## Text Colors
- Primary: `#f5f5f9` / `#ececf2`
- Muted: `#7a7a8b` / `#9a9aab`
- Faint: `#54546a`

## Typography
- Display/Headings: `Space Grotesk`
- Body/UI: `Manrope`

## Border Colors
- Default: `rgba(255,255,255,0.06)`
- Hover: `rgba(255,255,255,0.15)`


# Cron Jobs & notifications (`/cron`)

Admin-only page where jobs deliver a message to the **user currently viewing the
app** — an in-app **toast** (bottom-right) plus an optional **email** (SMTP via
`lib/email.ts`, configured by `SMTP_*` env; missing config = email silently
skipped). **There is no server scheduler** — the client (`lib/hooks/use-cron-runner.ts`,
mounted globally by `app/_components/notification-runtime.tsx`) evaluates which
enabled jobs are due and POSTs `/api/cron/[id]/fire`. The server claims an
idempotency slot in `cron_deliveries` before delivering, so reloads/double-polls
never double-send. The `test` flag (Send button) bypasses dedup.

Jobs have a **`kind`** picked from the "Add job" type list:
- `custom` — written body; `trigger_type` `delay` (N min after open) or
  `schedule` (daily HH:MM). In-app + optional email. Fires for any signed-in user.
- `server_health` — `trigger_type` `interval` (every N hours while viewing);
  body is generated live from `getLiveServerSnapshot` and emailed to the admin.
  Admin-only (non-admins don't even receive these in `GET /api/cron`).
- `visit_reminder` — `trigger_type` `manual` (only via Send); emails the admin.
- Future AI-generated kinds are shown locked in the picker.

Tables: `cron_jobs`, `notifications`, `cron_deliveries` (`lib/db/schema.sql`).
DB layer `lib/db/cron.ts` + `lib/db/notifications.ts`; schemas/types in
`lib/schemas.ts` + `lib/types.ts`. After changing the schema, re-apply it:
`psql "$DATABASE_URL" -f lib/db/schema.sql` (idempotent).


<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->
