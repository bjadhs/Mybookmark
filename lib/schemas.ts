import { z } from "zod";
import {
  CRON_KINDS,
  CRON_TRIGGER_TYPES,
  PROJECT_STATUSES,
  PROJECT_TAGS,
} from "@/lib/types";

/**
 * Canonical Zod schemas for every API boundary. Server routes parse requests
 * with these (via `safeParse`) and clients parse responses with them, so a
 * shape mismatch fails loudly instead of silently corrupting state. Input
 * types are derived with `z.infer` — never hand-write a parallel interface.
 */

/**
 * Thrown for input that parses fine but is semantically rejected by the data
 * layer (e.g. a `categoryId` that no longer exists). `handleApiError` surfaces
 * it as a clean 400 with this message — never as a leaked 500.
 */
export class InvalidInputError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "InvalidInputError";
  }
}

const MAX_TITLE = 200;
const MAX_DESC = 2000;
const MAX_URL = 2048;
const MAX_CATEGORY_NAME = 80;
// Preview images are stored inline (data URLs / remote URLs). Cap the length so
// a single row can't balloon unbounded. ~1.5 MB of base64 ≈ ~1.1 MB binary.
const MAX_PREVIEW_IMAGE = 1_500_000;

/**
 * Parse a raw URL string into a `URL`: trim, default the scheme to https://,
 * and reject anything that isn't http(s). Single source of truth shared by the
 * preview route and the bookmark schema so stored URLs are always valid and
 * consistent with `deriveDomain`.
 */
export function normalizeUrl(raw: string): URL | null {
  let value = raw.trim();
  if (!value) return null;
  if (!/^https?:\/\//i.test(value)) value = `https://${value}`;
  try {
    const url = new URL(value);
    if (url.protocol !== "http:" && url.protocol !== "https:") return null;
    return url;
  } catch {
    return null;
  }
}

/** The canonical href form of a raw URL string, or null if it's not valid. */
export function normalizeUrlString(raw: string): string | null {
  return normalizeUrl(raw)?.href ?? null;
}

/** A non-empty, length-capped URL that is normalized to its canonical href. */
const urlField = z
  .string()
  .trim()
  .min(1, "Link is required")
  .max(MAX_URL, "Link is too long")
  .transform((value, ctx) => {
    const normalized = normalizeUrlString(value);
    if (!normalized) {
      ctx.addIssue({ code: "custom", message: "Enter a valid http(s) URL" });
      return z.NEVER;
    }
    return normalized;
  });

/** Nullable preview image: empty → null; otherwise a capped data/http(s) URL. */
const previewImageField = z
  .preprocess(
    (value) =>
      typeof value === "string" && value.trim() === "" ? null : value,
    z
      .string()
      .max(MAX_PREVIEW_IMAGE, "Preview image is too large")
      .refine(
        (v) => /^data:image\//i.test(v) || /^https?:\/\//i.test(v),
        "Preview image must be an image data URL or http(s) URL"
      )
      .nullable()
  )
  .default(null);

// ── Request schemas (API input) ──────────────────────────────────────────────

export const bookmarkInputSchema = z.object({
  title: z
    .string()
    .trim()
    .min(1, "Title is required")
    .max(MAX_TITLE, "Title is too long"),
  url: urlField,
  desc: z.string().trim().max(MAX_DESC, "Description is too long").default(""),
  // Empty selection means "uncategorized"; existence is verified in the DB layer.
  categoryId: z.string().trim().default(""),
  previewImage: previewImageField,
});

export const projectInputSchema = z.object({
  title: z
    .string()
    .trim()
    .min(1, "Project title is required")
    .max(MAX_TITLE, "Title is too long"),
  tag: z.enum(PROJECT_TAGS).default(""),
  status: z.enum(PROJECT_STATUSES).default("todo"),
  notes: z.string().trim().max(MAX_DESC, "Notes are too long").default(""),
  completion: z.coerce.number().int().min(0).max(10).default(0),
});

export const cronJobInputSchema = z.object({
  title: z
    .string()
    .trim()
    .min(1, "Title is required")
    .max(MAX_TITLE, "Title is too long"),
  body: z.string().trim().max(MAX_DESC, "Message is too long").default(""),
  kind: z.enum(CRON_KINDS).default("custom"),
  triggerType: z.enum(CRON_TRIGGER_TYPES).default("delay"),
  // 1 minute … 24 hours. Used when triggerType === 'delay'.
  delayMinutes: z.coerce.number().int().min(1).max(1440).default(5),
  // "HH:MM" 24-hour. Used when triggerType === 'schedule'.
  scheduleTime: z
    .string()
    .trim()
    .regex(/^([01]\d|2[0-3]):[0-5]\d$/, "Time must be HH:MM (24-hour)")
    .default("09:00"),
  // 1 … 168 hours. Used when triggerType === 'interval' (server_health).
  intervalHours: z.coerce.number().int().min(1).max(168).default(6),
  sendEmail: z.boolean().default(true),
  enabled: z.boolean().default(true),
});

export const categoryInputSchema = z.object({
  name: z
    .string()
    .trim()
    .min(1, "Category name is required")
    .max(MAX_CATEGORY_NAME, "Category name is too long"),
});

export const previewQuerySchema = z.object({
  url: z.string().transform((value, ctx) => {
    const url = normalizeUrl(value);
    if (!url) {
      ctx.addIssue({ code: "custom", message: "A valid http(s) URL is required" });
      return z.NEVER;
    }
    return url;
  }),
});

export type BookmarkInput = z.infer<typeof bookmarkInputSchema>;
export type CategoryInput = z.infer<typeof categoryInputSchema>;
export type ProjectInput = z.infer<typeof projectInputSchema>;
export type CronJobInput = z.infer<typeof cronJobInputSchema>;

// ── Response schemas (validated on the client) ───────────────────────────────

export const categorySchema = z.object({
  id: z.string(),
  name: z.string(),
  count: z.number(),
});
export const categoriesSchema = z.array(categorySchema);

export const bookmarkSchema = z.object({
  id: z.string(),
  title: z.string(),
  domain: z.string(),
  url: z.string(),
  tag: z.string(),
  categoryId: z.string(),
  desc: z.string(),
  c1: z.string(),
  c2: z.string(),
  fg: z.string(),
  glyph: z.string(),
  mins: z.number(),
  last: z.string(),
  visits: z.number(),
  previewImage: z.string().nullable(),
  likeCount: z.number(),
  likedByMe: z.boolean(),
});
export const bookmarksSchema = z.array(bookmarkSchema);

export const likeToggleSchema = z.object({
  liked: z.boolean(),
  likeCount: z.number(),
});

export const projectSchema = z.object({
  id: z.string(),
  position: z.number(),
  title: z.string(),
  tag: z.enum(PROJECT_TAGS),
  status: z.enum(PROJECT_STATUSES),
  notes: z.string(),
  completion: z.number(),
});
export const projectsSchema = z.array(projectSchema);

export const cronJobSchema = z.object({
  id: z.string(),
  title: z.string(),
  body: z.string(),
  kind: z.enum(CRON_KINDS),
  triggerType: z.enum(CRON_TRIGGER_TYPES),
  delayMinutes: z.number(),
  scheduleTime: z.string(),
  intervalHours: z.number(),
  sendEmail: z.boolean(),
  enabled: z.boolean(),
  position: z.number(),
});
export const cronJobsSchema = z.array(cronJobSchema);

export const notificationSchema = z.object({
  id: z.string(),
  title: z.string(),
  body: z.string(),
  read: z.boolean(),
  createdAt: z.string(),
});
