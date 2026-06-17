import { cls, transitions } from "@/lib/styles";

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "primary" | "secondary" | "ghost";
  size?: "sm" | "md" | "lg";
  children: React.ReactNode;
}

const variantStyles = {
  primary:
    "bg-[var(--accent)] text-white border-none shadow-[0_8px_22px_-6px_rgba(168,85,247,0.5)] hover:brightness-[1.06]",
  secondary:
    "bg-white/[0.04] border border-white/10 text-[#c9c9d4] hover:bg-white/[0.07]",
  ghost: "bg-transparent border-none text-glance-muted hover:text-glance-primary hover:bg-white/[0.04]",
};

const sizeStyles = {
  sm: "px-[13px] py-[7px] text-[12.5px] rounded-[9px]",
  md: "py-3 px-4 text-sm rounded-xl",
  lg: "py-[15px] px-4 text-[15px] rounded-[13px]",
};

export function Button({
  variant = "primary",
  size = "md",
  className,
  children,
  ...props
}: ButtonProps) {
  return (
    <button
      className={cls(
        "font-semibold cursor-pointer",
        transitions.fast,
        variantStyles[variant],
        sizeStyles[size],
        className
      )}
      {...props}
    >
      {children}
    </button>
  );
}
