import { createClient } from '../supabase/server';

export interface DocumentVersion {
  id: string;
  document_id: string;
  version_number: number;
  content: string;
  created_at: string;
}

/**
 * S3-003: Creates a document AND its initial version (v1)
 */
export async function createDocumentWithVersion(
  userId: string,
  docData: { name: string; type: string; job_id?: string; content: string },
) {
  const supabase = await createClient();

  // 1. Insert into 'documents'
  // We MUST include content here because of your DB constraint!
  const { data: doc, error: docError } = await supabase
    .from('documents')
    .insert([
      {
        user_id: userId,
        name: docData.name,
        type: docData.type,
        job_id: docData.job_id,
        content: docData.content, // <--- ADD THIS LINE
      },
    ])
    .select()
    .single();

  if (docError) throw docError;

  // 2. Insert into 'document_versions' (S3-003 History)
  const { data: version, error: verError } = await supabase
    .from('document_versions')
    .insert([
      {
        document_id: doc.id,
        version_number: 1,
        content: docData.content,
      },
    ])
    .select()
    .single();

  if (verError) throw verError;

  return { ...doc, latest_version: version };
}

/**
 * S3-003: Adds a new snapshot/version of an existing document
 */
// src/lib/services/documentServices.ts

export async function addDocumentVersion(docId: string, content: string) {
  const supabase = await createClient();

  // 1. Get current version count
  const { data: versions } = await supabase
    .from('document_versions')
    .select('version_number')
    .eq('document_id', docId)
    .order('version_number', { ascending: false })
    .limit(1);

  const nextVersion = (versions?.[0]?.version_number || 0) + 1;

  // 2. Insert new version
  return await supabase
    .from('document_versions')
    .insert({
      document_id: docId,
      version_number: nextVersion,
      content: content,
    })
    .select()
    .single();
}

export interface Document {
  id?: string;
  user_id: string;
  job_id?: string; // Optional: can be a general document or linked to a job
  type: 'resume' | 'cover_letter';
  name: string;
  content: string;
  status?: 'draft' | 'final' | 'archived';
  tags?: string[];
  created_at?: string;
  updated_at?: string;
}

export async function createDocument(userId: string, data: Partial<Document>) {
  const supabase = await createClient();
  return await supabase
    .from('documents')
    .insert([{ ...data, user_id: userId }])
    .select()
    .single();
}

export async function getDocumentsByJob(userId: string, jobId: string) {
  const supabase = await createClient();
  return await supabase
    .from('documents')
    .select('*')
    .eq('user_id', userId)
    .eq('job_id', jobId)
    .order('created_at', { ascending: false });
}

export async function updateDocument(id: string, userId: string, updates: Partial<Document>) {
  const supabase = await createClient();
  return await supabase
    .from('documents')
    .update({ ...updates, updated_at: new Date().toISOString() })
    .eq('id', id)
    .eq('user_id', userId)
    .select()
    .single();
}

export async function deleteDocument(id: string, userId: string) {
  const supabase = await createClient();
  return await supabase.from('documents').delete().eq('id', id).eq('user_id', userId);
}
