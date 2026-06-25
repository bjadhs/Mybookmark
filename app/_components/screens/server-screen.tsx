"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { PageSubtitle, PageTitle } from "@/app/_components/ui/typography";
import {
  CheckIcon,
  CloseIcon,
  PencilIcon,
  PlusIcon,
  ServerIcon,
  TrashIcon,
} from "@/app/_icons";
import { useRole } from "@/lib/hooks/use-role";
import { useSettings } from "@/lib/hooks/use-settings";
import { pageById } from "@/lib/settings";
import { useContainers, type ContainerDraft } from "@/lib/hooks/use-containers";
import {
  useServerLive,
  type LiveAppKind,
  type LiveContainer,
  type LiveSnapshot,
} from "@/lib/hooks/use-server-live";
import { CONTAINER_STATUSES, type ServerContainer } from "@/lib/types";

/* -------------------------------------------------------------------------- */
/*  Shared visual metadata                                                     */
/* -------------------------------------------------------------------------- */

const STATE_META: Record<string, { color: string; label: string; pulse: boolean }> = {
  running: { color: "#1ed760", label: "Running", pulse: true },
  restarting: { color: "#febc2e", label: "Restarting", pulse: true },
  paused: { color: "#9a9aab", label: "Paused", pulse: false },
  created: { color: "#9a9aab", label: "Created", pulse: false },
  exited: { color: "#ff5f57", label: "Exited", pulse: false },
  dead: { color: "#ff5f57", label: "Dead", pulse: false },
};

function stateMeta(state: string) {
  return STATE_META[state] ?? { color: "#7a7a8b", label: state, pulse: false };
}

const APP_META: Record<LiveAppKind, { label: string; tint: string }> = {
  dokploy: { label: "Dokploy", tint: "#a855f7" },
  traefik: { label: "Traefik", tint: "#24a1c1" },
  postgres: { label: "Postgres", tint: "#3b82f6" },
  redis: { label: "Redis", tint: "#ff5f57" },
  registry: { label: "Registry", tint: "#9a9aab" },
  n8n: { label: "n8n", tint: "#f472b6" },
  hermes: { label: "Hermes", tint: "#00d4ff" },
  trading: { label: "Trading", tint: "#1ed760" },
  generic: { label: "Service", tint: "#7a7a8b" },
};

/* -------------------------------------------------------------------------- */
/*  Tiny animation helper                                                      */
/* -------------------------------------------------------------------------- */

/** Counts from 0 → target whenever target changes (for the stat tiles). */
function useCountUp(target: number, ms = 650): number {
  const [value, setValue] = useState(target);
  const fromRef = useRef(target);

  useEffect(() => {
    const from = fromRef.current;
    if (from === target) return;
    const start = performance.now();
    let raf = 0;
    const step = (now: number) => {
      const t = Math.min(1, (now - start) / ms);
      const eased = 1 - Math.pow(1 - t, 3);
      setValue(Math.round(from + (target - from) * eased));
      if (t < 1) raf = requestAnimationFrame(step);
      else fromRef.current = target;
    };
    raf = requestAnimationFrame(step);
    return () => cancelAnimationFrame(raf);
  }, [target, ms]);

  return value;
}

/* -------------------------------------------------------------------------- */
/*  Root                                                                       */
/* -------------------------------------------------------------------------- */

export function ServerScreen() {
  const { isAdmin } = useRole();
  const { settings, save } = useSettings();
  const live = useServerLive();

  const title = pageById(settings, "server")?.label ?? "My Server";

  // First load, no data yet → skeleton.
  if (live.loading && !live.data) {
    return (
      <div>
        <Header title={title} />
        <div className="flex items-center justify-center h-48 text-glance-muted gap-3">
          <span className="w-4 h-4 rounded-full border-2 border-white/15 border-t-[var(--accent)] animate-glance-spin-slow" />
          Reaching the server over SSH…
        </div>
      </div>
    );
  }

  // SSH unreachable and nothing cached → fall back to the saved/curated list so
  // the page still works (e.g. a deploy with no SSH key).
  if (live.error && !live.data) {
    return (
      <div>
        <Header title={title} />
        <ManagedFallback
          isAdmin={isAdmin}
          serverName={settings.serverName}
          onRename={(n) => save({ serverName: n })}
          reason={live.error}
          onRetry={live.refresh}
        />
      </div>
    );
  }

  return (
    <div>
      <Header title={title} />
      <LiveDashboard
        snapshot={live.data!}
        refreshing={live.refreshing}
        error={live.error}
        lastUpdated={live.lastUpdated}
        auto={live.auto}
        setAuto={live.setAuto}
        onRefresh={live.refresh}
        serverName={settings.serverName}
        isAdmin={isAdmin}
        onRename={(n) => save({ serverName: n })}
      />
    </div>
  );
}

