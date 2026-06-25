"use client";

import { useCallback, useEffect, useState } from "react";
import { CronJob } from "@/lib/types";
import { CronJobInput, cronJobSchema, cronJobsSchema } from "@/lib/schemas";

export type CronJobDraft = CronJobInput;

interface UseCronResult {
  jobs: CronJob[];
  loading: boolean;
  error: string | null;
  addJob: (draft: CronJobDraft) => Promise<CronJob>;
  updateJob: (id: string, draft: CronJobDraft) => Promise<CronJob>;
  deleteJob: (id: string) => Promise<void>;
  /** Fire a job immediately as an admin test (bypasses the per-day dedup). */
  testJob: (id: string) => Promise<void>;
  refresh: () => void;
}

async function readJson(res: Response): Promise<unknown> {
  const text = await res.text();
  try {
    return text ? JSON.parse(text) : null;
  } catch {
    throw new Error(`Server returned invalid JSON: ${text.slice(0, 200)}`);
  }
}

function errorMessage(data: unknown, status: number): string {
  return typeof data === "object" && data !== null && "error" in data
    ? String((data as { error: unknown }).error)
    : `Request failed with status ${status}`;
}

export function useCron(): UseCronResult {
  const [jobs, setJobs] = useState<CronJob[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [fetchKey, setFetchKey] = useState(0);

  useEffect(() => {
    let cancelled = false;
    fetch("/api/cron")
      .then(async (res) => {
        const data = await readJson(res);
        if (cancelled) return;
        if (!res.ok) {
          setError(errorMessage(data, res.status));
          return;
        }
        setJobs(cronJobsSchema.parse(data));
      })
      .catch((err) => {
        if (cancelled) return;
        setError(err instanceof Error ? err.message : "Failed to load cron jobs");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [fetchKey]);

  const refresh = useCallback(() => setFetchKey((k) => k + 1), []);

  const addJob = useCallback(async (draft: CronJobDraft): Promise<CronJob> => {
    const res = await fetch("/api/cron", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(draft),
    });
    const data = await readJson(res);
    if (!res.ok) throw new Error(errorMessage(data, res.status));
    const created = cronJobSchema.parse(data);
    setJobs((prev) =>
      [...prev, created].sort((a, b) => a.position - b.position)
    );
    return created;
  }, []);

  const updateJob = useCallback(
    async (id: string, draft: CronJobDraft): Promise<CronJob> => {
      const res = await fetch(`/api/cron/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(draft),
      });
      const data = await readJson(res);
      if (!res.ok) throw new Error(errorMessage(data, res.status));
      const updated = cronJobSchema.parse(data);
      setJobs((prev) => prev.map((j) => (j.id === id ? updated : j)));
      return updated;
    },
    []
  );

  const deleteJob = useCallback(async (id: string): Promise<void> => {
    const res = await fetch(`/api/cron/${id}`, { method: "DELETE" });
    if (!res.ok) {
      const data = await readJson(res);
      throw new Error(errorMessage(data, res.status));
    }
    setJobs((prev) => prev.filter((j) => j.id !== id));
  }, []);

  const testJob = useCallback(async (id: string): Promise<void> => {
    const res = await fetch(`/api/cron/${id}/fire`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ test: true }),
    });
    if (!res.ok) {
      const data = await readJson(res);
      throw new Error(errorMessage(data, res.status));
    }
  }, []);

  return {
    jobs,
    loading,
    error,
    addJob,
    updateJob,
    deleteJob,
    testJob,
    refresh,
  };
}
