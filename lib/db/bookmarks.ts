import { sql } from "./index";
import { Bookmark } from "@/lib/types";
import { deriveDomain } from "@/lib/styles";

export interface CreateBookmarkInput {
  title: string;
  url: string;
  desc: string;
  categoryId: string;
  previewImage?: string | null;
}

export interface UpdateBookmarkInput {
  title: string;
  url: string;
  desc: string;
  categoryId: string;
  previewImage?: string | null;
}

/**
 * Normalize a raw category id and confirm it exists. Returns `{ id: null }`
 * for an empty selection (the bookmark is "uncategorized"), or throws a clean
 * error if a non-empty id doesn't match a real category — so the API surfaces
 * a friendly 400 instead of a raw foreign-key violation.
 */
async function resolveCategory(
  rawCategoryId: string
): Promise<{ id: string | null; name: string }> {
  const categoryId = rawCategoryId.trim() || null;
  if (!categoryId) return { id: null, name: "" };

  const [row] = await sql`SELECT name FROM categories WHERE id = ${categoryId}`;
  if (!row) throw new Error("Selected category no longer exists");

  return { id: categoryId, name: String(row.name) };
}

function mapRow(row: Record<string, unknown>): Bookmark {
  return {
    id: String(row.id),
    title: String(row.title),
    domain: String(row.domain),
    url: String(row.url),
    tag: String(row.category_name ?? ""),
    categoryId: String(row.category_id ?? ""),
    desc: String(row.description ?? row.desc),
    c1: String(row.c1),
    c2: String(row.c2),
    fg: String(row.fg),
    glyph: String(row.glyph),
    mins: Number(row.mins),
    last: String(row.last_visit ?? row.last),
    visits: Number(row.visits),
    previewImage: row.preview_image == null ? null : String(row.preview_image),
    likeCount: Number(row.like_count ?? 0),
    likedByMe: Boolean(row.liked_by_me ?? false),
  };
}

export async function getBookmarks(
  viewerId: string | null = null
): Promise<Bookmark[]> {
  const rows = await sql`
    SELECT
      b.id,
      b.title,
      b.domain,
      b.url,
      b.description,
      b.category_id,
      c.name AS category_name,
      b.c1,
      b.c2,
      b.fg,
      b.glyph,
      b.mins,
      b.last_visit,
      b.visits,
      b.preview_image,
      (SELECT COUNT(*)::int FROM bookmark_likes l WHERE l.bookmark_id = b.id)
        AS like_count,
      (${viewerId}::text IS NOT NULL AND EXISTS (
        SELECT 1 FROM bookmark_likes l
        WHERE l.bookmark_id = b.id AND l.user_id = ${viewerId}
      )) AS liked_by_me
    FROM bookmarks b
    LEFT JOIN categories c ON b.category_id = c.id
    ORDER BY b.created_at DESC
  `;

  return rows.map(mapRow);
}

export async function createBookmark(
  input: CreateBookmarkInput
): Promise<Bookmark> {
  const title = input.title.trim();
  const url = input.url.trim();
  const desc = input.desc.trim();
  const previewImage = input.previewImage ?? null;

  if (!title) throw new Error("Title is required");
  if (!url) throw new Error("Link is required");

  const { id: categoryId, name: categoryName } = await resolveCategory(
    input.categoryId
  );

  const id = (globalThis.crypto?.randomUUID?.() ??
    `bm_${Date.now()}_${Math.random().toString(36).slice(2)}`) as string;
  const domain = deriveDomain(url) || "yoursite.com";
  const glyph = (title[0] || "+").toUpperCase();

  const rows = await sql`
    INSERT INTO bookmarks (
      id, title, domain, url, category_id, description,
      c1, c2, fg, glyph, mins, last_visit, visits, preview_image
    ) VALUES (
      ${id}, ${title}, ${domain}, ${url}, ${categoryId}, ${desc},
      ${"#00d4ff"}, ${"#7c5cff"}, ${"#06121a"}, ${glyph}, ${0}, ${"just now"}, ${0}, ${previewImage}
    )
    RETURNING id, title, domain, url, category_id, description,
      c1, c2, fg, glyph, mins, last_visit, visits, preview_image
  `;

  return mapRow({ ...rows[0], category_name: categoryName });
}

export async function getBookmarkById(
  id: string,
  viewerId: string | null = null
): Promise<Bookmark | null> {
  const rows = await sql`
    SELECT
      b.id,
      b.title,
      b.domain,
      b.url,
      b.description,
      b.category_id,
      c.name AS category_name,
      b.c1,
      b.c2,
      b.fg,
      b.glyph,
      b.mins,
      b.last_visit,
      b.visits,
      b.preview_image,
      (SELECT COUNT(*)::int FROM bookmark_likes l WHERE l.bookmark_id = b.id)
        AS like_count,
      (${viewerId}::text IS NOT NULL AND EXISTS (
        SELECT 1 FROM bookmark_likes l
        WHERE l.bookmark_id = b.id AND l.user_id = ${viewerId}
      )) AS liked_by_me
    FROM bookmarks b
    LEFT JOIN categories c ON b.category_id = c.id
    WHERE b.id = ${id}
  `;

  const row = rows[0];
  if (!row) return null;

  return mapRow(row);
}

export async function updateBookmark(
  id: string,
  input: UpdateBookmarkInput
): Promise<Bookmark | null> {
  const title = input.title.trim();
  const url = input.url.trim();
  const desc = input.desc.trim();
  const previewImage = input.previewImage ?? null;

  if (!title) throw new Error("Title is required");
  if (!url) throw new Error("Link is required");

  const { id: categoryId, name: categoryName } = await resolveCategory(
    input.categoryId
  );

  const domain = deriveDomain(url) || "yoursite.com";
  const glyph = (title[0] || "+").toUpperCase();

  const rows = await sql`
    UPDATE bookmarks SET
      title = ${title},
      url = ${url},
      domain = ${domain},
      category_id = ${categoryId},
      description = ${desc},
      glyph = ${glyph},
      preview_image = ${previewImage}
    WHERE id = ${id}
    RETURNING id, title, domain, url, category_id, description,
      c1, c2, fg, glyph, mins, last_visit, visits, preview_image
  `;

  const row = rows[0];
  if (!row) return null;

  return mapRow({ ...row, category_name: categoryName });
}

export async function deleteBookmark(id: string): Promise<boolean> {
  const rows = await sql`
    DELETE FROM bookmarks WHERE id = ${id} RETURNING id
  `;
  return rows.length > 0;
}
