# Authentication & Authorization — Single Source of Truth

> This file is the authoritative reference for **how auth works in Glance**.
> If behaviour and this file ever disagree, treat the disagreement as a bug and
> reconcile them. Update this file whenever the auth flow changes.

Provider: **Clerk** (`@clerk/nextjs`). Authorization (who-can-do-what) is layered
on top of Clerk with a small in-house role system keyed off an admin email.

---

## 1. The three roles

There is **one** source of truth for roles: `lib/auth.ts`.

| Role    | Who they are                                              | Identified by |
|---------|-----------------------------------------------------------|---------------|
| `admin` | The owner / curator                                       | Clerk email matches `ADMIN_EMAIL` |
| `user`  | Any signed-in person who is **not** the admin             | Signed in, email not in `ADMIN_EMAIL` |
| `guest` | Not signed in                                             | No Clerk session |

`ADMIN_EMAIL` lives in `.env`. It is a **comma-separated, case-insensitive**
list, so more than one admin is possible:

```env
ADMIN_EMAIL=bijayadhikari107@gmail.com
```

### What each role can do

| Capability                                | guest | user | admin |
|-------------------------------------------|:-----:|:----:|:-----:|
| View library (`/`) & open a bookmark (`/[slug]`) | ✅ | ✅ | ✅ |
| Read comments                             | ✅ | ✅ | ✅ |
| Like a bookmark                           | ❌ | ✅ | ✅ |
| Post a comment                            | ❌ | ✅ | ✅ |
| Delete **own** comment                    | ❌ | ✅ | ✅ |
| Delete **anyone's** comment               | ❌ | ❌ | ✅ |
| View members area (My Server, My Agents, Categories, Settings) | ❌* | ✅ | ✅ |
| View My Server containers + live log      | ❌* | ✅ | ✅ |
| Add / edit / delete bookmarks             | ❌ | ❌ | ✅ |
| Create / edit / delete categories         | ❌ | ❌ | ✅ |
| Add / edit / delete server containers; rename the server | ❌ | ❌ | ✅ |
| View My Agents grid + open an agent's detail (`/agents/[id]`) | ❌* | ✅ | ✅ |
| Add / edit / delete agents | ❌ | ❌ | ✅ |
| View an **unlocked** custom page (`/p/[slug]`) | ✅ | ✅ | ✅ |
| View a **locked** custom page (`/p/[slug]`) | ❌* | ✅ | ✅ |
| Add / edit / delete pages; set a page's icon/label/locked flag/locked copy/sections | ❌ | ❌ | ✅ |
| Edit site settings (theme, server name, lock-icon toggle) | ❌ | ❌ | ✅ |

\* Guests don't get a hard "access denied" — both the sidebar and the page's own
gate route them to the friendly `/locked` teaser instead (see §3a, §5).

**Golden rule:** the client UI is *cosmetic*. Every mutation is enforced again
on the server. Hiding a button never grants or removes a permission — the API
does.

---

## 2. `lib/auth.ts` — the role engine

Server-only helpers. This is the file to read first for any auth question.

| Export | Type | Purpose |
|--------|------|---------|
| `Role` | `"admin" \| "user" \| "guest"` | The role union |
| `CurrentUserInfo` | interface | `{ role, userId, name, imageUrl, email }` |
| `isAdminEmail(email)` | `boolean` | Is this email in `ADMIN_EMAIL`? (case-insensitive) |
| `getCurrentUserInfo()` | `Promise<CurrentUserInfo>` | Resolves the caller's identity + role from Clerk |
| `guardAdmin()` | `Promise<NextResponse \| null>` | `null` = allowed; otherwise a 401/403 response to return |
| `guardUser()` | `Promise<{response} \| {user}>` | `user` present = allowed; otherwise a 401 response |

How identity is resolved (important detail): the default Clerk **session token
does not include the email address**, so we call `currentUser()` (which hits
Clerk and returns the full user, including emails) and compare the primary email
against `ADMIN_EMAIL`. That is why admin checks are server-side and not derived
from the lightweight `auth()` session claims.

```ts
// Mutation handlers — admin only:
const denied = await guardAdmin();
if (denied) return denied;            // 401 guest / 403 non-admin

// Mutation handlers — any signed-in user (likes, comments):
const guard = await guardUser();
if (guard.response) return guard.response;   // 401 guest
const me = guard.user;                       // safe to use me.userId, me.name…
```

---

## 3. Middleware — `proxy.ts`

Clerk middleware. The logic is **"public by default, protect the members
area."** Everything not listed is reachable by guests (so they can browse the
library and open any bookmark detail).

