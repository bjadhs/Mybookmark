"use client";

import { useEffect, useState } from "react";
import { DbOfflineNotice } from "@/app/_components/db-offline-notice";

type DbStatus = "checking" | "ok" | "offline";

/**
 * App-wide gate that probes /api/health once on mount. While the check is in
 * flight it renders children optimistically (no flash for the common healthy
 * case); if the database is unreachable it swaps the page content for a
 * friendly DbOfflineNotice instead of letting every screen surface its own
 * raw 500 / "Request failed" error.
 */
export function DbHealthGate({ children }: { children: React.ReactNode }) {
  const [status, setStatus] = useState<DbStatus>("checking");

  useEffect(() => {
    let cancelled = false;

    fetch("/api/health")
      .then((res) => {
        if (cancelled) return;
        setStatus(res.ok ? "ok" : "offline");
      })
      .catch(() => {
        if (!cancelled) setStatus("offline");
      });

    return () => {
      cancelled = true;
    };
  }, []);

  if (status === "offline") return <DbOfflineNotice />;
  return <>{children}</>;
}
