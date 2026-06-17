"use client";

import { useCallback, useEffect, useState } from "react";
import { Category } from "@/lib/types";

interface UseCategoriesResult {
  categories: Category[];
  loading: boolean;
  error: string | null;
  addCategory: (name: string) => Promise<Category>;
  updateCategory: (id: string, name: string) => Promise<Category>;
  deleteCategory: (id: string) => Promise<void>;
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

export function useCategories(): UseCategoriesResult {
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [fetchKey, setFetchKey] = useState(0);

  useEffect(() => {
    let cancelled = false;

    fetch("/api/categories")
      .then(async (res) => {
        const data = await readJson(res);
        if (cancelled) return;

        if (!res.ok) {
          setError(errorMessage(data, res.status));
          return;
        }

        setCategories(data as Category[]);
      })
      .catch((err) => {
        if (cancelled) return;
        setError(err instanceof Error ? err.message : "Failed to load categories");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [fetchKey]);

  const refresh = useCallback(() => setFetchKey((k) => k + 1), []);

  const addCategory = useCallback(
    async (name: string): Promise<Category> => {
      const res = await fetch("/api/categories", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name }),
      });

      const data = await readJson(res);
      if (!res.ok) throw new Error(errorMessage(data, res.status));

      const created = data as Category;
      setCategories((prev) => [...prev, created].sort((a, b) => a.name.localeCompare(b.name)));
      return created;
    },
    []
  );

  const updateCategory = useCallback(
    async (id: string, name: string): Promise<Category> => {
      const res = await fetch(`/api/categories/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name }),
      });

      const data = await readJson(res);
      if (!res.ok) throw new Error(errorMessage(data, res.status));

      const updated = data as Category;
      setCategories((prev) =>
        prev.map((c) => (c.id === id ? updated : c)).sort((a, b) => a.name.localeCompare(b.name))
      );
      return updated;
    },
    []
  );

  const deleteCategory = useCallback(
    async (id: string): Promise<void> => {
      const res = await fetch(`/api/categories/${id}`, { method: "DELETE" });

      if (!res.ok) {
        const data = await readJson(res);
        throw new Error(errorMessage(data, res.status));
      }

      setCategories((prev) => prev.filter((c) => c.id !== id));
    },
    []
  );

  return {
    categories,
    loading,
    error,
    addCategory,
    updateCategory,
    deleteCategory,
    refresh,
  };
}
