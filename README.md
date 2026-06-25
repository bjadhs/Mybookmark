# Glance — live-grid bookmark manager

A dark-mode bookmark app where every saved site renders as a **faux browser
window** so the grid reads as "live previews". Built on **Next.js 16** +
**Tailwind CSS v4**, with **Postgres** for storage and **Clerk** for auth.

## Features

- **Bookmarks** — grid of brand-tinted preview cards, search, category chips,
  sort (Recent / A–Z / Most visited), likes & comments.
- **My Server / My Agents / Categories** — admin-curated, members-only pages.
- **Admin tools** — Projects tracker, Deploy bridge (SSH to the host), Handbook,
  and **Cron Jobs** (below).
- **Theming** — a single `--accent` CSS variable, switchable in Settings.

## Cron Jobs (`/cron`, admin only)

Admins schedule a message that reaches the user **currently viewing the app** —
as an in-app **toast** and (optionally) an **email**. There is no server-side
scheduler: each browser evaluates which jobs are due and asks the server to
fire them, which de-dupes per occurrence so nothing double-sends.

Click **Add job** to pick a type:

- **Custom message** — an in-app notification + optional email, triggered either
  N minutes after a user opens the app, or daily at a set time.
- **Server health report** — emails *you* a live server-status summary every N
  hours while you have Glance open (reuses the `/server` live snapshot).
- **Visit reminder** — emails *you* a nudge to open Glance, sent when you click
  **Send**.
- More types unlock once AI generation is added.

Every job row has a **Send / Send test** button to fire it to yourself
immediately. Email needs SMTP configured (see below); without it, jobs still
deliver the in-app toast.

## Getting started

> Ports **3000** and **3001** are reserved by another app — always pass an
> explicit alternative port.

```bash
npm install --legacy-peer-deps   # Clerk's peer range lags the Next 16 preview
npm run dev -- -p 3200
```

Open <http://localhost:3200>.

### Database

Bring up Postgres (see `docker-compose.yml`), then apply the schema — it's
idempotent, so re-running it is safe and is how you pick up new tables/columns:

```bash
psql "$DATABASE_URL" -f lib/db/schema.sql
```

### Environment (`.env`)

| Var | Purpose |
| --- | --- |
| `DATABASE_URL` | Postgres connection (or the discrete `POSTGRES_*` vars). |
| `ADMIN_EMAIL` | Comma-separated admin emails; everything else is a normal user. |
| `NEXT_PUBLIC_CLERK_*`, `CLERK_SECRET_KEY` | Clerk auth keys. |
| `SMTP_HOST` / `SMTP_PORT` / `SMTP_SECURE` / `SMTP_USER` / `SMTP_PASS` / `SMTP_FROM` | SMTP for cron emails. Optional — omit and email is skipped. For Gmail use an App Password on port 587. |
| `SERVER_SSH_HOST`, `SERVER_STACKS_DIR` | Host the `/server` + `/deploy` views SSH into. |

## Architecture notes

- **Pages** live at `app/<name>/page.tsx`; admin pages call `enforceAdmin()`.
  Screens are client components under `app/_components/screens/`.
- **APIs** under `app/api/**` use `guardAdmin` / `guardUser` from `lib/auth.ts`,
  Zod schemas from `lib/schemas.ts`, and `handleApiError` from `lib/api-error.ts`.
- **DB** access is in `lib/db/*` via the `postgres` tagged-template client.
- **Design system** and conventions are documented in `CLAUDE.md`.
