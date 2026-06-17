import { cls } from "@/lib/styles";

interface SectionLabelProps {
  children: React.ReactNode;
  className?: string;
}

export function SectionLabel({ children, className }: SectionLabelProps) {
  return (
    <div
      className={cls(
        "text-[11px] font-bold tracking-[0.8px] text-glance-faint uppercase",
        className
      )}
    >
      {children}
    </div>
  );
}

interface FormFieldProps {
  label: string;
  children: React.ReactNode;
  className?: string;
}

export function FormField({ label, children, className }: FormFieldProps) {
  return (
    <div className={cls("mb-[22px]", className)}>
      <label className="block text-[11.5px] font-bold tracking-[0.5px] uppercase text-glance-muted mb-[9px]">
        {label}
      </label>
      {children}
    </div>
  );
}

interface BackLinkProps {
  onClick: () => void;
  children: React.ReactNode;
}

export function BackLink({ onClick, children }: BackLinkProps) {
  return (
    <button
      onClick={onClick}
      className="inline-flex items-center gap-[7px] bg-transparent border-none text-glance-muted font-semibold text-[13.5px] cursor-pointer p-0 mb-[18px] transition-all hover:text-glance-primary"
    >
      {children}
    </button>
  );
}

export function LiveBadge() {
  return (
    <div className="flex items-center gap-2 mb-[13px]">
      <span className="w-[7px] h-[7px] rounded-full bg-glance-online shadow-[0_0_8px_#1ed760] animate-glance-pulse" />
      <span className="text-xs font-bold tracking-[0.5px] text-glance-muted uppercase">
        Live preview
      </span>
    </div>
  );
}

export function PageTitle({ children }: { children: React.ReactNode }) {
  return (
    <h1 className="font-[family-name:var(--font-space-grotesk)] text-[30px] font-bold text-[#f5f5f9] tracking-[-0.5px] mb-1">
      {children}
    </h1>
  );
}

export function PageSubtitle({ children }: { children: React.ReactNode }) {
  return (
    <p className="text-glance-muted text-[14.5px] mb-7">{children}</p>
  );
}
