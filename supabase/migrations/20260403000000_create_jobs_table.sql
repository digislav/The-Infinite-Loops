CREATE TABLE IF NOT EXISTS jobs (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id             UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,

  -- Card Data
  job_title           TEXT NOT NULL,
  company_name        TEXT NOT NULL,
  location            TEXT,
  current_stage       TEXT NOT NULL DEFAULT 'Interested',
  last_activity_date  TIMESTAMPTZ DEFAULT now(),
  deadline            TIMESTAMPTZ,
  is_priority         BOOLEAN DEFAULT false,

  -- Detail Data
  description         TEXT,
  compensation_notes  TEXT,
  application_date    TIMESTAMPTZ,
  recruiter_notes     TEXT,
  custom_notes        TEXT,

  created_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at          TIMESTAMPTZ NOT NULL DEFAULT now(),

  -- Archival Data
  is_archived         BOOLEAN DEFAULT FALSE,
  last_status_before_archive TEXT
);

CREATE INDEX IF NOT EXISTS idx_jobs_user_id ON jobs(user_id);

ALTER TABLE jobs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own jobs"
  ON jobs FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own jobs"
  ON jobs FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own jobs"
  ON jobs FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own jobs"
  ON jobs FOR DELETE
  USING (auth.uid() = user_id);
