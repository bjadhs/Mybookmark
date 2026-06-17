"use client";

import { useEffect, useState } from "react";
import type { Role } from "@/lib/types";

interface RoleState {
  role: Role;
  isAdmin: boolean;
  isSignedIn: boolean;
  loading: boolean;
}

/**
 * Reads the viewer's role from /api/me. This only drives which controls render
 * — every mutation is independently enforced on the server, so a tampered
 * client can't gain admin powers.
 */
export function useRole(): RoleState {
  const [state, setState] = useState<RoleState>({
    role: "guest",
    isAdmin: false,
    isSignedIn: false,
    loading: true,
  });

  useEffect(() => {
    let cancelled = false;

    fetch("/api/me")
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (cancelled || !data) return;
        setState({
          role: data.role as Role,
          isAdmin: Boolean(data.isAdmin),
          isSignedIn: Boolean(data.isSignedIn),
          loading: false,
        });
      })
      .catch(() => {
        if (!cancelled) setState((s) => ({ ...s, loading: false }));
      });

    return () => {
      cancelled = true;
    };
  }, []);

  return state;
}
