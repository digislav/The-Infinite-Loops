-- 1. Create the versions table
CREATE TABLE IF NOT EXISTS public.document_versions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  document_id UUID REFERENCES public.documents(id) ON DELETE CASCADE NOT NULL,
  version_number INTEGER NOT NULL,
  content TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- 2. MIGRATION: Copy existing content into version 1
INSERT INTO public.document_versions (document_id, version_number, content, created_at)
SELECT id, 1, content, created_at
FROM public.documents
WHERE content IS NOT NULL;

-- Enable RLS
ALTER TABLE public.document_versions ENABLE ROW LEVEL SECURITY;

-- Policy: Users can do anything (ALL) with a version IF they own the linked document
CREATE POLICY "Users can manage versions of their own documents"
ON public.document_versions
FOR ALL
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.documents
    WHERE documents.id = document_versions.document_id
    AND documents.user_id = auth.uid()
  )
);