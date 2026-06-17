export function cls(...classes: (string | false | null | undefined)[]) {
  return classes.filter(Boolean).join(" ");
}

export function gradientFromColors(c1: string, c2: string) {
  return `linear-gradient(135deg, ${c1}, ${c2})`;
}

export function heroTintFromColors(c1: string, c2: string) {
  return `linear-gradient(135deg, ${c1}2e, ${c2}14)`;
}

export function deriveDomain(url: string): string {
  return url
    .replace(/^https?:\/\//, "")
    .replace(/^www\./, "")
    .split("/")[0];
}

export function pluralize(count: number, noun: string) {
  return `${count} ${noun}${count === 1 ? "" : "s"}`;
}

export const transitions = {
  fast: "transition-all duration-150",
  base: "transition-all duration-200",
} as const;

export const focusRing =
  "focus:border-glance-focus focus:shadow-[0_0_0_3px_rgba(124,92,255,0.16)]";

export const surfaceBase =
  "rounded-[18px] bg-glance-surface border border-glance-border";

export const tagPill =
  "text-[11.5px] font-semibold text-[#b8a8ff] bg-glance-purple-tag border border-glance-purple-tag-border px-[9px] py-[3px] rounded-[7px]";

export const tagPillLg =
  "text-[12.5px] font-semibold text-[#b8a8ff] bg-glance-purple-tag border border-glance-purple-tag-border px-[11px] py-[5px] rounded-lg";
