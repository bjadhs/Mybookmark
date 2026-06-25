import type {
  AccentKey,
  ManagedPage,
  PageIconKey,
  PageSection,
  SiteSettings,
} from "./types";

/**
 * Shared (client + server) settings helpers. No DB imports here so this module
 * is safe to pull into client components. The DB layer lives in lib/db/settings.
 */

export const ACCENTS: Record<AccentKey, { label: string; hex: string }> = {
  purple: { label: "Purple", hex: "#a855f7" },
  cyan: { label: "Cyan", hex: "#00d4ff" },
  green: { label: "Green", hex: "#1ed760" },
  amber: { label: "Amber", hex: "#febc2e" },
  pink: { label: "Pink", hex: "#f472b6" },
};

export const ACCENT_KEYS = Object.keys(ACCENTS) as AccentKey[];

export function accentHex(accent: AccentKey | string | undefined): string {
  return ACCENTS[(accent as AccentKey) ?? "purple"]?.hex ?? ACCENTS.purple.hex;
}

/** Selectable page icons (validated against patches; mirrors PageIconKey). */
export const PAGE_ICON_KEYS: PageIconKey[] = [
  "server",
  "folder",
  "tag",
  "grid",
  "clock",
  "heart",
  "globe",
  "lock",
  "settings",
  "star",
];

/** Slugs that can never be used as a custom page id (routes / built-ins). */
const RESERVED_SLUGS = new Set([
  "server",
  "agents",
  "category",
  "projects",
  "cron",
  "p",
  "add",
  "settings",
  "locked",
  "sign-in",
  "sign-up",
  "api",
]);

const MAX_PAGES = 24;
const MAX_PERKS = 8;
const MAX_SECTIONS = 12;

/**
 * The three built-in pages. Their locked copy is the witty per-feature teaser
 * that used to be hardcoded in app/locked/page.tsx; it now lives here so admins
 * can edit it in Settings.
 */
export const DEFAULT_PAGES: ManagedPage[] = [
  {
    id: "server",
    builtin: true,
    label: "My Server",
    icon: "clock",
    locked: true,
    lockedIcon: "clock",
    lockedTitle: "Your private command deck is behind this door.",
    lockedDesc:
      "My Server is your personal mission control — the bookmarks you actually live in, front and center. Guests get the museum tour; members get the keys.",
    perks: [
      "Pin the sites you open 40 times a day",
      "A workspace that remembers you, not the internet",
      "Zero clutter, maximum smugness",
    ],
    sections: [],
  },
  {
    id: "agents",
    builtin: true,
    label: "My Agents",
    icon: "folder",
    locked: true,
    lockedIcon: "folder",
    lockedTitle: "The agent bay stays clamped shut for now.",
    lockedDesc:
      "My Agents is where your links get scooped, sorted, and stacked into tidy collections. Right now the claw is hovering… but it won't drop for guests.",
    perks: [
      "Group bookmarks into themed collections",
      "Drag, drop, and hoard without judgement",
      "Find that one link from three months ago, instantly",
    ],
    sections: [],
  },
  {
    id: "category",
    builtin: true,
    label: "Categories",
    icon: "tag",
    locked: true,
    lockedIcon: "tag",
    lockedTitle: "Categories: where chaos learns some manners.",
    lockedDesc:
      "Bend the whole library to your will with custom categories. Admins shape them, members browse them — and guests, well, you're reading this page.",
    perks: [
      "Slice the library by exactly your taste",
      "Color-coded order out of bookmark anarchy",
      "Future-you sends their thanks",
    ],
    sections: [],
  },
];

/** Generic locked-screen copy used when a page id can't be resolved. */
export const FALLBACK_LOCKED = {
  lockedIcon: "heart" as PageIconKey,
  lockedTitle: "Pssst… the good stuff is one sign-in away.",
  lockedDesc:
    "You've wandered into the velvet-rope section of Glance. Like, comment, save, and sort to your heart's content — it just takes an account (it's free, it's quick, it's painless).",
  perks: [
    "Like and comment on bookmarks",
    "Unlock My Server & My Agents",
    "Make the library truly yours",
  ],
};

export const DEFAULT_SETTINGS: SiteSettings = {
  accent: "purple",
  serverName: "Glance Production",
  showLockIcon: true,
  pages: DEFAULT_PAGES,
};

/**
 * Fold a stored (possibly partial / legacy) settings blob over the defaults so
 * callers always get a complete, typed object — even right after a schema bump
 * adds a new field.
 */
