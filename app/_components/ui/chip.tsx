import { cls } from "@/lib/styles";

interface ChipProps {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
  size?: "md" | "sm";
  className?: string;
}

export function Chip({
  active,
  onClick,
  children,
  size = "md",
  className,
}: ChipProps) {
  const base =
    "cursor-pointer transition-all duration-150 font-semibold " +
    (size === "md"
      ? "inline-flex items-center gap-[7px] px-[14px] py-2 rounded-full text-[13px]"
      : "px-[15px] py-[9px] rounded-[11px] text-[13.5px]");

  const activeStyle =
    "bg-[var(--accent)] text-white border border-transparent";

  const inactiveStyle =
    "bg-white/[0.04] text-glance-muted-light border border-white/[0.08] hover:bg-white/[0.07]";

  const activeShadow =
    size === "md"
      ? " shadow-[0_6px_18px_-4px_rgba(168,85,247,0.4)]"
      : "";

  return (
    <button
      type="button"
      onClick={onClick}
      className={cls(base, active ? activeStyle + activeShadow : inactiveStyle, className)}
    >
      {children}
    </button>
  );
}
