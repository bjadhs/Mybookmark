import { sql } from "./index";
import { Project, PROJECT_STATUSES, PROJECT_TAGS } from "@/lib/types";
import { ProjectInput } from "@/lib/schemas";

function oneOf<T extends readonly string[]>(
  value: unknown,
  allowed: T,
  fallback: T[number]
): T[number] {
  const v = String(value ?? "");
  return (allowed as readonly string[]).includes(v) ? (v as T[number]) : fallback;
}

function clampCompletion(v: unknown): number {
  const n = Math.round(Number(v));
  if (!Number.isFinite(n)) return 0;
  return Math.min(10, Math.max(0, n));
}

function mapRow(row: Record<string, unknown>): Project {
  return {
    id: String(row.id),
    position: Number(row.position ?? 0),
    title: String(row.title),
    tag: oneOf(row.tag, PROJECT_TAGS, ""),
    status: oneOf(row.status, PROJECT_STATUSES, "todo"),
    notes: String(row.notes ?? ""),
    completion: clampCompletion(row.completion),
  };
}

export async function getProjects(): Promise<Project[]> {
  const rows = await sql`
    SELECT id, position, title, tag, status, notes, completion
    FROM projects
    ORDER BY position, created_at
  `;
  return rows.map(mapRow);
}

export async function getProjectById(id: string): Promise<Project | null> {
  const rows = await sql`
    SELECT id, position, title, tag, status, notes, completion
    FROM projects WHERE id = ${id}
  `;
  return rows[0] ? mapRow(rows[0]) : null;
}

export async function createProject(input: ProjectInput): Promise<Project> {
  const id = `prj_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
  const posRows = await sql`
    SELECT COALESCE(MAX(position), 0) + 1 AS pos FROM projects
  `;
  const position = Number(posRows[0]?.pos ?? 1);

  const rows = await sql`
    INSERT INTO projects (id, title, tag, status, notes, completion, position)
    VALUES (${id}, ${input.title}, ${input.tag}, ${input.status}, ${input.notes}, ${clampCompletion(input.completion)}, ${position})
    RETURNING id, position, title, tag, status, notes, completion
  `;
  return mapRow(rows[0]);
}

export async function updateProject(
  id: string,
  input: ProjectInput
): Promise<Project | null> {
  const rows = await sql`
    UPDATE projects SET
      title = ${input.title},
      tag = ${input.tag},
      status = ${input.status},
      notes = ${input.notes},
      completion = ${clampCompletion(input.completion)}
    WHERE id = ${id}
    RETURNING id, position, title, tag, status, notes, completion
  `;
  return rows[0] ? mapRow(rows[0]) : null;
}

export async function deleteProject(id: string): Promise<boolean> {
  const rows = await sql`DELETE FROM projects WHERE id = ${id} RETURNING id`;
  return rows.length > 0;
}
