-- Documents table
CREATE TABLE public.documents (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  job_id UUID REFERENCES public.jobs(id) ON DELETE CASCADE, -- Links to the specific job
  type TEXT CHECK (type IN ('resume', 'cover_letter')),
  name TEXT NOT NULL, -- e.g., "Google Senior Dev Resume"
  content TEXT NOT NULL, -- The actual text of the resume/letter
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Enable RLS so users only see their own documents
ALTER TABLE public.documents ENABLE ROW LEVEL SECURITY;

-- Create policy
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE policyname = 'Users can manage own documents'
    AND tablename = 'documents'
  ) THEN
    CREATE POLICY "Users can manage own documents"
    ON public.documents FOR ALL
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);
  END IF;
END $$;
