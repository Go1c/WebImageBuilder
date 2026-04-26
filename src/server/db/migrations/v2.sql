-- v2 additive migration: project metadata, seed/cfg/steps capture
-- Safe to run multiple times.

ALTER TABLE sessions
  ADD COLUMN IF NOT EXISTS palette text[] NOT NULL DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS cover_asset_id uuid,
  ADD COLUMN IF NOT EXISTS last_task_at timestamptz;

ALTER TABLE generation_tasks
  ADD COLUMN IF NOT EXISTS seed bigint,
  ADD COLUMN IF NOT EXISTS cfg numeric,
  ADD COLUMN IF NOT EXISTS steps integer,
  ADD COLUMN IF NOT EXISTS aspect text;

CREATE INDEX IF NOT EXISTS idx_sessions_last_task_at ON sessions(last_task_at DESC NULLS LAST);
CREATE INDEX IF NOT EXISTS idx_generation_tasks_session_created ON generation_tasks(session_id, created_at DESC);
