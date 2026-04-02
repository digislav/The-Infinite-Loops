-- Add missing link columns to profiles table
ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS linkedin_url TEXT,
  ADD COLUMN IF NOT EXISTS github_url TEXT,
  ADD COLUMN IF NOT EXISTS portfolio_url TEXT;
