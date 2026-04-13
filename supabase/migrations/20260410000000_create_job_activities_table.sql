-- Create the activities table
CREATE TABLE IF NOT EXISTS public.job_activities (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    job_id UUID NOT NULL REFERENCES public.jobs(id) ON DELETE CASCADE,
    activity_type TEXT NOT NULL, -- e.g., 'STAGE_CHANGE', 'INTERVIEW', 'NOTE'     -- e.g., 'Technical', 'Behavioral'
    notes TEXT NULL,
    activity_date TIMESTAMPTZ DEFAULT now(),
    is_completed BOOLEAN DEFAULT false,
    timeline_event_type TEXT NULL, -- e.g., 'Interview', 'Offer'
    created_at TIMESTAMPTZ DEFAULT now(),
    interview_date TIMESTAMPTZ,
    interview_round TEXT, -- 'Technical', 'HR', etc.
    location_url TEXT   -- Zoom link
);

--  Add an index for faster lookups
CREATE INDEX IF NOT EXISTS idx_job_activities_job_id ON public.job_activities(job_id);

-- Enable Row Level Security
ALTER TABLE public.job_activities ENABLE ROW LEVEL SECURITY;

-- Policy: Users can VIEW activities for jobs THEY own
CREATE POLICY "Users can view activities for own jobs"
ON public.job_activities FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.jobs 
    WHERE jobs.id = job_activities.job_id 
    AND jobs.user_id = auth.uid()
  )
);

-- Policy: Users can INSERT activities only for jobs THEY own
CREATE POLICY "Users can insert activities for own jobs"
ON public.job_activities FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.jobs 
    WHERE jobs.id = job_activities.job_id 
    AND jobs.user_id = auth.uid()
  )
);

-- Policy: Users can DELETE/UPDATE activities only for jobs THEY own
CREATE POLICY "Users can modify activities for own jobs"
ON public.job_activities FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM public.jobs 
    WHERE jobs.id = job_activities.job_id 
    AND jobs.user_id = auth.uid()
  )
);
