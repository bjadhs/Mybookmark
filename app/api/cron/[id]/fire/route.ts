import { NextResponse } from "next/server";
import { getCronJobById, recordDeliveryIfNew } from "@/lib/db/cron";
import { createNotification } from "@/lib/db/notifications";
import { guardUser } from "@/lib/auth";
import { sendMail } from "@/lib/email";
import { handleApiError } from "@/lib/api-error";
import { getLiveServerSnapshot } from "@/lib/server-live";
import type { CronJob } from "@/lib/types";

// SSH (server_health) needs the Node runtime; never cache a fire.
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Idempotency bucket for a job's trigger. Real fires claim one of these once;
 * 'manual' jobs return null (always send — they're an explicit button press).
 */
function occurrenceKey(job: CronJob): string | null {
  const day = new Date().toISOString().slice(0, 10);
  switch (job.triggerType) {
    case "delay":
      return `delay:${day}`;
    case "schedule":
      return `schedule:${day}`;
    case "interval": {
      const ms = job.intervalHours * 3_600_000;
      return `interval:${Math.floor(Date.now() / ms)}`;
    }
    case "manual":
    default:
      return null;
  }
}

/** Compose the server-health email/notification body from a live snapshot. */
async function buildHealthBody(): Promise<string> {
  try {
    const snap = await getLiveServerSnapshot(false);
    const { host, totals, containers } = snap;
    const lines = [
      `Host: ${host}`,
      `Containers: ${totals.running}/${totals.all} running · ${totals.stopped} stopped · ${totals.stacks} stacks`,
      "",
      ...containers
        .slice(0, 12)
        .map(
          (c) =>
            `• ${c.displayName} — ${c.state}` +
            (c.health ? ` (${c.health})` : "") +
            ` · cpu ${c.cpu}% · mem ${c.mem}%`
        ),
    ];
    return lines.join("\n");
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    return `Couldn't reach the server over SSH right now.\n\n${msg}`;
  }
}

/**
 * Fire a cron job for the current viewer. The client calls this when a job is
 * due; the server is the gatekeeper. Behaviour depends on the job's kind:
 *  - custom:         deliver the static body (notification + optional email)
 *  - server_health:  admin only — generate a live health summary, email admin
 *  - visit_reminder: admin only — manual nudge to the admin's own inbox
 * The `test` flag (Send button) bypasses the per-occurrence dedup.
 */
export async function POST(request: Request, context: { params: Promise<{ id: string }> }) {
  const guard = await guardUser();
  if (guard.response) return guard.response;
  const me = guard.user;

  try {
    const { id } = await context.params;
    const body = await request.json().catch(() => ({}));
    const isTest = !!(body && typeof body === "object" && "test" in body && body.test);

    const job = await getCronJobById(id);
    if (!job) {
      return NextResponse.json({ error: "Cron job not found" }, { status: 404 });
    }

    // server_health / visit_reminder target the admin's own inbox.
    const adminOnly = job.kind === "server_health" || job.kind === "visit_reminder";
    if (adminOnly && me.role !== "admin") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }
    // A disabled job can only be fired as an admin test preview.
    if (!job.enabled && !(isTest && me.role === "admin")) {
      return NextResponse.json({ error: "Cron job is disabled" }, { status: 409 });
    }

    // Real (non-test) fires are deduped per occurrence; manual jobs have none.
    if (!isTest) {
      const key = occurrenceKey(job);
      if (key) {
        const claimed = await recordDeliveryIfNew(job.id, me.userId!, key);
        if (!claimed) return NextResponse.json({ deduped: true });
      }
    }

    // Resolve the delivered content + whether to email by kind.
    const title = job.title;
    const text =
      job.kind === "server_health"
        ? await buildHealthBody()
        : job.body || job.title;
    // health + reminder are email-first; custom honours its sendEmail flag.
    const wantsEmail = job.kind === "custom" ? job.sendEmail : true;

    const notification = await createNotification(me.userId!, title, text);

    let emailed = false;
    if (wantsEmail && me.email) {
      const result = await sendMail({ to: me.email, subject: title, text });
      emailed = result.sent;
    }

    return NextResponse.json({ notification, emailed }, { status: 201 });
  } catch (error) {
    return handleApiError(error);
  }
}
