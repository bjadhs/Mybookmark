import { sql } from "./index";
import { Notification } from "@/lib/types";

function mapRow(row: Record<string, unknown>): Notification {
  return {
    id: String(row.id),
    title: String(row.title),
    body: String(row.body ?? ""),
    read: Boolean(row.read),
    createdAt:
      row.created_at instanceof Date
        ? row.created_at.toISOString()
        : String(row.created_at ?? ""),
  };
}

export async function createNotification(
  userId: string,
  title: string,
  body: string
): Promise<Notification> {
  const id = `ntf_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
  const rows = await sql`
    INSERT INTO notifications (id, user_id, title, body)
    VALUES (${id}, ${userId}, ${title}, ${body})
    RETURNING id, title, body, read, created_at
  `;
  return mapRow(rows[0]);
}
