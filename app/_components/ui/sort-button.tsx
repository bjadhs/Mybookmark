import { cls, transitions } from "@/lib/styles";

interface SortButtonProps {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}

export function SortButton({ active, onClick, children }: SortButtonProps) {
  return (
    <button
      onClick={onClick}
      className={cls(
        "px-[13px] py-[7px] rounded-[9px] text-[12.5px] font-semibold cursor-pointer border-none",
        transitions.fast,
        active
          ? "bg-white/[0.09] text-glance-primary"
          : "bg-transparent text-glance-muted hover:text-glance-primary"
      )}
    >
      {children}
    </button>
  );
}
