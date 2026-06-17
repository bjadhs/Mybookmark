import { Bookmark, DerivedBookmark } from "./types";

/** Turn a title into a URL-safe slug, e.g. "Figma Design" -> "figma-design". */
export function slugify(value: string): string {
  return value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

export function deriveBookmark(b: Bookmark): DerivedBookmark {
  return {
    ...b,
    gradient: `linear-gradient(135deg, ${b.c1}, ${b.c2})`,
    heroTint: `linear-gradient(135deg, ${b.c1}2e, ${b.c2}14)`,
    slug: slugify(b.title) || b.id,
  };
}

/** Find a bookmark whose title-slug matches the given route param. Falls back to id match. */
export function findBySlug<T extends Bookmark>(
  bookmarks: T[],
  slug: string
): T | undefined {
  return (
    bookmarks.find((b) => slugify(b.title) === slug) ??
    bookmarks.find((b) => b.id === slug)
  );
}
