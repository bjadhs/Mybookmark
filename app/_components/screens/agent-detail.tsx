"use client";

import { useRouter } from "next/navigation";
import { ArrowLeftIcon } from "@/app/_icons";
import { ClawCabinet } from "@/app/_components/claw-cabinet";
import type { Agent } from "@/lib/types";

export function AgentDetail({ agent }: { agent: Agent }) {
  const router = useRouter();

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
