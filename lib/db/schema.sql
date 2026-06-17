CREATE TABLE IF NOT EXISTS categories (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL UNIQUE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS bookmarks (
  id TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  domain TEXT NOT NULL,
  url TEXT NOT NULL,
  -- Nullable: when a category is deleted its bookmarks become "uncategorized"
  -- (ON DELETE SET NULL). A NOT NULL column here would make that impossible.
  category_id TEXT REFERENCES categories(id) ON DELETE SET NULL,
  description TEXT NOT NULL,
  c1 TEXT NOT NULL,
  c2 TEXT NOT NULL,
  fg TEXT NOT NULL,
  glyph TEXT NOT NULL,
  mins INTEGER NOT NULL DEFAULT 0,
  last_visit TEXT NOT NULL DEFAULT 'just now',
  visits INTEGER NOT NULL DEFAULT 0,
  preview_image TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ---------------------------------------------------------------------------
-- Migrations for databases created with an earlier schema. All idempotent.
-- ---------------------------------------------------------------------------

-- preview_image was added after the first release.
ALTER TABLE bookmarks ADD COLUMN IF NOT EXISTS preview_image TEXT;

-- category_id was added after the first release. Ensure it exists and is
-- nullable (older schemas declared it NOT NULL, which conflicts with the
-- ON DELETE SET NULL behaviour and blocks category deletion).
ALTER TABLE bookmarks ADD COLUMN IF NOT EXISTS category_id TEXT;
ALTER TABLE bookmarks ALTER COLUMN category_id DROP NOT NULL;

-- The legacy `tag` column was declared NOT NULL but the app never wrote it,
-- so every INSERT failed. The category name (via the categories join) is the
-- single source of truth for the label now, so drop the redundant column.
ALTER TABLE bookmarks DROP COLUMN IF EXISTS tag;

-- Ensure the category_id foreign key exists (older DBs added the column
-- without it). Postgres names the inline FK `bookmarks_category_id_fkey`.
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'bookmarks_category_id_fkey'
  ) THEN
    ALTER TABLE bookmarks
      ADD CONSTRAINT bookmarks_category_id_fkey
      FOREIGN KEY (category_id) REFERENCES categories(id) ON DELETE SET NULL;
  END IF;
END $$;

-- ---------------------------------------------------------------------------
-- Social features: likes + comments. Any signed-in user can like/comment;
-- only admins can create/edit/delete bookmarks themselves. user_id holds the
-- Clerk user id (no local users table). Rows are removed with their bookmark.
-- ---------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS bookmark_likes (
  bookmark_id TEXT NOT NULL REFERENCES bookmarks(id) ON DELETE CASCADE,
  user_id TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  -- One like per user per bookmark; the like button is a toggle.
  PRIMARY KEY (bookmark_id, user_id)
);

CREATE TABLE IF NOT EXISTS comments (
  id TEXT PRIMARY KEY,
  bookmark_id TEXT NOT NULL REFERENCES bookmarks(id) ON DELETE CASCADE,
  user_id TEXT NOT NULL,
  -- Display fields snapshotted at post time so rendering needs no Clerk call.
  author_name TEXT NOT NULL,
  author_image TEXT,
  body TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS comments_bookmark_id_idx ON comments(bookmark_id);
CREATE INDEX IF NOT EXISTS bookmark_likes_bookmark_id_idx ON bookmark_likes(bookmark_id);

-- ---------------------------------------------------------------------------
-- "My Server" status board. Admin-managed; every user can view, only admins can
-- add / edit / delete. These are display rows (not live docker stats) so the
-- page reads as a 24/7 control deck the admin curates by hand.
-- ---------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS server_containers (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  image TEXT NOT NULL DEFAULT '',
  port TEXT NOT NULL DEFAULT '',
  uptime TEXT NOT NULL DEFAULT 'Up just now',
  status TEXT NOT NULL DEFAULT 'running',
  cpu INTEGER NOT NULL DEFAULT 0,
  mem INTEGER NOT NULL DEFAULT 0,
  position INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Seed the three sample containers, but only when the table is empty so we never
-- clobber an admin's hand-curated list on re-apply.
INSERT INTO server_containers (id, name, image, port, uptime, status, cpu, mem, position)
SELECT * FROM (VALUES
  ('ctr_postgres', 'glance-postgres', 'postgres:16-alpine', '5432→5432', 'Up 3 days', 'running', 4, 38, 0),
  ('ctr_web',      'glance-web',      'glance/next:latest', '3200→3200', 'Up 6 hours', 'running', 11, 54, 1),
  ('ctr_redis',    'glance-redis',    'redis:7-alpine',     '6379→6379', 'Up 3 days', 'running', 2, 17, 2)
) AS v(id, name, image, port, uptime, status, cpu, mem, position)
WHERE NOT EXISTS (SELECT 1 FROM server_containers);

-- ---------------------------------------------------------------------------
-- Site-wide settings: a single JSON row the admin edits from /settings (theme,
-- nav labels, server name, locked-teaser copy, perks). Public to read, admin to
-- write. JSONB so new fields don't need a migration — lib/settings merges over
-- defaults.
-- ---------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS site_settings (
  id INTEGER PRIMARY KEY DEFAULT 1,
  data JSONB NOT NULL DEFAULT '{}'::jsonb,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  CONSTRAINT site_settings_singleton CHECK (id = 1)
);

INSERT INTO site_settings (id, data) VALUES (1, '{}'::jsonb)
ON CONFLICT (id) DO NOTHING;

-- ---------------------------------------------------------------------------
-- "My Agents" board. Admin-managed agent rigs; every user can view the grid and
-- open an /agents/[id] detail page. Only admins add / edit / delete.
-- ---------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS agents (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  title TEXT NOT NULL DEFAULT '',
  description TEXT NOT NULL DEFAULT '',
  what_it_does TEXT NOT NULL DEFAULT '',
  color TEXT NOT NULL DEFAULT '#a855f7',
  llm TEXT NOT NULL DEFAULT '',
  robots INTEGER NOT NULL DEFAULT 4,
  status TEXT NOT NULL DEFAULT 'Cycle running',
  position INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Seed the two sample agents, only when the table is empty.
INSERT INTO agents (id, name, title, description, what_it_does, color, llm, robots, status, position)
SELECT * FROM (VALUES
  ('agt_01', 'Agent · Unit 01', 'Research Scout',
   'Scoops links, sorts them, and stacks tidy collections.',
   'Unit 01 patrols your incoming bookmarks, clusters them into themed collections, and tags duplicates. It runs a continuous grab cycle and hands finished stacks to the library.',
   '#a855f7', 'claude-opus-4-8', 4, 'Cycle running', 0),
  ('agt_02', 'Agent · Unit 02', 'Recall Hound',
   'Tracks targets and resurfaces the link you forgot.',
   'Unit 02 keeps a fast index of everything you have saved and answers "where was that link?" queries instantly, dropping the match straight into the chute.',
   '#00d4ff', 'claude-sonnet-4-6', 6, 'Cycle running', 1)
) AS v(id, name, title, description, what_it_does, color, llm, robots, status, position)
WHERE NOT EXISTS (SELECT 1 FROM agents);
