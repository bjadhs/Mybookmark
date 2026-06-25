"use client";

import { useEffect, useRef } from "react";
import { CronJob, Notification } from "@/lib/types";
import { cronJobsSchema, notificationSchema } from "@/lib/schemas";

// Re-evaluate due jobs every 30s (and once on mount).
const TICK = 30 * 1000;

/** Minutes since local midnight for an "HH:MM" string, or null if malformed. */
function minutesOfDay(hhmm: string): number | null {
  const m = /^(\d{2}):(\d{2})$/.exec(hhmm);
  if (!m) return null;
  return Number(m[1]) * 60 + Number(m[2]);
}

/**
 * When a job is due, return a key identifying *this* occurrence; else null. The
 * key lets the runner fire a recurring (interval) job once per window while
 * firing one-shot (delay/schedule) jobs once. 'manual' jobs never auto-fire.
 */
function dueKey(job: CronJob, sessionStart: number): string | null {
  switch (job.triggerType) {
    case "delay":
      return Date.now() - sessionStart >= job.delayMinutes * 60_000
        ? "delay"
        : null;
    case "schedule": {
      const target = minutesOfDay(job.scheduleTime);
      if (target === null) return null;
      const now = new Date();
      const nowMinutes = now.getHours() * 60 + now.getMinutes();
      if (nowMinutes < target) return null;
      return `sched:${now.toISOString().slice(0, 10)}`;
    }
    case "interval": {
      const ms = job.intervalHours * 3_600_000;
      return `int:${Math.floor(Date.now() / ms)}`;
    }
    case "manual":
    default:
      return null;
  }
}

/**
 * Client-side cron evaluator. Because every delivery targets the current viewer,
 * the browser is the scheduler: it loads the enabled jobs once, then every tick
 * checks which are due and POSTs a fire request. The server de-dupes per day, so
 * the `firedThisSession` guard here is just to avoid hammering it each tick.
 *
 * `onFired` receives the freshly-created notification (the server returns
 * `{ deduped: true }` for an already-delivered occurrence, which we ignore).
 */
export function useCronRunner(
  enabled: boolean,
  onFired: (n: Notification) => void
): void {
  const onFiredRef = useRef(onFired);
  useEffect(() => {
    onFiredRef.current = onFired;
  });

  useEffect(() => {
    if (!enabled) return;
    let cancelled = false;
    const sessionStart = Date.now();
    // Tracks `${jobId}:${occurrenceKey}` already fired this session, so a
    // recurring job re-fires on its next window but never twice in the same one.
    const fired = new Set<string>();
    let jobs: CronJob[] = [];

    const fire = async (job: CronJob, key: string) => {
      const token = `${job.id}:${key}`;
      fired.add(token);
      try {
        const res = await fetch(`/api/cron/${job.id}/fire`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: "{}",
        });
        if (!res.ok) return;
        const data = await res.json().catch(() => null);
        if (cancelled || !data || !data.notification) return;
        const parsed = notificationSchema.safeParse(data.notification);
        if (parsed.success) onFiredRef.current(parsed.data);
      } catch {
        // Allow a retry on a later tick if the request failed outright.
        fired.delete(token);
      }
    };

    const evaluate = () => {
      for (const job of jobs) {
        const key = dueKey(job, sessionStart);
        if (key && !fired.has(`${job.id}:${key}`)) fire(job, key);
      }
    };

    // Load enabled jobs once, then start ticking.
    fetch("/api/cron")
      .then(async (res) => {
        if (!res.ok) return;
        const text = await res.text();
        const data = text ? JSON.parse(text) : [];
        if (cancelled) return;
        jobs = cronJobsSchema.parse(data).filter((j) => j.enabled);
        evaluate();
      })
      .catch(() => {});

    const t = setInterval(evaluate, TICK);
    return () => {
      cancelled = true;
      clearInterval(t);
    };
  }, [enabled]);
}
