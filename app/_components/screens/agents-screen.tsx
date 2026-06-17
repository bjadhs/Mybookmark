"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { PageSubtitle, PageTitle } from "@/app/_components/ui/typography";
import {
  ArrowUpRightIcon,
  CheckIcon,
  CloseIcon,
  PencilIcon,
  PlusIcon,
  TrashIcon,
} from "@/app/_icons";
import { useRole } from "@/lib/hooks/use-role";
import { useSettings } from "@/lib/hooks/use-settings";
import { pageById } from "@/lib/settings";
import { useAgents, type AgentDraft } from "@/lib/hooks/use-agents";
import { AGENT_COLORS, type Agent } from "@/lib/types";
import { ClawCabinet } from "@/app/_components/claw-cabinet";

const EMPTY_DRAFT: AgentDraft = {
  name: "",
  title: "",
  description: "",
  whatItDoes: "",
  color: "#a855f7",
  llm: "claude-opus-4-8",
  robots: 4,
  status: "Cycle running",
};

type EditorState =
  | { mode: "add" }
  | { mode: "edit"; agent: Agent }
  | null;

export function AgentsScreen() {
  const router = useRouter();
  const { isAdmin } = useRole();
  const { settings } = useSettings();
  const { agents, loading, error, addAgent, updateAgent, deleteAgent } =
    useAgents();
  const [editor, setEditor] = useState<EditorState>(null);

  const handleDelete = async (a: Agent) => {
    if (!window.confirm(`Delete agent "${a.name}"?`)) return;
    try {
      await deleteAgent(a.id);
    } catch {
      /* surfaced via hook error */
    }
  };

  return (
    <div>
      <div className="flex items-start justify-between gap-6 mb-6">
        <div>
          <PageTitle>{pageById(settings, "agents")?.label ?? "My Agents"}</PageTitle>
          <PageSubtitle>
            Autonomous rigs running their grab cycles in real time.
          </PageSubtitle>
        </div>
        {isAdmin && (
          <button
            onClick={() => setEditor({ mode: "add" })}
            className="flex items-center gap-2 px-4 py-2.5 rounded-[11px] bg-[var(--accent)] text-white text-sm font-semibold cursor-pointer shadow-[0_8px_22px_-6px_rgba(168,85,247,0.5)] transition-all duration-150 hover:brightness-[1.06] hover:-translate-y-px shrink-0"
          >
            <PlusIcon className="w-4 h-4" />
            Add agent
          </button>
        )}
      </div>

      {error && (
        <div className="mb-4 rounded-[12px] border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-300">
          {error}
        </div>
      )}

      {loading ? (
        <div className="flex items-center justify-center h-40 text-glance-muted">
          Loading agents…
        </div>
      ) : agents.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 px-5 text-center border border-dashed border-white/10 rounded-[18px] bg-white/[0.015]">
          <div className="text-[17px] font-bold text-[#d4d4dd] mb-1.5">
            No agents yet
          </div>
          <div className="text-sm text-glance-muted">
            {isAdmin
              ? "Add your first agent to show it running here."
              : "The admin hasn't added any agents yet."}
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          {agents.map((agent, i) => (
            <AgentCard
              key={agent.id}
              agent={agent}
              index={i}
              isAdmin={isAdmin}
              onOpen={() => router.push(`/agents/${agent.id}`)}
              onEdit={() => setEditor({ mode: "edit", agent })}
              onDelete={() => handleDelete(agent)}
            />
          ))}
        </div>
      )}

      {editor && (
        <AgentEditor
          initial={editor.mode === "edit" ? editor.agent : null}
          onClose={() => setEditor(null)}
          onSubmit={async (draft) => {
            if (editor.mode === "edit") {
              await updateAgent(editor.agent.id, draft);
            } else {
              await addAgent(draft);
            }
            setEditor(null);
          }}
        />
      )}
    </div>
  );
}

