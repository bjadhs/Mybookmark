# Deploy — self-contained Docker Compose (app + Postgres)

Runbook for deploying Glance to the Hostinger box as a single compose stack that
**builds the app from the `Dockerfile`** and runs Postgres beside it. This is the
"get it running first" path: reachable over the server IP/Tailscale on a port,
using the current Clerk **test** keys. Domain + TLS + Clerk live keys are a later
pass (see `docs/DEPLOY.md`). Data is a **clean overwrite** of the server DB with
the latest local dump.

## Layout

- `Dockerfile` — multi-stage Next.js `standalone` build (`next.config.ts` sets
  `output: "standalone"`).
- `docker-compose.yml` — `app` (build) + `postgres` (image + volume). The app
  reaches Postgres as host **`postgres:5432`**; published host port **3200 → 3000**.
- The box `.env` is `.env.hostinger` (copied to `/root/glance/.env`). Its
  `DATABASE_URL` points at `postgres:5432` with user `glance`.

## 1. Snapshot the latest local data (on the Mac)

```bash
cd /Users/bijayadhs/Desktop/mybookmark/glance
docker exec -t glance-db pg_dump -U glance -d glance --no-owner --no-privileges \
  > glance_backup.sql
```

The dump carries schema + data for every table (bookmarks, categories, agents,
projects, settings, and the cron tables `cron_jobs` / `notifications` /
`cron_deliveries`). `glance_backup.sql` is gitignored.

## 2. Get the repo + env + dump onto the box

```bash
# repo (or `cd /root/glance && git pull` if it already exists)
ssh root@100.78.187.64 'git clone https://github.com/bjadhs/Mybookmark.git /root/glance'
# env (gitignored, so copied separately) and the dump
scp .env.hostinger    root@100.78.187.64:/root/glance/.env
scp glance_backup.sql root@100.78.187.64:/root/glance/
```

## 3. Bring up Postgres, restore data (clean overwrite), then the app

```bash
ssh root@100.78.187.64
cd /root/glance
docker compose up -d postgres                       # waits until healthy

# clean overwrite: drop & recreate, then restore the dump
docker exec glance-db dropdb  -U glance --if-exists glance
docker exec glance-db createdb -U glance glance
docker exec -i glance-db psql -U glance -d glance < /root/glance/glance_backup.sql

docker compose up -d --build app                    # builds the Dockerfile, starts the app
```

Visit **http://100.78.187.64:3200** (Tailscale/IP).

## Redeploy after a code change

```bash
cd /root/glance && git pull && docker compose up -d --build app
```

## Verify

```bash
docker compose ps                                   # glance-app + glance-db healthy
docker exec glance-db psql -U glance -d glance -c "\dt"
docker exec glance-db psql -U glance -d glance -c "SELECT count(*) FROM bookmarks;"
curl -I http://localhost:3200                       # 200 from the box
```

## Notes / known limits (this pass)

- **Clerk test keys over a raw IP:port** may be origin-restricted — core browsing
  and the DB work; full sign-in is part of the domain + live-keys pass.
- **`/server` and `/deploy`** admin panels SSH from the app process; the container
  has no SSH client/key, so they won't reach the host until a key is mounted later.
- Build must not touch Postgres (it isn't up during `compose build`). Pages are
  dynamic via Clerk, so they shouldn't prerender — if the build ever fails on the
  DB, mark the offending route `export const dynamic = "force-dynamic"`.
