-- Add outcome_notes column to jobs table
ALTER TABLE public.jobs
ADD COLUMN outcome_notes TEXT;
