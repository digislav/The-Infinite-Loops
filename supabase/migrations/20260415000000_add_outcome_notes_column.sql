-- Add outcome_notes column to jobs table
ALTER TABLE public.jobs
ADD COLUMN IF NOT EXISTS outcome_notes TEXT;
