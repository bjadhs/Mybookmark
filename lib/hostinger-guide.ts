/**
 * Content model + data for the admin-only /hostinger reference library. This is
 * a curated, hand-written operations handbook for the Hostinger box that runs
 * Glance + the Dokploy stack. Pure data so the screen can render it as a
 * navigable doc (TOC, callouts, code blocks, tables). Facts here are accurate
 * to the live server as observed; container counts on the page are pulled live.
 */

export type GuideBlock =
  | { type: "p"; text: string }
  | { type: "callout"; tone: "info" | "tip" | "warn" | "danger"; title?: string; text: string }
  | { type: "code"; label?: string; lines: string[] }
  | { type: "table"; headers: string[]; rows: string[][] }
  | { type: "list"; ordered?: boolean; items: string[] }
  | { type: "steps"; steps: { text: string; code?: string[] }[] }
  | { type: "links"; links: { label: string; href: string }[] };

export interface GuideSection {
  id: string;
  title: string;
  /** One-line summary shown in the TOC + under the heading. */
  blurb: string;
  tint: string;
  blocks: GuideBlock[];
}

/** Stable facts for the hero (specs measured off the box). */
export const SERVER_FACTS = {
  provider: "Hostinger VPS",
  host: "root@100.78.187.64",
  ip: "100.78.187.64",
  ram: "7.8 GiB",
  swap: "4.0 GiB",
  os: "Linux (Docker host)",
  orchestrator: "Dokploy v0.29.7 (Docker Swarm + Traefik)",
};

const HOST = "100.78.187.64";

