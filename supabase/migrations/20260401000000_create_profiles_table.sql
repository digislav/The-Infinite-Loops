-- Create profiles table
CREATE TABLE IF NOT EXISTS profiles (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id      UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  
  -- Identity and Contact
  first_name   TEXT,
  last_name    TEXT,
  email        TEXT,
  phone        TEXT,
  location     TEXT,
  linkedin_url TEXT,
  github_url   TEXT,
  portfolio_url TEXT,

  -- Professional Summary
  headline     TEXT,
  summary      TEXT,

  created_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at   TIMESTAMPTZ NOT NULL DEFAULT now(),

  CONSTRAINT profiles_user_id_unique UNIQUE (user_id)
);

-- Index for fast lookup by user
CREATE INDEX idx_profiles_user_id ON profiles(user_id);

-- Enable Row Level Security
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

-- SELECT: user can only read their own profile
CREATE POLICY "Users can view own profile"
  ON profiles FOR SELECT
  USING (auth.uid() = user_id);

-- INSERT: user_id must equal authenticated user
CREATE POLICY "Users can insert own profile"
  ON profiles FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- UPDATE: user can only update their own profile
CREATE POLICY "Users can update own profile"
  ON profiles FOR UPDATE
  USING (auth.uid() = user_id);

-- DELETE: user can only delete their own profile
CREATE POLICY "Users can delete own profile"
  ON profiles FOR DELETE
  USING (auth.uid() = user_id);
