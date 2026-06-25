"use client";

import { cls } from "@/lib/styles";

const TOTAL = 10;

/**
 * Per-project completion bar: 10 steps out of 10. Read-only by default; pass
 * `onChange` to make it editable. With `stepper`, − / + buttons step the count;
 * the segments themselves are also clickable (click a segment to jump to it,
 * click the current one to drop a step).
 */
export function ProjectProgress({
  value,
  onChange,
  size = "md",
  showLabel = true,
  stepper = false,
  className,
}: {
  value: number;
  onChange?: (next: number) => void;
  size?: "sm" | "md" | "lg";
  showLabel?: boolean;
  stepper?: boolean;
  className?: string;
}) {
  const v = Math.min(TOTAL, Math.max(0, Math.round(value)));
  const interactive = typeof onChange === "function";
  const set = (n: number) => {
    if (interactive) onChange(Math.min(TOTAL, Math.max(0, n)));
  };

  const segH =
    size === "lg" ? "h-3.5" : size === "sm" ? "h-2" : "h-2.5";

  return (
    <div className={cls("flex items-center gap-2", className)}>
      {stepper && interactive && (
        <StepButton label="Decrease" disabled={v <= 0} onClick={() => set(v - 1)}>
          <span className="block w-2.5 h-[2px] rounded-full bg-current" />
        </StepButton>
      )}

      <div className="flex items-center gap-[3px] flex-1 min-w-0">
        {Array.from({ length: TOTAL }).map((_, i) => {
          const filled = i < v;
          const isLead = i === v - 1;
          const base = cls(
            "flex-1 min-w-[5px] rounded-full transition-all duration-300",
            segH,
            filled ? "bg-[var(--accent)]" : "bg-white/[0.09]",
            filled && isLead && "shadow-[0_0_12px_-1px_var(--accent)]"
          );
          if (!interactive) return <span key={i} className={base} />;
          return (
            <button
              key={i}
              type="button"
              aria-label={`Set progress to ${i + 1} of ${TOTAL}`}
              onClick={() => set(v === i + 1 ? i : i + 1)}
              className={cls(
                base,
                "cursor-pointer hover:brightness-110",
                !filled && "hover:bg-[var(--accent)]/45"
              )}
            />
          );
        })}
      </div>

      {stepper && interactive && (
        <StepButton label="Increase" disabled={v >= TOTAL} onClick={() => set(v + 1)}>
          <span className="relative block w-2.5 h-2.5">
            <span className="absolute top-1/2 left-0 w-full h-[2px] -translate-y-1/2 rounded-full bg-current" />
            <span className="absolute left-1/2 top-0 h-full w-[2px] -translate-x-1/2 rounded-full bg-current" />
          </span>
        </StepButton>
      )}

      {showLabel && (
        <span className="shrink-0 font-mono tabular-nums text-[11px] text-glance-faint">
          <span className="text-[13px] font-bold text-[var(--accent)]">{v}</span>
          <span className="text-glance-muted">/{TOTAL}</span>
        </span>
      )}
    </div>
  );
}

function StepButton({
  label,
  disabled,
  onClick,
  children,
}: {
  label: string;
  disabled?: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      aria-label={label}
      disabled={disabled}
      onClick={onClick}
      className="flex items-center justify-center w-6 h-6 shrink-0 rounded-[8px] bg-white/[0.05] border border-white/10 text-glance-muted transition-all hover:text-[var(--accent)] hover:border-[var(--accent)]/50 hover:bg-[var(--accent)]/10 active:scale-90 disabled:opacity-30 disabled:hover:text-glance-muted disabled:hover:border-white/10 disabled:hover:bg-white/[0.05] disabled:cursor-default"
    >
      {children}
    </button>
  );
}
