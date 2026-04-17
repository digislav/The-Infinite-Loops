-- Career Preferences Table
CREATE TABLE public.career_preferences (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  target_roles TEXT[] DEFAULT '{}', 
  location_preferences TEXT[] DEFAULT '{}',
  work_mode TEXT CHECK (work_mode IN ('Remote', 'On-site', 'Hybrid', 'Any')),
  min_salary INT,
  currency TEXT DEFAULT 'USD',
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  UNIQUE(user_id)
);

-- Enable RLS
ALTER TABLE public.career_preferences ENABLE ROW LEVEL SECURITY;

-- Create policy
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE policyname = 'Users can manage their own career_preferences'
    AND tablename = 'career_preferences'
  ) THEN
    CREATE POLICY "Users can manage own career_preferences"
    ON public.career_preferences FOR ALL
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);
  END IF;
END $$;
