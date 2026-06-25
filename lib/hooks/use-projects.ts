"use client";

import { useCallback, useEffect, useState } from "react";
import { Project } from "@/lib/types";
import {
  ProjectInput,
  projectSchema,
  projectsSchema,
} from "@/lib/schemas";

export type ProjectDraft = ProjectInput;

interface UseProjectsResult {
  projects: Project[];
  loading: boolean;
  error: string | null;
  addProject: (draft: ProjectDraft) => Promise<Project>;
  updateProject: (id: string, draft: ProjectDraft) => Promise<Project>;
  deleteProject: (id: string) => Promise<void>;
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

export function useProjects(): UseProjectsResult {
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [fetchKey, setFetchKey] = useState(0);

  useEffect(() => {
    let cancelled = false;
    fetch("/api/projects")
      .then(async (res) => {
        const data = await readJson(res);
        if (cancelled) return;
        if (!res.ok) {
          setError(errorMessage(data, res.status));
          return;
        }
        setProjects(projectsSchema.parse(data));
      })
      .catch((err) => {
        if (cancelled) return;
        setError(err instanceof Error ? err.message : "Failed to load projects");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [fetchKey]);

  const refresh = useCallback(() => setFetchKey((k) => k + 1), []);

  const addProject = useCallback(
    async (draft: ProjectDraft): Promise<Project> => {
      const res = await fetch("/api/projects", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(draft),
      });
      const data = await readJson(res);
      if (!res.ok) throw new Error(errorMessage(data, res.status));
      const created = projectSchema.parse(data);
      setProjects((prev) =>
        [...prev, created].sort((a, b) => a.position - b.position)
      );
      return created;
    },
    []
  );

  const updateProject = useCallback(
    async (id: string, draft: ProjectDraft): Promise<Project> => {
      const res = await fetch(`/api/projects/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(draft),
      });
      const data = await readJson(res);
      if (!res.ok) throw new Error(errorMessage(data, res.status));
      const updated = projectSchema.parse(data);
      setProjects((prev) => prev.map((p) => (p.id === id ? updated : p)));
      return updated;
    },
    []
  );

  const deleteProject = useCallback(async (id: string): Promise<void> => {
    const res = await fetch(`/api/projects/${id}`, { method: "DELETE" });
    if (!res.ok) {
      const data = await readJson(res);
      throw new Error(errorMessage(data, res.status));
    }
    setProjects((prev) => prev.filter((p) => p.id !== id));
  }, []);

  return {
    projects,
    loading,
    error,
    addProject,
    updateProject,
    deleteProject,
    refresh,
  };
}
