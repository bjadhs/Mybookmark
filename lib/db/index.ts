import postgres from "postgres";

interface ConnectionConfig {
  host: string;
  port: number;
  user: string;
  password: string;
  database: string;
}

/**
 * Resolve connection settings into discrete fields rather than handing a URL
 * straight to the driver. The `postgres` driver does NOT `decodeURIComponent`
 * the password it reads from a URL, so a password containing URL-special
 * characters (e.g. `#` → `%23`) would be sent verbatim and fail auth. Parsing
 * the URL here and decoding the credentials ourselves makes any password work.
 */
function resolveConnection(): ConnectionConfig {
  const url = process.env.DATABASE_URL;
  if (url) {
    const parsed = new URL(url);
    return {
      host: parsed.hostname,
      port: parsed.port ? Number(parsed.port) : 5432,
      user: decodeURIComponent(parsed.username),
      password: decodeURIComponent(parsed.password),
      database: parsed.pathname.replace(/^\//, "") || "glance",
    };
  }

  return {
    host: "localhost",
    port: Number(process.env.POSTGRES_PORT || "5432"),
    user: process.env.POSTGRES_USER || "glance",
    password: process.env.POSTGRES_PASSWORD || "glance_password",
    database: process.env.POSTGRES_DB || "glance",
  };
}

const connection = resolveConnection();

const isLocalhost = ["localhost", "127.0.0.1", "host.docker.internal"].includes(
  connection.host
);

export const sql = postgres({
  ...connection,
  ssl: isLocalhost ? false : "prefer",
  max_lifetime: 60 * 30,
  idle_timeout: 20,
  connect_timeout: 10,
});

/**
 * True when an error means the Postgres server is unreachable / not serving us
 * (container down, wrong port, bad credentials, missing database) rather than a
 * normal query/constraint failure. Used to surface a friendly "DB not running"
 * response (503) instead of a generic 500.
 */
export function isDbConnectionError(err: unknown): boolean {
  if (!err || typeof err !== "object") return false;

  const code = String(
    (err as { code?: unknown }).code ?? (err as { errno?: unknown }).errno ?? ""
  ).toUpperCase();

  // Socket-level failures from the `postgres` driver / Node.
  const connectionCodes = new Set([
    "ECONNREFUSED",
    "ENOTFOUND",
    "ETIMEDOUT",
    "EHOSTUNREACH",
    "ENETUNREACH",
    "EPIPE",
    "CONNECT_TIMEOUT",
    "CONNECTION_ENDED",
    "CONNECTION_CLOSED",
    "CONNECTION_DESTROYED",
    // Postgres startup failures that mean "not serving us": bad password,
    // database does not exist, invalid authorization.
    "28P01",
    "3D000",
    "28000",
  ]);
  if (connectionCodes.has(code)) return true;

  const message = (
    err instanceof Error ? err.message : String(err)
  ).toLowerCase();
  return (
    message.includes("econnrefused") ||
    message.includes("connect_timeout") ||
    message.includes("could not connect") ||
    message.includes("connection refused") ||
    message.includes("terminated unexpectedly") ||
    message.includes("the database system is starting up")
  );
}

export async function testConnection(): Promise<{ ok: boolean; error?: string }> {
  try {
    await sql`SELECT 1`;
    return { ok: true };
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return { ok: false, error: message };
  }
}
