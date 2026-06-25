import "server-only";
import { execFile } from "node:child_process";
import { promisify } from "node:util";

const run = promisify(execFile);

/**
 * Live Docker inventory for the "My Server" page, read straight off the host
 * over SSH. This is the real fleet — `docker ps -a` + `docker stats` — parsed
 * into typed rows the dashboard can animate. Falls back gracefully: if SSH is
 * unavailable (e.g. a Vercel deploy with no key), the route surfaces the error
 * and the screen shows the admin's hand-curated containers instead.
 */

/** SSH target, overridable via env so this isn't pinned to one box. */
const SSH_HOST = process.env.SERVER_SSH_HOST || "root@100.78.187.64";

/** Apps we recognise by image/name — drives the per-card glyph + tint. */
export type AppKind =
  | "dokploy"
  | "traefik"
  | "postgres"
  | "redis"
  | "registry"
  | "n8n"
  | "hermes"
  | "trading"
  | "generic";

export interface LiveContainer {
  /** Short docker id (stable key). */
  id: string;
  /** Raw container name as docker reports it. */
  name: string;
  /** Human-friendly name with swarm/replica suffixes stripped. */
  displayName: string;
  image: string;
  /** Raw status string, e.g. "Up 2 days (healthy)". */
  status: string;
  /** Normalised lifecycle state: running | exited | restarting | paused | created. */
  state: string;
  /** Published port mappings, e.g. ["80→80", "443→443"]. */
  ports: string[];
  /** CPU usage %, from `docker stats`. */
  cpu: number;
  /** Memory usage %, from `docker stats`. */
  mem: number;
  /** Detected app family for iconography. */
  app: AppKind;
  /** Whether this is part of the Dokploy control plane itself. */
  isDokploy: boolean;
  /** Health, parsed from status: "healthy" | "unhealthy" | null. */
  health: string | null;
}

export interface LiveServerSnapshot {
  host: string;
  generatedAt: string;
  containers: LiveContainer[];
  totals: { all: number; running: number; stopped: number; stacks: number };
}

function detectApp(name: string, image: string): AppKind {
  const s = `${name} ${image}`.toLowerCase();
  if (s.includes("dokploy")) return "dokploy";
  if (s.includes("traefik")) return "traefik";
  if (s.includes("postgres")) return "postgres";
  if (s.includes("redis")) return "redis";
  if (s.includes("registry")) return "registry";
  if (s.includes("n8n")) return "n8n";
  if (s.includes("hermes")) return "hermes";
  if (s.includes("trading")) return "trading";
  return "generic";
}

/** Strip swarm task (`.1.<hash>`) and compose replica (`-1`) suffixes. */
function cleanName(raw: string): string {
  return raw
    .replace(/\.\d+\.[a-z0-9]+$/i, "")
    .replace(/-\d+$/, "");
}

function parsePorts(raw: string): string[] {
  if (!raw) return [];
  const out = new Set<string>();
  for (const part of raw.split(",")) {
    const seg = part.trim();
    if (!seg) continue;
    // "0.0.0.0:80->80/tcp" | "100.78.187.64:5444->5432/tcp"
    const pub = seg.match(/:(\d+)->(\d+)/);
    if (pub) {
      out.add(`${pub[1]}→${pub[2]}`);
      continue;
    }
    // Internal-only, e.g. "5432/tcp"
    const internal = seg.match(/^(\d+)\//);
    if (internal) out.add(internal[1]);
  }
  return [...out];
}

function parseHealth(status: string): string | null {
  const m = status.match(/\((healthy|unhealthy|health: starting)\)/i);
  return m ? m[1].toLowerCase() : null;
}

function parsePct(raw: string): number {
  const n = parseFloat(String(raw).replace("%", "").trim());
  return Number.isFinite(n) ? Math.round(n * 100) / 100 : 0;
}

/**
 * One SSH round-trip pulls both `docker ps -a` and `docker stats`. The two are
 * joined on container name. BatchMode + a tight ConnectTimeout keep a missing
 * key or unreachable host from hanging the request.
 */
async function fetchSnapshot(): Promise<LiveServerSnapshot> {
  const remote =
    'docker ps -a --format "{{.ID}}|{{.Names}}|{{.Image}}|{{.Status}}|{{.State}}|{{.Ports}}"; ' +
    'echo "===STATS==="; ' +
    'docker stats --no-stream --format "{{.Name}}|{{.CPUPerc}}|{{.MemPerc}}"';

  const { stdout } = await run(
    "ssh",
    [
      "-o",
      "BatchMode=yes",
      "-o",
      "ConnectTimeout=8",
      "-o",
      "StrictHostKeyChecking=accept-new",
      SSH_HOST,
      remote,
    ],
    { timeout: 15000, maxBuffer: 1024 * 1024 }
  );

  const [psBlock = "", statsBlock = ""] = stdout.split("===STATS===");

  // name -> { cpu, mem }
  const stats = new Map<string, { cpu: number; mem: number }>();
  for (const line of statsBlock.split("\n")) {
    const [name, cpu, mem] = line.split("|");
    if (!name?.trim()) continue;
    stats.set(name.trim(), { cpu: parsePct(cpu), mem: parsePct(mem) });
  }

  const containers: LiveContainer[] = [];
  for (const line of psBlock.split("\n")) {
    if (!line.trim()) continue;
    const [id, name, image, status, state, ports] = line.split("|");
    if (!name) continue;
    const st = stats.get(name) ?? { cpu: 0, mem: 0 };
    containers.push({
      id: (id || name).trim(),
      name: name.trim(),
      displayName: cleanName(name.trim()),
      image: (image ?? "").trim(),
      status: (status ?? "").trim(),
      state: (state ?? "").trim().toLowerCase() || "unknown",
      ports: parsePorts((ports ?? "").trim()),
      cpu: st.cpu,
      mem: st.mem,
      app: detectApp(name, image ?? ""),
      isDokploy: name.trim().toLowerCase().startsWith("dokploy"),
      health: parseHealth(status ?? ""),
    });
  }

  // Stable, readable ordering: running first, then by name.
  containers.sort((a, b) => {
    const ar = a.state === "running" ? 0 : 1;
    const br = b.state === "running" ? 0 : 1;
    if (ar !== br) return ar - br;
    return a.name.localeCompare(b.name);
  });

  const running = containers.filter((c) => c.state === "running").length;
  const stacks = new Set(containers.map((c) => cleanName(c.name))).size;

  return {
    host: SSH_HOST,
    generatedAt: new Date().toISOString(),
    containers,
    totals: {
      all: containers.length,
      running,
      stopped: containers.length - running,
      stacks,
    },
  };
}

// Short-lived cache so rapid polling / multiple viewers don't spawn an ssh
// process per request. One in-flight refresh is shared by concurrent callers.
const CACHE_TTL = 3500;
let cache: { at: number; snapshot: LiveServerSnapshot } | null = null;
let inflight: Promise<LiveServerSnapshot> | null = null;

export async function getLiveServerSnapshot(
  force = false
): Promise<LiveServerSnapshot> {
  if (!force && cache && Date.now() - cache.at < CACHE_TTL) {
    return cache.snapshot;
  }
  if (inflight) return inflight;
  inflight = fetchSnapshot()
    .then((snapshot) => {
      cache = { at: Date.now(), snapshot };
      return snapshot;
    })
    .finally(() => {
      inflight = null;
    });
  return inflight;
}
