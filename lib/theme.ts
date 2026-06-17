export const theme = {
  colors: {
    bg: "#08080c",
    surface: "#13131b",
    viewport: "#0e0e16",
    primary: "#ececf2",
    muted: "#7a7a8b",
    mutedLight: "#9a9aab",
    faint: "#54546a",
    border: "rgba(255, 255, 255, 0.06)",
    borderStrong: "rgba(255, 255, 255, 0.09)",
    focus: "#7c5cff",
    cyan: "#00d4ff",
    purple: "#7c5cff",
    purpleTag: "rgba(124, 92, 255, 0.13)",
    purpleTagBorder: "rgba(124, 92, 255, 0.2)",
    accentText: "#06121a",
    online: "#1ed760",
    inputPlaceholder: "#55586a",
    heading: "#f5f5f9",
    headingSoft: "#f4f4f8",
    body: "#e9e9f0",
    dimmed: "#d4d4dd",
    subtle: "#c9c9d4",
    description: "#a8a8b8",
    divider: "#3a3a48",
  },

  gradients: {
    accent: "linear-gradient(135deg, #00d4ff, #7c5cff)",
    avatar: "linear-gradient(135deg, #ff7eb3, #7c5cff)",
  },

  fonts: {
    display: "var(--font-space-grotesk)",
    body: "var(--font-manrope)",
  },

  radii: {
    sm: "6px",
    md: "9px",
    lg: "11px",
    xl: "13px",
    xxl: "14px",
    card: "18px",
    cardLg: "20px",
    full: "999px",
  },

  shadows: {
    accent: "0 8px 22px -6px rgba(80, 140, 255, 0.5)",
    accentStrong: "0 10px 28px -6px rgba(80, 140, 255, 0.55)",
    accentBtn: "0 6px 18px -4px rgba(80, 140, 255, 0.4)",
    card: "0 22px 46px -16px rgba(0, 0, 0, 0.7)",
    cardLifted: "0 22px 46px -18px rgba(0, 0, 0, 0.7)",
    visit: "0 30px 70px -24px rgba(0, 0, 0, 0.8)",
    logo: "0 6px 18px rgba(80, 140, 255, 0.35)",
    avatar: "0 12px 30px -8px rgba(0, 0, 0, 0.6)",
  },

  animations: {
    prog: "glance-prog 1.6s ease-in-out infinite",
    pulse: "glance-pulse 2s ease-in-out infinite",
    pulseFast: "glance-pulse 1.4s ease-in-out infinite",
  },

  chrome: {
    close: "#ff5f57",
    minimize: "#febc2e",
    maximize: "#28c840",
  },
} as const;

export const screens = ["home", "add", "visit"] as const;
export type Screen = (typeof screens)[number];

export const sorts = [
  { key: "recent", label: "Recent" },
  { key: "az", label: "A–Z" },
  { key: "visits", label: "Most visited" },
] as const;

export type SortKey = (typeof sorts)[number]["key"];
