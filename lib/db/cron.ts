import { sql } from "./index";
import {
  CRON_KINDS,
  CRON_TRIGGER_TYPES,
  CronJob,
  CronKind,
  CronTriggerType,
} from "@/lib/types";
import { CronJobInput } from "@/lib/schemas";

function triggerType(value: unknown): CronTriggerType {
  const v = String(value ?? "");
  return (CRON_TRIGGER_TYPES as readonly string[]).includes(v)
    ? (v as CronTriggerType)
    : "delay";
}

function kind(value: unknown): CronKind {
  const v = String(value ?? "");
  return (CRON_KINDS as readonly string[]).includes(v)
    ? (v as CronKind)
    : "custom";
}

function clampDelay(v: unknown): number {
  const n = Math.round(Number(v));
  if (!Number.isFinite(n)) return 5;
  return Math.min(1440, Math.max(1, n));
}

function clampInterval(v: unknown): number {
  const n = Math.round(Number(v));
  if (!Number.isFinite(n)) return 6;
  return Math.min(168, Math.max(1, n));
}

function mapRow(row: Record<string, unknown>): CronJob {
  return {
    id: String(row.id),
    title: String(row.title),
    body: String(row.body ?? ""),
    kind: kind(row.kind),
    triggerType: triggerType(row.trigger_type),
    delayMinutes: clampDelay(row.delay_minutes),
    scheduleTime: String(row.schedule_time ?? "09:00"),
    intervalHours: clampInterval(row.interval_hours),
    sendEmail: Boolean(row.send_email),
    enabled: Boolean(row.enabled),
    position: Number(row.position ?? 0),
  };
}

// Selected/returned columns. Passing the array to sql() renders a safe,
// comma-separated identifier list usable in both SELECT and RETURNING.
const COLUMNS = [
  "id",
  "title",
  "body",
  "kind",
  "trigger_type",
  "delay_minutes",
  "schedule_time",
  "interval_hours",
  "send_email",
  "enabled",
  "position",
];

/** Every job, admin view. */
export async function getCronJobs(): Promise<CronJob[]> {
  const rows = await sql`
    SELECT ${sql(COLUMNS)} FROM cron_jobs ORDER BY position, created_at
  `;
  return rows.map(mapRow);
}

/**
 * Enabled jobs a signed-in viewer's client needs to evaluate. Non-admins get
 * only `custom` jobs — the server_health / visit_reminder kinds target the
 * admin's own inbox, so only the admin's browser should ever fire them.
 */
export async function getEnabledCronJobs(customOnly = false): Promise<CronJob[]> {
  const rows = customOnly
    ? await sql`
        SELECT ${sql(COLUMNS)} FROM cron_jobs
        WHERE enabled = TRUE AND kind = 'custom'
        ORDER BY position, created_at
      `
    : await sql`
        SELECT ${sql(COLUMNS)} FROM cron_jobs WHERE enabled = TRUE
        ORDER BY position, created_at
      `;
  return rows.map(mapRow);
}

export async function getCronJobById(id: string): Promise<CronJob | null> {
  const rows = await sql`SELECT ${sql(COLUMNS)} FROM cron_jobs WHERE id = ${id}`;
  return rows[0] ? mapRow(rows[0]) : null;
}

export async function createCronJob(input: CronJobInput): Promise<CronJob> {
  const id = `cron_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
  const posRows = await sql`
    SELECT COALESCE(MAX(position), 0) + 1 AS pos FROM cron_jobs
  `;
  const position = Number(posRows[0]?.pos ?? 1);

  const rows = await sql`
    INSERT INTO cron_jobs (
      id, title, body, kind, trigger_type, delay_minutes, schedule_time,
      interval_hours, send_email, enabled, position
    ) VALUES (
      ${id}, ${input.title}, ${input.body}, ${input.kind}, ${input.triggerType},
      ${clampDelay(input.delayMinutes)}, ${input.scheduleTime},
      ${clampInterval(input.intervalHours)}, ${input.sendEmail},
      ${input.enabled}, ${position}
    )
    RETURNING ${sql(COLUMNS)}
  `;
  return mapRow(rows[0]);
}

export async function updateCronJob(
  id: string,
  input: CronJobInput
): Promise<CronJob | null> {
  const rows = await sql`
    UPDATE cron_jobs SET
      title = ${input.title},
      body = ${input.body},
      kind = ${input.kind},
      trigger_type = ${input.triggerType},
      delay_minutes = ${clampDelay(input.delayMinutes)},
      schedule_time = ${input.scheduleTime},
      interval_hours = ${clampInterval(input.intervalHours)},
      send_email = ${input.sendEmail},
      enabled = ${input.enabled}
    WHERE id = ${id}
    RETURNING ${sql(COLUMNS)}
  `;
  return rows[0] ? mapRow(rows[0]) : null;
}

export async function deleteCronJob(id: string): Promise<boolean> {
  const rows = await sql`DELETE FROM cron_jobs WHERE id = ${id} RETURNING id`;
  return rows.length > 0;
}

/**
 * Claim a delivery slot for (job, user, occurrence). Returns true only when this
 * call inserted the row — i.e. the job has not already fired for this user in
 * this occurrence. The composite PK makes concurrent/duplicate fires a no-op.
 */
export async function recordDeliveryIfNew(
  jobId: string,
  userId: string,
  occurrenceKey: string
): Promise<boolean> {
  const rows = await sql`
    INSERT INTO cron_deliveries (job_id, user_id, occurrence_key)
    VALUES (${jobId}, ${userId}, ${occurrenceKey})
    ON CONFLICT (job_id, user_id, occurrence_key) DO NOTHING
    RETURNING job_id
  `;
  return rows.length > 0;
}
