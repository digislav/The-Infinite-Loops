import { createClient } from '../supabase/server';

export interface Document {
  id?: string;
  user_id: string;
  job_id?: string; // Optional: can be a general document or linked to a job
  type: 'resume' | 'cover_letter';
  name: string;
  content: string;
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
