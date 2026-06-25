# Glance Deployment Guide — Hostinger VPS

This guide covers deploying the Glance Next.js app to the Hostinger VPS. Two
deployment paths are documented:

- **Part 1 — Dokploy (recommended / currently in use):** Dokploy is already
  running on the VPS and manages Traefik + Let's Encrypt SSL. Apps deploy as
  Docker containers from Git.
- **Part 2 — Manual (PM2 + Caddy/Nginx):** A from-scratch path that runs the app
  directly with PM2 behind a hand-configured reverse proxy. Use this only if you
  are not using Dokploy.

Both paths connect to the same migrated PostgreSQL container on the host.

## Server facts (shared)

- **VPS:** Hostinger Ubuntu 24.04 · public IPv4 `72.62.72.132` · Tailscale `100.78.187.64`
- **App port:** `3200` for the manual path; `3000` inside the container for Dokploy
  (never expose host `3000`/`3001` publicly — they're reserved locally)
- **Database:** `glance-db` container on `127.0.0.1:5434` mapped to Postgres `5432`
- **Domain:** `mybookmark.bijbrin.cloud`
- **Dokploy dashboard:** `:3000` on the VPS (not reachable publicly — see access note)
- **Traefik:** handles `80`/`443` and Let's Encrypt for the Dokploy path
- **Process manager (manual path):** PM2

---

# Part 1 — Dokploy Deployment (recommended)

## ⚠️ Access & edge-firewall blocker (read first)

Verified over SSH: ports **80, 443, and 3000 all time out from the public
internet**, even though UFW on the box allows them. The block is **upstream —
Hostinger's cloud/edge firewall**. Right now the VPS is only reachable over
**Tailscale**. This is why `http://dokploy.bijbrin.cloud:3000` won't load on your
Mac, and why `https://mybookmark.bijbrin.cloud` won't serve real users until the
edge ports are opened.

**Fix for public access:** Hostinger hPanel → your VPS → **Firewall** → allow
inbound **80** and **443** (keep **3000 closed** publicly).

**Open the Dokploy dashboard from your Mac:**

```bash
# Option A — SSH tunnel (works now, nothing to change)
ssh -L 3000:localhost:3000 root@100.78.187.64
#   then browse to  http://localhost:3000

# Option B — Tailscale (install on the Mac, join the tailnet)
#   then browse to  http://100.78.187.64:3000
```

Option C (after 80/443 are open): set Dokploy's panel domain to
`dokploy.bijbrin.cloud` in **Dokploy → Settings**, then use
`https://dokploy.bijbrin.cloud` (no `:3000`). It already resolves to the VPS.

---

## ✅ Post-Deploy: Make the Public HTTPS URL Work (repeatable for every app)

Run this **every time** after Dokploy reports an app deployed but you "can't get the
URL". This is the exact sequence proven out on `trading.bijbrin.cloud` (2026-06-20).
A green "running" status in Dokploy does **not** mean the app is reachable — these
are the layers between a healthy container and a working public HTTPS URL.

All commands target the VPS over Tailscale: **`ssh root@100.78.187.64`** (note `.78`,
**not** `.68` — easy to mistype).

### 1. Confirm DNS points at the VPS
```bash
dig +short <app>.bijbrin.cloud        # → 72.62.72.132
```
Add an A record in Hostinger hPanel → Domains → bijbrin.cloud → DNS Zone if missing.

### 2. Confirm Traefik is actually running (it can go missing)
```bash
ssh root@100.78.187.64 'docker ps --filter name=dokploy-traefik --format "{{.Names}} {{.Status}} {{.Ports}}"'
```
If **nothing** is returned, Traefik is down and **no** Dokploy domain will serve.
Make sure nothing else is squatting port 80 (`ss -tlnp | grep -E ":80 |:443 "` —
e.g. a stray host `nginx`; `systemctl stop nginx && systemctl disable nginx`), then
restore Traefik with Dokploy's own settings:
```bash
ssh root@100.78.187.64 'docker run -d --name dokploy-traefik --restart=always \
  --network dokploy-network \
  -v /etc/dokploy/traefik/traefik.yml:/etc/traefik/traefik.yml:ro \
  -v /etc/dokploy/traefik/dynamic:/etc/dokploy/traefik/dynamic \
  -v /var/run/docker.sock:/var/run/docker.sock \
  -p 80:80 -p 443:443/tcp -p 443:443/udp -p 8080:8080 \
  traefik:latest'
```

### 3. Add the domain + enable HTTPS **in the Dokploy UI** (don't hand-edit)
Dokploy app → **Domains** → Add Domain → host `<app>.bijbrin.cloud`, internal
**port** = the app's container port, **HTTPS = on**, provider **Let's Encrypt**.
This writes `/etc/dokploy/traefik/dynamic/<app>.yml` with both a `web` and a
`websecure` (TLS/`certResolver: letsencrypt`) router. **The UI is the source of
truth** — a manual edit to that file works until the next redeploy, then reverts.

### 4. Open the edge firewall — **this is the usual blocker**
Host UFW already allows 80/443, but **Hostinger's cloud firewall drops them**.
In Hostinger hPanel → VPS → **Firewall**, add inbound rules:
`accept TCP 80 any any` and `accept TCP 443 any any`.

> Source **must be `any`**. Let's Encrypt validates from many rotating global IPs
> (HTTP-01 challenge on port 80), so you **cannot** restrict the source to your own
> IP/Tailscale and still get a cert. If you want the app private to your devices,
> don't open the edge firewall at all — use Tailscale Serve instead (separate path).

Rules take **~5 min to sync**. Verify from a machine **outside** the VPS (your Mac):
```bash
nc -z -G 8 72.62.72.132 80 && echo "80 OPEN"
nc -z -G 8 72.62.72.132 443 && echo "443 OPEN"
```

### 5. Force the cert + verify end-to-end
Once port 80 is publicly open, force Traefik to retry ACME and check from outside:
```bash
ssh root@100.78.187.64 'docker restart dokploy-traefik'      # forces ACME retry
# from your Mac (no -k → proves the cert is real/trusted):
curl -s -o /dev/null -w "%{http_code}\n" https://<app>.bijbrin.cloud/   # → 200
curl -s -o /dev/null -w "%{http_code} %{redirect_url}\n" http://<app>.bijbrin.cloud/  # → 301 → https
echo | openssl s_client -connect 72.62.72.132:443 -servername <app>.bijbrin.cloud 2>/dev/null \
  | openssl x509 -noout -issuer -subject -dates          # issuer = Let's Encrypt
```
Cert auto-renews via Traefik. Done when `https://<app>.bijbrin.cloud` returns 200
with a trusted cert.

---

## Overview

Dokploy deploys apps as Docker containers. The main challenge is that a Dokploy container cannot easily reach `127.0.0.1:5434` on the host. This guide provides two ways to solve that:

| Path | Database | Best For | Complexity |
|------|----------|----------|------------|
| **A1** | New Postgres managed by Dokploy | Clean, managed setup | Medium |
| **A2** | Reuse existing `glance-db` container | Faster, keeps migrated data | Lower |

Both paths use the same Dockerfile and domain setup. Choose **A1** if you want Dokploy to manage everything, or **A2** if you want to keep the database you already migrated.

---

## Common Steps (Both Paths)

### 1. Push the Glance repo to GitHub

```bash
cd /Users/bijayadhs/Desktop/mybookmark/glance
git add .
git commit -m "refactor: env-based db config and dokploy setup"
git push origin main
```

### 2. Add a Dockerfile

Create `Dockerfile` in the Glance repo root:

```dockerfile
FROM node:20-alpine AS builder
WORKDIR /app
COPY package*.json ./
RUN npm install --legacy-peer-deps
COPY . .
RUN npm run build

FROM node:20-alpine
WORKDIR /app
ENV NODE_ENV=production
COPY --from=builder /app/.next ./.next
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/package*.json ./
COPY --from=builder /app/public ./public
EXPOSE 3000
CMD ["npm", "run", "start", "--", "-p", "3000"]
```

Commit and push:

```bash
git add Dockerfile
git commit -m "Add Dockerfile for Dokploy deployment"
git push origin main
```

### 3. Create a Dokploy Project and Application

1. Open Dokploy (via SSH tunnel `http://localhost:3000` or Tailscale `http://100.78.187.64:3000` — see access note above)
2. Sign in to Dokploy
3. Create a new project: `glance`
4. Add an application: `glance-app`
5. Source type: Git
6. Repository: `https://github.com/YOUR_USERNAME/glance`
7. Branch: `main`
8. Build type: Dockerfile

---

## Option A1 — Move Both App and Postgres into Dokploy (Cleanest)

### 4. Add Postgres as a Dokploy Service

In Dokploy, add a database service:

- Name: `glance-db`
- Type: PostgreSQL
- User: `glance`
- Password: `Mybookmark1#`
- Database: `glance`

Or use a custom `docker-compose.dokploy.yml` if Dokploy supports it.

### 5. Set Environment Variables

In the Dokploy app settings, add:

```env
DATABASE_URL=postgresql://glance:Mybookmark1%23@glance-db:5432/glance   # '#' MUST be encoded as %23
NEXT_PUBLIC_CLERK_SIGN_IN_URL=/sign-in
NEXT_PUBLIC_CLERK_SIGN_UP_URL=/sign-up
NEXT_PUBLIC_CLERK_SIGN_IN_FALLBACK_REDIRECT_URL=/
NEXT_PUBLIC_CLERK_SIGN_UP_FALLBACK_REDIRECT_URL=/
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_live_...
CLERK_SECRET_KEY=sk_live_...
ADMIN_EMAIL=your-email@example.com
```

### 6. Configure Domain and SSL

In Dokploy:

1. Go to application > Domains
2. Add domain: `mybookmark.bijbrin.cloud`
3. Enable HTTPS
4. Dokploy + Traefik will issue the Let's Encrypt certificate automatically

### 7. Deploy

Click Deploy in Dokploy. Monitor the build logs.

### 8. Migrate Data

Export data from the existing Hostinger Postgres and import into the Dokploy Postgres:

```bash
# Export from existing container
docker exec -t glance-db pg_dump -U glance -d glance > /root/glance_backup.sql

# Find the new Dokploy Postgres container
docker ps | grep glance-db

# Import into Dokploy Postgres container
docker exec -i DOKPLOY_POSTGRES_CONTAINER psql -U glance -d glance < /root/glance_backup.sql
```

### 9. Verify

```bash
curl https://mybookmark.bijbrin.cloud/api/health
```

---

## Option A2 — Keep Postgres on Host, Expose to Dokploy Network

Use this path if you want to reuse the `glance-db` container that was already migrated from your Mac.

### 4. Connect Existing Postgres to Dokploy Network

Find the Dokploy network:

```bash
docker network ls | grep dokploy
```

Usually `dokploy-network`.

Connect the existing `glance-db` container:

```bash
docker network connect dokploy-network glance-db
```

### 5. Set Environment Variables

In the Dokploy app settings, add:

```env
DATABASE_URL=postgresql://glance:Mybookmark1%23@glance-db:5432/glance   # '#' MUST be encoded as %23
NEXT_PUBLIC_CLERK_SIGN_IN_URL=/sign-in
NEXT_PUBLIC_CLERK_SIGN_UP_URL=/sign-up
NEXT_PUBLIC_CLERK_SIGN_IN_FALLBACK_REDIRECT_URL=/
NEXT_PUBLIC_CLERK_SIGN_UP_FALLBACK_REDIRECT_URL=/
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_live_...
CLERK_SECRET_KEY=sk_live_...
ADMIN_EMAIL=your-email@example.com
```

Docker DNS will resolve `glance-db` within the `dokploy-network`.

### 6. Configure Domain and SSL

In Dokploy:

1. Go to application > Domains
2. Add domain: `mybookmark.bijbrin.cloud`
3. Enable HTTPS
4. Dokploy + Traefik will issue the Let's Encrypt certificate automatically

### 7. Deploy

Click Deploy in Dokploy. Monitor the build logs.

### 8. Verify

```bash
curl https://mybookmark.bijbrin.cloud/api/health
```

---

## Clerk Production (the actual cause of "Failed to load Clerk JS")

Adding the domain in Dokploy is **not enough** for Clerk. The live key
`pk_live_…` loads Clerk JS from the custom Frontend-API host
`clerk.mybookmark.bijbrin.cloud`, which currently has **no DNS record** — hence
`ClerkRuntimeError: failed_to_load_clerk_js`. Fix it in DNS, not on the server
(these subdomains are served by Clerk's infra, not your nginx/Traefik).

### 1. Add Clerk CNAMEs (Hostinger hPanel → Domains → bijbrin.cloud → DNS Zone)
Copy the **exact targets** from Clerk Dashboard → **Configure → Domains**
(Production instance) — they're unique per app. ~5 records:

| Host (subdomain) | Type | Target (example — use dashboard value) |
|---|---|---|
| `clerk.mybookmark` | CNAME | `frontend-api.clerk.services` |
| `accounts.mybookmark` | CNAME | `accounts.clerk.services` |
| `clkmail.mybookmark` | CNAME | `mail.…clerk.services` |
| `clk._domainkey.mybookmark` | CNAME | DKIM target |
| `clk2._domainkey.mybookmark` | CNAME | DKIM target |

### 2. In the Clerk Dashboard (Production)
- Production domain = `mybookmark.bijbrin.cloud`.
- After the CNAMEs propagate, click **Verify** so Clerk provisions its cert.
- Add `https://mybookmark.bijbrin.cloud` to allowed origins / redirect URLs.
- Clerk production **requires HTTPS** on the app domain → Traefik provides it
  (needs edge ports 80/443 open, see top section).

### 3. Keys: prod vs local
- **Production (Dokploy env only):** `pk_live_…` / `sk_live_…`.
- **Local dev (`.env`):** keep the **test** keys (`pk_test_…clerk.accounts.dev`) —
  these load Clerk JS from a working `*.clerk.accounts.dev` host, no custom DNS
  needed. Never commit either set.

### 4. Verify Clerk end-to-end
```bash
dig +short clerk.mybookmark.bijbrin.cloud        # → Clerk CNAME target (not empty)
curl -I https://mybookmark.bijbrin.cloud         # → 200, valid Let's Encrypt cert
```
Then load the site: no `failed_to_load_clerk_js`, and sign-in/up completes.

---

## Recommended Path

**Option A1** is cleanest if you want Dokploy to manage everything.
**Option A2** is faster if you want to reuse the already-migrated Postgres data.

---

# Part 2 — Manual Deployment (PM2 + Caddy/Nginx)

Use this path only if you are **not** using Dokploy — it runs the app directly on
the VPS with PM2 behind a hand-configured reverse proxy. The app runs on port
`3200` and connects to the same `glance-db` Postgres container.

## 1. Prerequisites on the VPS

Connect to the VPS:

```bash
ssh root@YOUR_HOSTINGER_IP
```

Ensure Docker, Docker Compose, Node.js, and npm are installed:

```bash
# Docker
apt update && apt install -y docker.io docker-compose-plugin

# Node.js 20 LTS
curl -fsSL https://deb.nodesource.com/setup_20.x | bash -
apt install -y nodejs

# Verify
node -v
npm -v
docker compose version
```

Install PM2 globally:

```bash
npm install -g pm2
```

---

## 2. Clone the Repository

```bash
cd /root
# Replace with your actual repo URL
git clone https://github.com/YOUR_USERNAME/glance.git
cd glance
```

If the repo is private, use SSH or a deploy key.

---

## 3. Ensure Postgres Container Is Running

```bash
cd /root/glance
docker compose up -d postgres
docker ps --filter name=glance-db
```

Verify data is present:

```bash
docker exec -it glance-db psql -U bjadhs_glance -d glance -c "SELECT count(*) FROM bookmarks;"
```

---

## 4. Configure Environment Variables

Copy the Hostinger environment template and edit it:

```bash
cp .env.hostinger .env
nano .env
```

Make sure it contains:

```env
POSTGRES_USER=bjadhs_glance
POSTGRES_PASSWORD="Mybookmark1#"
POSTGRES_DB=glance
POSTGRES_PORT=5434
DATABASE_URL="postgresql://bjadhs_glance:Mybookmark1#@localhost:5434/glance"
ADMIN_EMAIL=your-email@example.com

# Clerk
NEXT_PUBLIC_CLERK_SIGN_IN_URL=/sign-in
NEXT_PUBLIC_CLERK_SIGN_UP_URL=/sign-up
NEXT_PUBLIC_CLERK_SIGN_IN_FALLBACK_REDIRECT_URL=/
NEXT_PUBLIC_CLERK_SIGN_UP_FALLBACK_REDIRECT_URL=/
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_live_...
CLERK_SECRET_KEY=sk_live_...
```

> Do not commit `.env`. It is already ignored by `.gitignore`.

---

## 5. Install Dependencies and Build

```bash
npm install
npm run build
```

If the build fails with lint errors, temporarily fix them or run:

```bash
NEXT_TELEMETRY_DISABLED=1 npm run build
```

The lint errors in `lib/category-filter.ts` and `lib/hooks/use-website-preview.ts` should be addressed separately.

---

## 6. Start the App with PM2

Use PM2 to keep the app running and restart on reboot:

```bash
pm2 start "npm run start -- -p 3200" --name glance-app
pm2 save
pm2 startup systemd
```

For development mode instead:

```bash
pm2 start "npm run dev -- -p 3200" --name glance-app-dev
```

Verify the app is running:

```bash
pm2 status
curl http://localhost:3200/api/health
```

---

## 7. Configure Firewall (UFW)

Block all unnecessary ports. Do not expose Postgres (`5434`) publicly.

```bash
ufw default deny incoming
ufw default allow outgoing
ufw allow ssh
ufw allow 80
ufw allow 443
ufw enable
ufw status verbose
```

> Port `3200` should not be opened to the public. Only Caddy/Nginx on `80`/`443` should reach it locally.

---

## 8. Set Up Reverse Proxy with HTTPS

### Option A — Caddy (simplest)

Install Caddy:

```bash
apt install -y caddy
```

Create or edit `/etc/caddy/Caddyfile`:

```caddyfile
your-domain.com {
    reverse_proxy localhost:3200
}
```

Reload Caddy:

```bash
caddy fmt --overwrite /etc/caddy/Caddyfile
caddy reload --config /etc/caddy/Caddyfile
```

### Option B — Nginx

Install Nginx:

```bash
apt install -y nginx
```

Create `/etc/nginx/sites-available/glance`:

```nginx
server {
    listen 80;
    server_name your-domain.com;

    location / {
        proxy_pass http://localhost:3200;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }
}
```

Enable the site:

```bash
ln -s /etc/nginx/sites-available/glance /etc/nginx/sites-enabled/
nginx -t
systemctl reload nginx
```

For HTTPS with Nginx, use Certbot:

```bash
apt install -y certbot python3-certbot-nginx
certbot --nginx -d your-domain.com
```

---

## 9. Update Clerk Redirect URLs

In your Clerk Dashboard, add the production domain to:

- Allowed origins
- Redirect URLs
- Authorized domains

Use `https://your-domain.com` as the production URL. (See the Clerk Production
section in Part 1 for the full DNS/CNAME setup required by `pk_live_…` keys.)

---

## 10. Verify Deployment

Open the domain in a browser:

```
https://your-domain.com
```

Check health:

```bash
curl https://your-domain.com/api/health
```

Check that bookmarks load from the database.

---

## 11. Useful PM2 Commands

```bash
pm2 status              # View running apps
pm2 logs glance-app     # View app logs
pm2 restart glance-app  # Restart app
pm2 stop glance-app     # Stop app
pm2 delete glance-app   # Remove from PM2
```

---

## 12. Future Deployments

After pushing changes to the repo, pull and restart on Hostinger:

```bash
cd /root/glance
git pull origin main
npm install
npm run build
pm2 restart glance-app
```

---

# Security Summary (both paths)

- [ ] Postgres is bound to `127.0.0.1:5434` only and remains localhost-only.
- [ ] UFW blocks port `5434` from the public internet.
- [ ] If using Dokploy Option A2, the `glance-db` port mapping is not exposed publicly.
- [ ] Next.js app is reachable only via the reverse proxy (Traefik for Dokploy, or
      Caddy/Nginx on `localhost:3200` for the manual path) — never directly.
- [ ] HTTPS is enabled (Traefik/Let's Encrypt for Dokploy, or Caddy/Certbot manual).
- [ ] Edge firewall (Hostinger hPanel) allows inbound `80`/`443` with source `any`;
      Dokploy panel port `3000` stays closed publicly.
- [ ] `.env` is never committed to Git; all secrets live in Dokploy env or `.env`.
- [ ] Clerk keys are **production** keys (`pk_live_…`/`sk_live_…`) on the server and
      **test** keys locally — never committed.
- [ ] **Rotate the `sk_live_…` secret** in the Clerk dashboard before go-live (it was
      exposed during a working session), then update the Dokploy env.
</content>
</invoke>
