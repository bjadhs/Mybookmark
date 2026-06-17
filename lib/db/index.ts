import postgres from "postgres";

const DATABASE_URL =
  process.env.DATABASE_URL ||
  "postgresql://glance:glance_password@localhost:5432/glance";

const isLocalhost =
  DATABASE_URL.includes("@localhost") ||
  DATABASE_URL.includes("@127.0.0.1") ||
  DATABASE_URL.includes("://host.docker.internal");

export const sql = postgres(DATABASE_URL, {
  ssl: isLocalhost ? false : "prefer",
  max_lifetime: 60 * 30,
  idle_timeout: 20,
  connect_timeout: 10,
});

export async function testConnection(): Promise<{ ok: boolean; error?: string }> {
  try {
    await sql`SELECT 1`;
    return { ok: true };
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return { ok: false, error: message };
  }
}
