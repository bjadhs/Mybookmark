import { sql } from "./index";
import { ServerContainer } from "@/lib/types";

function clampPct(v: unknown): number {
  const n = Math.round(Number(v));
  if (!Number.isFinite(n)) return 0;
  return Math.min(100, Math.max(0, n));
}

function mapRow(row: Record<string, unknown>): ServerContainer {
  return {
    id: String(row.id),
    name: String(row.name),
    image: String(row.image ?? ""),
    port: String(row.port ?? ""),
    uptime: String(row.uptime ?? ""),
    status: String(row.status ?? "running"),
    cpu: Number(row.cpu ?? 0),
    mem: Number(row.mem ?? 0),
  };
}

export interface ContainerInput {
  name: string;
  image?: string;
  port?: string;
  uptime?: string;
  status?: string;
  cpu?: number;
  mem?: number;
}

function normalize(input: ContainerInput) {
  const name = input.name.trim();
  if (!name) throw new Error("Container name is required");
  return {
    name,
    image: (input.image ?? "").trim(),
    port: (input.port ?? "").trim(),
    uptime: (input.uptime ?? "Up just now").trim() || "Up just now",
    status: (input.status ?? "running").trim() || "running",
    cpu: clampPct(input.cpu),
    mem: clampPct(input.mem),
  };
}

export async function getContainers(): Promise<ServerContainer[]> {
  const rows = await sql`
    SELECT id, name, image, port, uptime, status, cpu, mem
    FROM server_containers
    ORDER BY position, created_at
  `;
  return rows.map(mapRow);
}

export async function getContainerById(
  id: string
): Promise<ServerContainer | null> {
  const rows = await sql`
    SELECT id, name, image, port, uptime, status, cpu, mem
    FROM server_containers WHERE id = ${id}
  `;
  return rows[0] ? mapRow(rows[0]) : null;
}

export async function createContainer(
  input: ContainerInput
): Promise<ServerContainer> {
  const c = normalize(input);
  const id = `ctr_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
  const posRows = await sql`
    SELECT COALESCE(MAX(position), -1) + 1 AS pos FROM server_containers
  `;
  const position = Number(posRows[0]?.pos ?? 0);

  const rows = await sql`
    INSERT INTO server_containers
      (id, name, image, port, uptime, status, cpu, mem, position)
    VALUES
      (${id}, ${c.name}, ${c.image}, ${c.port}, ${c.uptime}, ${c.status},
       ${c.cpu}, ${c.mem}, ${position})
    RETURNING id, name, image, port, uptime, status, cpu, mem
  `;
  return mapRow(rows[0]);
}

export async function updateContainer(
  id: string,
  input: ContainerInput
): Promise<ServerContainer | null> {
  const c = normalize(input);
  const rows = await sql`
    UPDATE server_containers SET
      name = ${c.name},
      image = ${c.image},
      port = ${c.port},
      uptime = ${c.uptime},
      status = ${c.status},
      cpu = ${c.cpu},
      mem = ${c.mem}
    WHERE id = ${id}
    RETURNING id, name, image, port, uptime, status, cpu, mem
  `;
  return rows[0] ? mapRow(rows[0]) : null;
}

export async function deleteContainer(id: string): Promise<boolean> {
  const rows = await sql`
    DELETE FROM server_containers WHERE id = ${id} RETURNING id
  `;
  return rows.length > 0;
}
