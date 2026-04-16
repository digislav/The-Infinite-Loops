-- Education table — S2-017
-- Stores education records for each user's profile.
-- Follows the same pattern as the experience table per S1-001 §3.3.
-- Per S1-003 §4.1 — RLS enabled, users can only access their own records.

CREATE TABLE public.education (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  -- Ownership column — per S1-003 §3.3 every user-scoped table must have
  -- user_id with NOT NULL and FK to auth.users ON DELETE CASCADE.
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  -- Required fields per PRD §4.2 education section.
  institution TEXT NOT NULL,
  degree TEXT NOT NULL,
  field_of_study TEXT NOT NULL,
  -- Date fields — stored as DATE so they can be formatted by the UI.
  start_date DATE,
  end_date DATE, -- null if currently enrolled
  is_current BOOLEAN DEFAULT false,
  -- Optional fields per PRD §4.2.
  honors_gpa TEXT,
  description TEXT,
  -- order_index allows user to reorder education entries.
  order_index INT DEFAULT 0,
  -- Timestamps — per S1-001 §3.3 all tables must have created_at and updated_at.
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Index for fast lookup by user — per S1-001 §3.3.
CREATE INDEX idx_education_user_id ON public.education(user_id);

-- Enable Row Level Security — per S1-003 §4.1.
-- RLS is a defence-in-depth measure alongside service-layer ownership checks.
ALTER TABLE public.education ENABLE ROW LEVEL SECURITY;

-- Single policy covering all operations — users can only manage their own records.
-- Per S1-003 §4.2 — auth.uid() = user_id enforces ownership at the DB level.
CREATE POLICY "Users can manage their own education"
ON public.education
FOR ALL
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);
