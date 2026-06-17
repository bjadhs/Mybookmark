"use client";

import { useCallback, useEffect, useState } from "react";
import type { Comment } from "@/lib/types";

interface UseCommentsResult {
  comments: Comment[];
  loading: boolean;
  error: string | null;
  addComment: (body: string) => Promise<void>;
  deleteComment: (id: string) => Promise<void>;
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

export function useComments(bookmarkId: string): UseCommentsResult {
  const [comments, setComments] = useState<Comment[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    fetch(`/api/bookmarks/${bookmarkId}/comments`)
      .then(async (res) => {
        const data = await readJson(res);
        if (cancelled) return;
        if (!res.ok) {
          setError(errorMessage(data, res.status));
          return;
        }
        setComments(data as Comment[]);
      })
      .catch((err) => {
        if (!cancelled)
          setError(err instanceof Error ? err.message : "Failed to load comments");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [bookmarkId]);

  const addComment = useCallback(
    async (body: string): Promise<void> => {
      const res = await fetch(`/api/bookmarks/${bookmarkId}/comments`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ body }),
      });
      const data = await readJson(res);
      if (!res.ok) throw new Error(errorMessage(data, res.status));
      setComments((prev) => [...prev, data as Comment]);
    },
    [bookmarkId]
  );

  const deleteComment = useCallback(async (id: string): Promise<void> => {
    const res = await fetch(`/api/comments/${id}`, { method: "DELETE" });
    if (!res.ok) {
      const data = await readJson(res);
      throw new Error(errorMessage(data, res.status));
    }
    setComments((prev) => prev.filter((c) => c.id !== id));
  }, []);

  return { comments, loading, error, addComment, deleteComment };
}
