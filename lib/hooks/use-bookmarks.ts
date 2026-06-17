"use client";

import { useCallback, useEffect, useState } from "react";
import { Bookmark } from "@/lib/types";

export interface NewBookmarkInput {
  title: string;
  url: string;
  desc: string;
  categoryId: string;
  previewImage?: string | null;
}

export type UpdateBookmarkInput = NewBookmarkInput;

interface UseBookmarksResult {
  bookmarks: Bookmark[];
  loading: boolean;
  error: string | null;
  addBookmark: (input: NewBookmarkInput) => Promise<Bookmark>;
  updateBookmark: (id: string, input: UpdateBookmarkInput) => Promise<Bookmark>;
  deleteBookmark: (id: string) => Promise<void>;
  toggleLike: (id: string) => Promise<void>;
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

export function useBookmarks(): UseBookmarksResult {
  const [bookmarks, setBookmarks] = useState<Bookmark[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    fetch("/api/bookmarks")
      .then(async (res) => {
        const data = await readJson(res);
        if (cancelled) return;

        if (!res.ok) {
          setError(errorMessage(data, res.status));
          return;
        }

        setBookmarks(data as Bookmark[]);
      })
      .catch((err) => {
        if (cancelled) return;
        setError(err instanceof Error ? err.message : "Failed to load bookmarks");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, []);

  const addBookmark = useCallback(
    async (input: NewBookmarkInput): Promise<Bookmark> => {
      const res = await fetch("/api/bookmarks", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(input),
      });

      const data = await readJson(res);
      if (!res.ok) throw new Error(errorMessage(data, res.status));

      const created = data as Bookmark;
      setBookmarks((prev) => [created, ...prev]);
      return created;
    },
    []
  );

  const updateBookmark = useCallback(
    async (id: string, input: UpdateBookmarkInput): Promise<Bookmark> => {
      const res = await fetch(`/api/bookmarks/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(input),
      });

      const data = await readJson(res);
      if (!res.ok) throw new Error(errorMessage(data, res.status));

      const updated = data as Bookmark;
      setBookmarks((prev) => prev.map((b) => (b.id === id ? updated : b)));
      return updated;
    },
    []
  );

  const deleteBookmark = useCallback(async (id: string): Promise<void> => {
    const res = await fetch(`/api/bookmarks/${id}`, { method: "DELETE" });

    if (!res.ok) {
      const data = await readJson(res);
      throw new Error(errorMessage(data, res.status));
    }

    setBookmarks((prev) => prev.filter((b) => b.id !== id));
  }, []);

  const toggleLike = useCallback(async (id: string): Promise<void> => {
    const res = await fetch(`/api/bookmarks/${id}/like`, { method: "POST" });
    const data = await readJson(res);
    if (!res.ok) throw new Error(errorMessage(data, res.status));

    const { liked, likeCount } = data as { liked: boolean; likeCount: number };
    setBookmarks((prev) =>
      prev.map((b) =>
        b.id === id ? { ...b, likedByMe: liked, likeCount } : b
      )
    );
  }, []);

  return {
    bookmarks,
    loading,
    error,
    addBookmark,
    updateBookmark,
    deleteBookmark,
    toggleLike,
  };
}
