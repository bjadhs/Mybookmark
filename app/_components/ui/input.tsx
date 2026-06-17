import { SearchIcon } from "@/app/_icons";
import { cls, focusRing, transitions } from "@/lib/styles";

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  icon?: React.ReactNode;
  className?: string;
}

export function Input({ icon, className, ...props }: InputProps) {
  return (
    <div className={cls("relative", className)}>
      {icon && (
        <div className="absolute left-[14px] top-1/2 -translate-y-1/2 text-glance-faint">
          {icon}
        </div>
      )}
      <input
        className={cls(
          "w-full py-3 px-4 bg-white/[0.03] border border-white/[0.09] rounded-xl text-glance-primary text-[14.5px] outline-none",
          transitions.fast,
          focusRing,
          icon ? "pl-10" : null
        )}
        {...props}
      />
    </div>
  );
}

interface TextAreaProps
  extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  className?: string;
}

export function TextArea({ className, ...props }: TextAreaProps) {
  return (
    <textarea
      className={cls(
        "w-full py-3 px-4 bg-white/[0.03] border border-white/[0.09] rounded-xl text-glance-primary text-[14.5px] outline-none resize-y leading-[1.5]",
        transitions.fast,
        focusRing,
        className
      )}
      {...props}
    />
  );
}

export function SearchInput(props: Omit<InputProps, "icon">) {
  return (
    <Input
      icon={<SearchIcon className="text-glance-faint" />}
      placeholder="Search bookmarks..."
      {...props}
    />
  );
}
