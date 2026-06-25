"use client";

import { useState } from "react";
import { PageSubtitle, PageTitle } from "@/app/_components/ui/typography";
import {
  BellIcon,
  CheckIcon,
  CloseIcon,
  CronIcon,
  LockIcon,
  PencilIcon,
  PlusIcon,
  ServerIcon,
  TrashIcon,
} from "@/app/_icons";
import { useCron, type CronJobDraft } from "@/lib/hooks/use-cron";
import type { CronJob, CronKind } from "@/lib/types";

/** Metadata for the active job types shown in the picker. */
const KIND_META: Record<
  CronKind,
  { label: string; blurb: string; Icon: (p: { className?: string }) => React.JSX.Element }
> = {
  custom: {
    label: "Custom message",
    blurb: "An in-app notification + email, on a delay after open or a daily time.",
    Icon: BellIcon,
  },
  server_health: {
    label: "Server health report",
    blurb: "Email yourself a live server status summary every few hours.",
    Icon: ServerIcon,
  },
  visit_reminder: {
    label: "Visit reminder",
    blurb: "Email yourself a nudge to open Glance — sent when you click Send.",
    Icon: CronIcon,
  },
};

const ACTIVE_KINDS: CronKind[] = ["custom", "server_health", "visit_reminder"];

/** Types that unlock once AI is wired up — shown disabled in the picker. */
const LOCKED_TYPES = [
  {
    label: "AI news digest",
    blurb: "Auto-written AI news for your users. Unlocks after AI is added.",
  },
  {
    label: "Bookmark summaries",
    blurb: "AI summaries of new bookmarks. Coming soon.",
  },
];

function defaultDraft(kind: CronKind): CronJobDraft {
  const base = {
    kind,
    body: "",
    delayMinutes: 5,
    scheduleTime: "09:00",
    intervalHours: 6,
    sendEmail: true,
    enabled: true,
  };
  switch (kind) {
    case "server_health":
      return { ...base, title: "Server health", triggerType: "interval" };
    case "visit_reminder":
      return {
        ...base,
        title: "Come back to Glance",
        body: "A quick nudge to open Glance and check in.",
        triggerType: "manual",
      };
    default:
      return { ...base, title: "", triggerType: "delay" };
  }
}

function draftFrom(j: CronJob): CronJobDraft {
  return {
    kind: j.kind,
    title: j.title,
    body: j.body,
    triggerType: j.triggerType,
    delayMinutes: j.delayMinutes,
    scheduleTime: j.scheduleTime,
    intervalHours: j.intervalHours,
    sendEmail: j.sendEmail,
    enabled: j.enabled,
  };
}

function triggerSummary(j: CronJob): string {
  switch (j.kind) {
    case "server_health":
      return `Every ${j.intervalHours}h while you're viewing · emails you`;
    case "visit_reminder":
      return "Manual · emails you when you click Send";
    default:
      return j.triggerType === "delay"
        ? `${j.delayMinutes} min after a user opens the app`
        : `Daily at ${j.scheduleTime}`;
  }
}

type EditorState =
  | { mode: "pick" }
  | { mode: "add"; kind: CronKind }
  | { mode: "edit"; job: CronJob }
  | null;

