"use client";

import { useEffect, useState } from "react";

/**
 * Tiny shared store for the currently selected category filter.
 *
 * It replaces the old `window` CustomEvent bus, which dropped the selection
 * whenever the dispatcher (the sidebar) navigated to a route whose listener
 * (the home grid) had not mounted yet. Because the value is held in module
 * state, a freshly mounted consumer reads the latest selection synchronously.
 */
const ALL = "all";

let current = ALL;
const listeners = new Set<(id: string) => void>();

export function getActiveCategory(): string {
  return current;
}

export function setActiveCategory(id: string): void {
  const next = id || ALL;
  if (next === current) return;
  current = next;
  for (const listener of listeners) listener(current);
}

/** Subscribe to category-filter changes, seeded with the current value. */
export function useActiveCategory(): string {
  const [value, setValue] = useState(current);

  useEffect(() => {
    // Re-sync in case the value changed between render and effect.
    setValue(current);
    listeners.add(setValue);
    return () => {
      listeners.delete(setValue);
    };
  }, []);

  return value;
}
