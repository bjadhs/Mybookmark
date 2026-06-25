# Deploy & Server Operations — Session Notes

Everything added in this session to turn Glance into a live control room for the
Hostinger box (`root@100.78.187.64`). Four areas: a **live `/server`**
dashboard, two new **agents**, an admin **`/deploy`** SSH control bridge, and an
admin **`/hostinger`** operations handbook.

---

## 0. Prerequisites & environment

The live features shell out to `ssh` from wherever the app runs. They work as
long as that machine can `ssh root@100.78.187.64` **without a password** (key
auth), and — because the box is on a Tailscale `100.64.0.0/10` address — with
Tailscale up.

Added to `.env`:

```bash
# Hostinger box — the /server live view and /deploy control bridge SSH here.
SERVER_SSH_HOST=root@100.78.187.64
# Base dir on the box where stacks / cloned repos live (compose-up, deploy).
SERVER_STACKS_DIR=/root
```

Both are read at runtime (`lib/ssh.ts`, `lib/server-live.ts`), so you can point
at a different box or stack directory without code changes. A remote/serverless
deploy (e.g. Vercel) has no SSH key — live features degrade gracefully there.

Admin identity is still driven by `ADMIN_EMAIL`. `/deploy` and `/hostinger` are
admin-only.

---

## 1. Live `/server` dashboard

The Server page now reads the **real Docker fleet** over SSH instead of showing
hand-curated rows.

**How it works**

- `lib/server-live.ts` (server-only) runs one SSH round-trip:
  `docker ps -a` + `docker stats --no-stream`, joined on container name. It
  parses each container into name, cleaned display name (swarm/replica suffixes
  stripped), image, state, published ports (`80→80`), CPU/MEM %, health, and an
  app-family tag. Results are cached in-memory for ~3.5s so multiple
  viewers/refreshes don't spawn an ssh process each.
- `app/api/server/live/route.ts` — `GET` (Node runtime, `force-dynamic`).
  `?force=1` bypasses the cache. Returns `{ host, generatedAt, containers,
  totals }`, or `502 { code: "live_unavailable" }` if SSH fails.
- `lib/hooks/use-server-live.ts` — client hook with a **5-minute** Live
  auto-refresh toggle + manual refresh. (Each refresh opens a fresh SSH
  connection, so the interval is deliberately long to avoid loading the box;
  use the Refresh button for an on-demand pull.)
- `app/_components/screens/server-screen.tsx` — rewritten:
  - Animated count-up stat tiles (Containers / Running / Stopped / Stacks).
  - A highlighted **Dokploy control plane** panel (auto-detects `dokploy*`).
  - **Running** and **Stopped & restarting** sections, search + status filters.
  - Cards with staggered entrance, pulsing status dots, port pills, health
    badges, CPU/MEM meters (dynamic range + scan shimmer on live containers).
  - A live terminal fed by the real container roster.
  - **Graceful fallback**: if SSH is unavailable, it shows the saved/curated
    containers (the original admin CRUD UI) with a "Retry live" banner.

**Verified live:** 16 containers — 12 running, 4 stopped, 13 stacks.

---

## 2. New agents: N8N & Hermes

Added two agents that mirror real containers, with a "look inside"
configuration panel on the detail page.

- Seeded into the DB (and `lib/db/schema.sql`, idempotent `ON CONFLICT DO
  NOTHING`):
  - **N8N Agent** · Workflow Automation (`agt_n8n`, pink) → `n8n-wlad-n8n-1`
  - **Hermes Agent** · Reasoning Engine (`agt_hermes`, cyan) →
    `hermes-webui-dygg-hermes-agent-1`
- `lib/agent-presets.ts` — dummy-but-realistic config keyed off the agent name
  (n8n / hermes / generic): a badge, an "Open console" link to the live port,
  the container name, capability chips, and grouped Runtime / Model / Webhook /
  Environment key-value cards (with masked secrets + show/hide).
- `app/_components/screens/agent-detail.tsx` — renders the badge + Configuration
  panel under the existing agent detail.

---

## 3. `/deploy` — admin SSH control bridge

A one-click ops console: every button runs a fixed command on the box over SSH.

**Files**

- `lib/ssh.ts` — shared `sshExec(remoteCommand, timeoutMs)`; always resolves
  (captures stdout/stderr even on non-zero exit). BatchMode + 8s connect
  timeout. Reads `SERVER_SSH_HOST`.
- `lib/deploy-actions.ts` — **client-safe** catalog (pure metadata: id, label,
  description, category, params, danger/read flags, CTA) + quick links.
- `lib/server-bridge.ts` — **server-only** execution. Each action maps to a
  command template; user input is restricted to a few named params, each
  validated against a strict allowlist regex **before** it's placed in a
  command (validated tokens contain no shell metacharacters, so interpolation is
  safe). Per-action timeouts; output clipped to 20k chars. Unknown actions
  rejected.
- `app/api/deploy/run/route.ts` — `POST { action, params }`, `guardAdmin()`
  first, Node runtime, `force-dynamic`.
