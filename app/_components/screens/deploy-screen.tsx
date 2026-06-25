"use client";

import { useMemo, useState } from "react";
import { PageSubtitle, PageTitle } from "@/app/_components/ui/typography";
import { ArrowUpRightIcon } from "@/app/_icons";
import { useDeploy, type RunRecord } from "@/lib/hooks/use-deploy";
import {
  CATEGORY_META,
  DEPLOY_ACTIONS,
  DEPLOY_LINKS,
  SERVER_HOST,
  type DeployActionMeta,
  type DeployCategory,
} from "@/lib/deploy-actions";

const CATEGORY_ORDER: DeployCategory[] = [
  "deploy",
  "containers",
  "maintenance",
  "cron",
];

export function DeployScreen() {
  const { results, running, run, clear } = useDeploy();
  // Per-action param values: { [actionId]: { [paramName]: value } }
  const [values, setValues] = useState<Record<string, Record<string, string>>>({});
  const [errors, setErrors] = useState<Record<string, string>>({});

  const grouped = useMemo(() => {
    const map = {} as Record<DeployCategory, DeployActionMeta[]>;
    for (const a of DEPLOY_ACTIONS) (map[a.category] ??= []).push(a);
    return map;
  }, []);

  const setParam = (actionId: string, name: string, value: string) =>
    setValues((v) => ({ ...v, [actionId]: { ...v[actionId], [name]: value } }));

  const handleRun = async (action: DeployActionMeta) => {
    if (running.includes(action.id)) return;
    const params = values[action.id] ?? {};

    // Block obviously-empty required params before hitting the server.
    const missing = (action.params ?? []).find(
      (p) => !p.optional && !(params[p.name] ?? "").trim()
    );
    if (missing) {
      setErrors((e) => ({ ...e, [action.id]: `${missing.label} is required` }));
      return;
    }
    setErrors((e) => ({ ...e, [action.id]: "" }));

    if (action.danger) {
      const ok = window.confirm(
        `Run “${action.label}” on ${SERVER_HOST}? This changes server state.`
      );
      if (!ok) return;
    }

    await run(action.id, action.label, params);
  };

  return (
    <div>
      <div className="flex flex-wrap items-start justify-between gap-4 mb-5">
        <div>
          <PageTitle>Deploy</PageTitle>
          <PageSubtitle>
            One-click control bridge — every button runs a command on the box
            over SSH.
          </PageSubtitle>
        </div>
        <div className="flex items-center gap-2 px-3 py-1.5 rounded-full border border-amber-500/30 bg-amber-500/10 text-[11.5px] font-semibold text-amber-200">
          <span className="w-[6px] h-[6px] rounded-full bg-amber-400 animate-glance-pulse" />
          Admin · live SSH to {SERVER_HOST}
        </div>
      </div>

      {/* Quick links */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3 mb-6">
        {DEPLOY_LINKS.map((link) => (
          <a
            key={link.label}
            href={link.href}
            target="_blank"
            rel="noreferrer"
            className="group rounded-[13px] border border-glance-border bg-glance-surface px-3.5 py-3 transition-colors hover:border-glance-border-strong"
          >
            <div className="flex items-center justify-between gap-2">
              <span
                className="flex items-center justify-center w-7 h-7 rounded-[8px] text-[12px] font-bold"
                style={{ background: `${link.tint}22`, color: link.tint }}
              >
                {link.label[0]}
              </span>
              <ArrowUpRightIcon className="w-3.5 h-3.5 text-glance-faint transition-colors group-hover:text-glance-primary" />
            </div>
            <div className="mt-2 text-[12.5px] font-bold text-glance-primary truncate">
              {link.label}
            </div>
            <div className="text-[11px] text-glance-muted truncate">
              {link.description}
            </div>
          </a>
        ))}
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-[1fr_minmax(360px,420px)] gap-5 items-start">
        {/* Actions */}
        <div className="flex flex-col gap-6 min-w-0">
          {CATEGORY_ORDER.map((cat) => {
            const meta = CATEGORY_META[cat];
            const actions = grouped[cat] ?? [];
            if (actions.length === 0) return null;
            return (
              <section key={cat}>
                <div className="flex items-center gap-2 mb-3">
                  <span
                    className="w-[7px] h-[7px] rounded-full"
                    style={{ background: meta.tint, boxShadow: `0 0 8px ${meta.tint}` }}
                  />
                  <h2 className="text-[13px] font-bold text-glance-primary">
                    {meta.label}
                  </h2>
                  <span className="text-[11.5px] text-glance-faint">{meta.hint}</span>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {actions.map((action) => (
                    <ActionCard
                      key={action.id}
                      action={action}
                      values={values[action.id] ?? {}}
                      onChange={(name, value) => setParam(action.id, name, value)}
                      onRun={() => handleRun(action)}
                      running={running.includes(action.id)}
                      disabled={running.includes(action.id)}
                      error={errors[action.id]}
                    />
                  ))}
                </div>
              </section>
            );
          })}
        </div>

        {/* Console */}
        <Console results={results} onClear={clear} running={running} />
      </div>
    </div>
  );
}

function ActionCard({
  action,
  values,
  onChange,
  onRun,
  running,
  disabled,
  error,
}: {
  action: DeployActionMeta;
  values: Record<string, string>;
  onChange: (name: string, value: string) => void;
  onRun: () => void;
  running: boolean;
  disabled: boolean;
  error?: string;
}) {
  const tone = action.danger
    ? { btn: "bg-red-500/90 hover:bg-red-500 text-white", ring: "border-red-500/25" }
    : action.read
    ? {
        btn: "bg-white/[0.05] hover:bg-white/[0.09] text-glance-primary border border-glance-border",
        ring: "border-glance-border",
      }
    : { btn: "bg-[var(--accent)] hover:brightness-110 text-white", ring: "border-glance-border" };

  return (
    <div
      className={`flex flex-col rounded-[14px] border bg-glance-surface p-4 ${tone.ring}`}
    >
      <div className="flex items-start justify-between gap-2 mb-1">
        <span className="text-[13px] font-bold text-glance-primary">
          {action.label}
        </span>
        {action.danger && (
          <span className="text-[9.5px] font-bold tracking-[0.4px] uppercase text-red-400 px-1.5 py-0.5 rounded bg-red-500/10">
            danger
          </span>
        )}
        {action.read && (
          <span className="text-[9.5px] font-bold tracking-[0.4px] uppercase text-glance-muted px-1.5 py-0.5 rounded bg-white/[0.05]">
            read
          </span>
        )}
      </div>
      <p className="text-[12px] leading-[1.5] text-glance-muted mb-3">
        {action.description}
      </p>

      {action.params && action.params.length > 0 && (
        <div className="flex flex-col gap-2 mb-3">
          {action.params.map((p) => (
            <input
              key={p.name}
              value={values[p.name] ?? ""}
              onChange={(e) => onChange(p.name, e.target.value)}
              placeholder={p.optional ? `${p.placeholder} (optional)` : p.placeholder}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !disabled) onRun();
              }}
              spellCheck={false}
              autoComplete="off"
              className="w-full bg-white/5 border border-white/10 rounded-[9px] px-2.5 py-2 text-[12.5px] font-mono text-glance-primary outline-none focus:border-[var(--accent)] placeholder:text-glance-faint placeholder:font-sans"
            />
          ))}
        </div>
      )}

      {error && <div className="text-[11.5px] text-red-400 mb-2">{error}</div>}

      <button
        onClick={onRun}
        disabled={disabled}
        className={`mt-auto flex items-center justify-center gap-2 px-3 py-2 rounded-[10px] text-[12.5px] font-semibold transition-all disabled:opacity-40 disabled:cursor-default ${tone.btn}`}
      >
        {running ? (
          <>
            <span className="w-3.5 h-3.5 rounded-full border-2 border-white/40 border-t-white animate-glance-spin-slow" />
            Running…
          </>
        ) : (
          action.cta
        )}
      </button>
    </div>
  );
}

