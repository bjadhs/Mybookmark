"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { PageSubtitle, PageTitle } from "@/app/_components/ui/typography";
import { ProjectProgress } from "@/app/_components/ui/project-progress";
import {
  ArrowUpRightIcon,
  CheckIcon,
  CloseIcon,
  PencilIcon,
  PlusIcon,
  TrashIcon,
} from "@/app/_icons";
import { useProjects, type ProjectDraft } from "@/lib/hooks/use-projects";
import {
  PROJECT_STATUSES,
  PROJECT_TAGS,
  type Project,
  type ProjectStatus,
} from "@/lib/types";

const STATUS_META: Record<ProjectStatus, { label: string; color: string }> = {
  todo: { label: "To do", color: "#9a9aab" },
  in_progress: { label: "In progress", color: "#febc2e" },
  done: { label: "Done", color: "#1ed760" },
};

const TAG_LABEL: Record<string, string> = {
  agentic: "Agentic",
  book: "Book",
  project: "Project",
};

const EMPTY_DRAFT: ProjectDraft = {
  title: "",
  tag: "",
  status: "todo",
  notes: "",
  completion: 0,
};

type EditorState =
  | { mode: "add" }
  | { mode: "edit"; project: Project }
  | null;

type StatusFilter = "all" | ProjectStatus;

export function ProjectsScreen() {
  const {
    projects,
    loading,
    error,
    addProject,
    updateProject,
    deleteProject,
  } = useProjects();
  const [editor, setEditor] = useState<EditorState>(null);
  const [filter, setFilter] = useState<StatusFilter>("all");

  const doneCount = projects.filter((p) => p.status === "done").length;
  const totalSteps = projects.reduce((sum, p) => sum + p.completion, 0);
  const avgPct = projects.length
    ? Math.round((totalSteps / (projects.length * 10)) * 100)
    : 0;

  const visible = useMemo(
    () => (filter === "all" ? projects : projects.filter((p) => p.status === filter)),
    [projects, filter]
  );

  const draftFrom = (p: Project): ProjectDraft => ({
    title: p.title,
    tag: p.tag,
    status: p.status,
    notes: p.notes,
    completion: p.completion,
  });

  const handleStatus = async (p: Project, status: ProjectStatus) => {
    if (p.status === status) return;
    try {
      await updateProject(p.id, { ...draftFrom(p), status });
    } catch {
      /* surfaced via hook error */
    }
  };

  // Setting progress nudges the status: full = done, dropping below full from
  // "done" reverts to in-progress. Otherwise the status is left as the admin set it.
  const handleCompletion = async (p: Project, completion: number) => {
    if (p.completion === completion) return;
    const status: ProjectStatus =
      completion >= 10
        ? "done"
        : p.status === "done"
          ? "in_progress"
          : p.status;
    try {
      await updateProject(p.id, { ...draftFrom(p), completion, status });
    } catch {
      /* surfaced via hook error */
    }
  };

  const handleDelete = async (p: Project) => {
    if (!window.confirm(`Delete project "${p.title}"?`)) return;
    try {
      await deleteProject(p.id);
    } catch {
      /* surfaced via hook error */
    }
  };

  return (
    <div>
      <div className="flex items-start justify-between gap-6 mb-5">
        <div>
          <PageTitle>My Projects</PageTitle>
          <PageSubtitle>
            Private work tracker — only you (admin) can see this board.
          </PageSubtitle>
        </div>
        <button
          onClick={() => setEditor({ mode: "add" })}
          className="flex items-center gap-2 px-4 py-2.5 rounded-[11px] bg-[var(--accent)] text-white text-sm font-semibold cursor-pointer shadow-[0_8px_22px_-6px_rgba(168,85,247,0.5)] transition-all duration-150 hover:brightness-[1.06] hover:-translate-y-px shrink-0"
        >
          <PlusIcon className="w-4 h-4" />
          Add project
        </button>
      </div>

      {/* Overall summary (aggregate of every project's individual bar) */}
      <div className="flex flex-wrap items-center justify-between gap-3 mb-5 rounded-[14px] border border-glance-border bg-glance-surface px-4 py-3">
        <div className="flex items-center gap-3 min-w-0 flex-1">
          <span className="text-[11px] font-bold uppercase tracking-[0.5px] text-glance-faint shrink-0">
            Overall
          </span>
          <div className="flex-1 h-2 rounded-full bg-white/[0.06] overflow-hidden min-w-[120px]">
            <div
              className="h-full rounded-full bg-[var(--accent)] transition-[width] duration-700"
              style={{ width: `${avgPct}%` }}
            />
          </div>
          <span className="text-[11px] font-mono text-glance-muted shrink-0">
            {avgPct}% · {doneCount}/{projects.length} done
          </span>
        </div>
        <div className="flex items-center gap-1.5 shrink-0">
          {(["all", ...PROJECT_STATUSES] as StatusFilter[]).map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`px-2.5 py-1 rounded-[8px] text-[11.5px] font-semibold transition-colors ${
                filter === f
                  ? "bg-[var(--accent)]/20 text-[var(--accent)]"
                  : "text-glance-muted hover:text-glance-primary hover:bg-white/[0.05]"
              }`}
            >
              {f === "all" ? "All" : STATUS_META[f].label}
            </button>
          ))}
        </div>
      </div>

      {error && (
        <div className="mb-4 rounded-[12px] border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-300">
          {error}
        </div>
      )}

      {loading ? (
        <div className="flex items-center justify-center h-40 text-glance-muted">
          Loading projects…
        </div>
      ) : visible.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 px-5 text-center border border-dashed border-white/10 rounded-[18px] bg-white/[0.015]">
          <div className="text-[17px] font-bold text-[#d4d4dd] mb-1.5">
            {projects.length === 0 ? "No projects yet" : "Nothing here"}
          </div>
          <div className="text-sm text-glance-muted">
            {projects.length === 0
              ? "Add your first project to start tracking it."
              : "No projects match this filter."}
          </div>
        </div>
      ) : (
        <div className="flex flex-col gap-2">
          {visible.map((p) => (
            <ProjectRow
              key={p.id}
              project={p}
              onStatus={(s) => handleStatus(p, s)}
              onCompletion={(c) => handleCompletion(p, c)}
              onEdit={() => setEditor({ mode: "edit", project: p })}
              onDelete={() => handleDelete(p)}
            />
          ))}
        </div>
      )}

      {editor && (
        <ProjectEditor
          initial={editor.mode === "edit" ? editor.project : null}
          onClose={() => setEditor(null)}
          onSubmit={async (draft) => {
            if (editor.mode === "edit") {
              await updateProject(editor.project.id, draft);
            } else {
              await addProject(draft);
            }
            setEditor(null);
          }}
        />
      )}
    </div>
  );
}

