"use client";

import { ServerIcon } from "@/app/_icons";

const START_COMMAND = "cd glance && docker compose up -d";

/**
 * Shown app-wide (via DbHealthGate) when the Postgres database can't be
 * reached. Replaces the old raw "Request failed with status 500" with a clear,
 * on-brand explanation and the command to bring the database back up.
 */
export function DbOfflineNotice() {
  return (
    <div className="flex items-center justify-center min-h-[60vh] px-4">
      <div className="w-full max-w-[520px] rounded-[18px] border border-glance-border bg-glance-surface px-8 py-9 text-center shadow-[0_24px_60px_-30px_rgba(0,0,0,0.8)]">
        <div className="mx-auto mb-5 flex h-14 w-14 items-center justify-center rounded-[14px] bg-[var(--accent)]/15 text-[var(--accent)]">
          <ServerIcon />
        </div>

        <h1 className="font-[family-name:var(--font-space-grotesk)] text-[22px] font-bold tracking-[-0.4px] text-glance-primary">
          Glance database isn’t running
        </h1>

        <p className="mt-3 text-[14.5px] leading-relaxed text-glance-muted">
          The app can’t reach its Postgres database, so bookmarks and settings
          can’t load. Start the database container, then reload this page.
        </p>

        <div className="mt-6 text-left">
          <p className="mb-2 text-[12px] font-medium uppercase tracking-[0.6px] text-glance-faint">
            Start it
          </p>
          <code className="block w-full rounded-[10px] border border-glance-border bg-glance-viewport px-4 py-3 font-mono text-[13px] text-glance-primary">
            {START_COMMAND}
          </code>
        </div>
      </div>
    </div>
  );
}
