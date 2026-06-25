"use client";

import { useCallback, useEffect, useRef, useState } from "react";

export type LiveAppKind =
  | "dokploy"
  | "traefik"
  | "postgres"
  | "redis"
  | "registry"
  | "n8n"
  | "hermes"
  | "trading"
  | "generic";

export interface LiveContainer {
  id: string;
  name: string;
  displayName: string;
  image: string;
  status: string;
  state: string;
  ports: string[];
  cpu: number;
  mem: number;
  app: LiveAppKind;
  isDokploy: boolean;
  health: string | null;
}

export interface LiveSnapshot {
  host: string;
  generatedAt: string;
  containers: LiveContainer[];
  totals: { all: number; running: number; stopped: number; stacks: number };
}

interface UseServerLiveResult {
  data: LiveSnapshot | null;
  /** First-load spinner only. */
  loading: boolean;
  /** Background re-fetch in progress (manual or auto). */
  refreshing: boolean;
  error: string | null;
  lastUpdated: number | null;
  auto: boolean;
  setAuto: (on: boolean) => void;
  refresh: () => void;
}

// Poll every 5 minutes, not seconds: each refresh opens a fresh SSH connection
// to the box, so a tight interval would hammer the server. 5 min keeps the view
// current without load. Use the manual "Refresh" button for an on-demand pull.
const AUTO_INTERVAL = 5 * 60 * 1000;

export function useServerLive(): UseServerLiveResult {
  const [data, setData] = useState<LiveSnapshot | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdated, setLastUpdated] = useState<number | null>(null);
  const [auto, setAuto] = useState(true);
  const [tick, setTick] = useState(0);
  const firstLoad = useRef(true);

  const refresh = useCallback(() => setTick((t) => t + 1), []);

  useEffect(() => {
    let cancelled = false;
    if (firstLoad.current) setLoading(true);
    else setRefreshing(true);

    const force = firstLoad.current ? "" : "?force=1";
    fetch(`/api/server/live${force}`)
      .then(async (res) => {
        const text = await res.text();
        const json = text ? JSON.parse(text) : null;
        if (cancelled) return;
        if (!res.ok) {
          setError(
            (json && typeof json === "object" && "error" in json
              ? String((json as { error: unknown }).error)
              : null) ?? `Request failed (${res.status})`
          );
          return;
        }
        setData(json as LiveSnapshot);
        setError(null);
        setLastUpdated(Date.now());
      })
      .catch((err) => {
        if (cancelled) return;
        setError(err instanceof Error ? err.message : "Failed to load");
      })
      .finally(() => {
        if (cancelled) return;
        firstLoad.current = false;
        setLoading(false);
        setRefreshing(false);
      });

    return () => {
      cancelled = true;
    };
  }, [tick]);

  // Auto-refresh poll.
  useEffect(() => {
    if (!auto) return;
    const t = setInterval(() => setTick((x) => x + 1), AUTO_INTERVAL);
    return () => clearInterval(t);
  }, [auto]);

  return {
    data,
    loading,
    refreshing,
    error,
    lastUpdated,
    auto,
    setAuto,
    refresh,
  };
}
