"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useAuth } from "@clerk/nextjs";
import { BellIcon, CloseIcon } from "@/app/_icons";
import { useCronRunner } from "@/lib/hooks/use-cron-runner";
import type { Notification } from "@/lib/types";

interface Toast {
  id: string;
  title: string;
  body: string;
}

const TOAST_TTL = 8000;

/**
 * App-wide notification surface for signed-in users. It runs the client cron
 * evaluator and pops a toast (bottom-right, out of the way of page headers)
 * whenever a job fires. Delivery is always to the current viewer, so a toast
 * lands exactly when they're looking — no persistent bell/inbox needed.
 * Renders nothing for guests.
 */
export function NotificationRuntime() {
  const { isSignedIn } = useAuth();
  const enabled = isSignedIn === true;

  const [toasts, setToasts] = useState<Toast[]>([]);
  const timers = useRef<Record<string, ReturnType<typeof setTimeout>>>({});

  const dismissToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
    const timer = timers.current[id];
    if (timer) {
      clearTimeout(timer);
      delete timers.current[id];
    }
  }, []);

  const pushToast = useCallback(
    (n: Notification) => {
      setToasts((prev) => [...prev, { id: n.id, title: n.title, body: n.body }]);
      timers.current[n.id] = setTimeout(() => dismissToast(n.id), TOAST_TTL);
    },
    [dismissToast]
  );

  useCronRunner(enabled, pushToast);

  useEffect(() => {
    const map = timers.current;
    return () => {
      Object.values(map).forEach(clearTimeout);
    };
  }, []);

  if (!enabled || toasts.length === 0) return null;

  return (
    <div className="fixed bottom-6 right-6 z-50 flex flex-col gap-2 w-[330px] max-w-[calc(100vw-3rem)] pointer-events-none">
      {toasts.map((t) => (
        <div
          key={t.id}
          style={{ animation: "glance-rise 0.25s ease both" }}
          className="pointer-events-auto rounded-[14px] border border-[var(--accent)]/30 bg-[rgba(19,19,27,0.95)] backdrop-blur-md px-4 py-3 shadow-[0_18px_50px_-12px_rgba(0,0,0,0.7)]"
        >
          <div className="flex items-start justify-between gap-2">
            <div className="flex items-center gap-2 min-w-0">
              <BellIcon className="w-4 h-4 text-[var(--accent)] shrink-0" />
              <span className="text-[13px] font-bold text-glance-primary truncate">
                {t.title}
              </span>
            </div>
            <button
              onClick={() => dismissToast(t.id)}
              className="p-0.5 rounded text-glance-faint hover:text-glance-primary shrink-0"
            >
              <CloseIcon className="w-3.5 h-3.5" />
            </button>
          </div>
          {t.body && (
            <div className="text-[12px] text-glance-muted mt-1 whitespace-pre-wrap break-words">
              {t.body}
            </div>
          )}
        </div>
      ))}
    </div>
  );
}
