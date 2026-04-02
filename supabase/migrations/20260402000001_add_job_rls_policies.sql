-- Add RLS policies for the job table

-- 1. Enable RLS (just in case it isn't fully enabled yet)
ALTER TABLE public.job ENABLE ROW LEVEL SECURITY;

-- 2. Restrict SELECT to the owner
CREATE POLICY "Users can view their own jobs" 
  ON public.job FOR SELECT 
  USING (auth.uid() = user_id);

-- 3. Restrict INSERT to the owner
CREATE POLICY "Users can insert their own jobs" 
  ON public.job FOR INSERT 
  WITH CHECK (auth.uid() = user_id);

-- 4. Restrict UPDATE to the owner
CREATE POLICY "Users can update their own jobs" 
  ON public.job FOR UPDATE 
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- 5. Restrict DELETE to the owner
CREATE POLICY "Users can delete their own jobs" 
  ON public.job FOR DELETE 
  USING (auth.uid() = user_id);
