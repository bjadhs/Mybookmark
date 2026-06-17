"use client";

import { useCallback, useEffect, useState } from "react";
import { ServerContainer } from "@/lib/types";

export type ContainerDraft = Omit<ServerContainer, "id">;

interface UseContainersResult {
  containers: ServerContainer[];
  loading: boolean;
  error: string | null;
  addContainer: (draft: ContainerDraft) => Promise<ServerContainer>;
  updateContainer: (id: string, draft: ContainerDraft) => Promise<ServerContainer>;
  deleteContainer: (id: string) => Promise<void>;
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

export function useContainers(): UseContainersResult {
  const [containers, setContainers] = useState<ServerContainer[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [fetchKey, setFetchKey] = useState(0);

  useEffect(() => {
    let cancelled = false;
    fetch("/api/containers")
      .then(async (res) => {
        const data = await readJson(res);
        if (cancelled) return;
        if (!res.ok) {
          setError(errorMessage(data, res.status));
          return;
        }
        setContainers(data as ServerContainer[]);
      })
      .catch((err) => {
        if (cancelled) return;
        setError(err instanceof Error ? err.message : "Failed to load containers");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [fetchKey]);

  const refresh = useCallback(() => setFetchKey((k) => k + 1), []);

  const addContainer = useCallback(
    async (draft: ContainerDraft): Promise<ServerContainer> => {
      const res = await fetch("/api/containers", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(draft),
      });
      const data = await readJson(res);
      if (!res.ok) throw new Error(errorMessage(data, res.status));
      const created = data as ServerContainer;
      setContainers((prev) => [...prev, created]);
      return created;
    },
    []
  );

  const updateContainer = useCallback(
    async (id: string, draft: ContainerDraft): Promise<ServerContainer> => {
      const res = await fetch(`/api/containers/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(draft),
      });
      const data = await readJson(res);
      if (!res.ok) throw new Error(errorMessage(data, res.status));
      const updated = data as ServerContainer;
      setContainers((prev) => prev.map((c) => (c.id === id ? updated : c)));
      return updated;
    },
    []
  );

  const deleteContainer = useCallback(async (id: string): Promise<void> => {
    const res = await fetch(`/api/containers/${id}`, { method: "DELETE" });
    if (!res.ok) {
      const data = await readJson(res);
      throw new Error(errorMessage(data, res.status));
    }
    setContainers((prev) => prev.filter((c) => c.id !== id));
  }, []);

  return {
    containers,
    loading,
    error,
    addContainer,
    updateContainer,
    deleteContainer,
    refresh,
  };
}