export function CronScreen() {
  const { jobs, loading, error, addJob, updateJob, deleteJob, testJob } =
    useCron();
  const [editor, setEditor] = useState<EditorState>(null);

  const toggleEnabled = async (j: CronJob) => {
    try {
      await updateJob(j.id, { ...draftFrom(j), enabled: !j.enabled });
    } catch {
      /* surfaced via hook error */
    }
  };

  const handleDelete = async (j: CronJob) => {
    if (!window.confirm(`Delete cron job "${j.title}"?`)) return;
    try {
      await deleteJob(j.id);
    } catch {
      /* surfaced via hook error */
    }
  };

  return (
    <div>
      <div className="flex items-start justify-between gap-6 mb-5">
        <div>
          <PageTitle>Cron Jobs</PageTitle>
          <PageSubtitle>
            Schedule a message that reaches whoever&apos;s using the app — as an
            in-app notification and an email. Only you (admin) can manage these.
          </PageSubtitle>
        </div>
        <button
          onClick={() => setEditor({ mode: "pick" })}
          className="flex items-center gap-2 px-4 py-2.5 rounded-[11px] bg-[var(--accent)] text-white text-sm font-semibold cursor-pointer shadow-[0_8px_22px_-6px_rgba(168,85,247,0.5)] transition-all duration-150 hover:brightness-[1.06] hover:-translate-y-px shrink-0"
        >
          <PlusIcon className="w-4 h-4" />
          Add job
        </button>
      </div>

      {error && (
        <div className="mb-4 rounded-[12px] border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-300">
          {error}
        </div>
      )}

      {loading ? (
        <div className="flex items-center justify-center h-40 text-glance-muted">
          Loading cron jobs…
        </div>
      ) : jobs.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 px-5 text-center border border-dashed border-white/10 rounded-[18px] bg-white/[0.015]">
          <div className="text-[17px] font-bold text-[#d4d4dd] mb-1.5">
            No cron jobs yet
          </div>
          <div className="text-sm text-glance-muted">
            Click <span className="text-glance-primary font-semibold">Add job</span>{" "}
            and pick a type to get started.
          </div>
        </div>
      ) : (
        <div className="flex flex-col gap-2">
          {jobs.map((j) => (
            <CronRow
              key={j.id}
              job={j}
              onToggle={() => toggleEnabled(j)}
              onTest={() => testJob(j.id)}
              onEdit={() => setEditor({ mode: "edit", job: j })}
              onDelete={() => handleDelete(j)}
            />
          ))}
        </div>
      )}

      {editor?.mode === "pick" && (
        <TypePicker
          onClose={() => setEditor(null)}
          onPick={(kind) => setEditor({ mode: "add", kind })}
        />
      )}

      {editor && editor.mode !== "pick" && (
        <CronEditor
          initial={editor.mode === "edit" ? editor.job : null}
          kind={editor.mode === "edit" ? editor.job.kind : editor.kind}
          onClose={() => setEditor(null)}
          onSubmit={async (draft) => {
            if (editor.mode === "edit") {
              await updateJob(editor.job.id, draft);
            } else {
              await addJob(draft);
            }
            setEditor(null);
          }}
        />
      )}
    </div>
  );
}

