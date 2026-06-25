# PostgreSQL Migration Plan — Glance App (Mac Docker → Hostinger VPS)

## Overview

This guide covers migrating the `glance` PostgreSQL database from a local Docker container on macOS to a Hostinger VPS running Docker.

- **Source:** `glance-db` container on Mac (Postgres 16, volume `glance_pg_data`)
- **Target:** Hostinger VPS (Ubuntu) running Docker + `docker-compose.yml`
- **Credentials:** Stored in `.env` and `.env.hostinger`; never hardcoded in `docker-compose.yml`

---

## Part A — One-Time Cutover

### 1. Stop writes on the source

Stop the local Next.js dev server or any app process writing to the DB:

```bash
pkill -f "next dev"
```

### 2. Backup the local database

```bash
docker exec -t glance-db pg_dump -U glance -d glance > glance_backup.sql
```

> Plain SQL format is used instead of custom format (`-Fc`) to avoid `pg_restore` version compatibility issues.

Verify:

```bash
ls -lh glance_backup.sql
```

### 3. Prepare the Hostinger VPS

- Provision an Ubuntu 22.04/24.04 VPS on Hostinger.
- SSH in:

```bash
ssh root@YOUR_HOSTINGER_IP
```

- Install Docker and Docker Compose:

```bash
apt update && apt install -y docker.io docker-compose-plugin
```

- Create the target directory on the VPS:

```bash
mkdir -p /root/glance
```

- If the VPS already has another Postgres service on port `5432`, update `glance/docker-compose.yml` to use a different host port and a bind mount before uploading. The compose file reads credentials from `.env`:

```yaml
services:
  postgres:
    image: postgres:16-alpine
    container_name: glance-db
    env_file:
      - .env
    ports:
      - "127.0.0.1:${POSTGRES_PORT:-5432}:5432"
    volumes:
      - /opt/glance/postgres-data:/var/lib/postgresql/data
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U $$POSTGRES_USER -d $$POSTGRES_DB"]
      interval: 5s
      timeout: 5s
      retries: 5
```

Create `.env` on the VPS (use `.env.hostinger` as a template) and set `POSTGRES_PORT=5434`.

### 4. Upload files to Hostinger

From your Mac, run these from the project root (the folder containing `glance/`). If you are elsewhere, use the full path to each file.

```bash
scp glance/docker-compose.yml root@YOUR_HOSTINGER_IP:/root/glance/
scp glance_backup.sql root@YOUR_HOSTINGER_IP:/root/glance/
```

### 5. Start Postgres on Hostinger

On the VPS:

```bash
cd /root/glance
docker compose up -d postgres
```

Wait until healthy:

```bash
docker logs -f glance-db
```

### 6. Restore the database

```bash
docker exec -i glance-db psql -U glance -d glance < /root/glance/glance_backup.sql
```

If objects already exist or you want a clean restore, recreate the DB first:

```bash
docker exec glance-db dropdb -U glance glance
docker exec glance-db createdb -U glance glance
docker exec -i glance-db psql -U glance -d glance < /root/glance/glance_backup.sql
```

### 7. Verify

```bash
docker exec -it glance-db psql -U glance -d glance -c "\dt"
docker exec -it glance-db psql -U glance -d glance -c "SELECT count(*) FROM bookmarks;"
```

The Glance DB is restored with all data verified (e.g., `SELECT count(*) FROM bookmarks;` should match the source).

### 8. Update environment and start the app on Hostinger

If the VPS already has another Postgres service on port `5432`, the Glance DB is exposed on a different port (controlled by `POSTGRES_PORT` in `.env`). On the VPS, copy the provided template and fill in your Clerk keys:

```bash
cd /root/glance
cp .env.hostinger .env
# Edit .env and add your Clerk keys
nano .env
```

The resulting `.env` should include:

```env
POSTGRES_PORT=5434
DATABASE_URL="postgresql://bjadhs_glance:Mybookmark1#@localhost:5434/glance"
```

Then start the app:

```bash
cd /root/glance
docker compose up -d
# or for development
npm install && npm run dev -- -p 3200
```

The app will read `DATABASE_URL` and connect through the `postgres` package in `lib/db/index.ts`. Since the URL points to `localhost`, SSL is automatically disabled.

### 9. Secure the Hostinger VPS with UFW

Allow only the ports you actually need. If you run the Next.js dev server on port `3200`, you may need to open it for testing, but for production use a reverse proxy (Nginx/Caddy) and only expose `80`/`443`.

```bash
ufw default deny incoming
ufw default allow outgoing
ufw allow ssh
ufw allow 80
ufw allow 443
# Only if you need direct access to the dev server (not recommended for production)
# ufw allow 3200
ufw enable
```

Verify rules:

```bash
ufw status verbose
```

**Important:** Never expose the Postgres port (`5432` or `5434`) to the public internet. It should only listen on `127.0.0.1` inside the `docker-compose.yml`.

### 10. Decommission local container

```bash
docker compose -f /path/to/glance/docker-compose.yml down
```

---

## Part B — Source DB Stays Running

### Option 1 — Streaming Replication (Advanced)

- Configure `postgresql.conf` and `pg_hba.conf` in the local container for replication.
- Clone via `pg_basebackup` from Hostinger.
- Promote Hostinger replica to primary at cutover.

**Pros:** Near-zero downtime.  
**Cons:** Complex; requires secure exposure of local Postgres.

### Option 2 — Periodic Dump-and-Restore (Simple)

From Mac:

```bash
docker exec -t glance-db pg_dump -U bjadhs_glance -d glance > glance_backup_$(date +%F).sql
scp glance_backup_$(date +%F).sql root@YOUR_HOSTINGER_IP:/root/glance/
```

> Ensure `/root/glance/` exists on the VPS (see Part A step 3).

On Hostinger:

```bash
cd /root/glance
docker exec glance-db dropdb -U glance glance || true
docker exec glance-db createdb -U glance glance
docker exec -i glance-db psql -U glance -d glance < glance_backup_$(date +%F).sql
```

**Pros:** Simple and repeatable.  
**Cons:** Not real-time.

### Option 3 — Parallel Run + Final Cutover (Recommended)

1. Restore an initial backup to Hostinger.
2. Run and test the Glance app against Hostinger DB.
3. Take a final backup from Mac and restore it to Hostinger.
4. Switch DNS/env vars to Hostinger.
5. Stop the local DB after confirmation.

---

## Security Checklist

- [ ] Avoid exposing Postgres port `5432` (or the mapped host port like `5434`) publicly. Bind to `127.0.0.1` only.
- [ ] Do not commit `.env` files — they are already ignored via `.gitignore`.
- [ ] Do not expose the Next.js dev server port (`3200`) publicly in production; use Nginx/Caddy with HTTPS instead.
- [ ] Use a strong DB password; rotate if needed.
- [ ] Enable UFW:

```bash
ufw default deny incoming
ufw default allow outgoing
ufw allow ssh
ufw allow 80
ufw allow 443
ufw enable
```

- [ ] Prefer `.env` / Docker secrets over hardcoded passwords in `docker-compose.yml`.

---

## Recommended Path

Use **Part B — Option 3** for a safe, reversible migration.