```ts
const isProtectedRoute = createRouteMatcher(["/settings(.*)", "/add(.*)"]);

export default clerkMiddleware(async (auth, request) => {
  if (isProtectedRoute(request)) {
    await auth.protect();   // guest → bounced to Clerk sign-in
  }
});
```

Why this shape:
- `/` and `/[slug]` (bookmark detail) **must** be public — guests browse and
  open bookmarks. A catch-all "protect everything" matcher can't tell a bookmark
  slug like `/figma` from a named route, so we invert it and protect only the
  named members routes.
- `/locked` and `/sign-in` / `/sign-up` are public by virtue of not being listed.
- The managed pages (`/server`, `/agents`, `/category`, and custom `/p/*`) are
  **not** in the matcher anymore — they gate themselves per-page via
  `enforcePageAccess` (see §3a), so a page's `locked` flag is the single source of
  truth and an *unlocked* custom page stays reachable by guests.
- The `add`/mutation **APIs** are not in this list because they enforce their own
  role checks (§4) — middleware blocking pages is a UX backstop, not the real gate.

The hard backstop vs. the friendly path:
- **Sidebar click** on a locked members item as a guest → `/locked?feature=…` teaser.
- **Direct URL** to a locked `/server` etc. as a guest → also `/locked?feature=…`
  (via the page's own gate, §3a), not Clerk sign-in.

### 3a. Per-page access gate — `lib/page-access.ts`

Pages are now admin-managed data (see §7a). Each managed page carries a `locked`
flag, so middleware can't know statically whether a route is members-only. Instead
each built-in page route (and the custom `/p/[slug]` route) is an **async server
component** that calls `enforcePageAccess(pageId)` first:

```ts
export async function enforcePageAccess(pageId: string) {
  const [settings, me] = await Promise.all([getSettings(), getCurrentUserInfo()]);
  const page = pageById(settings, pageId);
  if (page?.locked && !me.userId) redirect(`/locked?feature=${pageId}`);
  return { settings, page, me };
}
```

Used by `app/server/page.tsx`, `app/agents/page.tsx`, `app/agents/[id]/page.tsx`,
`app/category/page.tsx`, and `app/p/[slug]/page.tsx`. (`/settings` and `/add` are
still hard-gated by middleware, not this.)

---

## 4. API enforcement (the real gate)

All reads are public; all writes are role-checked.

| Route | GET | POST / PUT / DELETE |
|-------|-----|---------------------|
| `/api/bookmarks` | public, viewer-aware | POST `guardAdmin()` |
| `/api/bookmarks/[id]` | public, viewer-aware | PUT/DELETE `guardAdmin()` |
| `/api/categories`, `/api/categories/[id]` | public | `guardAdmin()` |
| `/api/bookmarks/[id]/like` | — | POST `guardUser()` (toggle) |
| `/api/bookmarks/[id]/comments` | public (list) | POST `guardUser()` |
| `/api/comments/[id]` | — | DELETE: author **or** admin only |
| `/api/containers` | public (list) | POST `guardAdmin()` |
| `/api/containers/[id]` | public | PUT/DELETE `guardAdmin()` |
| `/api/agents` | public (list) | POST `guardAdmin()` |
| `/api/agents/[id]` | public (one) | PUT/DELETE `guardAdmin()` |
| `/api/settings` | public | PUT `guardAdmin()` |
| `/api/me` | public | — |

"Viewer-aware" = the bookmark queries take the caller's `userId` so each row can
report `likeCount` and `likedByMe`. Guests get `likedByMe: false`.

`/api/me` is the bridge to the client: it returns
`{ role, isSignedIn, isAdmin, name, imageUrl }` so the UI can gate cosmetically
without re-implementing role logic.

Comment deletion authorization (the one per-row rule):
```ts
const isAuthor = comment.userId === me.userId;
if (!isAuthor && me.role !== "admin") return 403;
```

---

## 5. The guest experience (UX, not security)

Guests are never shown a dead end; they're sold on signing up.

- **`/locked` page** (`app/locked/page.tsx`, public): a playful teaser with a
  floating padlock, **page-specific copy driven by site settings**
  (`?feature=<pageId>` → the matching page's `lockedIcon`/`lockedTitle`/
  `lockedDesc`/`perks`), a perks list, and **Sign up / Sign in** buttons. An
  unknown/absent feature falls back to the generic members-only teaser
  (`FALLBACK_LOCKED` in `lib/settings.ts`). This is where both the sidebar and the
  per-page gate send guests. *(Editing a page's locked copy in Settings now changes
  this screen — previously the per-feature copy was hardcoded and ignored edits.)*
- **Sidebar** (`app/_components/sidebar.tsx`):
  - Nav items are driven by `navPages(settings)` (built-ins first, then custom
    pages). Every page's label and icon come from settings; the guest padlock
    badge is toggled by the `showLockIcon` setting. Only `locked` pages get the
    guest teaser treatment — unlocked pages link straight through for everyone.
  - For guests they get a "locked" treatment — dashed frosted tile, dimmed
    icon+text, a padlock fused onto the icon (locked-folder metaphor), and a
    purple "UNLOCK" nudge on hover. Clicking → `/locked?feature=…`.
  - For signed-in users they render as normal nav and route to the real page.
  - The "+ New bookmark" button renders **only for admins** (`isAdmin`).
  - The bottom "Not signed in" card is clickable → `/sign-in`. (The old inline
    Sign in / Sign up buttons were removed; this card is the single entry point.)
- **Detail screen** (`app/_components/screens/detail-screen.tsx`): guests see
  "Sign in to like" and "Sign in to join" (comments) prompts; Edit/Delete render
  only for admins.

---

## 6. Client-side role plumbing

| File | Role |
|------|------|
| `lib/hooks/use-role.ts` | `useRole()` → `{ role, isAdmin, isSignedIn, loading }` (fetches `/api/me`) |
| `@clerk/nextjs` `useAuth()` | `isSignedIn`, `userId` for quick client checks |
| `app/add/page.tsx` | Admin-only page: `useRole()` guard redirects non-admins to `/` (API also enforces) |

Pattern: **`useRole()` for "is this person an admin?"**, Clerk's `useAuth()` for
"are they signed in at all?". Never trust either for security — they only decide
what to *show*.

---

## 7. Routes map

| Path | Access | Notes |
|------|--------|-------|
| `/` | public | Library / all bookmarks |
| `/[slug]` | public | Bookmark detail — guests can view, like/comment gated |
| `/locked` | public | Friendly members-only teaser |
| `/sign-in`, `/sign-up` | public | Clerk hosted components |
| `/server` | members† | Server status board — view (user) / add·edit·delete containers + rename server (admin). Label = the `server` page's editable `label` (default "My Server"). |
| `/agents` | members† | Agents board — view + open detail (user) / add·edit·delete agents (admin). Label = the `agents` page's editable `label` (default "My Agents"). |
| `/agents/[id]` | members† | Single agent detail (name, title, what-it-does, model, robots, color). Read-only. |
| `/category` | members† | Categories — view (user) / manage (admin) |
| `/p/[slug]` | per-page† | Admin-created custom page. Public if its `locked` flag is off, else members-only. Renders the page's editable `sections`. 404 for unknown/built-in slugs. |
| `/settings` | members | Site settings — view (user) / edit (admin): theme accent, server name, lock-icon toggle, and the **Pages** manager (per-page label, icon, locked toggle, locked-screen copy, and content sections for custom pages). |
| `/add` | admin | Add bookmark; double-guarded (page + API) |

† Gated by `enforcePageAccess` (§3a), **not** middleware. A guest hitting a
locked one is redirected to `/locked?feature=<id>`; an unlocked page is public.

### 7a. The pages model

Pages are admin-managed data, stored as `SiteSettings.pages` (the single
`site_settings` JSONB row). A `ManagedPage` (`lib/types.ts`) owns: `id` (slug),
`builtin`, `label`, `icon`, `locked`, `lockedIcon`/`lockedTitle`/`lockedDesc`/
`perks` (the `/locked` teaser), and `sections` (custom-page body).

- **Built-ins** (`server`, `agents`, `category`) are seeded by `DEFAULT_PAGES`
  (`lib/settings.ts`), can't be deleted, and render their own rich screens —
  their `sections` are ignored. Their route is `/<id>`.
- **Custom pages** are created in `/settings` → Pages, live at `/p/<id>`, and
  render their `sections` via `app/_components/screens/custom-page.tsx`.
- `mergeSettings` tolerates old/partial blobs (and migrates legacy flat
  `serverLabel`/`agentsLabel`/`lockedTitle`/`lockedSubtitle`/`perks` onto the
  built-ins). `sanitizeSettingsPatch` validates icons, dedupes/whitelists slugs
  (no reserved or built-in collisions), and can never flip a `builtin` flag or
  drop a built-in. Both are admin-enforced via `PUT /api/settings` → `guardAdmin`.

> Route history: `/recent` → `/server`, and `/collections` → `/openclaw` →
> `/agents`. The agents page is now a real CRUD board with a per-agent detail
> page at `/agents/[id]`; its label is the editable `label` of the `agents`
> managed page (default "My Agents") and the `/locked` feature key is `agents`.
> The leftover `"recent"` string in the codebase is the **sort** option
> (Recent / A–Z / Most visited), unrelated to routing.

---

## 8. Data layer touchpoints

| File | Auth-relevant detail |
|------|----------------------|
| `lib/db/bookmarks.ts` | `getBookmarks(viewerId)` / `getBookmarkById(id, viewerId)` add `like_count` + `liked_by_me` subqueries |
| `lib/db/likes.ts` | `toggleLike(bookmarkId, userId)` → `{ liked, likeCount }` |
| `lib/db/comments.ts` | `getComments`, `createComment`, `getCommentById`, `deleteComment` |
| `lib/db/containers.ts` | `getContainers` / `createContainer` / `updateContainer` / `deleteContainer` — admin writes guarded at the API |
| `lib/db/settings.ts` | `getSettings` / `updateSettings` — single JSONB row, folded over `DEFAULT_SETTINGS` in `lib/settings.ts` |
| `lib/db/agents.ts` | `getAgents` / `getAgentById` / `createAgent` / `updateAgent` / `deleteAgent` — admin writes guarded at the API |
| `lib/db/schema.sql` | Tables `bookmark_likes`, `comments`, `server_containers`, `site_settings`, `agents` (applied manually — see below) |

Schema is applied **manually** (no auto-loader). Postgres runs in Docker
(`glance-db`). Apply with:
```bash
docker exec -i glance-db psql -U glance -d glance < lib/db/schema.sql
```

---

## 9. Setup & environment

- Clerk app: **My Application** (`app_3FG9bmJTZxvsJcYs6SbtkEE2UVG`), CLI
  authenticated as `bijayadhikari107@gmail.com`.
- `.env` keys: `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY`, `CLERK_SECRET_KEY`,
  `ADMIN_EMAIL`, plus the Postgres connection.
- `app/layout.tsx` wraps the app in `<ClerkProvider>`.
- `next.config.ts` allows `img.clerk.com` (avatars in comment threads).
- **Postgres must be running** for any DB-backed call (remind Bijaya to start the
  Docker container if connections fail).

Dev server (ports 3000/3001 are reserved — always pass an explicit alt port):
```bash
npm run dev -- -p 3200
```

---

## 10. "Where do I change X?" cheat sheet

| I want to… | Edit |
|------------|------|
| Add/remove an admin | `ADMIN_EMAIL` in `.env` |
| Change who can do an action (real rule) | the route handler under `app/api/**` + `lib/auth.ts` guards |
| Make `/settings` or `/add` public/protected | `isProtectedRoute` in `proxy.ts` |
| Make a **managed page** members-only or public | toggle its **locked** flag in `/settings` → Pages (enforced by `enforcePageAccess`, `lib/page-access.ts`) |
| Add / rename / re-icon / delete a page | `/settings` → Pages (admin); persisted in `SiteSettings.pages` |
| Change what guests see in the nav | `app/_components/sidebar.tsx` (driven by `navPages`) |
| Change the upsell/teaser copy | edit a page's locked-screen fields in `/settings` → Pages (generic fallback: `FALLBACK_LOCKED` in `lib/settings.ts`); layout in `app/locked/page.tsx` |
| Change like/comment storage | `lib/db/likes.ts`, `lib/db/comments.ts`, `lib/db/schema.sql` |
| Change client gating signal | `/api/me` + `lib/hooks/use-role.ts` |
| Add a site setting (theme/server name/etc.) | `SiteSettings` + `DEFAULT_SETTINGS` + `sanitizeSettingsPatch` in `lib/settings.ts`; surface it in `app/_components/screens/settings-screen.tsx` |
| Change the page model (icons, sections, fields) | `ManagedPage`/`PageIconKey`/`PageSection` in `lib/types.ts`, `DEFAULT_PAGES`/merge/sanitize in `lib/settings.ts`, `PAGE_ICONS` in `app/_icons`, the Pages manager in `settings-screen.tsx`, render in `custom-page.tsx` |
| Change the server-container model | `lib/types.ts` (`ServerContainer`), `lib/db/containers.ts`, `app/_components/screens/server-screen.tsx` |
| Change the agent model / its detail page | `lib/types.ts` (`Agent`), `lib/db/agents.ts`, `app/_components/screens/agents-screen.tsx` + `agent-detail.tsx` (shared claw animation in `app/_components/claw-cabinet.tsx`) |
| Change the theme accent palette | `ACCENTS` in `lib/settings.ts`; applied via the `--accent` CSS var (set by `SettingsProvider`), consumed as `bg-[var(--accent)]` etc. |
| Rename "My Server" / "My Agents" (or any page) | edit the page's `label` in `/settings` → Pages (admin) — pages are data (`SiteSettings.pages`), not hard-coded |
