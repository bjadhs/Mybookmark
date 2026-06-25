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

-- The N8N + Hermes rigs map to real containers on the server. Inserted per-row
-- (ON CONFLICT DO NOTHING) so they also land on databases seeded before these
-- existed, without disturbing the admin's edits.
INSERT INTO agents (id, name, title, description, what_it_does, color, llm, robots, status, position)
VALUES
  ('agt_n8n', 'N8N Agent', 'Workflow Automation',
   'Wires your stack together and runs jobs on a schedule.',
   'The N8N rig orchestrates multi-step workflows across your services — webhooks in, transforms in the middle, and side effects out to Postgres, Slack, and HTTP endpoints. It runs in queue mode with a pool of workers and keeps seven workflows live around the clock.',
   '#f472b6', 'n8n · self-hosted', 5, 'Cycle running', 2),
  ('agt_hermes', 'Hermes Agent', 'Reasoning Engine',
   'Tool-calling reasoning agent with long-context recall.',
   'The Hermes rig pairs the Nous Research Hermes-4 model with a tool-calling loop: it plans, calls functions, reads from a vector memory backed by Postgres, and writes results back. A 128k context window lets it hold whole working sets in mind across a run.',
   '#00d4ff', 'Hermes-4 · 128k', 6, 'Cycle running', 3)
ON CONFLICT (id) DO NOTHING;

-- ---------------------------------------------------------------------------
-- "My Projects" work tracker. Admin-only (the page and its API both require an
-- admin). `position` is the hand-numbered order from the source list (1..N) and
-- is what the UI shows as the "#". `tag` is the circled label (agentic/book/
-- project, or '' for none); `status` is the work state.
-- ---------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS projects (
  id TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  tag TEXT NOT NULL DEFAULT '',
  status TEXT NOT NULL DEFAULT 'todo',
  notes TEXT NOT NULL DEFAULT '',
  -- Completion is tracked as steps out of 10 (the on-card progress bar).
  completion INTEGER NOT NULL DEFAULT 0,
  position INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- completion was added after the projects table first shipped.
ALTER TABLE projects ADD COLUMN IF NOT EXISTS completion INTEGER NOT NULL DEFAULT 0;

-- ---------------------------------------------------------------------------
-- Cron jobs + notifications. Admins define jobs on /cron; each fires for the
-- user currently viewing the app — either a delay after they open it, or at a
-- daily time-of-day — delivering a static message as an in-app notification and
-- (optionally) an email. There is no server scheduler: the browser evaluates
-- which jobs are due and POSTs /api/cron/[id]/fire. `cron_deliveries` is the
-- idempotency ledger so a job fires at most once per user per occurrence.
-- ---------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS cron_jobs (
  id TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  body TEXT NOT NULL DEFAULT '',
  -- What the job is: 'custom' | 'server_health' | 'visit_reminder'. Drives the
  -- content and which trigger/fields apply.
  kind TEXT NOT NULL DEFAULT 'custom',
  -- 'delay' = N min after open; 'schedule' = daily HH:MM; 'interval' = every N
  -- hours while viewing (server_health); 'manual' = only via the Send button.
  trigger_type TEXT NOT NULL DEFAULT 'delay',
  delay_minutes INTEGER NOT NULL DEFAULT 5,
  schedule_time TEXT NOT NULL DEFAULT '09:00',
  interval_hours INTEGER NOT NULL DEFAULT 6,
  send_email BOOLEAN NOT NULL DEFAULT TRUE,
  enabled BOOLEAN NOT NULL DEFAULT TRUE,
  position INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- kind + interval_hours were added after cron_jobs first shipped.
ALTER TABLE cron_jobs ADD COLUMN IF NOT EXISTS kind TEXT NOT NULL DEFAULT 'custom';
ALTER TABLE cron_jobs ADD COLUMN IF NOT EXISTS interval_hours INTEGER NOT NULL DEFAULT 6;

-- In-app notifications: one row per user per delivery. user_id is the Clerk id.
CREATE TABLE IF NOT EXISTS notifications (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  title TEXT NOT NULL,
  body TEXT NOT NULL DEFAULT '',
  read BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS notifications_user_idx ON notifications(user_id, read);

-- Idempotency ledger. The composite PK means a duplicate fire (double poll,
-- reload) conflicts instead of delivering twice. occurrence_key is the UTC date
-- bucket, e.g. 'delay:2026-06-25' — so a job lands at most once per day per user.
CREATE TABLE IF NOT EXISTS cron_deliveries (
  job_id TEXT NOT NULL REFERENCES cron_jobs(id) ON DELETE CASCADE,
  user_id TEXT NOT NULL,
  occurrence_key TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  PRIMARY KEY (job_id, user_id, occurrence_key)
);

-- Seed the initial 14-item project list, only when the table is empty so we
-- never clobber the admin's tracked progress on a re-apply.
INSERT INTO projects (id, title, tag, status, notes, position)
SELECT * FROM (VALUES
  ('prj_01', 'Job Application', '', 'todo', '', 1),
  ('prj_02', 'Resume CV Agent / Claude RCV / Claude-loop', 'agentic', 'todo', '', 2),
  ('prj_03', 'Communication & Interview Practice', '', 'todo', '', 3),
  ('prj_04', 'Networking & LinkedIn', '', 'todo', '', 4),
  ('prj_05', 'Light & Night Code', 'agentic', 'todo', '', 5),
  ('prj_06', 'Resume Portfolio / React / Github', '', 'todo', '', 6),
  ('prj_07', 'Hiday — a productivity app', '', 'todo', '', 7),
  ('prj_08', 'Mybookmark — everything in one', '', 'todo', '', 8),
  ('prj_09', 'Emburontoaark & Ecomm — projects showcase', 'project', 'todo', '', 9),
  ('prj_10', 'Raspberry Pi & Hostinger Server', '', 'todo', '', 10),
  ('prj_11', 'Agentic Loop (kimi & claude) — coding auto', 'agentic', 'todo', '', 11),
  ('prj_12', 'Websites & AI business — 70 pages', 'book', 'todo', '', 12),
  ('prj_13', 'Stock Analysis — investing', 'agentic', 'todo', '', 13),
  ('prj_14', 'Postgresql & Agentic harness', 'book', 'todo', '', 14)
) AS v(id, title, tag, status, notes, position)
WHERE NOT EXISTS (SELECT 1 FROM projects);
