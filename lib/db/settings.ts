import { sql } from "./index";
import { SiteSettings } from "@/lib/types";
import { mergeSettings } from "@/lib/settings";

/**
 * The whole settings doc lives in one JSONB row (id = 1). We always fold it over
 * the code-level defaults so reads are complete even when the row predates a new
 * field.
 */
export async function getSettings(): Promise<SiteSettings> {
  const rows = await sql`SELECT data FROM site_settings WHERE id = 1`;
  const data = rows[0]?.data as Partial<SiteSettings> | undefined;
  return mergeSettings(data);
}

/**
 * Merge a validated patch into the stored doc and persist the full merged blob.
 * Returns the complete, normalized settings.
 */
export async function updateSettings(
  patch: Partial<SiteSettings>
): Promise<SiteSettings> {
  const current = await getSettings();
  const next = mergeSettings({ ...current, ...patch });
  const json = sql.json(next as unknown as Parameters<typeof sql.json>[0]);

  await sql`
    INSERT INTO site_settings (id, data, updated_at)
    VALUES (1, ${json}, NOW())
    ON CONFLICT (id) DO UPDATE SET data = ${json}, updated_at = NOW()
  `;
  return next;
}
