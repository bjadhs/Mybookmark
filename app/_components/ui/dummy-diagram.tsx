import type { DiagramVariant } from "@/lib/project-details";

/**
 * Decorative, themeable SVG "architecture" diagrams for the project detail page.
 * Pure presentational (server-safe). The accent strokes use var(--accent) so
 * they recolor with the theme; everything else is low-opacity white.
 */
export function DummyDiagram({
  variant,
  className,
}: {
  variant: DiagramVariant;
  className?: string;
}) {
  return (
    <div
      className={`relative w-full overflow-hidden rounded-[14px] border border-glance-border bg-[#0e0e16] ${className ?? ""}`}
    >
      <span className="absolute left-3 top-2.5 text-[10px] font-bold uppercase tracking-[0.6px] text-glance-faint">
        Architecture · schematic
      </span>
      <svg
        viewBox="0 0 320 150"
        className="w-full h-auto block"
        fill="none"
        role="img"
        aria-label={`${variant} diagram`}
      >
        {DIAGRAMS[variant]}
      </svg>
    </div>
  );
}

const accent = "var(--accent)";
const faint = "rgba(255,255,255,0.12)";
const dim = "rgba(255,255,255,0.05)";
const label = "rgba(255,255,255,0.45)";

function node(x: number, y: number, w: number, h: number, on = false) {
  return (
    <rect
      x={x}
      y={y}
      width={w}
      height={h}
      rx={7}
      fill={on ? "rgba(168,85,247,0.12)" : dim}
      stroke={on ? accent : faint}
      strokeWidth={1.5}
    />
  );
}

function dot(x: number, y: number, r: number, on = false) {
  return <circle cx={x} cy={y} r={r} fill={on ? accent : faint} />;
}

const DIAGRAMS: Record<DiagramVariant, React.ReactNode> = {
  flow: (
    <>
      <path d="M70 75h45M185 75h45" stroke={faint} strokeWidth={1.5} strokeDasharray="4 4" />
      <path d="M110 75l8-4v8z" fill={accent} />
      <path d="M225 75l8-4v8z" fill={accent} />
      {node(20, 58, 52, 34)}
      {node(122, 58, 56, 34, true)}
      {node(238, 58, 60, 34)}
      <circle cx="46" cy="75" r="5" fill={faint} />
      <circle cx="150" cy="75" r="6" fill={accent} />
      <circle cx="268" cy="75" r="5" fill={faint} />
    </>
  ),
  stack: (
    <>
      {node(110, 30, 100, 22, true)}
      {node(100, 62, 120, 22)}
      {node(90, 94, 140, 22)}
      <path d="M160 52v10M160 84v10" stroke={faint} strokeWidth={1.5} />
      {dot(160, 24, 4, true)}
    </>
  ),
  orbit: (
    <>
      <circle cx="160" cy="75" r="52" stroke={dim} strokeWidth={1.5} />
      <circle cx="160" cy="75" r="30" stroke={faint} strokeWidth={1.5} strokeDasharray="3 5" />
      <circle cx="160" cy="75" r="14" fill="rgba(168,85,247,0.15)" stroke={accent} strokeWidth={1.5} />
      {dot(160, 75, 4, true)}
      {dot(160, 23, 5, true)}
      {dot(212, 75, 5)}
      {dot(160, 127, 5)}
      {dot(108, 75, 5, true)}
      {dot(196, 39, 4)}
      {dot(124, 111, 4)}
    </>
  ),
  grid: (
    <>
      {[0, 1, 2, 3].map((c) =>
        [0, 1, 2].map((r) => {
          const on = (c + r) % 3 === 0;
          return (
            <rect
              key={`${c}-${r}`}
              x={60 + c * 52}
              y={32 + r * 32}
              width={40}
              height={22}
              rx={5}
              fill={on ? "rgba(168,85,247,0.12)" : dim}
              stroke={on ? accent : faint}
              strokeWidth={1.3}
            />
          );
        })
      )}
    </>
  ),
  timeline: (
    <>
      <path d="M30 75h260" stroke={faint} strokeWidth={1.5} />
      {[0, 1, 2, 3, 4].map((i) => {
        const x = 46 + i * 57;
        const on = i % 2 === 0;
        return (
          <g key={i}>
            <circle cx={x} cy={75} r={on ? 7 : 5} fill={on ? accent : faint} />
            <rect x={x - 16} y={on ? 36 : 92} width={32} height={16} rx={4} fill={dim} stroke={faint} strokeWidth={1.2} />
            <path d={`M${x} ${on ? 68 : 82}v${on ? -16 : 10}`} stroke={faint} strokeWidth={1.2} />
          </g>
        );
      })}
      <text x="160" y="140" textAnchor="middle" fontSize="8" fill={label}>
        milestones
      </text>
    </>
  ),
};
