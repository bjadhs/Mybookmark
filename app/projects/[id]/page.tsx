import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { getCurrentUserInfo } from "@/lib/auth";
import { getProjectById } from "@/lib/db/projects";
import { detailFor } from "@/lib/project-details";
import { ProjectProgress } from "@/app/_components/ui/project-progress";
import { DummyDiagram } from "@/app/_components/ui/dummy-diagram";
import { GameMount } from "@/app/_components/games/game-mount";
import { ArrowLeftIcon } from "@/app/_icons";

const STATUS_META: Record<string, { label: string; color: string }> = {
  todo: { label: "To do", color: "#9a9aab" },
  in_progress: { label: "In progress", color: "#febc2e" },
  done: { label: "Done", color: "#1ed760" },
};

const TAG_LABEL: Record<string, string> = {
  agentic: "Agentic",
  book: "Book",
  project: "Project",
};

type RouteParams = { params: Promise<{ id: string }> };

export default async function ProjectDetailPage({ params }: RouteParams) {
  // Detail pages are open to any signed-in user (the list itself is admin-only).
  const me = await getCurrentUserInfo();
  if (!me.userId) redirect("/sign-in");

  const { id } = await params;
  const project = await getProjectById(id);
  if (!project) notFound();

  const detail = detailFor(project.id, project.title);
  const status = STATUS_META[project.status] ?? STATUS_META.todo;

  return (
    <div className="max-w-[1000px]">
      <Link
        href="/projects"
        className="inline-flex items-center gap-1.5 text-[13px] font-semibold text-glance-muted hover:text-[var(--accent)] transition-colors mb-4"
      >
        <ArrowLeftIcon className="w-4 h-4" />
        All projects
      </Link>

      {/* Header */}
      <div className="rounded-[18px] border border-glance-border bg-glance-surface p-6 mb-5">
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div className="min-w-0">
            <div className="flex items-center gap-2.5 mb-1.5">
              <span className="flex items-center justify-center w-7 h-7 rounded-[8px] bg-white/[0.04] text-[12px] font-bold text-glance-muted shrink-0">
                {project.position}
              </span>
              {project.tag && (
                <span className="text-[10.5px] font-bold tracking-[0.4px] uppercase text-[var(--accent)] bg-[var(--accent)]/12 border border-[var(--accent)]/25 px-[7px] py-[2px] rounded-[6px]">
                  {TAG_LABEL[project.tag] ?? project.tag}
                </span>
              )}
              <span
                className="text-[11px] font-bold tracking-[0.4px] uppercase"
                style={{ color: status.color }}
              >
                {status.label}
              </span>
            </div>
            <h1 className="font-[family-name:var(--font-space-grotesk)] text-[26px] font-bold text-glance-primary leading-tight">
              {project.title}
            </h1>
            <p className="text-[14px] text-glance-muted mt-1">{detail.tagline}</p>
          </div>
        </div>

        <div className="mt-5 max-w-[420px]">
          <div className="text-[10px] font-bold uppercase tracking-[0.6px] text-glance-faint mb-1.5">
            Completion
          </div>
          <ProjectProgress value={project.completion} size="lg" />
        </div>
      </div>

      {/* Overview + diagram */}
      <div className="grid grid-cols-1 lg:grid-cols-[1.4fr_1fr] gap-5 mb-5">
        <div className="rounded-[18px] border border-glance-border bg-glance-surface p-6">
          <h2 className="text-[15px] font-bold text-glance-primary mb-3">Overview</h2>
          <div className="flex flex-col gap-3">
            {detail.overview.map((p, i) => (
              <p key={i} className="text-[13.5px] leading-relaxed text-glance-muted">
                {p}
              </p>
            ))}
          </div>
          {project.notes && (
            <div className="mt-4 rounded-[12px] border border-white/[0.06] bg-white/[0.02] px-4 py-3">
              <div className="text-[10px] font-bold uppercase tracking-[0.6px] text-glance-faint mb-1">
                Notes
              </div>
              <p className="text-[13px] text-glance-muted">{project.notes}</p>
            </div>
          )}
          <div className="mt-5 flex flex-wrap gap-2">
            {detail.highlights.map((h) => (
              <span
                key={h}
                className="text-[11.5px] font-semibold text-glance-muted bg-white/[0.04] border border-white/[0.08] px-2.5 py-1 rounded-full"
              >
                {h}
              </span>
            ))}
          </div>
        </div>

        <div className="flex flex-col gap-3">
          <DummyDiagram variant={detail.diagram} />
          <div className="rounded-[14px] border border-dashed border-white/10 bg-white/[0.012] px-4 py-3 text-[12px] text-glance-faint">
            Diagrams are illustrative placeholders — swap in the real thing as the
            project takes shape.
          </div>
        </div>
      </div>

      {/* Game */}
      <div className="rounded-[18px] border border-glance-border bg-glance-surface p-6">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-[15px] font-bold text-glance-primary">
              Take a break — play
            </h2>
            <p className="text-[12.5px] text-glance-muted">
              A little mini-game themed to this project. You earned it.
            </p>
          </div>
          <span className="text-[10px] font-bold uppercase tracking-[0.6px] text-[var(--accent)] bg-[var(--accent)]/12 border border-[var(--accent)]/25 px-2 py-1 rounded-full">
            Mini-game
          </span>
        </div>
        <GameMount projectId={project.id} />
      </div>
    </div>
  );
}