export function mergeSettings(
  partial: Partial<SiteSettings> | null | undefined
): SiteSettings {
  const p = (partial ?? {}) as Record<string, unknown>;

  // Legacy v1 blobs stored flat fields instead of a pages array. Fold any such
  // customization onto the built-in pages so nothing the admin set is lost.
  const legacy = {
    serverLabel: typeof p.serverLabel === "string" ? p.serverLabel : undefined,
    agentsLabel: typeof p.agentsLabel === "string" ? p.agentsLabel : undefined,
    lockedTitle: typeof p.lockedTitle === "string" ? p.lockedTitle : undefined,
    lockedSubtitle:
      typeof p.lockedSubtitle === "string" ? p.lockedSubtitle : undefined,
    perks: Array.isArray(p.perks)
      ? p.perks.map((s) => String(s)).filter((s) => s.trim())
      : undefined,
  };

  const stored = Array.isArray(p.pages)
    ? (p.pages as unknown[])
    : undefined;

  // Start from the built-in defaults, then fold each stored page over its
  // same-id default. Built-ins are always present even if the blob omits them.
  const byId = new Map<string, ManagedPage>(
    DEFAULT_PAGES.map((d) => [d.id, { ...d, perks: [...d.perks], sections: [] }])
  );

  if (stored) {
    for (const raw of stored) {
      const page = coercePage(raw, byId);
      if (page) byId.set(page.id, page);
    }
  }

  // Apply legacy flat fields only where the built-in page wasn't overridden by
  // a stored page (no pages array means this is a pure-legacy blob).
  if (!stored) {
    const server = byId.get("server");
    if (server && legacy.serverLabel) server.label = legacy.serverLabel;
    const agents = byId.get("agents");
    if (agents && legacy.agentsLabel) agents.label = legacy.agentsLabel;
    if (legacy.lockedTitle || legacy.lockedSubtitle || legacy.perks) {
      for (const id of ["server", "agents", "category"]) {
        const pg = byId.get(id);
        if (!pg) continue;
        if (legacy.lockedTitle) pg.lockedTitle = legacy.lockedTitle;
        if (legacy.lockedSubtitle) pg.lockedDesc = legacy.lockedSubtitle;
        if (legacy.perks && legacy.perks.length)
          pg.perks = legacy.perks.slice(0, MAX_PERKS);
      }
    }
  }

  // Built-ins first (in canonical order), then custom pages in stored order.
  const pages: ManagedPage[] = [];
  for (const d of DEFAULT_PAGES) {
    const pg = byId.get(d.id);
    if (pg) pages.push(pg);
  }
  if (stored) {
    for (const raw of stored) {
      const id = typeof (raw as { id?: unknown })?.id === "string"
        ? slugify((raw as { id: string }).id)
        : "";
      const pg = byId.get(id);
      if (pg && !pg.builtin && !pages.includes(pg)) pages.push(pg);
    }
  }

  return {
    accent: ACCENTS[p.accent as AccentKey]
      ? (p.accent as AccentKey)
      : DEFAULT_SETTINGS.accent,
    serverName: str(p.serverName, DEFAULT_SETTINGS.serverName),
    showLockIcon:
      typeof p.showLockIcon === "boolean"
        ? p.showLockIcon
        : DEFAULT_SETTINGS.showLockIcon,
    pages: pages.slice(0, MAX_PAGES),
  };
}

/**
 * Turn one stored page entry into a clean ManagedPage merged over its same-id
 * default (built-ins) or a blank custom template. Returns null if unusable.
 */
function coercePage(
  raw: unknown,
  byId: Map<string, ManagedPage>
): ManagedPage | null {
  if (!raw || typeof raw !== "object") return null;
  const r = raw as Record<string, unknown>;
  const rawId = typeof r.id === "string" ? slugify(r.id) : "";
  if (!rawId) return null;

  const builtinDefault = DEFAULT_PAGES.find((d) => d.id === rawId);
  const base: ManagedPage =
    builtinDefault ?? {
      id: rawId,
      builtin: false,
      label: "Untitled",
      icon: "globe",
      locked: true,
      lockedIcon: "lock",
      lockedTitle: "Members only.",
      lockedDesc: "Sign in to view this page.",
      perks: [],
      sections: [],
    };
  // Don't let a stored custom page collide with a reserved/built-in slug.
  if (!builtinDefault && RESERVED_SLUGS.has(rawId)) return null;

  const existing = byId.get(rawId);
  if (existing && existing.builtin && !builtinDefault) return null;

  return {
    id: rawId,
    builtin: base.builtin,
    label: str(r.label, base.label),
    icon: pageIcon(r.icon, base.icon),
    locked: typeof r.locked === "boolean" ? r.locked : base.locked,
    lockedIcon: pageIcon(r.lockedIcon, base.lockedIcon),
    lockedTitle: str(r.lockedTitle, base.lockedTitle),
    lockedDesc: str(r.lockedDesc, base.lockedDesc),
    perks: Array.isArray(r.perks)
      ? r.perks.map((s) => String(s)).filter((s) => s.trim()).slice(0, MAX_PERKS)
      : base.perks,
    sections: base.builtin ? [] : coerceSections(r.sections),
  };
}

