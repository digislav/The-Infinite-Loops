-- Add status and tags columns to the documents table
-- status defaults to 'draft' to match current AI generation logic
-- tags defaults to empty array

ALTER TABLE public.documents 
ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'draft' CHECK (status IN ('draft', 'final', 'archived')),
ADD COLUMN IF NOT EXISTS tags TEXT[] DEFAULT '{}';

-- Create indexes if they don't already exist
CREATE INDEX IF NOT EXISTS idx_documents_status ON public.documents(status);
CREATE INDEX IF NOT EXISTS idx_documents_tags ON public.documents USING GIN (tags);
