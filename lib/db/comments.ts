import { sql } from "./index";
import { Comment } from "@/lib/types";

function mapRow(row: Record<string, unknown>): Comment {
  return {
    id: String(row.id),
    bookmarkId: String(row.bookmark_id),
    userId: String(row.user_id),
    authorName: String(row.author_name),
    authorImage: row.author_image == null ? null : String(row.author_image),
    body: String(row.body),
    createdAt: new Date(row.created_at as string).toISOString(),
  };
}

export async function getComments(bookmarkId: string): Promise<Comment[]> {
  const rows = await sql`
    SELECT id, bookmark_id, user_id, author_name, author_image, body, created_at
    FROM comments
    WHERE bookmark_id = ${bookmarkId}
    ORDER BY created_at ASC
  `;
  return rows.map(mapRow);
}

export interface CreateCommentInput {
  bookmarkId: string;
  userId: string;
  authorName: string;
  authorImage?: string | null;
  body: string;
}

export async function createComment(
  input: CreateCommentInput
): Promise<Comment> {
  const body = input.body.trim();
  if (!body) throw new Error("Comment cannot be empty");
  if (body.length > 2000) throw new Error("Comment is too long");

  const [bookmark] = await sql`SELECT id FROM bookmarks WHERE id = ${input.bookmarkId}`;
  if (!bookmark) throw new Error("Bookmark not found");

  const id = (globalThis.crypto?.randomUUID?.() ??
    `cm_${Date.now()}_${Math.random().toString(36).slice(2)}`) as string;

  const rows = await sql`
    INSERT INTO comments (id, bookmark_id, user_id, author_name, author_image, body)
    VALUES (
      ${id}, ${input.bookmarkId}, ${input.userId},
      ${input.authorName}, ${input.authorImage ?? null}, ${body}
    )
    RETURNING id, bookmark_id, user_id, author_name, author_image, body, created_at
  `;

  return mapRow(rows[0]);
}

export async function getCommentById(id: string): Promise<Comment | null> {
  const rows = await sql`
    SELECT id, bookmark_id, user_id, author_name, author_image, body, created_at
    FROM comments
    WHERE id = ${id}
  `;
  return rows[0] ? mapRow(rows[0]) : null;
}

export async function deleteComment(id: string): Promise<boolean> {
  const rows = await sql`DELETE FROM comments WHERE id = ${id} RETURNING id`;
  return rows.length > 0;
}
