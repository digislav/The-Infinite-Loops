-- Add status and tags columns to the documents table
-- status defaults to 'draft' to match current AI generation logic
-- tags defaults to empty array

ALTER TABLE public.documents 
ADD COLUMN status TEXT DEFAULT 'draft' CHECK (status IN ('draft', 'final', 'archived')),
ADD COLUMN tags TEXT[] DEFAULT '{}';

-- Create an index on the new columns for faster filtering later
CREATE INDEX idx_documents_status ON public.documents(status);
CREATE INDEX idx_documents_tags ON public.documents USING GIN (tags);
