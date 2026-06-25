# Cron Jobs & Notifications — Single Source of Truth

> Authoritative reference for **how the `/cron` feature works in Glance**. If
> behaviour and this file disagree, treat it as a bug and reconcile. Update this
> file whenever the cron/notification flow changes. Auth specifics also live in
> `docs/AUTH.md` (§4 fire gating, §7 routes).

Admins define **jobs** on `/cron`. When a job becomes **due**, it delivers a
message to the user **currently viewing the app** as an in-app **toast**
(bottom-right) and, optionally, an **email**.

## Core idea: there is no server scheduler

Because every delivery targets *the person looking at the app right now*, the
**browser is the scheduler**. A global client runtime evaluates which enabled
jobs are due and asks the server to fire them. The server is the gatekeeper: it
claims a one-time idempotency slot before delivering, so reloads / overlapping
polls can never double-send.

```
browser (use-cron-runner)            server (/api/cron/[id]/fire)
  every 30s, per enabled job
  is it due? → POST fire ───────────▶ guardUser
                                      kind admin-only? → 403 for non-admins
                                      claim cron_deliveries slot (ON CONFLICT
                                        DO NOTHING) — already claimed? → {deduped}
                                      build content by kind
                                      createNotification (DB row = toast payload)
                                      sendMail if wanted + SMTP configured
  ◀──────────────── { notification, emailed }
  pop toast (bottom-right)
```

## Job kinds

Picked from the **Add job** type list (`app/_components/screens/cron-screen.tsx`).
The `kind` column drives content, trigger, recipient, and who may fire it.

| Kind | Trigger | Content | Recipient | Who fires |
|------|---------|---------|-----------|-----------|
| `custom` | `delay` (N min after open) **or** `schedule` (daily HH:MM) | the admin-written `body` | the current viewer | any signed-in user |
| `server_health` | `interval` (every N hours while viewing) | generated live from `getLiveServerSnapshot` (`lib/server-live.ts`) | the admin (own email) | **admin only** |
| `visit_reminder` | `manual` (only via the **Send** button) | the admin-written `body` | the admin (own email) | **admin only** |

Future AI-generated kinds (news digest, bookmark summaries) are shown **locked**
in the picker until AI is wired up.

Admin-only kinds are gated three ways: they're absent from `GET /api/cron` for
non-admins (so their runner never sees them), the fire route returns 403 for
non-admins, and the management UI is behind `enforceAdmin()`.

## Triggers & "due" logic

`lib/hooks/use-cron-runner.ts` computes a **`dueKey`** per job each tick (~30s);
a non-null key means "fire this occurrence". The key also throttles within the
session so a job fires once per occurrence:

| `trigger_type` | Due when | dueKey (client) |
|----------------|----------|-----------------|
| `delay` | `now - sessionStart ≥ delayMinutes` | `delay` (once/session) |
| `schedule` | local clock ≥ `scheduleTime` today | `sched:<YYYY-MM-DD>` (once/day) |
| `interval` | always, bucketed | `int:<floor(now / intervalHours)>` (once/window) |
| `manual` | never auto-fires | `null` |

## Idempotency / dedup

`recordDeliveryIfNew(jobId, userId, occurrenceKey)` (`lib/db/cron.ts`) does an
`INSERT … ON CONFLICT DO NOTHING RETURNING` into `cron_deliveries`
(PK `(job_id, user_id, occurrence_key)`). It returns `true` only if **this** call
inserted the row — the authoritative "first time this occurrence". The server
computes the occurrence key independently of the client:

- `delay` → `delay:<UTC date>` · `schedule` → `schedule:<UTC date>`
- `interval` → `interval:<floor(epoch / intervalHours)>`
- `manual` → no key (always sends)

The **Send / Send test** button posts `{ test: true }`, which **bypasses dedup**
(an explicit, repeatable admin action) and is the only trigger for `manual` jobs.

## Email (`lib/email.ts`)

SMTP via **nodemailer**, lazily built from env. If `SMTP_HOST`/`SMTP_USER`/
`SMTP_PASS` are missing **or** a send throws, `sendMail` returns `{ sent: false }`
instead of throwing — email is best-effort and never blocks the in-app toast.

```
SMTP_HOST  SMTP_PORT(=587)  SMTP_SECURE(=true for 465)
SMTP_USER  SMTP_PASS        SMTP_FROM(=SMTP_USER)
```

Gmail: enable 2-Step Verification, then create an **App Password** and use it as
`SMTP_PASS` on port 587. `.env` ships these commented out.

## Data model (`lib/db/schema.sql`, applied manually)

- **`cron_jobs`** — `id, title, body, kind, trigger_type, delay_minutes,
  schedule_time, interval_hours, send_email, enabled, position, created_at`.
- **`notifications`** — `id, user_id, title, body, read, created_at`. One row per
  delivery (the toast payload + an audit trail). No read API today — toast-only UI.
- **`cron_deliveries`** — idempotency ledger, PK `(job_id, user_id, occurrence_key)`,
  `ON DELETE CASCADE` from `cron_jobs`.

After any schema change, re-apply (idempotent):

```bash
psql "$DATABASE_URL" -f lib/db/schema.sql
# or, against the docker container:
docker exec -i glance-db psql -U glance -d glance < lib/db/schema.sql
```

## File map

| Concern | File |
|---------|------|
| Admin page (gate) | `app/cron/page.tsx` (`enforceAdmin`) |
| Admin UI (picker + per-kind forms + rows) | `app/_components/screens/cron-screen.tsx` |
| Admin CRUD hook | `lib/hooks/use-cron.ts` |
| Client trigger evaluator | `lib/hooks/use-cron-runner.ts` |
| Global toast runtime (mounted in app shell) | `app/_components/notification-runtime.tsx` |
| List/create API | `app/api/cron/route.ts` |
| Update/delete API | `app/api/cron/[id]/route.ts` |
| Fire API (content + gating + dedup) | `app/api/cron/[id]/fire/route.ts` |
| DB — jobs + dedup | `lib/db/cron.ts` |
| DB — notifications | `lib/db/notifications.ts` |
| Email | `lib/email.ts` |
| Types / Zod | `lib/types.ts`, `lib/schemas.ts` |
| Health summary source | `lib/server-live.ts` (`getLiveServerSnapshot`) |

## Known limitations

- Delivery only happens while someone has the app open (by design — recipient is
  the current viewer). A `server_health` job emails you only while *you're*
  viewing Glance; it won't run with the app closed.
- Occurrence buckets use UTC dates server-side, so day-boundary edges can be off
  by a timezone offset. Acceptable for once-a-day-ish delivery.

## "Where do I change X?"

| I want to… | Edit |
|------------|------|
| Add a new job **kind** | `CRON_KINDS` (`lib/types.ts`), `cronJobInputSchema`/`cronJobSchema` (`lib/schemas.ts`), the picker + form + row in `cron-screen.tsx`, content branch in the fire route, and `KIND_META` |
| Add a new **trigger** | `CRON_TRIGGER_TYPES` (`lib/types.ts`), `dueKey` (`use-cron-runner.ts`), `occurrenceKey` (fire route), and the editor form |
| Change dedup granularity | `occurrenceKey` (fire route) + `dueKey` (runner) |
| Change the health email body | `buildHealthBody` in the fire route |
| Change toast look / TTL | `app/_components/notification-runtime.tsx` |
| Configure email | `SMTP_*` in `.env`; transport in `lib/email.ts` |
