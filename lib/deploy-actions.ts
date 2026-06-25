/**
 * Catalog of the admin "control bridge" actions on /deploy. This is the
 * CLIENT-SAFE metadata (pure data, no command logic) used to render the panel.
 * The matching server-side validation + command templates live in
 * lib/server-bridge.ts, keyed by the same `id`. Keep the two in sync.
 */

export type DeployCategory = "containers" | "deploy" | "maintenance" | "cron";

export interface DeployParam {
  name: string;
  label: string;
  placeholder: string;
  /** Hint pattern for the <input> (client-side only — server is authoritative). */
  pattern?: string;
  optional?: boolean;
}

export interface DeployActionMeta {
  id: string;
  label: string;
  description: string;
  category: DeployCategory;
  /** Button text. */
  cta: string;
  /** Destructive / state-changing — UI confirms before running. */
  danger?: boolean;
  /** Read-only inspection (no confirm, styled neutral). */
  read?: boolean;
  params?: DeployParam[];
}

export interface DeployLink {
  label: string;
  description: string;
  href: string;
  tint: string;
}

/** Public IP of the box, used only to build the quick-link URLs. */
export const SERVER_HOST = "100.78.187.64";

const NAME_PATTERN = "^[a-zA-Z0-9][a-zA-Z0-9_.-]{0,99}$";
const IMAGE_PATTERN = "^[a-zA-Z0-9][a-zA-Z0-9_./:@-]{0,199}$";
const REPO_PATTERN = "^[a-zA-Z0-9_.-]+/[a-zA-Z0-9_.-]+$";

export const CATEGORY_META: Record<
  DeployCategory,
  { label: string; hint: string; tint: string }
> = {
  containers: {
    label: "Containers",
    hint: "Lifecycle controls for a single container by name",
    tint: "#00d4ff",
  },
  deploy: {
    label: "Deploy & rollout",
    hint: "Bring stacks up, pull images, ship from GitHub",
    tint: "#a855f7",
  },
  maintenance: {
    label: "Maintenance",
    hint: "Health, disk, and housekeeping",
    tint: "#febc2e",
  },
  cron: {
    label: "Status cron",
    hint: "A 5-minute job on the box that logs container status",
    tint: "#1ed760",
  },
};