function Console({
  results,
  onClear,
  running,
}: {
  results: RunRecord[];
  onClear: () => void;
  running: string[];
}) {
  return (
    <div className="xl:sticky xl:top-4 rounded-[16px] border border-glance-border bg-[#0a0a10] overflow-hidden">
      <div className="flex items-center gap-2 px-4 py-2.5 border-b border-glance-border bg-white/[0.02]">
        <span className="w-3 h-3 rounded-full bg-[#ff5f57]" />
        <span className="w-3 h-3 rounded-full bg-[#febc2e]" />
        <span className="w-3 h-3 rounded-full bg-[#28c840]" />
        <span className="ml-2 text-[11.5px] font-mono text-glance-muted">
          console{" "}
          {running.length > 0 && (
            <span className="text-amber-300">
              · running {running.length}…
            </span>
          )}
        </span>
        {results.length > 0 && (
          <button
            onClick={onClear}
            className="ml-auto text-[11px] font-semibold text-glance-faint hover:text-glance-primary transition-colors"
          >
            Clear
          </button>
        )}
      </div>
      <div className="max-h-[70vh] overflow-y-auto p-3 flex flex-col gap-2.5">
        {results.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 px-4 text-center">
            <div className="text-[13px] font-bold text-glance-muted-light mb-1">
              No commands run yet
            </div>
            <div className="text-[11.5px] text-glance-faint">
              Output from each button lands here.
            </div>
          </div>
        ) : (
          results.map((r) => <ResultBlock key={r.key} r={r} />)
        )}
      </div>
    </div>
  );
}

function ResultBlock({ r }: { r: RunRecord }) {
  const [open, setOpen] = useState(true);
  const body = [r.stdout, r.stderr].filter(Boolean).join("\n").trim();
  return (
    <div
      className="rounded-[11px] border bg-black/30 overflow-hidden"
      style={{
        borderColor: r.ok ? "rgba(30,215,96,0.25)" : "rgba(255,95,87,0.3)",
        animation: "glance-rise 0.35s ease both",
      }}
    >
      <button
        onClick={() => setOpen((o) => !o)}
        className="w-full flex items-center gap-2 px-3 py-2 text-left"
      >
        <span
          className="w-[7px] h-[7px] rounded-full shrink-0"
          style={{ background: r.ok ? "#1ed760" : "#ff5f57" }}
        />
        <span className="text-[12px] font-bold text-glance-primary truncate">
          {r.label}
        </span>
        <span className="ml-auto flex items-center gap-2 shrink-0 text-[10.5px] font-mono text-glance-faint">
          <span style={{ color: r.ok ? "#1ed760" : "#ff5f57" }}>
            exit {r.code}
          </span>
          <span>{r.durationMs}ms</span>
          <span>{open ? "▾" : "▸"}</span>
        </span>
      </button>
      {open && (
        <div className="px-3 pb-3">
          <div className="text-[10.5px] font-mono text-[#7aa2ff] mb-1.5 break-all">
            $ {r.command}
          </div>
          <pre className="text-[11px] leading-[1.55] font-mono text-[#9fe6b3] whitespace-pre-wrap break-words max-h-[260px] overflow-y-auto">
            {body || "(no output)"}
          </pre>
        </div>
      )}
    </div>
  );
}