function ProjectRow({
  project: p,
  onStatus,
  onCompletion,
  onEdit,
  onDelete,
}: {
  project: Project;
  onStatus: (status: ProjectStatus) => void;
  onCompletion: (completion: number) => void;
  onEdit: () => void;
  onDelete: () => void;
}) {
  const router = useRouter();
  const meta = STATUS_META[p.status];
  // Controls live inside a clickable card — stop their clicks from navigating.
  const stop = (e: React.MouseEvent) => e.stopPropagation();

  return (
    <div
      role="link"
      tabIndex={0}
      onClick={() => router.push(`/projects/${p.id}`)}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          router.push(`/projects/${p.id}`);
        }
      }}
      title="Open project & game"
      className="group flex flex-col sm:flex-row sm:items-center gap-x-3 gap-y-3 rounded-[14px] border border-glance-border bg-glance-surface px-4 py-3 cursor-pointer transition-all duration-150 hover:border-[var(--accent)]/45 hover:bg-white/[0.025] focus:outline-none focus-visible:border-[var(--accent)]"
    >
      {/* Identity (number + title + tag + notes) */}
      <div className="flex items-center gap-3 min-w-0 sm:flex-1">
        <span className="flex items-center justify-center w-7 h-7 rounded-[8px] bg-white/[0.04] text-[12px] font-bold text-glance-muted shrink-0">
          {p.position}
        </span>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <span
              className={`inline-flex items-center gap-1 text-[14px] font-semibold truncate ${
                p.status === "done"
                  ? "text-glance-muted line-through"
                  : "text-glance-primary"
              } group-hover:text-[var(--accent)] transition-colors`}
            >
              <span className="truncate">{p.title}</span>
              <ArrowUpRightIcon className="w-3.5 h-3.5 shrink-0 opacity-0 -translate-x-1 transition-all group-hover:opacity-100 group-hover:translate-x-0" />
            </span>
            {p.tag && (
              <span className="shrink-0 text-[10.5px] font-bold tracking-[0.4px] uppercase text-[var(--accent)] bg-[var(--accent)]/12 border border-[var(--accent)]/25 px-[7px] py-[2px] rounded-[6px]">
                {TAG_LABEL[p.tag] ?? p.tag}
              </span>
            )}
          </div>
          {p.notes && (
            <div className="text-[12px] text-glance-faint truncate mt-0.5">
              {p.notes}
            </div>
          )}
        </div>
      </div>

      {/* Individual completion stepper — middle on big screens, own line on small */}
      <div
        onClick={stop}
        className="sm:w-[260px] sm:shrink-0 order-last sm:order-none"
      >
        <ProjectProgress value={p.completion} onChange={onCompletion} stepper />
      </div>

      {/* Status + actions */}
      <div onClick={stop} className="flex items-center gap-2 shrink-0">
        <select
          value={p.status}
          onChange={(e) => onStatus(e.target.value as ProjectStatus)}
          className="bg-white/5 border border-white/10 rounded-[9px] px-2.5 py-1.5 text-[12px] font-semibold outline-none cursor-pointer focus:border-[var(--accent)]"
          style={{ color: meta.color }}
          title="Change status"
        >
          {PROJECT_STATUSES.map((s) => (
            <option key={s} value={s} className="bg-glance-surface text-glance-primary">
              {STATUS_META[s].label}
            </option>
          ))}
        </select>

        <div className="flex items-center gap-1 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity">
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
    </div>
  );
}

