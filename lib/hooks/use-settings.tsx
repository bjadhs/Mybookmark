"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
} from "react";
import type { SiteSettings } from "@/lib/types";
import { DEFAULT_SETTINGS, accentHex, mergeSettings } from "@/lib/settings";

interface SettingsContextValue {
  settings: SiteSettings;
  loading: boolean;
  error: string | null;
  /** Admin-only on the server; persists a patch and updates local state. */
  save: (patch: Partial<SiteSettings>) => Promise<SiteSettings>;
  refresh: () => void;
}

const SettingsContext = createContext<SettingsContextValue | null>(null);

/**
 * Loads site settings once for the whole app and applies the theme accent. We
 * seed with DEFAULT_SETTINGS so the first paint already matches the eventual
 * values (no flash), then reconcile with the server.
 */
export function SettingsProvider({ children }: { children: React.ReactNode }) {
  const [settings, setSettings] = useState<SiteSettings>(DEFAULT_SETTINGS);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [fetchKey, setFetchKey] = useState(0);

  useEffect(() => {
    let cancelled = false;
    fetch("/api/settings")
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (cancelled || !data) return;
        setSettings(mergeSettings(data));
      })
      .catch((err) => {
        if (!cancelled) setError(err instanceof Error ? err.message : "Failed");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [fetchKey]);

  // Apply the accent to the whole app by overriding the single --accent var.
  useEffect(() => {
    document.documentElement.style.setProperty("--accent", accentHex(settings.accent));
  }, [settings.accent]);

  const save = useCallback(
    async (patch: Partial<SiteSettings>): Promise<SiteSettings> => {
      const res = await fetch("/api/settings", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(patch),
      });
      const data = await res.json().catch(() => null);
      if (!res.ok) {
        throw new Error(
          (data && typeof data === "object" && "error" in data
            ? String((data as { error: unknown }).error)
            : null) ?? `Request failed (${res.status})`
        );
      }
      const next = mergeSettings(data);
      setSettings(next);
      return next;
    },
    []
  );

  const refresh = useCallback(() => setFetchKey((k) => k + 1), []);

  return (
    <SettingsContext.Provider value={{ settings, loading, error, save, refresh }}>
      {children}
    </SettingsContext.Provider>
  );
}

export function useSettings(): SettingsContextValue {
  const ctx = useContext(SettingsContext);
  if (!ctx) {
    throw new Error("useSettings must be used within a SettingsProvider");
  }
  return ctx;
}