function Header({ title }: { title: string }) {
  return (
    <div className="mb-5">
      <PageTitle>{title}</PageTitle>
      <PageSubtitle>
        Live Docker fleet read straight off the box over SSH — running 24/7.
      </PageSubtitle>
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/*  Live dashboard                                                             */
/* -------------------------------------------------------------------------- */

type Filter = "all" | "running" | "stopped";

function LiveDashboard({
  snapshot,
  refreshing,
  error,
  lastUpdated,
  auto,
  setAuto,
  onRefresh,
  serverName,
  isAdmin,
  onRename,
}: {
  snapshot: LiveSnapshot;
  refreshing: boolean;
  error: string | null;
  lastUpdated: number | null;
  auto: boolean;
  setAuto: (on: boolean) => void;
  onRefresh: () => void;
  serverName: string;
  isAdmin: boolean;
  onRename: (name: string) => Promise<unknown>;
}) {
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<Filter>("all");

  const { totals, containers } = snapshot;

  const dokploy = containers.filter((c) => c.isDokploy);
  const rest = containers.filter((c) => !c.isDokploy);

  const matches = (c: LiveContainer) => {
    const q = query.trim().toLowerCase();
    if (q && !(`${c.name} ${c.image} ${c.app}`.toLowerCase().includes(q)))
      return false;
    if (filter === "running") return c.state === "running";
    if (filter === "stopped") return c.state !== "running";
    return true;
  };

  const running = rest.filter((c) => c.state === "running").filter(matches);
  const stopped = rest.filter((c) => c.state !== "running").filter(matches);
  const dokployShown = dokploy.filter(matches);

  // Dynamic meter ranges so near-idle bars still read as comparative bars.
  const maxCpu = Math.max(2, ...containers.map((c) => c.cpu));
  const maxMem = Math.max(10, ...containers.map((c) => c.mem));

  // Admins can click a card to start/stop it (via the admin deploy bridge).
  const [busy, setBusy] = useState<Set<string>>(new Set());

  const toggleContainer = async (c: LiveContainer) => {
    const running = c.state === "running";
    const action = running ? "stop-container" : "start-container";
    const verb = running ? "Stop" : "Start";
    const ok = window.confirm(
      `${verb} “${c.displayName}”?\n\nRuns: docker ${running ? "stop" : "start"} ${c.name}`
    );
    if (!ok) return;

    setBusy((prev) => new Set(prev).add(c.id));
    try {
      const res = await fetch("/api/deploy/run", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action, params: { name: c.name } }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok || data?.ok === false) {
        window.alert(
          `Couldn’t ${verb.toLowerCase()} ${c.displayName}:\n\n` +
            (data?.stderr || data?.error || `Request failed (${res.status})`)
        );
      }
    } catch (err) {
      window.alert(
        `Couldn’t ${verb.toLowerCase()} ${c.displayName}:\n\n` +
          (err instanceof Error ? err.message : "Network error")
      );
    } finally {
      setBusy((prev) => {
        const next = new Set(prev);
        next.delete(c.id);
        return next;
      });
      onRefresh();
    }
  };

  const cardProps = { isAdmin, busyIds: busy, onToggle: toggleContainer };

  return (
    <div>
      {/* Identity + controls */}
      <div className="flex flex-wrap items-center justify-between gap-3 mb-4 rounded-[14px] border border-glance-border bg-glance-surface px-4 py-3">
        <ServerIdentity
          serverName={serverName}
          isAdmin={isAdmin}
          onRename={onRename}
          host={snapshot.host}
        />
        <div className="flex items-center gap-2 shrink-0">
          <span className="hidden sm:inline text-[11px] font-mono text-glance-faint">
            {lastUpdated ? <UpdatedAgo at={lastUpdated} /> : "—"}
          </span>
          <button
            onClick={() => setAuto(!auto)}
            title={auto ? "Auto-refresh on" : "Auto-refresh off"}
            className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-[9px] text-[11.5px] font-semibold border transition-colors ${
              auto
                ? "border-glance-online/40 bg-glance-online/10 text-glance-online"
                : "border-glance-border bg-white/[0.03] text-glance-muted hover:text-glance-primary"
            }`}
          >
            <span
              className={`w-[6px] h-[6px] rounded-full ${
                auto ? "bg-glance-online animate-glance-pulse" : "bg-glance-faint"
              }`}
            />
            Live
          </button>
          <button
            onClick={onRefresh}
            className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-[9px] text-[11.5px] font-semibold text-glance-muted bg-white/[0.03] border border-glance-border hover:text-glance-primary hover:bg-white/[0.06] transition-colors"
          >
            <RefreshIcon className={`w-3.5 h-3.5 ${refreshing ? "animate-glance-spin-slow" : ""}`} />
            Refresh
          </button>
        </div>
      </div>

      {error && (
        <div className="mb-4 rounded-[12px] border border-amber-500/30 bg-amber-500/10 px-4 py-2.5 text-[12.5px] text-amber-300">
          Couldn’t refresh ({error}). Showing the last snapshot.
        </div>
      )}

      {/* Stat tiles */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-4">
        <StatTile label="Containers" value={totals.all} tint="#a855f7" />
        <StatTile label="Running" value={totals.running} tint="#1ed760" dot />
        <StatTile label="Stopped" value={totals.stopped} tint="#ff5f57" />
        <StatTile label="Stacks" value={totals.stacks} tint="#00d4ff" />
      </div>

      {/* Toolbar */}
      <div className="flex flex-wrap items-center gap-2 mb-4">
        <div className="relative flex-1 min-w-[180px]">
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Filter containers…"
            className="w-full bg-glance-surface border border-glance-border rounded-[11px] pl-3 pr-3 py-2 text-[13px] text-glance-primary outline-none focus:border-[var(--accent)] placeholder:text-glance-faint"
          />
        </div>
        {(["all", "running", "stopped"] as Filter[]).map((f) => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={`px-3 py-2 rounded-[11px] text-[12px] font-semibold capitalize border transition-colors ${
              filter === f
                ? "bg-[var(--accent)] text-white border-transparent"
                : "bg-glance-surface text-glance-muted border-glance-border hover:text-glance-primary"
            }`}
          >
            {f}
          </button>
        ))}
      </div>

      {/* Dokploy control plane */}
      {dokployShown.length > 0 && (
        <DokployPanel
          containers={dokployShown}
          maxCpu={maxCpu}
          maxMem={maxMem}
          {...cardProps}
        />
      )}

      {/* Running */}
      {running.length > 0 && (
        <Section
          title="Running"
          count={running.length}
          color="#1ed760"
          containers={running}
          maxCpu={maxCpu}
          maxMem={maxMem}
          {...cardProps}
        />
      )}

      {/* Stopped / restarting */}
      {stopped.length > 0 && (
        <Section
          title="Stopped & restarting"
          count={stopped.length}
          color="#ff5f57"
          containers={stopped}
          maxCpu={maxCpu}
          maxMem={maxMem}
          {...cardProps}
        />
      )}

      {dokployShown.length === 0 && running.length === 0 && stopped.length === 0 && (
        <div className="flex flex-col items-center justify-center py-14 px-5 mb-5 text-center border border-dashed border-white/10 rounded-[18px] bg-white/[0.015]">
          <div className="text-[15px] font-bold text-[#d4d4dd] mb-1">
            No containers match
          </div>
          <div className="text-sm text-glance-muted">
            Try a different filter or search term.
          </div>
        </div>
      )}

      <LogView containers={snapshot.containers} />
    </div>
  );
}

function ServerIdentity({
  serverName,
  isAdmin,
  onRename,
  host,
}: {
  serverName: string;
  isAdmin: boolean;
  onRename: (name: string) => Promise<unknown>;
  host: string;
}) {
  const [editing, setEditing] = useState(false);
  const [value, setValue] = useState(serverName);
  const [saving, setSaving] = useState(false);

  const commit = async () => {
    if (!value.trim() || saving) return;
    setSaving(true);
    try {
      await onRename(value.trim());
      setEditing(false);
    } catch {
      /* keep editing */
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="flex items-center gap-2.5 min-w-0">
      <span className="flex items-center justify-center w-9 h-9 rounded-[10px] bg-[var(--accent)]/15 text-[var(--accent)] shrink-0">
        <ServerIcon className="w-[18px] h-[18px]" />
      </span>
      {editing ? (
        <div className="flex items-center gap-2">
          <input
            autoFocus
            value={value}
            onChange={(e) => setValue(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") commit();
              if (e.key === "Escape") {
                setValue(serverName);
                setEditing(false);
              }
            }}
            className="bg-white/5 border border-white/10 rounded-[9px] px-3 py-1.5 text-sm text-glance-primary outline-none focus:border-[var(--accent)]"
          />
          <button
            onClick={commit}
            disabled={saving || !value.trim()}
            className="p-1.5 rounded-lg text-[var(--accent)] hover:bg-[var(--accent)]/20 transition-colors disabled:opacity-40"
          >
            <CheckIcon className="w-4 h-4" />
          </button>
        </div>
      ) : (
        <div className="flex flex-col min-w-0">
          <div className="flex items-center gap-2">
            <span className="text-[14px] font-bold text-glance-primary truncate">
              {serverName}
            </span>
            {isAdmin && (
              <button
                onClick={() => {
                  setValue(serverName);
                  setEditing(true);
                }}
                title="Rename server"
                className="p-1 rounded-md text-glance-faint hover:text-[var(--accent)] hover:bg-white/[0.05] transition-colors"
              >
                <PencilIcon className="w-[13px] h-[13px]" />
              </button>
            )}
          </div>
          <span className="text-[11px] font-mono text-glance-faint truncate">
            {host}
          </span>
        </div>
      )}
    </div>
  );
}

function UpdatedAgo({ at }: { at: number }) {
  const [secs, setSecs] = useState(0);
  useEffect(() => {
    const compute = () => setSecs(Math.max(0, Math.round((Date.now() - at) / 1000)));
    compute();
    const t = setInterval(compute, 1000);
    return () => clearInterval(t);
  }, [at]);
  const ago = secs < 60 ? `${secs}s` : `${Math.floor(secs / 60)}m`;
  return <>updated {ago} ago</>;
}

function StatTile({
  label,
  value,
  tint,
  dot,
}: {
  label: string;
  value: number;
  tint: string;
  dot?: boolean;
}) {
  const shown = useCountUp(value);
  return (
    <div className="relative overflow-hidden rounded-[14px] border border-glance-border bg-glance-surface px-4 py-3.5">
      <div
        className="absolute -right-6 -top-8 w-24 h-24 rounded-full blur-2xl opacity-20"
        style={{ background: tint }}
      />
      <div className="relative flex items-center gap-1.5 mb-1">
        {dot && (
          <span
            className="w-[6px] h-[6px] rounded-full animate-glance-pulse"
            style={{ background: tint, boxShadow: `0 0 8px ${tint}` }}
          />
        )}
        <span className="text-[10.5px] font-bold tracking-[0.6px] text-glance-faint uppercase">
          {label}
        </span>
      </div>
      <div
        className="relative font-[family-name:var(--font-space-grotesk)] text-[28px] font-bold leading-none tabular-nums"
        style={{ color: tint }}
      >
        {shown}
      </div>
    </div>
  );
}

interface CardActions {
  isAdmin: boolean;
  busyIds: Set<string>;
  onToggle: (c: LiveContainer) => void;
}

function DokployPanel({
  containers,
  maxCpu,
  maxMem,
  isAdmin,
  busyIds,
  onToggle,
}: {
  containers: LiveContainer[];
  maxCpu: number;
  maxMem: number;
} & CardActions) {
  return (
    <div className="relative mb-5 rounded-[18px] border border-[var(--accent)]/30 bg-[var(--accent)]/[0.05] p-4 shadow-[0_18px_50px_-28px_rgba(168,85,247,0.7)]">
      <div className="flex items-center gap-2 mb-3">
        <span className="flex items-center justify-center w-6 h-6 rounded-[7px] bg-[var(--accent)] text-white text-[12px] font-bold">
          ◆
        </span>
        <span className="text-[13px] font-bold text-glance-primary">
          Dokploy
        </span>
        <span className="text-[11px] font-semibold text-[var(--accent)]">
          deployment platform
        </span>
        <span className="ml-auto text-[11px] font-mono text-glance-faint">
          {containers.length} services
        </span>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
        {containers.map((c, i) => (
          <LiveCard
            key={c.id}
            c={c}
            index={i}
            maxCpu={maxCpu}
            maxMem={maxMem}
            isAdmin={isAdmin}
            busy={busyIds.has(c.id)}
            onToggle={onToggle}
          />
        ))}
      </div>
    </div>
  );
}

function Section({
  title,
  count,
  color,
  containers,
  maxCpu,
  maxMem,
  isAdmin,
  busyIds,
  onToggle,
}: {
  title: string;
  count: number;
  color: string;
  containers: LiveContainer[];
  maxCpu: number;
  maxMem: number;
} & CardActions) {
  return (
    <div className="mb-5">
      <div className="flex items-center gap-2 mb-2.5">
        <span
          className="w-[7px] h-[7px] rounded-full"
          style={{ background: color, boxShadow: `0 0 8px ${color}` }}
        />
        <h2 className="text-[12px] font-bold tracking-[0.5px] text-glance-muted uppercase">
          {title}
        </h2>
        <span className="text-[11px] font-mono text-glance-faint">{count}</span>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
        {containers.map((c, i) => (
          <LiveCard
            key={c.id}
            c={c}
            index={i}
            maxCpu={maxCpu}
            maxMem={maxMem}
            isAdmin={isAdmin}
            busy={busyIds.has(c.id)}
            onToggle={onToggle}
          />
        ))}
      </div>
    </div>
  );
}

function LiveCard({
  c,
  index,
  maxCpu,
  maxMem,
  isAdmin,
  busy,
  onToggle,
}: {
  c: LiveContainer;
  index: number;
  maxCpu: number;
  maxMem: number;
  isAdmin?: boolean;
  busy?: boolean;
  onToggle?: (c: LiveContainer) => void;
}) {
  const meta = stateMeta(c.state);
  const app = APP_META[c.app];
  const running = c.state === "running";
  const clickable = Boolean(isAdmin && onToggle && !busy);

  return (
    <div
      onClick={clickable ? () => onToggle?.(c) : undefined}
      title={
        clickable
          ? `Click to ${running ? "stop" : "start"} ${c.displayName}`
          : undefined
      }
      className={`group relative rounded-[14px] border border-glance-border bg-glance-surface p-[15px] transition-colors ${
        clickable
          ? "cursor-pointer hover:border-[var(--accent)]/50 hover:bg-white/[0.02]"
          : "hover:border-glance-border-strong"
      }`}
      style={{ animation: "glance-rise 0.5s ease both", animationDelay: `${index * 45}ms` }}
    >
      {/* Busy overlay while a start/stop is in flight */}
      {busy && (
        <div className="absolute inset-0 z-10 flex items-center justify-center gap-2 rounded-[14px] bg-black/55 backdrop-blur-[1px] text-[12px] font-semibold text-glance-primary">
          <span className="w-3.5 h-3.5 rounded-full border-2 border-white/30 border-t-white animate-glance-spin-slow" />
          {running ? "Stopping…" : "Starting…"}
        </div>
      )}

      <div className="flex items-center gap-2.5 mb-2.5">
        <span
          className="flex items-center justify-center w-8 h-8 rounded-[9px] text-[13px] font-bold shrink-0"
          style={{ background: `${app.tint}22`, color: app.tint }}
        >
          {app.label[0]}
        </span>
        <div className="min-w-0 flex-1">
          <div className="text-[13px] font-bold text-glance-primary truncate" title={c.name}>
            {c.displayName}
          </div>
          <div className="text-[11px] text-glance-muted font-mono truncate">
            {c.image || "—"}
          </div>
        </div>
        <span className="flex items-center gap-1.5 shrink-0">
          <span
            className={`w-[7px] h-[7px] rounded-full ${meta.pulse ? "animate-glance-pulse" : ""}`}
            style={{
              background: meta.color,
              boxShadow: meta.pulse ? `0 0 8px ${meta.color}` : "none",
            }}
          />
          <span
            className="text-[10px] font-bold tracking-[0.4px] uppercase"
            style={{ color: meta.color }}
          >
            {meta.label}
          </span>
        </span>
      </div>

      <div className="flex flex-wrap items-center gap-1.5 mb-3 min-h-[20px]">
        {c.ports.length > 0 ? (
          c.ports.slice(0, 4).map((p) => (
            <span
              key={p}
              className="px-1.5 py-0.5 rounded-md bg-white/[0.04] border border-glance-border text-[10.5px] font-mono text-glance-muted"
            >
              {p}
            </span>
          ))
        ) : (
          <span className="text-[10.5px] font-mono text-glance-faint">
            no published ports
          </span>
        )}
        {c.health && (
          <span
            className="px-1.5 py-0.5 rounded-md text-[10px] font-bold uppercase tracking-[0.3px]"
            style={{
              color: c.health === "healthy" ? "#1ed760" : "#febc2e",
              background: c.health === "healthy" ? "#1ed76015" : "#febc2e15",
            }}
          >
            {c.health}
          </span>
        )}
      </div>

      <Meter label="CPU" value={c.cpu} max={maxCpu} tint={app.tint} live={c.state === "running"} />
      <Meter label="MEM" value={c.mem} max={maxMem} tint={app.tint} live={c.state === "running"} />

      <div className="mt-2.5 pt-2.5 border-t border-white/[0.05] flex items-center gap-2">
        <span className="text-[10.5px] font-mono text-glance-faint truncate flex-1">
          {c.status || "—"}
        </span>
        {clickable && (
          <span
            className="shrink-0 px-1.5 py-0.5 rounded-md text-[9.5px] font-bold uppercase tracking-[0.4px] opacity-0 group-hover:opacity-100 transition-opacity"
            style={{
              color: running ? "#ff5f57" : "#1ed760",
              background: running ? "#ff5f5718" : "#1ed76018",
            }}
          >
            Click to {running ? "stop" : "start"}
          </span>
        )}
      </div>
    </div>
  );
}

function Meter({
  label,
  value,
  max,
  tint,
  live,
}: {
  label: string;
  value: number;
  max: number;
  tint: string;
  live: boolean;
}) {
  const pct = Math.min(100, Math.round((value / max) * 100));
  return (
    <div className="flex items-center gap-2.5 mb-1.5 last:mb-0">
      <span className="text-[10px] font-bold tracking-[0.5px] text-glance-faint w-7">
        {label}
      </span>
      <div className="relative flex-1 h-1.5 rounded-full bg-white/[0.06] overflow-hidden">
        <div
          className="h-full rounded-full transition-[width] duration-700"
          style={{ width: `${pct}%`, background: tint }}
        />
        {live && pct > 0 && (
          <div className="absolute inset-y-0 left-0 w-1/3 bg-gradient-to-r from-transparent via-white/30 to-transparent animate-glance-scan" />
        )}
      </div>
      <span className="text-[10.5px] font-mono text-glance-muted w-12 text-right">
        {value.toFixed(2)}%
      </span>
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/*  Live terminal log (now fed by the real container roster)                   */
/* -------------------------------------------------------------------------- */

function LogView({ containers }: { containers: LiveContainer[] }) {
  const feed = useMemo(() => buildLogFeed(containers), [containers]);
  const [lines, setLines] = useState<string[]>(() => feed.slice(0, 6));
  const idx = useRef(6);
  const scroller = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (feed.length === 0) return;
    const t = setInterval(() => {
      const next = feed[idx.current % feed.length];
      idx.current += 1;
      setLines((prev) => [...prev.slice(-40), next]);
    }, 1300);
    return () => clearInterval(t);
  }, [feed]);

  useEffect(() => {
    scroller.current?.scrollTo({ top: scroller.current.scrollHeight });
  }, [lines]);

  return (
    <div className="rounded-[14px] border border-glance-border bg-[#0a0a10] overflow-hidden">
      <div className="flex items-center gap-2 px-4 py-2.5 border-b border-glance-border bg-white/[0.02]">
        <span className="w-3 h-3 rounded-full bg-[#ff5f57]" />
        <span className="w-3 h-3 rounded-full bg-[#febc2e]" />
        <span className="w-3 h-3 rounded-full bg-[#28c840]" />
        <span className="ml-2 text-[11.5px] font-mono text-glance-muted">
          docker stats --no-stream
        </span>
      </div>
      <div
        ref={scroller}
        className="h-[210px] overflow-y-auto px-4 py-3 font-mono text-[12px] leading-[1.7]"
      >
        {lines.map((l, i) => (
          <div key={i} className="text-[#9fe6b3] whitespace-pre">
            {l}
          </div>
        ))}
        <div className="text-[#9fe6b3] whitespace-pre">
          $ <span className="animate-blink">▋</span>
        </div>
      </div>
    </div>
  );
}

function buildLogFeed(containers: LiveContainer[]): string[] {
  if (containers.length === 0) return ["no containers reporting"];
  const pad = (s: string, n: number) => (s.length > n ? s.slice(0, n) : s.padEnd(n));
  return containers.map((c) => {
    const dot = c.state === "running" ? "●" : "○";
    return `${dot} ${pad(c.displayName, 26)} cpu ${c.cpu
      .toFixed(2)
      .padStart(5)}%  mem ${c.mem.toFixed(2).padStart(5)}%  ${c.state}`;
  });
}

/* -------------------------------------------------------------------------- */
/*  Fallback: hand-curated containers (when SSH is unavailable)                */
/* -------------------------------------------------------------------------- */

const EMPTY_DRAFT: ContainerDraft = {
  name: "",
  image: "",
  port: "",
  uptime: "Up just now",
  status: "running",
  cpu: 0,
  mem: 0,
};

type EditorState =
  | { mode: "add" }
  | { mode: "edit"; container: ServerContainer }
  | null;

function ManagedFallback({
  isAdmin,
  serverName,
  onRename,
  reason,
  onRetry,
}: {
  isAdmin: boolean;
  serverName: string;
  onRename: (name: string) => Promise<unknown>;
  reason: string;
  onRetry: () => void;
}) {
  const {
    containers,
    loading,
    error,
    addContainer,
    updateContainer,
    deleteContainer,
  } = useContainers();
  const [editor, setEditor] = useState<EditorState>(null);

  const runningCount = containers.filter((c) => c.status === "running").length;

  const handleDelete = async (c: ServerContainer) => {
    if (!window.confirm(`Delete container "${c.name}"?`)) return;
    try {
      await deleteContainer(c.id);
    } catch {
      /* surfaced via hook error */
    }
  };

  return (
    <div>
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3 rounded-[12px] border border-amber-500/30 bg-amber-500/10 px-4 py-2.5">
        <span className="text-[12.5px] text-amber-200">
          Live SSH read unavailable ({reason}). Showing saved containers.
        </span>
        <button
          onClick={onRetry}
          className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-[9px] text-[11.5px] font-semibold text-amber-100 bg-amber-500/15 hover:bg-amber-500/25 transition-colors"
        >
          <RefreshIcon className="w-3.5 h-3.5" />
          Retry live
        </button>
      </div>

      <div className="flex items-center justify-between gap-3 mb-5 rounded-[14px] border border-glance-border bg-glance-surface px-4 py-3">
        <ServerIdentity
          serverName={serverName}
          isAdmin={isAdmin}
          onRename={onRename}
          host="offline snapshot"
        />
        <div className="flex items-center gap-3 shrink-0">
          <span className="text-xs font-bold tracking-[0.5px] text-glance-muted uppercase">
            {runningCount} of {containers.length} running
          </span>
          {isAdmin && (
            <button
              onClick={() => setEditor({ mode: "add" })}
              className="flex items-center gap-2 px-3 py-2 rounded-[10px] bg-[var(--accent)] text-white text-[12.5px] font-semibold cursor-pointer transition-all hover:brightness-[1.06]"
            >
              <PlusIcon className="w-3.5 h-3.5" />
              Add
            </button>
          )}
        </div>
      </div>

      {error && (
        <div className="mb-4 rounded-[12px] border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-300">
          {error}
        </div>
      )}

      {loading ? (
        <div className="flex items-center justify-center h-40 text-glance-muted">
          Loading containers…
        </div>
      ) : containers.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 px-5 mb-5 text-center border border-dashed border-white/10 rounded-[18px] bg-white/[0.015]">
          <div className="text-[17px] font-bold text-[#d4d4dd] mb-1.5">
            No containers yet
          </div>
          <div className="text-sm text-glance-muted">
            {isAdmin
              ? "Add the services running on your server to track them here."
              : "The admin hasn't added any containers yet."}
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 mb-5">
          {containers.map((c) => (
            <ManagedCard
              key={c.id}
              container={c}
              isAdmin={isAdmin}
              onEdit={() => setEditor({ mode: "edit", container: c })}
              onDelete={() => handleDelete(c)}
            />
          ))}
        </div>
      )}

      {editor && (
        <ContainerEditor
          initial={editor.mode === "edit" ? editor.container : null}
          onClose={() => setEditor(null)}
          onSubmit={async (draft) => {
            if (editor.mode === "edit") {
              await updateContainer(editor.container.id, draft);
            } else {
              await addContainer(draft);
            }
            setEditor(null);
          }}
        />
      )}
    </div>
  );
}

function ManagedCard({
  container: c,
  isAdmin,
  onEdit,
  onDelete,
}: {
  container: ServerContainer;
  isAdmin: boolean;
  onEdit: () => void;
  onDelete: () => void;
}) {
  const meta = stateMeta(c.status);
  return (
    <div className="group rounded-[14px] border border-glance-border bg-glance-surface p-[15px]">
      <div className="flex items-center justify-between gap-2 mb-2">
        <span className="text-[13.5px] font-bold text-glance-primary truncate">
          {c.name}
        </span>
        <span className="flex items-center gap-1.5 shrink-0">
          <span
            className={`w-[7px] h-[7px] rounded-full ${meta.pulse ? "animate-glance-pulse" : ""}`}
            style={{
              background: meta.color,
              boxShadow: meta.pulse ? `0 0 8px ${meta.color}` : "none",
            }}
          />
          <span
            className="text-[10.5px] font-bold tracking-[0.4px] uppercase"
            style={{ color: meta.color }}
          >
            {c.status}
          </span>
        </span>
      </div>

      <div className="text-[11.5px] text-glance-muted font-mono mb-0.5 truncate">
        {c.image || "—"}
      </div>
      <div className="text-[11px] text-glance-faint font-mono mb-3 truncate">
        {[c.port, c.uptime].filter(Boolean).join(" · ") || "—"}
      </div>

      <Meter label="CPU" value={c.cpu} max={30} tint="var(--accent)" live={c.status === "running"} />
      <Meter label="MEM" value={c.mem} max={100} tint="var(--accent)" live={c.status === "running"} />

      {isAdmin && (
        <div className="flex items-center gap-2 mt-3 pt-3 border-t border-white/[0.05] opacity-0 group-hover:opacity-100 transition-opacity">
          <button
            onClick={onEdit}
            className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-[9px] text-[11.5px] font-semibold text-glance-muted hover:text-[var(--accent)] hover:bg-[var(--accent)]/10 transition-colors"
          >
            <PencilIcon className="w-3.5 h-3.5" />
            Edit
          </button>
          <button
            onClick={onDelete}
            className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-[9px] text-[11.5px] font-semibold text-glance-muted hover:text-red-400 hover:bg-red-500/10 transition-colors"
          >
            <TrashIcon className="w-3.5 h-3.5" />
            Delete
          </button>
        </div>
      )}
    </div>
  );
}

function ContainerEditor({
  initial,
  onClose,
  onSubmit,
}: {
  initial: ServerContainer | null;
  onClose: () => void;
  onSubmit: (draft: ContainerDraft) => Promise<void>;
}) {
  const [draft, setDraft] = useState<ContainerDraft>(
    initial
      ? {
          name: initial.name,
          image: initial.image,
          port: initial.port,
          uptime: initial.uptime,
          status: initial.status,
          cpu: initial.cpu,
          mem: initial.mem,
        }
      : { ...EMPTY_DRAFT }
  );
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const set = <K extends keyof ContainerDraft>(key: K, v: ContainerDraft[K]) =>
    setDraft((d) => ({ ...d, [key]: v }));

  const submit = async () => {
    if (!draft.name.trim() || saving) return;
    setSaving(true);
    setErr(null);
    try {
      await onSubmit({
        ...draft,
        name: draft.name.trim(),
        cpu: clampNum(draft.cpu),
        mem: clampNum(draft.mem),
      });
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Failed to save");
      setSaving(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-[440px] rounded-[18px] border border-glance-border-strong bg-glance-surface p-5 shadow-[0_30px_80px_-20px_rgba(0,0,0,0.8)]"
      >
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-[family-name:var(--font-space-grotesk)] text-[18px] font-bold text-glance-primary">
            {initial ? "Edit container" : "Add container"}
          </h2>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-glance-faint hover:text-glance-primary hover:bg-white/[0.06] transition-colors"
          >
            <CloseIcon className="w-4 h-4" />
          </button>
        </div>

        <div className="flex flex-col gap-3">
          <Field label="Name">
            <input
              autoFocus
              value={draft.name}
              onChange={(e) => set("name", e.target.value)}
              placeholder="glance-web"
              className={inputClass}
            />
          </Field>

          <div className="grid grid-cols-2 gap-3">
            <Field label="Image">
              <input
                value={draft.image}
                onChange={(e) => set("image", e.target.value)}
                placeholder="postgres:16-alpine"
                className={inputClass}
              />
            </Field>
            <Field label="Port">
              <input
                value={draft.port}
                onChange={(e) => set("port", e.target.value)}
                placeholder="5432→5432"
                className={inputClass}
              />
            </Field>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <Field label="Uptime">
              <input
                value={draft.uptime}
                onChange={(e) => set("uptime", e.target.value)}
                placeholder="Up 3 days"
                className={inputClass}
              />
            </Field>
            <Field label="Status">
              <select
                value={draft.status}
                onChange={(e) => set("status", e.target.value)}
                className={`${inputClass} cursor-pointer capitalize`}
              >
                {CONTAINER_STATUSES.map((s) => (
                  <option key={s} value={s} className="bg-glance-surface capitalize">
                    {s}
                  </option>
                ))}
              </select>
            </Field>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <Field label="CPU %">
              <input
                type="number"
                min={0}
                max={100}
                value={draft.cpu}
                onChange={(e) => set("cpu", Number(e.target.value))}
                className={inputClass}
              />
            </Field>
            <Field label="MEM %">
              <input
                type="number"
                min={0}
                max={100}
                value={draft.mem}
                onChange={(e) => set("mem", Number(e.target.value))}
                className={inputClass}
              />
            </Field>
          </div>
        </div>

        {err && <div className="mt-3 text-[12.5px] text-red-400">{err}</div>}

        <div className="flex items-center justify-end gap-2 mt-5">
          <button
            onClick={onClose}
            className="px-4 py-2.5 rounded-[11px] text-sm font-semibold text-glance-muted hover:text-glance-primary hover:bg-white/[0.05] transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={submit}
            disabled={saving || !draft.name.trim()}
            className="flex items-center gap-2 px-4 py-2.5 rounded-[11px] bg-[var(--accent)] text-white text-sm font-semibold cursor-pointer transition-all hover:brightness-[1.06] disabled:opacity-40 disabled:cursor-default"
          >
            <CheckIcon className="w-4 h-4" />
            {initial ? "Save changes" : "Add container"}
          </button>
        </div>
      </div>
    </div>
  );
}

const inputClass =
  "w-full bg-white/5 border border-white/10 rounded-[10px] px-3 py-2 text-sm text-glance-primary outline-none focus:border-[var(--accent)] placeholder:text-glance-faint";

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="flex flex-col gap-1.5">
      <span className="text-[11px] font-bold tracking-[0.5px] text-glance-faint uppercase">
        {label}
      </span>
      {children}
    </label>
  );
}

function clampNum(v: number): number {
  const n = Math.round(Number(v));
  if (!Number.isFinite(n)) return 0;
  return Math.min(100, Math.max(0, n));
}

function RefreshIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M21 12a9 9 0 1 1-2.64-6.36" />
      <path d="M21 3v6h-6" />
    </svg>
  );
}