function coerceSections(raw: unknown): PageSection[] {
  if (!Array.isArray(raw)) return [];
  return raw
    .map((s) => {
      if (!s || typeof s !== "object") return null;
      const o = s as Record<string, unknown>;
      return {
        heading: typeof o.heading === "string" ? o.heading.slice(0, 160) : "",
        text: typeof o.text === "string" ? o.text.slice(0, 2000) : "",
      } satisfies PageSection;
    })
    .filter((s): s is PageSection => !!s && (!!s.heading || !!s.text))
    .slice(0, MAX_SECTIONS);
}

/**
 * Validate + normalize a client-supplied patch into a clean partial. Anything
 * unrecognized is dropped so the PUT handler can't be used to write junk.
 */
export function sanitizeSettingsPatch(body: unknown): Partial<SiteSettings> {
  if (!body || typeof body !== "object") return {};
  const b = body as Record<string, unknown>;
  const out: Partial<SiteSettings> = {};

  if (typeof b.accent === "string" && ACCENTS[b.accent as AccentKey]) {
    out.accent = b.accent as AccentKey;
  }
  if (typeof b.serverName === "string") {
    out.serverName = b.serverName.slice(0, 240);
  }
  if (typeof b.showLockIcon === "boolean") out.showLockIcon = b.showLockIcon;

  if (Array.isArray(b.pages)) {
    const seen = new Set<string>();
    const pages: ManagedPage[] = [];
    for (const raw of b.pages) {
      const page = sanitizePage(raw, seen);
      if (page) {
        seen.add(page.id);
        pages.push(page);
      }
    }
    // Guarantee the three built-ins survive even if a patch omits them.
    for (const d of DEFAULT_PAGES) {
      if (!seen.has(d.id)) {
        pages.push({ ...d, perks: [...d.perks], sections: [] });
        seen.add(d.id);
      }
    }
    out.pages = pages.slice(0, MAX_PAGES);
  }

  return out;
}

function sanitizePage(raw: unknown, seen: Set<string>): ManagedPage | null {
  if (!raw || typeof raw !== "object") return null;
  const r = raw as Record<string, unknown>;
  const id = typeof r.id === "string" ? slugify(r.id) : "";
  if (!id || seen.has(id)) return null;

  const builtinDefault = DEFAULT_PAGES.find((d) => d.id === id);
  const builtin = !!builtinDefault;
  // A custom page can never claim a reserved/built-in slug.
  if (!builtin && RESERVED_SLUGS.has(id)) return null;

  const base = builtinDefault ?? {
    icon: "globe" as PageIconKey,
    lockedIcon: "lock" as PageIconKey,
  };

  return {
    id,
    builtin, // never trust a client-supplied builtin flag
    label: typeof r.label === "string" ? r.label.slice(0, 240) || "Untitled" : "Untitled",
    icon: pageIcon(r.icon, base.icon),
    locked: typeof r.locked === "boolean" ? r.locked : true,
    lockedIcon: pageIcon(r.lockedIcon, base.lockedIcon),
    lockedTitle:
      typeof r.lockedTitle === "string" ? r.lockedTitle.slice(0, 240) : "",
    lockedDesc:
      typeof r.lockedDesc === "string" ? r.lockedDesc.slice(0, 240) : "",
    perks: Array.isArray(r.perks)
      ? r.perks
          .map((s) => String(s).slice(0, 160))
          .filter((s) => s.trim())
          .slice(0, MAX_PERKS)
      : [],
    sections: builtin ? [] : coerceSections(r.sections),
  };
}

function pageIcon(v: unknown, fallback: PageIconKey): PageIconKey {
  return typeof v === "string" && PAGE_ICON_KEYS.includes(v as PageIconKey)
    ? (v as PageIconKey)
    : fallback;
}

/** Lowercase, hyphenated, url-safe slug (drops anything but a-z0-9 and dashes). */
export function slugify(input: string): string {
  return input
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 48);
}

/** Find a page by id. */
export function pageById(
  settings: SiteSettings,
  id: string
): ManagedPage | undefined {
  return settings.pages.find((p) => p.id === id);
}

/** Route a page lives at: built-ins at /<id>, custom pages at /p/<id>. */
export function pageRoute(page: ManagedPage): string {
  return page.builtin ? `/${page.id}` : `/p/${page.id}`;
}

/** Pages shown in the sidebar nav (built-ins first, custom appended). */
export function navPages(settings: SiteSettings): ManagedPage[] {
  return settings.pages;
}

function str(v: unknown, fallback: string): string {
  return typeof v === "string" && v.trim() ? v : fallback;
}
