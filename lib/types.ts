export interface Category {
  id: string;
  name: string;
  count: number;
}

export interface Bookmark {
  id: string;
  title: string;
  domain: string;
  url: string;
  tag: string;
  categoryId: string;
  desc: string;
  c1: string;
  c2: string;
  fg: string;
  glyph: string;
  mins: number;
  last: string;
  visits: number;
  previewImage: string | null;
  /** Total likes across all users. */
  likeCount: number;
  /** Whether the current viewer has liked this bookmark (false for guests). */
  likedByMe: boolean;
}

export interface Comment {
  id: string;
  bookmarkId: string;
  userId: string;
  authorName: string;
  authorImage: string | null;
  body: string;
  /** ISO timestamp. */
  createdAt: string;
}

export type Role = "admin" | "user" | "guest";

/** Work state for a tracked project. */
export const PROJECT_STATUSES = ["todo", "in_progress", "done"] as const;
export type ProjectStatus = (typeof PROJECT_STATUSES)[number];

/** The circled label from the source list ('' = no tag). */
export const PROJECT_TAGS = ["", "agentic", "book", "project"] as const;
export type ProjectTag = (typeof PROJECT_TAGS)[number];

/** An admin-only tracked project (the "My Projects" work tracker). */
export interface Project {
  id: string;
  /** Hand-numbered order from the source list; shown as the "#". */
  position: number;
  title: string;
  tag: ProjectTag;
  status: ProjectStatus;
  notes: string;
  /** Progress tracked as steps out of 10 (the on-card progress bar). */
  completion: number;
}

/** A Docker/service container shown on the admin-managed "My Server" page. */
export interface ServerContainer {
  id: string;
  name: string;
  image: string;
  port: string;
  /** Free-text uptime, e.g. "Up 3 days". */
  uptime: string;
  /** "running" | "stopped" | "restarting" | "paused" | "exited". */
  status: string;
  /** CPU usage %. */
  cpu: number;
  /** Memory usage %. */
  mem: number;
}

export const CONTAINER_STATUSES = [
  "running",
  "stopped",
  "restarting",
  "paused",
  "exited",
] as const;
export type ContainerStatus = (typeof CONTAINER_STATUSES)[number];

/** An autonomous agent rig shown on the admin-managed "My Agents" page. */
export interface Agent {
  id: string;
  /** Unit name, e.g. "Agent · Unit 01". */
  name: string;
  /** Short headline / role, e.g. "Research Scout". */
  title: string;
  /** One-line tagline. */
  description: string;
  /** Longer "what it does" write-up shown on the detail page. */
  whatItDoes: string;
  /** Hex color driving this agent's cabinet glow + accents. */
  color: string;
  /** Model the agent runs on, e.g. "claude-opus-4-8". */
  llm: string;
  /** Number of robots shown working in the animation (1–8). */
  robots: number;
  /** Free-text status, e.g. "Cycle running". */
  status: string;
}

/** Palette offered for an agent's accent color (independent of the app theme). */
export const AGENT_COLORS = [
  "#a855f7",
  "#00d4ff",
  "#1ed760",
  "#febc2e",
  "#f472b6",
  "#ff7847",
] as const;

/** What a cron job is — drives its content and which trigger/fields apply. */
export const CRON_KINDS = ["custom", "server_health", "visit_reminder"] as const;
export type CronKind = (typeof CRON_KINDS)[number];

/**
 * How a cron job becomes due:
 *  - delay:    N minutes after the viewer opens the app
 *  - schedule: a daily time-of-day
 *  - interval: every N hours while the viewer has the app open (server_health)
 *  - manual:   never automatically — only via the Send button (visit_reminder)
 */
export const CRON_TRIGGER_TYPES = [
  "delay",
  "schedule",
  "interval",
  "manual",
] as const;
export type CronTriggerType = (typeof CRON_TRIGGER_TYPES)[number];

/**
 * An admin-defined cron job (the "/cron" page). Delivered to the user currently
 * viewing the app when the trigger becomes due — as an in-app notification and,
 * when `sendEmail`, an email. `kind` selects the content (static body, generated
 * server-health summary, or a visit nudge).
 */
export interface CronJob {
  id: string;
  title: string;
  body: string;
  kind: CronKind;
  triggerType: CronTriggerType;
  /** Minutes after the user opens the app (trigger='delay'). */
  delayMinutes: number;
  /** Daily time-of-day, "HH:MM" (trigger='schedule'). */
  scheduleTime: string;
  /** Hours between fires while viewing (trigger='interval'). */
  intervalHours: number;
  sendEmail: boolean;
  enabled: boolean;
  position: number;
}

/** A delivered in-app notification belonging to one user. */
export interface Notification {
  id: string;
  title: string;
  body: string;
  read: boolean;
  /** ISO timestamp. */
  createdAt: string;
}

export type AccentKey = "purple" | "cyan" | "green" | "amber" | "pink";

/** Icons selectable for a page's sidebar item and its locked-screen hero. */
export type PageIconKey =
  | "server"
  | "folder"
  | "tag"
  | "grid"
  | "clock"
  | "heart"
  | "globe"
  | "lock"
  | "settings"
  | "star";

/** A heading + body block making up a custom page's editable content. */
export interface PageSection {
  heading: string;
  text: string;
}

/**
 * An admin-managed page. The three built-ins (server/agents/category) have their
 * own rich UI; custom pages render their `sections`. Every page owns its sidebar
 * label/icon, whether it's members-only (`locked`), and its locked-screen copy.
 */
export interface ManagedPage {
  /** Slug. Built-ins: "server" | "agents" | "category". Custom: route is /p/<id>. */
  id: string;
  /** Built-ins can't be deleted and render their own screens, not `sections`. */
  builtin: boolean;
  /** Sidebar nav + page title. */
  label: string;
  /** Sidebar icon. */
  icon: PageIconKey;
  /** Members-only? Guests are steered to the /locked teaser. */
  locked: boolean;
  /** Hero icon shown on the /locked teaser for this page. */
  lockedIcon: PageIconKey;
  /** Hero title on the /locked teaser. */
  lockedTitle: string;
  /** Hero blurb on the /locked teaser. */
  lockedDesc: string;
  /** The "what it does" perks list on the /locked teaser. */
  perks: string[];
  /** Custom-page body content (unused for built-ins). */
  sections: PageSection[];
}

/** Site-wide, admin-editable configuration (single JSON row in site_settings). */
export interface SiteSettings {
  /** Theme accent color preset. */
  accent: AccentKey;
  /** Identity of the server box, shown on the "My Server" page. */
  serverName: string;
  /** Whether guests see the padlock treatment on members-only nav items. */
  showLockIcon: boolean;
  /** Ordered pages: built-ins first, custom pages appended. */
  pages: ManagedPage[];
}

export interface DerivedBookmark extends Bookmark {
  gradient: string;
  heroTint: string;
  /** URL-safe slug derived from the title, used for the /:title route. */
  slug: string;
}

export type Screen = "home" | "add" | "visit";
export type SortKey = "recent" | "az" | "visits";