export const DEPLOY_ACTIONS: DeployActionMeta[] = [
  // ---- Containers --------------------------------------------------------
  {
    id: "start-container",
    label: "Start container",
    description: "docker start — bring a stopped container back up.",
    category: "containers",
    cta: "Start",
    params: [
      { name: "name", label: "Container", placeholder: "n8n-wlad-n8n-1", pattern: NAME_PATTERN },
    ],
  },
  {
    id: "restart-container",
    label: "Restart container",
    description: "docker restart — bounce a running container.",
    category: "containers",
    cta: "Restart",
    danger: true,
    params: [
      { name: "name", label: "Container", placeholder: "dokploy-traefik", pattern: NAME_PATTERN },
    ],
  },
  {
    id: "stop-container",
    label: "Stop container",
    description: "docker stop — gracefully halt a container.",
    category: "containers",
    cta: "Stop",
    danger: true,
    params: [
      { name: "name", label: "Container", placeholder: "local-registry", pattern: NAME_PATTERN },
    ],
  },
  {
    id: "logs",
    label: "Tail logs",
    description: "Last 120 lines, with timestamps.",
    category: "containers",
    cta: "Fetch logs",
    read: true,
    params: [
      { name: "name", label: "Container", placeholder: "n8n-wlad-n8n-1", pattern: NAME_PATTERN },
    ],
  },
  {
    id: "inspect",
    label: "Inspect",
    description: "State, health, image, restart count.",
    category: "containers",
    cta: "Inspect",
    read: true,
    params: [
      { name: "name", label: "Container", placeholder: "hermes-webui-dygg-hermes-agent-1", pattern: NAME_PATTERN },
    ],
  },

  // ---- Deploy ------------------------------------------------------------
  {
    id: "compose-up",
    label: "Roll out a stack",
    description: "cd into the stack dir and docker compose up -d.",
    category: "deploy",
    cta: "Compose up",
    params: [
      { name: "stack", label: "Stack directory", placeholder: "my-app", pattern: NAME_PATTERN },
    ],
  },
  {
    id: "compose-redeploy",
    label: "Update & redeploy",
    description: "compose pull then up -d — pick up the newest images.",
    category: "deploy",
    cta: "Pull & up",
    danger: true,
    params: [
      { name: "stack", label: "Stack directory", placeholder: "my-app", pattern: NAME_PATTERN },
    ],
  },
  {
    id: "deploy-github",
    label: "Deploy from GitHub",
    description: "Clone (or fast-forward) a repo and compose up -d automatically.",
    category: "deploy",
    cta: "Deploy",
    params: [
      { name: "repo", label: "GitHub repo", placeholder: "owner/project", pattern: REPO_PATTERN },
      { name: "branch", label: "Branch", placeholder: "main", optional: true },
    ],
  },
  {
    id: "pull-image",
    label: "Pull an image",
    description: "docker pull — warm an image before rollout.",
    category: "deploy",
    cta: "Pull",
    params: [
      { name: "image", label: "Image", placeholder: "postgres:17", pattern: IMAGE_PATTERN },
    ],
  },
  {
    id: "dokploy-webhook",
    label: "Trigger Dokploy deploy",
    description: "POST a Dokploy app deploy webhook (from the box).",
    category: "deploy",
    cta: "Trigger",
    params: [
      {
        name: "url",
        label: "Deploy webhook URL",
        placeholder: "https://dokploy.example.com/api/deploy/abc123",
      },
    ],
  },

  // ---- Maintenance -------------------------------------------------------
  {
    id: "disk",
    label: "Disk usage",
    description: "df -h plus docker system df.",
    category: "maintenance",
    cta: "Check disk",
    read: true,
  },
  {
    id: "uptime",
    label: "Uptime & memory",
    description: "Load average and free memory.",
    category: "maintenance",
    cta: "Check",
    read: true,
  },
  {
    id: "prune",
    label: "Prune dangling",
    description: "docker system prune -f — reclaim space.",
    category: "maintenance",
    cta: "Prune",
    danger: true,
  },
  {
    id: "reload-traefik",
    label: "Restart Traefik",
    description: "Bounce the dokploy-traefik edge router.",
    category: "maintenance",
    cta: "Restart edge",
    danger: true,
  },

  // ---- Cron --------------------------------------------------------------
  {
    id: "cron-install",
    label: "Install 5-min status cron",
    description: "Writes container status to /tmp/glance-status.log every 5 min.",
    category: "cron",
    cta: "Install cron",
  },
  {
    id: "cron-read",
    label: "Read status log",
    description: "Show the latest snapshot the cron wrote.",
    category: "cron",
    cta: "Read log",
    read: true,
  },
  {
    id: "cron-remove",
    label: "Remove status cron",
    description: "Strip the glance-status line from crontab.",
    category: "cron",
    cta: "Remove cron",
    danger: true,
  },
];

export const DEPLOY_LINKS: DeployLink[] = [
  { label: "Dokploy", description: "Deployment dashboard", href: `http://${SERVER_HOST}:3000`, tint: "#a855f7" },
  { label: "n8n", description: "Workflow editor", href: `http://${SERVER_HOST}:32770`, tint: "#f472b6" },
  { label: "Hermes WebUI", description: "Agent console", href: `http://${SERVER_HOST}:32769`, tint: "#00d4ff" },
  { label: "Traefik", description: "Edge router dashboard", href: `http://${SERVER_HOST}:8080`, tint: "#24a1c1" },
  { label: "Registry", description: "Local image registry", href: `http://${SERVER_HOST}:5000`, tint: "#9a9aab" },
];
