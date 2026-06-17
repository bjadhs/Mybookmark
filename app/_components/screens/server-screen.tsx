"use client";

import { useEffect, useRef, useState } from "react";
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
import { CONTAINER_STATUSES, type ServerContainer } from "@/lib/types";

// The terminal feed is intentionally a static sample (per spec — "the running
// log view is fine"). It's flavor, not live data.
const LOG_LINES = [
  "postgres   | LOG:  database system is ready to accept connections",
  "postgres   | LOG:  checkpoint starting: time",
  "web        | ▲ Next.js 16.0.0  -  ready on http://0.0.0.0:3200",
  "web        | GET /  200 in 41ms",
  "web        | GET /api/bookmarks  200 in 18ms",
  "redis      | * Background saving started by pid 41",
  "redis      | * Background saving terminated with success",
  "web        | GET /api/state  200 in 7ms",
  "postgres   | LOG:  checkpoint complete: wrote 12 buffers",
  "web        | POST /api/bookmarks  201 in 63ms",
];

const STATUS_META: Record<string, { color: string; pulse: boolean }> = {
  running: { color: "#1ed760", pulse: true },
  restarting: { color: "#febc2e", pulse: true },
  paused: { color: "#9a9aab", pulse: false },
  stopped: { color: "#ff5f57", pulse: false },
  exited: { color: "#ff5f57", pulse: false },
};

function statusMeta(status: string) {
  return STATUS_META[status] ?? STATUS_META.running;
}

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

export function ServerScreen() {
  const { isAdmin } = useRole();
  const { settings, save } = useSettings();
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
      <div className="flex items-start justify-between gap-6 mb-5">
        <div>
          <PageTitle>{pageById(settings, "server")?.label ?? "My Server"}</PageTitle>
          <PageSubtitle>
            Live status of the Docker stack powering Glance — kept running 24/7.
          </PageSubtitle>
        </div>
        {isAdmin && (
          <button
            onClick={() => setEditor({ mode: "add" })}
            className="flex items-center gap-2 px-4 py-2.5 rounded-[11px] bg-[var(--accent)] text-white text-sm font-semibold cursor-pointer shadow-[0_8px_22px_-6px_rgba(168,85,247,0.5)] transition-all duration-150 hover:brightness-[1.06] hover:-translate-y-px shrink-0"
          >
            <PlusIcon className="w-4 h-4" />
            Add container
          </button>
        )}
      </div>

      {/* Server identity bar — admin can rename the box inline. */}
      <ServerIdentityBar
        serverName={settings.serverName}
        isAdmin={isAdmin}
        running={runningCount}
        total={containers.length}
        onRename={(name) => save({ serverName: name })}
      />

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
            <ContainerCard
              key={c.id}
              container={c}
              isAdmin={isAdmin}
              onEdit={() => setEditor({ mode: "edit", container: c })}
              onDelete={() => handleDelete(c)}
            />
          ))}
        </div>
      )}

      <LogView />

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

function ServerIdentityBar({
  serverName,
  isAdmin,
  running,
  total,
  onRename,
}: {
  serverName: string;
  isAdmin: boolean;
  running: number;
  total: number;
  onRename: (name: string) => Promise<unknown>;
}) {
  const [editing, setEditing] = useState(false);
  const [value, setValue] = useState(serverName);
  const [saving, setSaving] = useState(false);

  const startEdit = () => {
    setValue(serverName);
    setEditing(true);
  };

  const commit = async () => {
    if (!value.trim() || saving) return;
    setSaving(true);
    try {
      await onRename(value.trim());
      setEditing(false);
    } catch {
      /* keep editing open */
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="flex flex-wrap items-center justify-between gap-3 mb-5 rounded-[14px] border border-glance-border bg-glance-surface px-4 py-3">
      <div className="flex items-center gap-2.5 min-w-0">
        <span className="flex items-center justify-center w-8 h-8 rounded-[9px] bg-[var(--accent)]/15 text-[var(--accent)] shrink-0">
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
          <div className="flex items-center gap-2 min-w-0">
            <div className="flex flex-col min-w-0">
              <span className="text-[10px] font-bold tracking-[0.6px] text-glance-faint uppercase">
                Server
              </span>
              <span className="text-[14px] font-bold text-glance-primary truncate">
                {serverName}
              </span>
            </div>
            {isAdmin && (
              <button
                onClick={startEdit}
                title="Rename server"
                className="p-1.5 rounded-lg text-glance-faint hover:text-[var(--accent)] hover:bg-white/[0.05] transition-colors"
              >
                <PencilIcon className="w-[14px] h-[14px]" />
              </button>
            )}
          </div>
        )}
      </div>

      <div className="flex items-center gap-2 shrink-0">
        <span
          className={`w-[7px] h-[7px] rounded-full ${
            running > 0
              ? "bg-glance-online shadow-[0_0_8px_#1ed760] animate-glance-pulse"
              : "bg-glance-faint"
          }`}
        />
        <span className="text-xs font-bold tracking-[0.5px] text-glance-muted uppercase">
          {running} of {total} running
        </span>
      </div>
    </div>
  );
}

function ContainerCard({
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
  const meta = statusMeta(c.status);
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

      <Meter label="CPU" value={c.cpu} max={30} />
      <Meter label="MEM" value={c.mem} max={100} />

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

function Field({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
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

function LogView() {
  const [lines, setLines] = useState<string[]>(LOG_LINES.slice(0, 5));
  const idx = useRef(5);
  const scroller = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const t = setInterval(() => {
      const next = LOG_LINES[idx.current % LOG_LINES.length];
      idx.current += 1;
      setLines((prev) => [...prev.slice(-40), next]);
    }, 1400);
    return () => clearInterval(t);
  }, []);

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
          docker compose logs -f
        </span>
      </div>
      <div
        ref={scroller}
        className="h-[230px] overflow-y-auto px-4 py-3 font-mono text-[12px] leading-[1.7]"
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

function Meter({
  label,
  value,
  max,
}: {
  label: string;
  value: number;
  max: number;
}) {
  const pct = Math.min(100, Math.round((value / max) * 100));
  return (
    <div className="flex items-center gap-2.5 mb-1.5 last:mb-0">
      <span className="text-[10px] font-bold tracking-[0.5px] text-glance-faint w-7">
        {label}
      </span>
      <div className="flex-1 h-1.5 rounded-full bg-white/[0.06] overflow-hidden">
        <div
          className="h-full rounded-full bg-[var(--accent)] transition-[width] duration-700"
          style={{ width: `${pct}%` }}
        />
      </div>
      <span className="text-[10.5px] font-mono text-glance-muted w-9 text-right">
        {value}%
      </span>
    </div>
  );
}
