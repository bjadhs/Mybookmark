"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeftIcon, ArrowUpRightIcon } from "@/app/_icons";
import { ClawCabinet } from "@/app/_components/claw-cabinet";
import { presetForAgent, type ConfigField } from "@/lib/agent-presets";
import type { Agent } from "@/lib/types";

export function AgentDetail({ agent }: { agent: Agent }) {
  const router = useRouter();
  const preset = presetForAgent(agent);

  return (
    <div className="max-w-[920px]">
      <button
        onClick={() => router.push("/agents")}
        className="mb-5 inline-flex items-center gap-2 text-[13px] font-semibold text-glance-muted transition-colors hover:text-glance-primary"
      >
        <ArrowLeftIcon />
        All agents
      </button>

      <div className="flex items-start justify-between gap-4 mb-6">
        <div className="min-w-0">
          <h1 className="font-[family-name:var(--font-space-grotesk)] text-[30px] font-bold leading-[1.1] tracking-[-0.5px] text-glance-primary">
            {agent.name}
          </h1>
          {agent.title && (
            <div className="mt-1 text-[15px] font-semibold" style={{ color: agent.color }}>
              {agent.title}
            </div>
          )}
          <div className="mt-2 inline-flex items-center gap-2 px-2.5 py-1 rounded-full border border-glance-border bg-white/[0.03] text-[11px] font-semibold text-glance-muted">
            <span
              className="w-[6px] h-[6px] rounded-full"
              style={{ background: agent.color }}
            />
            {preset.badge}
          </div>
        </div>
        <span className="flex items-center gap-1.5 shrink-0 mt-2">
          <span
            className="w-[8px] h-[8px] rounded-full animate-glance-pulse"
            style={{ background: agent.color, boxShadow: `0 0 10px ${agent.color}` }}
          />
          <span
            className="text-[11px] font-bold tracking-[0.4px] uppercase"
            style={{ color: agent.color }}
          >
            {agent.status}
          </span>
        </span>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-[1.1fr_1fr] gap-5">
        <ClawCabinet color={agent.color} robots={agent.robots} duration="6s" height={320} />

        <div className="flex flex-col gap-3">
          {agent.description && (
            <p className="text-[15px] leading-[1.6] text-[#d4d4dd]">
              {agent.description}
            </p>
          )}

          <div className="grid grid-cols-3 gap-3">
            <Stat label="Model" value={agent.llm || "—"} mono />
            <Stat label="Robots" value={String(agent.robots)} />
            <Stat
              label="Color"
              value={agent.color}
              mono
              swatch={agent.color}
            />
          </div>

          <div className="rounded-[14px] border border-glance-border bg-glance-surface p-4">
            <div className="text-[11px] font-bold tracking-[0.6px] text-glance-faint uppercase mb-2">
              What it does
            </div>
            <p className="text-[14px] leading-[1.65] text-glance-muted-light whitespace-pre-wrap">
              {agent.whatItDoes || "No description yet."}
            </p>
          </div>
        </div>
      </div>

      {/* Look inside: configuration */}
      <div className="mt-6">
        <div className="flex flex-wrap items-center justify-between gap-3 mb-3">
          <h2 className="font-[family-name:var(--font-space-grotesk)] text-[18px] font-bold text-glance-primary">
            Configuration
          </h2>
          {preset.endpoint && (
            <a
              href={preset.endpoint}
              target="_blank"
              rel="noreferrer"
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-[10px] text-[12px] font-semibold text-glance-primary bg-white/[0.04] border border-glance-border hover:bg-white/[0.07] transition-colors"
            >
              Open console
              <ArrowUpRightIcon className="w-3.5 h-3.5" />
            </a>
          )}
        </div>

        {preset.container && (
          <div className="mb-3 flex flex-wrap items-center gap-2 text-[12px]">
            <span className="text-glance-faint font-semibold uppercase tracking-[0.4px] text-[10.5px]">
              Container
            </span>
            <span className="px-2 py-1 rounded-md bg-white/[0.04] border border-glance-border font-mono text-glance-muted">
              {preset.container}
            </span>
          </div>
        )}

        <div className="flex flex-wrap gap-1.5 mb-4">
          {preset.integrations.map((tag) => (
            <span
              key={tag}
              className="px-2.5 py-1 rounded-full text-[11.5px] font-semibold border"
              style={{
                color: agent.color,
                background: `${agent.color}14`,
                borderColor: `${agent.color}33`,
              }}
            >
              {tag}
            </span>
          ))}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
          {preset.sections.map((section) => (
            <div
              key={section.heading}
              className="rounded-[14px] border border-glance-border bg-glance-surface p-4"
            >
              <div className="text-[11px] font-bold tracking-[0.6px] text-glance-faint uppercase mb-3">
                {section.heading}
              </div>
              <div className="flex flex-col gap-2.5">
                {section.fields.map((f) => (
                  <ConfigRow key={f.label} field={f} />
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function ConfigRow({ field }: { field: ConfigField }) {
  const [revealed, setRevealed] = useState(false);
  const shown = field.secret && !revealed ? "••••••••••" : field.value;
  return (
    <div className="flex items-center justify-between gap-3">
      <span className="text-[11.5px] font-semibold text-glance-muted shrink-0">
        {field.label}
      </span>
      <span className="flex items-center gap-1.5 min-w-0">
        <span
          className={`text-[12px] text-glance-primary truncate ${
            field.mono ? "font-mono text-[11.5px]" : "font-semibold"
          }`}
          title={field.secret && !revealed ? "hidden" : field.value}
        >
          {shown}
        </span>
        {field.secret && (
          <button
            onClick={() => setRevealed((v) => !v)}
            className="text-[10px] font-semibold text-glance-faint hover:text-[var(--accent)] transition-colors shrink-0"
          >
            {revealed ? "hide" : "show"}
          </button>
        )}
      </span>
    </div>
  );
}

function Stat({
  label,
  value,
  mono,
  swatch,
}: {
  label: string;
  value: string;
  mono?: boolean;
  swatch?: string;
}) {
  return (
    <div className="rounded-[14px] border border-glance-border bg-glance-surface px-3.5 py-3">
      <div className="text-[10px] font-bold tracking-[0.6px] text-glance-faint uppercase mb-1">
        {label}
      </div>
      <div
        className={`flex items-center gap-1.5 text-[13px] font-semibold text-glance-primary truncate ${
          mono ? "font-mono text-[12px]" : ""
        }`}
      >
        {swatch && (
          <span
            className="w-[10px] h-[10px] rounded-full shrink-0"
            style={{ background: swatch }}
          />
        )}
        {value}
      </div>
    </div>
  );
}