function AgentCard({
  agent,
  index,
  isAdmin,
  onOpen,
  onEdit,
  onDelete,
}: {
  agent: Agent;
  index: number;
  isAdmin: boolean;
  onOpen: () => void;
  onEdit: () => void;
  onDelete: () => void;
}) {
  return (
    <div className="group rounded-[18px] border border-glance-border bg-glance-surface p-[18px]">
      <div className="flex items-start justify-between gap-3 mb-3.5">
        <div className="min-w-0">
          <div className="text-[14px] font-bold text-glance-primary truncate">
            {agent.name}
          </div>
          {agent.title && (
            <div className="text-[12px] font-semibold text-glance-muted truncate">
              {agent.title}
            </div>
          )}
        </div>
        <span className="flex items-center gap-1.5 shrink-0">
          <span
            className="w-[7px] h-[7px] rounded-full animate-glance-pulse"
            style={{ background: agent.color, boxShadow: `0 0 8px ${agent.color}` }}
          />
          <span
            className="text-[10.5px] font-bold tracking-[0.4px] uppercase"
            style={{ color: agent.color }}
          >
            {agent.status}
          </span>
        </span>
      </div>

      <ClawCabinet
        color={agent.color}
        robots={agent.robots}
        duration={`${6 + index * 0.7}s`}
      />

      {agent.description && (
        <p className="mt-3 text-[12.5px] leading-[1.5] text-glance-muted line-clamp-2">
          {agent.description}
        </p>
      )}

      <div className="mt-3 flex items-center justify-between gap-2">
        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-white/[0.04] border border-glance-border text-[11px] font-mono text-glance-muted truncate">
          <span
            className="w-[6px] h-[6px] rounded-full shrink-0"
            style={{ background: agent.color }}
          />
          {agent.llm || "—"}
        </span>
        <button
          onClick={onOpen}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-[10px] text-[12px] font-semibold text-glance-primary bg-white/[0.04] border border-glance-border hover:bg-white/[0.07] transition-colors shrink-0"
        >
          View details
          <ArrowUpRightIcon className="w-3.5 h-3.5" />
        </button>
      </div>

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

function AgentEditor({
  initial,
  onClose,
  onSubmit,
}: {
  initial: Agent | null;
  onClose: () => void;
  onSubmit: (draft: AgentDraft) => Promise<void>;
}) {
  const [draft, setDraft] = useState<AgentDraft>(
    initial
      ? {
          name: initial.name,
          title: initial.title,
          description: initial.description,
          whatItDoes: initial.whatItDoes,
          color: initial.color,
          llm: initial.llm,
          robots: initial.robots,
          status: initial.status,
        }
      : { ...EMPTY_DRAFT }
  );
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const set = <K extends keyof AgentDraft>(key: K, v: AgentDraft[K]) =>
    setDraft((d) => ({ ...d, [key]: v }));

  const submit = async () => {
    if (!draft.name.trim() || saving) return;
    setSaving(true);
    setErr(null);
    try {
      await onSubmit({ ...draft, name: draft.name.trim() });
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Failed to save");
      setSaving(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm overflow-y-auto"
      onClick={onClose}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-[480px] my-8 rounded-[18px] border border-glance-border-strong bg-glance-surface p-5 shadow-[0_30px_80px_-20px_rgba(0,0,0,0.8)]"
      >
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-[family-name:var(--font-space-grotesk)] text-[18px] font-bold text-glance-primary">
            {initial ? "Edit agent" : "Add agent"}
          </h2>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-glance-faint hover:text-glance-primary hover:bg-white/[0.06] transition-colors"
          >
            <CloseIcon className="w-4 h-4" />
          </button>
        </div>

        <div className="flex flex-col gap-3">
          <div className="grid grid-cols-2 gap-3">
            <Field label="Agent name">
              <input
                autoFocus
                value={draft.name}
                onChange={(e) => set("name", e.target.value)}
                placeholder="Agent · Unit 03"
                className={inputClass}
              />
            </Field>
            <Field label="Title">
              <input
                value={draft.title}
                onChange={(e) => set("title", e.target.value)}
                placeholder="Research Scout"
                className={inputClass}
              />
            </Field>
          </div>

          <Field label="Description (one line)">
            <input
              value={draft.description}
              onChange={(e) => set("description", e.target.value)}
              placeholder="Scoops links and stacks tidy collections."
              className={inputClass}
            />
          </Field>

          <Field label="What it does">
            <textarea
              value={draft.whatItDoes}
              onChange={(e) => set("whatItDoes", e.target.value)}
              rows={3}
              placeholder="A fuller description shown on the agent's detail page…"
              className={`${inputClass} resize-y leading-[1.5]`}
            />
          </Field>

          <Field label="Color">
            <div className="flex flex-wrap gap-2 pt-0.5">
              {AGENT_COLORS.map((c) => (
                <button
                  key={c}
                  type="button"
                  onClick={() => set("color", c)}
                  title={c}
                  className="flex items-center justify-center w-8 h-8 rounded-[10px] border transition-all"
                  style={{
                    background: c,
                    borderColor:
                      draft.color === c ? "#ffffff" : "rgba(255,255,255,0.12)",
                    transform: draft.color === c ? "scale(1.08)" : "none",
                  }}
                >
                  {draft.color === c && (
                    <CheckIcon className="w-4 h-4 text-white" />
                  )}
                </button>
              ))}
            </div>
          </Field>

          <div className="grid grid-cols-2 gap-3">
            <Field label="LLM used">
              <input
                value={draft.llm}
                onChange={(e) => set("llm", e.target.value)}
                placeholder="claude-opus-4-8"
                className={inputClass}
              />
            </Field>
            <Field label={`Robots working (${draft.robots})`}>
              <input
                type="range"
                min={1}
                max={8}
                value={draft.robots}
                onChange={(e) => set("robots", Number(e.target.value))}
                className="w-full accent-[var(--accent)] cursor-pointer mt-2.5"
              />
            </Field>
          </div>

          <Field label="Status">
            <input
              value={draft.status}
              onChange={(e) => set("status", e.target.value)}
              placeholder="Cycle running"
              className={inputClass}
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
            disabled={saving || !draft.name.trim()}
            className="flex items-center gap-2 px-4 py-2.5 rounded-[11px] bg-[var(--accent)] text-white text-sm font-semibold cursor-pointer transition-all hover:brightness-[1.06] disabled:opacity-40 disabled:cursor-default"
          >
            <CheckIcon className="w-4 h-4" />
            {initial ? "Save changes" : "Add agent"}
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