export const HOSTINGER_GUIDE: GuideSection[] = [
  {
    id: "overview",
    title: "The box",
    blurb: "What this server is and what runs on it.",
    tint: "#a855f7",
    blocks: [
      {
        type: "p",
        text: "This is a Hostinger VPS acting as a single-node Docker host. It runs Glance's Postgres, the Dokploy deployment platform, and a handful of app stacks (n8n, Hermes, a trading bot, a local image registry). Everything is containerised — there are no app processes installed directly on the host.",
      },
      {
        type: "table",
        headers: ["Property", "Value"],
        rows: [
          ["Provider", "Hostinger VPS"],
          ["Address", `${HOST} (SSH as root)`],
          ["Memory", "7.8 GiB RAM + 4.0 GiB swap"],
          ["Orchestrator", "Dokploy v0.29.7 — Docker Swarm + Traefik"],
          ["Edge", "Traefik on :80 / :443 (TLS) and :8080 (dashboard)"],
        ],
      },
      {
        type: "callout",
        tone: "info",
        title: "That 100.x address is a Tailscale IP",
        text: "100.78.187.64 sits in the 100.64.0.0/10 CGNAT range Tailscale uses. The box is reachable on your tailnet — handy and private, but it means SSH/console access depends on Tailscale being up on whatever machine you connect from (including wherever Glance runs its SSH bridge).",
      },
      {
        type: "links",
        links: [
          { label: "Live container view → /server", href: "/server" },
          { label: "One-click control bridge → /deploy", href: "/deploy" },
        ],
      },
    ],
  },
  {
    id: "access",
    title: "Access & SSH",
    blurb: "How you and the app reach the box.",
    tint: "#00d4ff",
    blocks: [
      {
        type: "p",
        text: "Access is key-based SSH as `root`. Glance's /server and /deploy features shell out to the same connection, so if your laptop can `ssh root@…` without a password, the app can too.",
      },
      { type: "code", label: "Connect", lines: [`ssh root@${HOST}`] },
      {
        type: "p",
        text: "Glance reads the target from the `SERVER_SSH_HOST` env var (defaults to `root@100.78.187.64`) and `SERVER_STACKS_DIR` for where stacks live. Change the box without touching code by editing `.env`.",
      },
      {
        type: "callout",
        tone: "tip",
        title: "Use an SSH config alias",
        text: "Add a Host entry so you can type `ssh hostinger`. Keeps keys, user, and the tailnet address in one place.",
      },
      {
        type: "code",
        label: "~/.ssh/config",
        lines: [
          "Host hostinger",
          `    HostName ${HOST}`,
          "    User root",
          "    IdentityFile ~/.ssh/id_ed25519",
        ],
      },
    ],
  },
  {
    id: "dokploy",
    title: "Dokploy platform",
    blurb: "The deployment control plane and how apps ship.",
    tint: "#7c5cff",
    blocks: [
      {
        type: "p",
        text: "Dokploy is a self-hosted PaaS (think a small Vercel/Heroku) running on the box. It manages apps as Docker Swarm services, routes them through Traefik with automatic TLS, and can deploy straight from a GitHub repo or a Docker image.",
      },
      {
        type: "table",
        headers: ["Component", "Container", "Role"],
        rows: [
          ["Dashboard/API", "dokploy", "UI + REST API on :3000"],
          ["Database", "dokploy-postgres", "Postgres 16 — Dokploy's own state"],
          ["Queue", "dokploy-redis", "Redis 7 — build/deploy jobs"],
          ["Edge router", "dokploy-traefik", "TLS termination + routing"],
        ],
      },
      {
        type: "steps",
        steps: [
          { text: "Open the Dokploy dashboard and create (or pick) a Project." },
          { text: "Add an Application, choose the GitHub provider, and select the repo + branch." },
          { text: "Set the build type (Nixpacks, Dockerfile, or Compose) and any env vars." },
          { text: "Hit Deploy. Dokploy builds, pushes to the local registry, and rolls out the service." },
        ],
      },
      {
        type: "callout",
        tone: "tip",
        title: "Trigger redeploys from Glance",
        text: "Each Dokploy app can expose a deploy webhook. Paste that URL into the “Trigger Dokploy deploy” action on /deploy to redeploy from inside Glance.",
      },
      { type: "links", links: [{ label: "Open Dokploy", href: `http://${HOST}:3000` }] },
    ],
  },
  {
    id: "containers",
    title: "Containers & stacks",
    blurb: "Everything currently deployed, grouped by purpose.",
    tint: "#1ed760",
    blocks: [
      {
        type: "p",
        text: "Containers fall into three buckets: the Dokploy control plane, your app stacks, and infrastructure (registry). The /server page shows these live with CPU/MEM; the table below is the stable roster.",
      },
      {
        type: "table",
        headers: ["Container", "Image", "Purpose"],
        rows: [
          ["n8n-wlad-n8n", "n8nio/n8n", "Workflow automation (port 32770)"],
          ["hermes-webui / hermes-agent", "nousresearch/hermes-agent", "Reasoning agent + UI (32769)"],
          ["trading-trading-wvludl", "custom", "Trading bot (swarm service)"],
          ["postgresql-ykcl", "postgres:17", "App Postgres (127.0.0.1:5432)"],
          ["agentlooppg", "postgres:17", "Agent-loop Postgres (:5444)"],
          ["local-registry", "registry:2", "Private image registry (:5000)"],
        ],
      },
      {
        type: "callout",
        tone: "info",
        title: "Swarm vs compose names",
        text: "Names like `dokploy.1.<hash>` are Swarm tasks; `name-1` suffixes are compose replicas. Glance strips these to a clean display name on /server, but you address the real name with docker commands.",
      },
      {
        type: "code",
        label: "Inspect from your shell",
        lines: [
          "docker ps -a            # everything, running or not",
          "docker stats --no-stream",
          "docker logs --tail 100 -f <name>",
        ],
      },
    ],
  },
  {
    id: "networking",
    title: "Networking & ports",
    blurb: "What listens where, and how traffic flows.",
    tint: "#24a1c1",
    blocks: [
      {
        type: "p",
        text: "Public web traffic enters through Traefik on 80/443 and is routed to services by host/path rules with automatic Let's Encrypt TLS. Some tools also publish direct host ports for convenience.",
      },
      {
        type: "table",
        headers: ["Port", "Service", "Notes"],
        rows: [
          ["80 / 443", "Traefik", "HTTP→HTTPS, TLS termination, routing"],
          ["8080", "Traefik dashboard", "Router/service introspection"],
          ["3000", "Dokploy", "Dashboard + API"],
          ["32770", "n8n", "Workflow editor UI"],
          ["32769", "Hermes WebUI", "Agent console"],
          ["5000", "Registry", "Private Docker registry"],
          ["5432 / 5444", "Postgres", "App DB / agent-loop DB"],
        ],
      },
      {
        type: "callout",
        tone: "warn",
        title: "Direct ports skip Traefik",
        text: "Anything published on a high port (32769, 32770, 8080, 5000…) is exposed without Traefik's TLS/auth. Prefer routing through Dokploy/Traefik for anything sensitive, or keep these bound to the tailnet only.",
      },
    ],
  },
  {
    id: "databases",
    title: "Databases",
    blurb: "Postgres instances and how to back them up.",
    tint: "#3b82f6",
    blocks: [
      {
        type: "table",
        headers: ["Instance", "Version", "Used by"],
        rows: [
          ["postgresql-ykcl", "17", "Glance / app data"],
          ["dokploy-postgres", "16", "Dokploy internal state"],
          ["agentlooppg", "17", "Agent-loop experiments (:5444)"],
        ],
      },
      {
        type: "callout",
        tone: "danger",
        title: "Back up before you touch anything",
        text: "These containers hold real state. Always snapshot before upgrades, migrations, or prune operations.",
      },
      {
        type: "code",
        label: "Dump a database",
        lines: [
          "docker exec -t postgresql-ykcl-postgresql-1 \\",
          "  pg_dump -U <user> <db> | gzip > backup-$(date +%F).sql.gz",
        ],
      },
      {
        type: "code",
        label: "Restore",
        lines: [
          "gunzip -c backup.sql.gz | \\",
          "  docker exec -i postgresql-ykcl-postgresql-1 psql -U <user> <db>",
        ],
      },
    ],
  },
  {
    id: "services",
    title: "Service catalog",
    blurb: "What each app does and where to open it.",
    tint: "#f472b6",
    blocks: [
      {
        type: "list",
        items: [
          "n8n — visual workflow automation; webhooks in, integrations out. Mirrored as the “N8N Agent” on /agents.",
          "Hermes — Nous Research reasoning agent with a tool-calling loop and a web console. Mirrored as the “Hermes Agent”.",
          "Trading bot — a long-running Swarm service; check its logs for cycle output.",
          "Local registry — stores images Dokploy builds, so rollouts don't re-pull from the internet.",
        ],
      },
      {
        type: "links",
        links: [
          { label: "n8n", href: `http://${HOST}:32770` },
          { label: "Hermes WebUI", href: `http://${HOST}:32769` },
          { label: "Traefik dashboard", href: `http://${HOST}:8080` },
          { label: "Registry", href: `http://${HOST}:5000` },
        ],
      },
    ],
  },
  {
    id: "security",
    title: "Security notes",
    blurb: "The short list of things that keep this box safe.",
    tint: "#ff5f57",
    blocks: [
      {
        type: "callout",
        tone: "danger",
        title: "You're operating as root",
        text: "Every command from /deploy and your SSH session runs as root. There's no undo. Read the command, confirm the target container, and prefer the read-only actions when you're just looking.",
      },
      {
        type: "list",
        items: [
          "Keep SSH key-only — disable password auth (`PasswordAuthentication no`).",
          "Lean on Tailscale: bind admin ports (8080, 5000, 32769/32770) to the tailnet, not 0.0.0.0, where you can.",
          "Never expose the Docker socket over TCP — it's root-equivalent.",
          "Secrets live in env / Dokploy, never in images or git. Rotate API keys (Hermes, n8n, registry) periodically.",
          "Let Traefik handle TLS; don't terminate plaintext on public ports.",
          "Run `apt update && apt upgrade` (or unattended-upgrades) and keep images patched.",
          "Add fail2ban for SSH and watch auth logs.",
        ],
      },
      {
        type: "callout",
        tone: "tip",
        title: "Treat the Glance bridge as privileged",
        text: "Because /deploy can run docker on the host, it's admin-only and validates every input against a strict allowlist. Keep ADMIN_EMAIL tight and the app behind sign-in.",
      },
    ],
  },
  {
    id: "runbooks",
    title: "Runbooks",
    blurb: "Step-by-step for the things you'll actually do.",
    tint: "#febc2e",
    blocks: [
      {
        type: "p",
        text: "Each of these maps to a button on /deploy, but here's the manual version so you understand what's happening.",
      },
      {
        type: "steps",
        steps: [
          {
            text: "Deploy a new project from GitHub (clone + compose):",
            code: [
              "cd /root && git clone --depth 1 https://github.com/<owner>/<repo>.git",
              "cd <repo> && docker compose up -d",
            ],
          },
          {
            text: "Restart a crashed container:",
            code: ["docker restart <name>", "docker logs --tail 100 <name>"],
          },
          {
            text: "Reclaim disk when builds pile up:",
            code: ["docker system df", "docker system prune -f"],
          },
          {
            text: "Update a stack to the newest images:",
            code: ["cd /root/<stack>", "docker compose pull && docker compose up -d"],
          },
        ],
      },
    ],
  },
  {
    id: "maintenance",
    title: "Maintenance & monitoring",
    blurb: "Keeping an eye on things over time.",
    tint: "#1ed760",
    blocks: [
      {
        type: "p",
        text: "The /deploy panel can install a cron that writes container status to a file every 5 minutes — a lightweight heartbeat you can read back any time.",
      },
      {
        type: "code",
        label: "What the cron installs",
        lines: [
          '*/5 * * * * docker ps -a \\',
          '  --format "{{.Names}} {{.State}} {{.Status}}" \\',
          "  > /tmp/glance-status.log 2>&1",
        ],
      },
      {
        type: "list",
        items: [
          "Check disk weekly: `df -h /` and `docker system df`.",
          "Watch load + memory: `uptime`, `free -h`.",
          "Skim service logs after deploys for stack traces.",
          "Confirm TLS certs renew (Traefik handles this automatically).",
        ],
      },
    ],
  },
  {
    id: "troubleshooting",
    title: "Troubleshooting",
    blurb: "Common failures and the first thing to try.",
    tint: "#ff7847",
    blocks: [
      {
        type: "table",
        headers: ["Symptom", "First check", "Likely fix"],
        rows: [
          ["A container keeps restarting", "docker logs <name>", "Bad env/config or a failing dependency"],
          ["Site 502s through Traefik", "Traefik dashboard :8080", "Service down or wrong router label"],
          ["Deploy fails to build", "Dokploy build logs", "Out of disk — prune; or build error"],
          ["No disk space", "docker system df", "docker system prune -f; remove old images"],
          ["Can't SSH", "Is Tailscale up?", "Reconnect tailnet; check key"],
          ["DB connection refused", "docker ps for the pg container", "Start it; verify port mapping"],
        ],
      },
    ],
  },
  {
    id: "cheatsheet",
    title: "Command cheat sheet",
    blurb: "Copy-paste reference.",
    tint: "#9a9aab",
    blocks: [
      {
        type: "code",
        label: "Docker",
        lines: [
          "docker ps -a                     # all containers",
          "docker stats --no-stream         # cpu/mem snapshot",
          "docker logs --tail 100 -f <name> # follow logs",
          "docker restart <name>            # bounce a container",
          "docker inspect <name>            # full config/state",
          "docker exec -it <name> sh        # shell inside",
        ],
      },
      {
        type: "code",
        label: "Compose (inside a stack dir)",
        lines: [
          "docker compose up -d             # roll out",
          "docker compose pull              # fetch newer images",
          "docker compose ps                # stack status",
          "docker compose down              # tear down",
        ],
      },
      {
        type: "code",
        label: "System",
        lines: [
          "df -h /                          # disk",
          "free -h                          # memory",
          "uptime                           # load average",
          "crontab -l                       # scheduled jobs",
        ],
      },
    ],
  },
];
