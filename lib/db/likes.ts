import { sql } from "./index";

export interface LikeState {
  liked: boolean;
  likeCount: number;
}

async function countLikes(bookmarkId: string): Promise<number> {
  const [row] = await sql`
    SELECT COUNT(*)::int AS count FROM bookmark_likes WHERE bookmark_id = ${bookmarkId}
  `;
  return Number(row?.count ?? 0);
}

/**
 * Toggle the viewer's like on a bookmark. Returns the resulting state so the
 * client can update the heart + count from one round-trip. Throws if the
 * bookmark doesn't exist (surfaced as a 404 by the route).
 */
export async function toggleLike(
  bookmarkId: string,
  userId: string
): Promise<LikeState> {
  const [bookmark] = await sql`SELECT id FROM bookmarks WHERE id = ${bookmarkId}`;
  if (!bookmark) throw new Error("Bookmark not found");

  const deleted = await sql`
    DELETE FROM bookmark_likes
    WHERE bookmark_id = ${bookmarkId} AND user_id = ${userId}
    RETURNING bookmark_id
  `;

  if (deleted.length === 0) {
    await sql`
      INSERT INTO bookmark_likes (bookmark_id, user_id)
      VALUES (${bookmarkId}, ${userId})
      ON CONFLICT (bookmark_id, user_id) DO NOTHING
    `;
  }

  return {
    liked: deleted.length === 0,
    likeCount: await countLikes(bookmarkId),
  };
}
