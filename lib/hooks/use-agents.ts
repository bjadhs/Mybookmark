"use client";

import { useCallback, useEffect, useState } from "react";
import { Agent } from "@/lib/types";

export type AgentDraft = Omit<Agent, "id">;

interface UseAgentsResult {
  agents: Agent[];
  loading: boolean;
  error: string | null;
  addAgent: (draft: AgentDraft) => Promise<Agent>;
  updateAgent: (id: string, draft: AgentDraft) => Promise<Agent>;
  deleteAgent: (id: string) => Promise<void>;
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

export function useAgents(): UseAgentsResult {
  const [agents, setAgents] = useState<Agent[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [fetchKey, setFetchKey] = useState(0);

  useEffect(() => {
    let cancelled = false;
    fetch("/api/agents")
      .then(async (res) => {
        const data = await readJson(res);
        if (cancelled) return;
        if (!res.ok) {
          setError(errorMessage(data, res.status));
          return;
        }
        setAgents(data as Agent[]);
      })
      .catch((err) => {
        if (cancelled) return;
        setError(err instanceof Error ? err.message : "Failed to load agents");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [fetchKey]);

  const refresh = useCallback(() => setFetchKey((k) => k + 1), []);

  const addAgent = useCallback(async (draft: AgentDraft): Promise<Agent> => {
    const res = await fetch("/api/agents", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(draft),
    });
    const data = await readJson(res);
    if (!res.ok) throw new Error(errorMessage(data, res.status));
    const created = data as Agent;
    setAgents((prev) => [...prev, created]);
    return created;
  }, []);

  const updateAgent = useCallback(
    async (id: string, draft: AgentDraft): Promise<Agent> => {
      const res = await fetch(`/api/agents/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(draft),
      });
      const data = await readJson(res);
      if (!res.ok) throw new Error(errorMessage(data, res.status));
      const updated = data as Agent;
      setAgents((prev) => prev.map((a) => (a.id === id ? updated : a)));
      return updated;
    },
    []
  );

  const deleteAgent = useCallback(async (id: string): Promise<void> => {
    const res = await fetch(`/api/agents/${id}`, { method: "DELETE" });
    if (!res.ok) {
      const data = await readJson(res);
      throw new Error(errorMessage(data, res.status));
    }
    setAgents((prev) => prev.filter((a) => a.id !== id));
  }, []);

  return {
    agents,
    loading,
    error,
    addAgent,
    updateAgent,
    deleteAgent,
    refresh,
  };
}
