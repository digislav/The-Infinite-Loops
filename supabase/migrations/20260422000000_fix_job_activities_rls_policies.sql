-- Fix missing INSERT, UPDATE, and DELETE RLS policies on job_activities.
-- The original migration (20260410000000) had a copy-paste bug where all three
-- DO blocks checked for the same SELECT policy name, so only the SELECT policy
-- was ever created. This migration adds the missing three policies.

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE policyname = 'Users can insert activities for own jobs'
    AND tablename = 'job_activities'
  ) THEN
    CREATE POLICY "Users can insert activities for own jobs"
    ON public.job_activities FOR INSERT
    WITH CHECK (
      EXISTS (
        SELECT 1 FROM public.jobs
        WHERE jobs.id = job_activities.job_id
        AND jobs.user_id = auth.uid()
      )
    );
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE policyname = 'Users can update activities for own jobs'
    AND tablename = 'job_activities'
  ) THEN
    CREATE POLICY "Users can update activities for own jobs"
    ON public.job_activities FOR UPDATE
    USING (
      EXISTS (
        SELECT 1 FROM public.jobs
        WHERE jobs.id = job_activities.job_id
        AND jobs.user_id = auth.uid()
      )
    );
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE policyname = 'Users can delete activities for own jobs'
    AND tablename = 'job_activities'
  ) THEN
    CREATE POLICY "Users can delete activities for own jobs"
    ON public.job_activities FOR DELETE
    USING (
      EXISTS (
        SELECT 1 FROM public.jobs
        WHERE jobs.id = job_activities.job_id
        AND jobs.user_id = auth.uid()
      )
    );
  END IF;
END $$;
