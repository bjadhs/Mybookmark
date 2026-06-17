import { sql } from "./index";
import { Agent } from "@/lib/types";

function clampRobots(v: unknown): number {
  const n = Math.round(Number(v));
  if (!Number.isFinite(n)) return 4;
  return Math.min(8, Math.max(1, n));
}

function mapRow(row: Record<string, unknown>): Agent {
  return {
    id: String(row.id),
    name: String(row.name),
    title: String(row.title ?? ""),
    description: String(row.description ?? ""),
    whatItDoes: String(row.what_it_does ?? ""),
    color: String(row.color ?? "#a855f7"),
    llm: String(row.llm ?? ""),
    robots: Number(row.robots ?? 4),
    status: String(row.status ?? "Cycle running"),
  };
}

export interface AgentInput {
  name: string;
  title?: string;
  description?: string;
  whatItDoes?: string;
  color?: string;
  llm?: string;
  robots?: number;
  status?: string;
}

function normalize(input: AgentInput) {
  const name = input.name.trim();
  if (!name) throw new Error("Agent name is required");
  const color = (input.color ?? "#a855f7").trim();
  return {
    name,
    title: (input.title ?? "").trim(),
    description: (input.description ?? "").trim(),
    whatItDoes: (input.whatItDoes ?? "").trim(),
    color: /^#[0-9a-fA-F]{6}$/.test(color) ? color : "#a855f7",
    llm: (input.llm ?? "").trim(),
    robots: clampRobots(input.robots),
    status: (input.status ?? "Cycle running").trim() || "Cycle running",
  };
}

export async function getAgents(): Promise<Agent[]> {
  const rows = await sql`
    SELECT id, name, title, description, what_it_does, color, llm, robots, status
    FROM agents
    ORDER BY position, created_at
  `;
  return rows.map(mapRow);
}

export async function getAgentById(id: string): Promise<Agent | null> {
  const rows = await sql`
    SELECT id, name, title, description, what_it_does, color, llm, robots, status
    FROM agents WHERE id = ${id}
  `;
  return rows[0] ? mapRow(rows[0]) : null;
}

export async function createAgent(input: AgentInput): Promise<Agent> {
  const a = normalize(input);
  const id = `agt_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
  const posRows = await sql`
    SELECT COALESCE(MAX(position), -1) + 1 AS pos FROM agents
  `;
  const position = Number(posRows[0]?.pos ?? 0);

  const rows = await sql`
    INSERT INTO agents
      (id, name, title, description, what_it_does, color, llm, robots, status, position)
    VALUES
      (${id}, ${a.name}, ${a.title}, ${a.description}, ${a.whatItDoes},
       ${a.color}, ${a.llm}, ${a.robots}, ${a.status}, ${position})
    RETURNING id, name, title, description, what_it_does, color, llm, robots, status
  `;
  return mapRow(rows[0]);
}

export async function updateAgent(
  id: string,
  input: AgentInput
): Promise<Agent | null> {
  const a = normalize(input);
  const rows = await sql`
    UPDATE agents SET
      name = ${a.name},
      title = ${a.title},
      description = ${a.description},
      what_it_does = ${a.whatItDoes},
      color = ${a.color},
      llm = ${a.llm},
      robots = ${a.robots},
      status = ${a.status}
    WHERE id = ${id}
    RETURNING id, name, title, description, what_it_does, color, llm, robots, status
  `;
  return rows[0] ? mapRow(rows[0]) : null;
}

export async function deleteAgent(id: string): Promise<boolean> {
  const rows = await sql`DELETE FROM agents WHERE id = ${id} RETURNING id`;
  return rows.length > 0;
}
