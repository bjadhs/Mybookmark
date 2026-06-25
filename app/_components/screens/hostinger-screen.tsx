"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { PageSubtitle, PageTitle } from "@/app/_components/ui/typography";
import { useServerLive } from "@/lib/hooks/use-server-live";
import {
  HOSTINGER_GUIDE,
  SERVER_FACTS,
  type GuideBlock,
  type GuideSection,
} from "@/lib/hostinger-guide";

export function HostingerScreen() {
  const activeId = useScrollSpy(HOSTINGER_GUIDE.map((s) => s.id));

  return (
    <div>
      <div className="mb-5">
        <PageTitle>Hostinger Handbook</PageTitle>
        <PageSubtitle>
          Everything this server runs, how to operate it, and the safe way to do
          it — your control-room reference.
        </PageSubtitle>
      </div>

      <Hero />

      <div className="grid grid-cols-1 lg:grid-cols-[220px_1fr] gap-6 items-start">
        <Toc activeId={activeId} />
        <div className="flex flex-col gap-5 min-w-0">
          {HOSTINGER_GUIDE.map((section) => (
            <SectionCard key={section.id} section={section} />
          ))}
          <div className="text-[11.5px] text-glance-faint pt-2 pb-6">
            Facts verified against the live box. Container roster is read live on{" "}
            <Link href="/server" className="text-[var(--accent)] hover:underline">
              /server
            </Link>{" "}
            and actions run from{" "}
            <Link href="/deploy" className="text-[var(--accent)] hover:underline">
              /deploy
            </Link>
            .
          </div>
        </div>
      </div>
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/*  Hero — live stat chips                                                      */
/* -------------------------------------------------------------------------- */

function Hero() {
  const { data } = useServerLive();
  const running = data?.totals.running;
  const total = data?.totals.all;

  const chips: { label: string; value: string }[] = [
    { label: "Provider", value: SERVER_FACTS.provider },
    { label: "Memory", value: SERVER_FACTS.ram },
    {
      label: "Containers",
      value: total != null ? `${running}/${total} up` : "—",
    },
    { label: "Orchestrator", value: "Dokploy" },
  ];

  return (
    <div className="relative overflow-hidden rounded-[18px] border border-glance-border bg-glance-surface p-5 mb-6">
      <div className="absolute -right-10 -top-16 w-64 h-64 rounded-full blur-3xl opacity-[0.13] bg-[var(--accent)]" />
      <div className="absolute -left-16 -bottom-20 w-64 h-64 rounded-full blur-3xl opacity-[0.08] bg-glance-cyan" />
      <div className="relative">
        <div className="flex items-center gap-2 mb-1">
          <span className="w-[7px] h-[7px] rounded-full bg-glance-online shadow-[0_0_8px_#1ed760] animate-glance-pulse" />
          <span className="font-[family-name:var(--font-space-grotesk)] text-[20px] font-bold text-glance-primary">
            {SERVER_FACTS.host}
          </span>
        </div>
        <p className="text-[13px] text-glance-muted max-w-[640px] mb-4">
          A single-node Docker host running Glance&apos;s database, the Dokploy
          deployment platform, and your app stacks. Reachable over Tailscale.
        </p>
        <div className="flex flex-wrap gap-2.5">
          {chips.map((c) => (
            <div
              key={c.label}
              className="rounded-[11px] border border-glance-border bg-white/[0.03] px-3 py-2"
            >
              <div className="text-[9.5px] font-bold tracking-[0.6px] text-glance-faint uppercase">
                {c.label}
              </div>
              <div className="text-[13px] font-bold text-glance-primary">
                {c.value}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/*  Table of contents                                                          */
/* -------------------------------------------------------------------------- */

function Toc({ activeId }: { activeId: string | null }) {
  return (
    <nav className="hidden lg:flex flex-col gap-0.5 sticky top-4">
      <div className="text-[10px] font-bold tracking-[0.7px] text-glance-faint uppercase px-3 pb-2">
        Contents
      </div>
      {HOSTINGER_GUIDE.map((s, i) => {
        const active = activeId === s.id;
        return (
          <a
            key={s.id}
            href={`#${s.id}`}
            className={`flex items-center gap-2.5 px-3 py-1.5 rounded-[9px] text-[12.5px] font-semibold transition-colors ${
              active
                ? "bg-[var(--accent)]/15 text-[var(--accent)]"
                : "text-glance-muted hover:text-glance-primary hover:bg-white/[0.03]"
            }`}
          >
            <span
              className="w-[18px] text-[10px] font-mono text-right shrink-0"
              style={{ color: active ? s.tint : undefined }}
            >
              {String(i + 1).padStart(2, "0")}
            </span>
            <span className="truncate">{s.title}</span>
          </a>
        );
      })}
    </nav>
  );
}

function useScrollSpy(ids: string[]): string | null {
  const [active, setActive] = useState<string | null>(ids[0] ?? null);

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        const visible = entries
          .filter((e) => e.isIntersecting)
          .sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top);
        if (visible[0]) setActive(visible[0].target.id);
      },
      { rootMargin: "-20% 0px -65% 0px", threshold: 0 }
    );
    for (const id of ids) {
      const el = document.getElementById(id);
      if (el) observer.observe(el);
    }
    return () => observer.disconnect();
  }, [ids]);

  return active;
}

/* -------------------------------------------------------------------------- */
/*  Section + block renderers                                                  */
/* -------------------------------------------------------------------------- */

function SectionCard({ section }: { section: GuideSection }) {
  return (
    <section
      id={section.id}
      className="scroll-mt-4 rounded-[18px] border border-glance-border bg-glance-surface p-5"
    >
      <div className="flex items-start gap-3 mb-4">
        <span
          className="flex items-center justify-center w-9 h-9 rounded-[10px] text-[13px] font-bold shrink-0"
          style={{ background: `${section.tint}20`, color: section.tint }}
        >
          {section.title[0]}
        </span>
        <div>
          <h2 className="font-[family-name:var(--font-space-grotesk)] text-[18px] font-bold text-glance-primary leading-tight">
            {section.title}
          </h2>
          <p className="text-[12.5px] text-glance-muted">{section.blurb}</p>
        </div>
      </div>
      <div className="flex flex-col gap-3.5">
        {section.blocks.map((block, i) => (
          <Block key={i} block={block} tint={section.tint} />
        ))}
      </div>
    </section>
  );
}

const CALLOUT_TONE: Record<string, { border: string; bg: string; text: string }> = {
  info: { border: "border-glance-cyan/30", bg: "bg-glance-cyan/[0.06]", text: "text-glance-cyan" },
  tip: { border: "border-glance-online/30", bg: "bg-glance-online/[0.06]", text: "text-glance-online" },
  warn: { border: "border-amber-500/30", bg: "bg-amber-500/[0.07]", text: "text-amber-300" },
  danger: { border: "border-red-500/30", bg: "bg-red-500/[0.07]", text: "text-red-300" },
};

function Block({ block, tint }: { block: GuideBlock; tint: string }) {
  switch (block.type) {
    case "p":
      return (
        <p className="text-[13.5px] leading-[1.65] text-glance-muted-light">
          <Inline text={block.text} />
        </p>
      );

    case "callout": {
      const t = CALLOUT_TONE[block.tone] ?? CALLOUT_TONE.info;
      return (
        <div className={`rounded-[12px] border ${t.border} ${t.bg} px-3.5 py-3`}>
          {block.title && (
            <div className={`text-[12px] font-bold mb-1 ${t.text}`}>
              {block.title}
            </div>
          )}
          <div className="text-[12.5px] leading-[1.6] text-glance-muted-light">
            <Inline text={block.text} />
          </div>
        </div>
      );
    }

    case "code":
      return <CodeBlock label={block.label} lines={block.lines} />;

    case "table":
      return (
        <div className="overflow-x-auto rounded-[12px] border border-glance-border">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-white/[0.03]">
                {block.headers.map((h) => (
                  <th
                    key={h}
                    className="px-3 py-2 text-[10.5px] font-bold tracking-[0.4px] uppercase text-glance-faint border-b border-glance-border"
                  >
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {block.rows.map((row, ri) => (
                <tr key={ri} className="border-b border-glance-border last:border-0">
                  {row.map((cell, ci) => (
                    <td
                      key={ci}
                      className={`px-3 py-2 text-[12.5px] align-top ${
                        ci === 0
                          ? "font-semibold text-glance-primary"
                          : "text-glance-muted-light"
                      }`}
                    >
                      <Inline text={cell} />
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      );

    case "list":
      return block.ordered ? (
        <ol className="flex flex-col gap-1.5 pl-1">
          {block.items.map((it, i) => (
            <li key={i} className="flex gap-2.5 text-[13px] leading-[1.55] text-glance-muted-light">
              <span className="text-[11px] font-mono text-glance-faint mt-0.5">{i + 1}.</span>
              <span><Inline text={it} /></span>
            </li>
          ))}
        </ol>
      ) : (
        <ul className="flex flex-col gap-1.5">
          {block.items.map((it, i) => (
            <li key={i} className="flex gap-2.5 text-[13px] leading-[1.55] text-glance-muted-light">
              <span
                className="w-[5px] h-[5px] rounded-full mt-[7px] shrink-0"
                style={{ background: tint }}
              />
              <span><Inline text={it} /></span>
            </li>
          ))}
        </ul>
      );

    case "steps":
      return (
        <ol className="flex flex-col gap-3">
          {block.steps.map((s, i) => (
            <li key={i} className="flex gap-3">
              <span
                className="flex items-center justify-center w-6 h-6 rounded-full text-[11px] font-bold shrink-0"
                style={{ background: `${tint}20`, color: tint }}
              >
                {i + 1}
              </span>
              <div className="flex-1 min-w-0 pt-0.5">
                <div className="text-[13px] leading-[1.5] text-glance-muted-light mb-1.5">
                  <Inline text={s.text} />
                </div>
                {s.code && <CodeBlock lines={s.code} />}
              </div>
            </li>
          ))}
        </ol>
      );

    case "links":
      return (
        <div className="flex flex-wrap gap-2">
          {block.links.map((l) => {
            const cls =
              "px-3 py-1.5 rounded-[10px] text-[12px] font-semibold text-glance-primary bg-white/[0.04] border border-glance-border hover:bg-white/[0.07] transition-colors";
            return l.href.startsWith("http") ? (
              <a key={l.href} href={l.href} target="_blank" rel="noreferrer" className={cls}>
                {l.label}
              </a>
            ) : (
              <Link key={l.href} href={l.href} className={cls}>
                {l.label}
              </Link>
            );
          })}
        </div>
      );

    default:
      return null;
  }
}

function CodeBlock({ label, lines }: { label?: string; lines: string[] }) {
  const [copied, setCopied] = useState(false);
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(lines.join("\n"));
      setCopied(true);
      setTimeout(() => setCopied(false), 1400);
    } catch {
      /* clipboard blocked — no-op */
    }
  };
  return (
    <div className="rounded-[12px] border border-glance-border bg-[#0a0a10] overflow-hidden">
      <div className="flex items-center justify-between px-3 py-1.5 border-b border-glance-border bg-white/[0.02]">
        <span className="text-[10.5px] font-mono text-glance-faint">
          {label ?? "shell"}
        </span>
        <button
          onClick={copy}
          className="text-[10.5px] font-semibold text-glance-faint hover:text-[var(--accent)] transition-colors"
        >
          {copied ? "copied ✓" : "copy"}
        </button>
      </div>
      <pre className="px-3 py-2.5 overflow-x-auto text-[11.5px] leading-[1.6] font-mono text-[#9fe6b3]">
        {lines.join("\n")}
      </pre>
    </div>
  );
}

/** Renders `inline code` spans inside otherwise-plain text (backtick syntax). */
function Inline({ text }: { text: string }) {
  if (!text.includes("`")) return <>{text}</>;
  const parts = text.split("`");
  return (
    <>
      {parts.map((part, i) =>
        i % 2 === 1 ? (
          <code
            key={i}
            className="px-1 py-0.5 rounded bg-white/[0.06] border border-glance-border font-mono text-[0.9em] text-glance-primary"
          >
            {part}
          </code>
        ) : (
          <span key={i}>{part}</span>
        )
      )}
    </>
  );
}