const inputClass =
  "w-full bg-white/5 border border-white/10 rounded-[10px] px-3 py-2 text-sm text-glance-primary outline-none focus:border-[var(--accent)] placeholder:text-glance-faint";

function ProjectEditor({
  initial,
  onClose,
  onSubmit,
}: {
  initial: Project | null;
  onClose: () => void;
  onSubmit: (draft: ProjectDraft) => Promise<void>;
}) {
  const [draft, setDraft] = useState<ProjectDraft>(
    initial
      ? {
          title: initial.title,
          tag: initial.tag,
          status: initial.status,
          notes: initial.notes,
          completion: initial.completion,
        }
      : { ...EMPTY_DRAFT }
  );
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const set = <K extends keyof ProjectDraft>(key: K, v: ProjectDraft[K]) =>
    setDraft((d) => ({ ...d, [key]: v }));

  const submit = async () => {
    if (!draft.title.trim() || saving) return;
    setSaving(true);
    setErr(null);
    try {
      await onSubmit({ ...draft, title: draft.title.trim(), notes: draft.notes.trim() });
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
            {initial ? "Edit project" : "Add project"}
          </h2>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-glance-faint hover:text-glance-primary hover:bg-white/[0.06] transition-colors"
          >
            <CloseIcon className="w-4 h-4" />
          </button>
        </div>

        <div className="flex flex-col gap-3">
          <Field label="Title">
            <input
              autoFocus
              value={draft.title}
              onChange={(e) => set("title", e.target.value)}
              placeholder="Resume CV Agent"
              className={inputClass}
            />
          </Field>

          <div className="grid grid-cols-2 gap-3">
            <Field label="Tag">
              <select
                value={draft.tag}
                onChange={(e) => set("tag", e.target.value as ProjectDraft["tag"])}
                className={`${inputClass} cursor-pointer`}
              >
                {PROJECT_TAGS.map((t) => (
                  <option key={t || "none"} value={t} className="bg-glance-surface">
                    {t ? TAG_LABEL[t] : "No tag"}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="Status">
              <select
                value={draft.status}
                onChange={(e) =>
                  set("status", e.target.value as ProjectDraft["status"])
                }
                className={`${inputClass} cursor-pointer`}
              >
                {PROJECT_STATUSES.map((s) => (
                  <option key={s} value={s} className="bg-glance-surface">
                    {STATUS_META[s].label}
                  </option>
                ))}
              </select>
            </Field>
          </div>

          <Field label={`Progress — ${draft.completion}/10`}>
            <div className="pt-1">
              <ProjectProgress
                value={draft.completion}
                onChange={(c) => set("completion", c)}
                size="lg"
                stepper
                showLabel={false}
              />
            </div>
          </Field>

          <Field label="Notes">
            <textarea
              value={draft.notes}
              onChange={(e) => set("notes", e.target.value)}
              placeholder="Optional notes…"
              rows={3}
              className={`${inputClass} resize-none`}
            />
          </Field>
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
            {initial ? "Save changes" : "Add project"}
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
