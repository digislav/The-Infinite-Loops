-- Experience table
CREATE TABLE IF NOT EXISTS public.experience (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  company_name TEXT NOT NULL,
  role_title TEXT NOT NULL,
  location TEXT,
  start_date DATE,
  end_date DATE, -- Can be null if is_current is true
  is_current BOOLEAN DEFAULT false,
  description TEXT, -- For bullet points/notes
  order_index INT DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.experience ENABLE ROW LEVEL SECURITY;

-- Create Policy
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE policyname = 'Users can manage their own experience'
    AND tablename = 'experience'
  ) THEN
    CREATE POLICY "Users can manage their own experience"
    ON public.experience
    FOR ALL
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);
  END IF;
END $$;