function TypePicker({
  onClose,
  onPick,
}: {
  onClose: () => void;
  onPick: (kind: CronKind) => void;
}) {
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-[480px] rounded-[18px] border border-glance-border-strong bg-glance-surface p-5 shadow-[0_30px_80px_-20px_rgba(0,0,0,0.8)]"
      >
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-[family-name:var(--font-space-grotesk)] text-[18px] font-bold text-glance-primary">
            Choose a job type
          </h2>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-glance-faint hover:text-glance-primary hover:bg-white/[0.06] transition-colors"
          >
            <CloseIcon className="w-4 h-4" />
          </button>
        </div>

        <div className="flex flex-col gap-2">
          {ACTIVE_KINDS.map((kind) => {
            const { label, blurb, Icon } = KIND_META[kind];
            return (
              <button
                key={kind}
                onClick={() => onPick(kind)}
                className="group flex items-start gap-3 text-left rounded-[14px] border border-glance-border bg-white/[0.015] px-4 py-3 cursor-pointer transition-all duration-150 hover:border-[var(--accent)]/45 hover:bg-white/[0.03]"
              >
                <span className="flex items-center justify-center w-9 h-9 rounded-[10px] bg-[var(--accent)]/15 text-[var(--accent)] shrink-0">
                  <Icon className="w-[18px] h-[18px]" />
                </span>
                <span className="min-w-0">
                  <span className="block text-[14px] font-semibold text-glance-primary group-hover:text-[var(--accent)] transition-colors">
                    {label}
                  </span>
                  <span className="block text-[12px] text-glance-muted mt-0.5">
                    {blurb}
                  </span>
                </span>
              </button>
            );
          })}

          <div className="text-[11px] font-bold tracking-[0.6px] text-glance-faint uppercase px-1 pt-2">
            After AI
          </div>
          {LOCKED_TYPES.map((t) => (
            <div
              key={t.label}
              title="Unlocks after AI is added"
              className="flex items-start gap-3 rounded-[14px] border border-dashed border-white/[0.08] bg-white/[0.008] px-4 py-3 cursor-not-allowed opacity-60"
            >
              <span className="flex items-center justify-center w-9 h-9 rounded-[10px] bg-white/[0.04] text-glance-faint shrink-0">
                <LockIcon className="w-3.5 h-3.5" />
              </span>
              <span className="min-w-0">
                <span className="block text-[14px] font-semibold text-glance-muted">
                  {t.label}
                </span>
                <span className="block text-[12px] text-glance-faint mt-0.5">
                  {t.blurb}
                </span>
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function CronRow({
  job: j,
  onToggle,
  onTest,
  onEdit,
  onDelete,
}: {
  job: CronJob;
  onToggle: () => void;
  onTest: () => void;
  onEdit: () => void;
  onDelete: () => void;
}) {
  const [testState, setTestState] = useState<"idle" | "sending" | "sent">("idle");
  const sendLabel = j.kind === "visit_reminder" ? "Send" : "Send test";

  const runTest = async () => {
    if (testState === "sending") return;
    setTestState("sending");
    try {
      await onTest();
      setTestState("sent");
      setTimeout(() => setTestState("idle"), 2000);
    } catch {
      setTestState("idle");
    }
  };

  return (
    <div className="group flex flex-col sm:flex-row sm:items-center gap-x-3 gap-y-3 rounded-[14px] border border-glance-border bg-glance-surface px-4 py-3 transition-all duration-150 hover:border-[var(--accent)]/45 hover:bg-white/[0.025]">
      {/* Identity */}
      <div className="min-w-0 sm:flex-1">
        <div className="flex items-center gap-2">
          <span
            className={`text-[14px] font-semibold truncate ${
              j.enabled ? "text-glance-primary" : "text-glance-muted"
            }`}
          >
            {j.title}
          </span>
          <span className="shrink-0 text-[10.5px] font-bold tracking-[0.4px] uppercase text-[var(--accent)] bg-[var(--accent)]/12 border border-[var(--accent)]/25 px-[7px] py-[2px] rounded-[6px]">
            {KIND_META[j.kind].label}
          </span>
        </div>
        <div className="text-[12px] text-glance-faint truncate mt-0.5">
          {triggerSummary(j)}
          {j.kind !== "server_health" && j.body ? ` · ${j.body}` : ""}
        </div>
      </div>

      {/* Enabled toggle */}
      <button
        onClick={onToggle}
        title={j.enabled ? "Enabled — click to pause" : "Paused — click to enable"}
        className={`shrink-0 relative w-10 h-[22px] rounded-full transition-colors ${
          j.enabled ? "bg-[var(--accent)]" : "bg-white/10"
        }`}
      >
        <span
          className={`absolute top-[3px] w-4 h-4 rounded-full bg-white transition-all ${
            j.enabled ? "left-[21px]" : "left-[3px]"
          }`}
        />
      </button>

      {/* Actions */}
      <div className="flex items-center gap-1 shrink-0">
        <button
          onClick={runTest}
          disabled={testState === "sending"}
          title="Send this to yourself now"
          className="px-2.5 py-1.5 rounded-lg text-[12px] font-semibold text-glance-muted hover:text-[var(--accent)] hover:bg-[var(--accent)]/10 transition-colors disabled:opacity-50"
        >
          {testState === "sent"
            ? "Sent ✓"
            : testState === "sending"
              ? "Sending…"
              : sendLabel}
        </button>
        <button
          onClick={onEdit}
          title="Edit"
          className="p-1.5 rounded-lg text-glance-muted hover:text-[var(--accent)] hover:bg-[var(--accent)]/10 transition-colors"
        >
          <PencilIcon className="w-3.5 h-3.5" />
        </button>
        <button
          onClick={onDelete}
          title="Delete"
          className="p-1.5 rounded-lg text-glance-muted hover:text-red-400 hover:bg-red-500/10 transition-colors"
        >
          <TrashIcon className="w-3.5 h-3.5" />
        </button>
      </div>
    </div>
  );
}

const inputClass =
  "w-full bg-white/5 border border-white/10 rounded-[10px] px-3 py-2 text-sm text-glance-primary outline-none focus:border-[var(--accent)] placeholder:text-glance-faint";

function CronEditor({
  initial,
  kind,
  onClose,
  onSubmit,
}: {
  initial: CronJob | null;
  kind: CronKind;
  onClose: () => void;
  onSubmit: (draft: CronJobDraft) => Promise<void>;
}) {
  const [draft, setDraft] = useState<CronJobDraft>(
    initial ? draftFrom(initial) : defaultDraft(kind)
  );
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const set = <K extends keyof CronJobDraft>(key: K, v: CronJobDraft[K]) =>
    setDraft((d) => ({ ...d, [key]: v }));

  const submit = async () => {
    if (!draft.title.trim() || saving) return;
    setSaving(true);
    setErr(null);
    try {
      await onSubmit({
        ...draft,
        title: draft.title.trim(),
        body: draft.body.trim(),
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
        className="w-full max-w-[460px] rounded-[18px] border border-glance-border-strong bg-glance-surface p-5 shadow-[0_30px_80px_-20px_rgba(0,0,0,0.8)]"
      >
        <div className="flex items-center justify-between mb-1">
          <h2 className="font-[family-name:var(--font-space-grotesk)] text-[18px] font-bold text-glance-primary">
            {initial ? "Edit" : "New"} · {KIND_META[kind].label}
          </h2>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-glance-faint hover:text-glance-primary hover:bg-white/[0.06] transition-colors"
          >
            <CloseIcon className="w-4 h-4" />
          </button>
        </div>
        <p className="text-[12px] text-glance-muted mb-4">
          {KIND_META[kind].blurb}
        </p>

        <div className="flex flex-col gap-3">
          <Field label="Title">
            <input
              autoFocus
              value={draft.title}
              onChange={(e) => set("title", e.target.value)}
              placeholder={
                kind === "server_health" ? "Server health" : "Today's update"
              }
              className={inputClass}
            />
          </Field>

          {/* Server health: just the interval. Content is generated live. */}
          {kind === "server_health" && (
            <Field label="Send every (hours)">
              <input
                type="number"
                min={1}
                max={168}
                value={draft.intervalHours}
                onChange={(e) =>
                  set("intervalHours", Number(e.target.value) || 1)
                }
                className={inputClass}
              />
            </Field>
          )}

          {/* Custom + visit reminder both carry a written message. */}
          {kind !== "server_health" && (
            <Field label="Message">
              <textarea
                value={draft.body}
                onChange={(e) => set("body", e.target.value)}
                placeholder="The text delivered in the notification and email…"
                rows={3}
                className={`${inputClass} resize-none`}
              />
            </Field>
          )}

          {/* Custom: choose delay vs daily schedule. */}
          {kind === "custom" && (
            <>
              <Field label="Trigger">
                <select
                  value={draft.triggerType}
                  onChange={(e) =>
                    set(
                      "triggerType",
                      e.target.value as CronJobDraft["triggerType"]
                    )
                  }
                  className={`${inputClass} cursor-pointer`}
                >
                  <option value="delay" className="bg-glance-surface">
                    Minutes after a user opens the app
                  </option>
                  <option value="schedule" className="bg-glance-surface">
                    Daily at a set time
                  </option>
                </select>
              </Field>

              {draft.triggerType === "delay" ? (
                <Field label="Delay (minutes after open)">
                  <input
                    type="number"
                    min={1}
                    max={1440}
                    value={draft.delayMinutes}
                    onChange={(e) =>
                      set("delayMinutes", Number(e.target.value) || 1)
                    }
                    className={inputClass}
                  />
                </Field>
              ) : (
                <Field label="Time of day (24-hour)">
                  <input
                    type="time"
                    value={draft.scheduleTime}
                    onChange={(e) => set("scheduleTime", e.target.value)}
                    className={inputClass}
                  />
                </Field>
              )}
            </>
          )}

          <div className="flex flex-col gap-2 pt-1">
            {/* Health + reminder always email you; only custom is optional. */}
            {kind === "custom" ? (
              <label className="flex items-center gap-2.5 cursor-pointer">
                <input
                  type="checkbox"
                  checked={draft.sendEmail}
                  onChange={(e) => set("sendEmail", e.target.checked)}
                  className="w-4 h-4 accent-[var(--accent)]"
                />
                <span className="text-[13px] text-glance-primary">
                  Also send an email
                </span>
              </label>
            ) : (
              <div className="text-[12px] text-glance-muted">
                {kind === "visit_reminder"
                  ? "Sent to your admin email when you click Send."
                  : "Emails the live server status to your admin email."}
              </div>
            )}
            <label className="flex items-center gap-2.5 cursor-pointer">
              <input
                type="checkbox"
                checked={draft.enabled}
                onChange={(e) => set("enabled", e.target.checked)}
                className="w-4 h-4 accent-[var(--accent)]"
              />
              <span className="text-[13px] text-glance-primary">Enabled</span>
            </label>
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
            disabled={saving || !draft.title.trim()}
            className="flex items-center gap-2 px-4 py-2.5 rounded-[11px] bg-[var(--accent)] text-white text-sm font-semibold cursor-pointer transition-all hover:brightness-[1.06] disabled:opacity-40 disabled:cursor-default"
          >
            <CheckIcon className="w-4 h-4" />
            {initial ? "Save changes" : "Add job"}
          </button>
        </div>
      </div>
    </div>
  );
}

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
