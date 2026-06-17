import { sql } from "./index";
import { Category } from "@/lib/types";

function mapRow(row: Record<string, unknown>): Category {
  return {
    id: String(row.id),
    name: String(row.name),
    count: Number(row.count ?? 0),
  };
}

export async function getCategories(): Promise<Category[]> {
  const rows = await sql`
    SELECT
      c.id,
      c.name,
      COUNT(b.id)::int AS count
    FROM categories c
    LEFT JOIN bookmarks b ON b.category_id = c.id
    GROUP BY c.id, c.name
    ORDER BY c.name
  `;

  return rows.map(mapRow);
}

export async function getCategoryById(id: string): Promise<Category | null> {
  const rows = await sql`
    SELECT
      c.id,
      c.name,
      COUNT(b.id)::int AS count
    FROM categories c
    LEFT JOIN bookmarks b ON b.category_id = c.id
    WHERE c.id = ${id}
    GROUP BY c.id, c.name
  `;

  const row = rows[0];
  if (!row) return null;

  return mapRow(row);
}

export async function createCategory(name: string): Promise<Category> {
  const trimmed = name.trim();
  if (!trimmed) throw new Error("Category name is required");

  const id = `cat_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;

  const rows = await sql`
    INSERT INTO categories (id, name)
    VALUES (${id}, ${trimmed})
    RETURNING id, name
  `;

  return mapRow({ ...rows[0], count: 0 });
}

export async function updateCategory(
  id: string,
  name: string
): Promise<Category | null> {
  const trimmed = name.trim();
  if (!trimmed) throw new Error("Category name is required");

  const rows = await sql`
    UPDATE categories SET name = ${trimmed}
    WHERE id = ${id}
    RETURNING id, name
  `;

  const row = rows[0];
  if (!row) return null;

  const countRows = await sql`
    SELECT COUNT(id)::int AS count FROM bookmarks WHERE category_id = ${id}
  `;

  return mapRow({ ...row, count: countRows[0]?.count ?? 0 });
}

export async function deleteCategory(id: string): Promise<boolean> {
  const rows = await sql`
    DELETE FROM categories WHERE id = ${id} RETURNING id
  `;
  return rows.length > 0;
}