- `lib/hooks/use-deploy.ts` — client hook. Tracks **running actions as a list of
  ids** (each button tracks itself), keeps a rolling list of result records.
- `app/_components/screens/deploy-screen.tsx` — grouped action cards with inline
  inputs, per-action run buttons, danger confirms, and a sticky **console**
  (color-coded, expandable, shows command + stdout/stderr + exit code +
  duration).
- `app/deploy/page.tsx` — `enforceAdmin()`.

**Actions (by category)**

| Category | Actions |
|----------|---------|
| Deploy & rollout | Roll out a stack (`compose up -d`), Update & redeploy (`pull` + `up`), **Deploy from GitHub** (clone/ff + compose), Pull an image, Trigger Dokploy deploy webhook |
| Containers | Start, Restart, Stop, Tail logs (read), Inspect (read) — by container name |
| Maintenance | Disk usage (read), Uptime & memory (read), Prune dangling, Restart Traefik |
| Status cron | Install 5-min status cron, Read status log (read), Remove status cron |
| Quick links | Dokploy, n8n, Hermes WebUI, Traefik, Registry |

**Security model**

- Admin-only (`guardAdmin()` + `enforceAdmin()`).
- Strict per-param regex validation server-side (names, images, `owner/repo`,
  branch, https URL). Fixed command templates — no raw user text in a shell.
- Danger actions require a UI confirm. Read-only actions are styled neutral.

**Validation patterns**

- container/stack name: `^[a-zA-Z0-9][a-zA-Z0-9_.-]{0,99}$`
- image: `^[a-zA-Z0-9][a-zA-Z0-9_./:@-]{0,199}$`
- repo: `^[a-zA-Z0-9_.-]+/[a-zA-Z0-9_.-]+$`
- https URL: `^https://…$`

**The 5-minute status cron** installs this crontab line on the box (idempotent —
re-running replaces it; remove strips it):

```cron
*/5 * * * * docker ps -a --format "{{.Names}} {{.State}} {{.Status}}" > /tmp/glance-status.log 2>&1 # glance-status
```

"Read status log" cats `/tmp/glance-status.log`.

---

## 4. `/hostinger` — operations handbook

A big, navigable reference library (admin-only) so you can do things manually or
follow runbooks.

**Files**

- `lib/hostinger-guide.ts` — structured content model (`p`, `callout`, `code`,
  `table`, `list`, `steps`, `links`) + the content itself + `SERVER_FACTS`.
- `app/_components/screens/hostinger-screen.tsx` — doc UI: sticky
  table-of-contents with **scroll-spy** active highlighting, a live hero (real
  container counts via `useServerLive`), and a renderer for every block type
  (callouts info/tip/warn/danger, copy-able code blocks, tables, steps, inline
  `` `code` ``).
- `app/hostinger/page.tsx` — `enforceAdmin()`.

**Sections:** the box & specs · Access & SSH · Dokploy platform · Containers &
stacks · Networking & ports · Databases · Service catalog · Security notes ·
Runbooks · Maintenance & monitoring · Troubleshooting · Command cheat sheet.

---

## 5. Navigation & misc

- `app/_components/sidebar.tsx` — added **Deploy** and **Hostinger** links to the
  ADMIN section.
- `app/_icons/index.tsx` — added `DeployIcon`.
- `app/globals.css` — added `glance-rise`, `glance-scan`, `glance-spin-slow`
  animation tokens + `glance-scan` keyframe.

---

## 6. Container roster (observed)

| Container | Image | Role | Port |
|-----------|-------|------|------|
| dokploy | dokploy/dokploy:v0.29.7 | Deployment platform (healthy) | 3000 |
| dokploy-postgres | postgres:16 | Dokploy state | 5432 (internal) |
| dokploy-redis | redis:7 | Build/deploy queue | 6379 (internal) |
| dokploy-traefik | traefik:latest | Edge router / TLS | 80, 443, 8080 |
| n8n-wlad-n8n | n8nio/n8n | Workflow automation | 32770→5678 |
| hermes-webui | ghcr.io/nesquena/hermes-webui | Agent console (healthy) | 32769→8787 |
| hermes-agent | nousresearch/hermes-agent | Reasoning agent | — |
| trading-trading-wvludl | custom (swarm) | Trading bot | — |
| postgresql-ykcl | postgres:17 | App / Glance DB | 5432 |
| agentlooppg | postgres:17 | Agent-loop DB | 5444→5432 |
| local-registry | registry:2 | Private image registry | 5000 |

---

## 7. Verification

- `tsc --noEmit` and `eslint` clean across all new/changed files.
- `GET /api/server/live` → 200 with real parsed data.
- `POST /api/deploy/run` unauthenticated → 401 (admin guard).
- Read-only command templates (uptime, inspect `--format`, cron-read) execute
  correctly over SSH.

**Note:** `/deploy` and `/hostinger` SSH actions only work where the app can
reach the box (your dev machine / tailnet with the key). Without it, the live
view falls back to saved containers and bridge actions report the SSH error.
