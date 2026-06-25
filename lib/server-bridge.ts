import "server-only";
import { sshExec } from "./ssh";

/**
 * Server-side execution for the /deploy control bridge. Every action maps a
 * fixed command template over SSH; user input is restricted to a few named
 * params, each validated against a strict allowlist regex BEFORE it is placed
 * into a command. Because validated tokens contain no shell metacharacters
 * (no spaces, quotes, `;`, `|`, `&`, `$`, backticks, parens), interpolating
 * them into the remote command string is safe. Unknown actions are rejected.
 *
 * Admin-only: the route (app/api/deploy/run) calls guardAdmin() before this.
 */

const NAME = /^[a-zA-Z0-9][a-zA-Z0-9_.-]{0,99}$/;
const IMAGE = /^[a-zA-Z0-9][a-zA-Z0-9_./:@-]{0,199}$/;
const REPO = /^[a-zA-Z0-9_.-]+\/[a-zA-Z0-9_.-]+$/;
const BRANCH = /^[a-zA-Z0-9_.\/-]{1,100}$/;
const HTTPS_URL = /^https:\/\/[A-Za-z0-9._~:/?#@!$&()*+,;=%-]+$/;

/** Base directory on the box where stacks / cloned repos live. */
const STACKS_DIR = (process.env.SERVER_STACKS_DIR || "/root").replace(/\/+$/, "");

export interface RunResult {
  ok: boolean;
  action: string;
  command: string;
  stdout: string;
  stderr: string;
  code: number;
  durationMs: number;
}

class InvalidParam extends Error {}

type Params = Record<string, unknown>;

/** Read + validate a required param, or throw a friendly error. */
function req(params: Params, key: string, re: RegExp, label: string): string {
  const raw = params[key];
  const value = typeof raw === "string" ? raw.trim() : "";
  if (!value) throw new InvalidParam(`${label} is required`);
  if (!re.test(value)) throw new InvalidParam(`${label} "${value}" is not valid`);
  return value;
}

function opt(params: Params, key: string, re: RegExp, fallback: string): string {
  const raw = params[key];
  const value = typeof raw === "string" ? raw.trim() : "";
  if (!value) return fallback;
  if (!re.test(value)) throw new InvalidParam(`"${value}" is not valid`);
  return value;
}

interface ActionDef {
  /** Build the remote command from validated params (throws on bad input). */
  command: (p: Params) => string;
  timeout?: number;
}

const ACTIONS: Record<string, ActionDef> = {
  // ---- Containers --------------------------------------------------------
  "start-container": {
    command: (p) => `docker start ${req(p, "name", NAME, "Container")} 2>&1`,
  },
  "restart-container": {
    command: (p) => `docker restart ${req(p, "name", NAME, "Container")} 2>&1`,
    timeout: 40000,
  },
  "stop-container": {
    command: (p) => `docker stop ${req(p, "name", NAME, "Container")} 2>&1`,
    timeout: 40000,
  },
  logs: {
    command: (p) =>
      `docker logs --tail 120 --timestamps ${req(p, "name", NAME, "Container")} 2>&1`,
  },
  inspect: {
    command: (p) => {
      const name = req(p, "name", NAME, "Container");
      const fmt =
        "state={{.State.Status}} health={{if .State.Health}}{{.State.Health.Status}}{{else}}n/a{{end}} restarts={{.RestartCount}} image={{.Config.Image}} started={{.State.StartedAt}}";
      return `docker inspect --format '${fmt}' ${name} 2>&1`;
    },
  },

  // ---- Deploy ------------------------------------------------------------
  "compose-up": {
    command: (p) =>
      `cd ${STACKS_DIR}/${req(p, "stack", NAME, "Stack")} && docker compose up -d 2>&1`,
    timeout: 180000,
  },
  "compose-redeploy": {
    command: (p) => {
      const stack = req(p, "stack", NAME, "Stack");
      return `cd ${STACKS_DIR}/${stack} && docker compose pull && docker compose up -d 2>&1`;
    },
    timeout: 240000,
  },
  "deploy-github": {
    command: (p) => {
      const repo = req(p, "repo", REPO, "Repo");
      const branch = opt(p, "branch", BRANCH, "main");
      const name = repo.split("/")[1];
      if (!NAME.test(name)) throw new InvalidParam(`Repo name "${name}" is not valid`);
      const dir = `${STACKS_DIR}/${name}`;
      return (
        `if [ -d "${dir}/.git" ]; then ` +
        `cd "${dir}" && git fetch --depth 1 origin ${branch} && git reset --hard origin/${branch}; ` +
        `else git clone --depth 1 -b ${branch} https://github.com/${repo}.git "${dir}"; fi ` +
        `&& cd "${dir}" && docker compose up -d 2>&1`
      );
    },
    timeout: 300000,
  },
  "pull-image": {
    command: (p) => `docker pull ${req(p, "image", IMAGE, "Image")} 2>&1`,
    timeout: 240000,
  },
  "dokploy-webhook": {
    command: (p) => {
      const url = req(p, "url", HTTPS_URL, "Webhook URL");
      return `curl -fsS -m 30 -X POST '${url}' 2>&1 && echo '\\n[webhook accepted]'`;
    },
    timeout: 45000,
  },

  // ---- Maintenance -------------------------------------------------------
  disk: {
    command: () =>
      `echo '== df -h / ==' && df -h / && echo && echo '== docker system df ==' && docker system df 2>&1`,
  },
  uptime: {
    command: () => `uptime && echo && free -h 2>&1`,
  },
  prune: {
    command: () => `docker system prune -f 2>&1`,
    timeout: 120000,
  },
  "reload-traefik": {
    command: () => `docker restart dokploy-traefik 2>&1`,
    timeout: 40000,
  },

  // ---- Cron --------------------------------------------------------------
  "cron-install": {
    command: () => {
      const job =
        `*/5 * * * * docker ps -a --format "{{.Names}} {{.State}} {{.Status}}" > /tmp/glance-status.log 2>&1 # glance-status`;
      return (
        `( crontab -l 2>/dev/null | grep -v 'glance-status'; echo '${job}' ) | crontab - ` +
        `&& echo 'Installed:' && crontab -l | grep glance-status`
      );
    },
  },
  "cron-read": {
    command: () =>
      `echo "read at: $(date)"; echo; cat /tmp/glance-status.log 2>/dev/null || echo 'No log yet — install the cron and wait up to 5 minutes.'`,
  },
  "cron-remove": {
    command: () =>
      `( crontab -l 2>/dev/null | grep -v 'glance-status' ) | crontab - && echo 'Removed glance-status cron.'`,
  },
};

const MAX_OUTPUT = 20000;

function clip(s: string): string {
  if (s.length <= MAX_OUTPUT) return s;
  return s.slice(0, MAX_OUTPUT) + `\n… (${s.length - MAX_OUTPUT} more chars truncated)`;
}

export function isKnownAction(id: string): boolean {
  return Object.prototype.hasOwnProperty.call(ACTIONS, id);
}

export async function runAction(id: string, params: Params = {}): Promise<RunResult> {
  const def = ACTIONS[id];
  if (!def) throw new InvalidParam(`Unknown action "${id}"`);

  let command: string;
  try {
    command = def.command(params);
  } catch (e) {
    // Validation failures come back as a clean, non-executed result.
    const message = e instanceof Error ? e.message : "Invalid parameters";
    return {
      ok: false,
      action: id,
      command: "(not executed — invalid input)",
      stdout: "",
      stderr: message,
      code: -1,
      durationMs: 0,
    };
  }

  const started = Date.now();
  const res = await sshExec(command, def.timeout);
  return {
    ok: res.code === 0,
    action: id,
    command,
    stdout: clip(res.stdout),
    stderr: clip(res.stderr),
    code: res.code,
    durationMs: Date.now() - started,
  };
}

export { InvalidParam };
