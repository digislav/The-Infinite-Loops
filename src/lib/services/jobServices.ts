import { createClient } from '@/lib/supabase/server';

export type Job = {
  id?: string;
  user_id: string;
  job_title: string;
  company_name: string;
  location?: string;
  current_stage?: 'Interested' | 'Applied' | 'Interview' | 'Offer' | 'Rejected' | 'Archived';
  last_activity_date?: string;
  deadline?: string;
  is_priority?: boolean;
  description?: string;
  compensation_notes?: string;
  application_date?: string;
  recruiter_notes?: string;
  custom_notes?: string;
  created_at?: string;
  updated_at?: string;
};

export async function getJobs(userId: string, filters?: { status?: string; deadline?: string }) {
  const supabase = await createClient();
  let query = supabase.from('jobs').select('*').eq('user_id', userId);

  if (filters?.status) {
    query = query.eq('current_stage', filters.status);
  }

  if (filters?.deadline) {
    query = query.lte('deadline', filters.deadline);
  }

  return query.order('created_at', { ascending: false });
}

export async function getJobById(id: string, userId: string) {
  const supabase = await createClient();
  return supabase.from('jobs').select('*').eq('id', id).eq('user_id', userId).single();
}

export async function createJob(job: Omit<Job, 'id' | 'created_at' | 'updated_at'>) {
  const supabase = await createClient();
  return supabase.from('jobs').insert(job).select().single();
}

export async function updateJob(id: string, userId: string, updates: Partial<Job>) {
  const supabase = await createClient();
  return supabase.from('jobs').update(updates).eq('id', id).eq('user_id', userId).select().single();
}

export async function deleteJob(id: string, userId: string) {
  const supabase = await createClient();
  return supabase.from('jobs').delete().eq('id', id).eq('user_id', userId);
}
