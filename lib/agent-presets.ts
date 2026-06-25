import type { Agent } from "@/lib/types";

/**
 * "Look inside the agent" configuration shown on the /agents/[id] detail page.
 * This is presentation-only flavour (dummy config) keyed off the agent's name —
 * known rigs (n8n, Hermes) get a hand-written control panel; anything else gets
 * a sensible config generated from its own fields. Nothing here is persisted.
 */

export interface ConfigField {
  label: string;
  value: string;
  /** Render the value monospaced (ids, envs, endpoints). */
  mono?: boolean;
  /** Mask as a secret (shows dots). */
  secret?: boolean;
}

export interface ConfigSection {
  heading: string;
  fields: ConfigField[];
}

export interface AgentPreset {
  /** Small badge under the title, e.g. "Workflow automation · Self-hosted". */
  badge: string;
  /** Reachable endpoint (opens in a new tab on the detail page). */
  endpoint?: string;
  /** Docker container this agent maps to on the server. */
  container?: string;
  /** Capability chips. */
  integrations: string[];
  /** Config groups rendered as label/value grids. */
  sections: ConfigSection[];
}

const HOST = "100.78.187.64";

function n8nPreset(): AgentPreset {
  return {
    badge: "Workflow automation · Self-hosted",
    endpoint: `http://${HOST}:32770`,
    container: "n8n-wlad-n8n-1",
    integrations: ["Webhook", "HTTP Request", "Postgres", "Slack", "OpenAI", "Cron", "Gmail"],
    sections: [
      {
        heading: "Runtime",
        fields: [
          { label: "Image", value: "docker.n8n.io/n8nio/n8n", mono: true },
          { label: "Port", value: "32770 → 5678", mono: true },
          { label: "Execution mode", value: "queue" },
          { label: "Concurrency", value: "10 workers" },
          { label: "Timezone", value: "Asia/Kathmandu" },
        ],
      },
      {
        heading: "Webhooks",
        fields: [
          { label: "Base URL", value: `http://${HOST}:32770/webhook`, mono: true },
          { label: "Active workflows", value: "7" },
          { label: "Executions (24h)", value: "1,284" },
          { label: "Last run", value: "2 minutes ago" },
        ],
      },
      {
        heading: "Environment",
        fields: [
          { label: "N8N_HOST", value: HOST, mono: true },
          { label: "N8N_PORT", value: "5678", mono: true },
          { label: "DB_TYPE", value: "postgresdb", mono: true },
          { label: "N8N_ENCRYPTION_KEY", value: "n8n_enc_3f9c1a", mono: true, secret: true },
          { label: "WEBHOOK_URL", value: `http://${HOST}:32770/`, mono: true },
        ],
      },
    ],
  };
}

function hermesPreset(): AgentPreset {
  return {
    badge: "Reasoning agent · Nous Research",
    endpoint: `http://${HOST}:32769`,
    container: "hermes-webui-dygg-hermes-agent-1",
    integrations: ["Tool calling", "Function exec", "Vector recall", "Web search", "Code interpreter"],
    sections: [
      {
        heading: "Runtime",
        fields: [
          { label: "Agent image", value: "nousresearch/hermes-agent:latest", mono: true },
          { label: "WebUI", value: "32769 → 8787", mono: true },
          { label: "Health", value: "healthy" },
          { label: "Backend", value: "hermes-webui-dygg-hermes-webui-1", mono: true },
        ],
      },
      {
        heading: "Model",
        fields: [
          { label: "Model", value: "Hermes-4", mono: true },
          { label: "Context window", value: "128k tokens" },
          { label: "Temperature", value: "0.7" },
          { label: "Max output", value: "4,096 tokens" },
          { label: "Tool calling", value: "enabled" },
        ],
      },
      {
        heading: "Environment",
        fields: [
          { label: "HERMES_MODEL", value: "hermes-4-128k", mono: true },
          { label: "HERMES_API_KEY", value: "hms_live_8b21de", mono: true, secret: true },
          { label: "TOOLS_ENABLED", value: "true", mono: true },
          { label: "MEMORY_BACKEND", value: "postgres", mono: true },
          { label: "MAX_STEPS", value: "12", mono: true },
        ],
      },
    ],
  };
}

/** Fallback config built from the agent's own fields, so every agent has one. */
function genericPreset(agent: Agent): AgentPreset {
  const slug = agent.name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
  return {
    badge: agent.title ? `${agent.title} · Glance rig` : "Autonomous rig",
    container: `${slug || "agent"}-1`,
    integrations: ["Scheduler", "Bookmark API", "Vector store", "Notifier"],
    sections: [
      {
        heading: "Runtime",
        fields: [
          { label: "Model", value: agent.llm || "claude-opus-4-8", mono: true },
          { label: "Workers", value: `${agent.robots} robots` },
          { label: "Status", value: agent.status },
          { label: "Cycle", value: "continuous" },
        ],
      },
      {
        heading: "Environment",
        fields: [
          { label: "AGENT_ID", value: agent.id, mono: true },
          { label: "AGENT_MODEL", value: agent.llm || "claude-opus-4-8", mono: true },
          { label: "POLL_INTERVAL", value: "30s", mono: true },
          { label: "API_KEY", value: "glance_live_a1b2c3", mono: true, secret: true },
        ],
      },
    ],
  };
}

export function presetForAgent(agent: Agent): AgentPreset {
  const key = `${agent.name} ${agent.title}`.toLowerCase();
  if (key.includes("n8n")) return n8nPreset();
  if (key.includes("hermes")) return hermesPreset();
  return genericPreset(agent);
}
