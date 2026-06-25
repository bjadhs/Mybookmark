"use client";

import { useCallback, useState } from "react";

export interface RunResult {
  ok: boolean;
  action: string;
  command: string;
  stdout: string;
  stderr: string;
  code: number;
  durationMs: number;
}

export interface RunRecord extends RunResult {
  /** Local id for the console list. */
  key: string;
  /** Wall-clock when it finished. */
  at: number;
  /** Action label for display. */
  label: string;
}

interface UseDeployResult {
  results: RunRecord[];
  /** Action ids currently executing (each button tracks itself). */
  running: string[];
  run: (action: string, label: string, params?: Record<string, string>) => Promise<boolean>;
  clear: () => void;
}

export function useDeploy(): UseDeployResult {
  const [results, setResults] = useState<RunRecord[]>([]);
  const [running, setRunning] = useState<string[]>([]);

  const run = useCallback(
    async (action: string, label: string, params: Record<string, string> = {}) => {
      setRunning((prev) => (prev.includes(action) ? prev : [...prev, action]));
      const key = `${action}-${Date.now()}`;
      try {
        const res = await fetch("/api/deploy/run", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ action, params }),
        });
        const text = await res.text();
        const data = text ? JSON.parse(text) : {};

        const record: RunRecord = res.ok
          ? { ...(data as RunResult), key, at: Date.now(), label }
          : {
              ok: false,
              action,
              command: "(request rejected)",
              stdout: "",
              stderr:
                (data && typeof data === "object" && "error" in data
                  ? String((data as { error: unknown }).error)
                  : null) ?? `Request failed (${res.status})`,
              code: res.status,
              durationMs: 0,
              key,
              at: Date.now(),
              label,
            };

        setResults((prev) => [record, ...prev].slice(0, 30));
        return record.ok;
      } catch (err) {
        setResults((prev) =>
          [
            {
              ok: false,
              action,
              command: "(network error)",
              stdout: "",
              stderr: err instanceof Error ? err.message : "Network error",
              code: -1,
              durationMs: 0,
              key,
              at: Date.now(),
              label,
            },
            ...prev,
          ].slice(0, 30)
        );
        return false;
      } finally {
        setRunning((prev) => prev.filter((a) => a !== action));
      }
    },
    []
  );

  const clear = useCallback(() => setResults([]), []);

  return { results, running, run, clear };
}
