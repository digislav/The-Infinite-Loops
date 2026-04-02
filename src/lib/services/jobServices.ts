import { createClient } from '../supabase/client'

const supabase = createClient()

export type Job = {
  id?: string
  user_id: string
  
  // Card Data
  job_title: string
  company_name: string
  location?: string
  current_stage?: 'Interested' | 'Applied' | 'Interview' | 'Offer' | 'Rejected' | 'Archived'
  last_activity_date?: string
  deadline?: string
  is_priority?: boolean

  // Detail Data
  description?: string
  compensation_notes?: string
  application_date?: string
  recruiter_notes?: string
  custom_notes?: string
  
  created_at?: string
  updated_at?: string
}

// 1. GET ALL (filtered on status and deadline)
export async function getJobs(userId: string, filters?: { status?: string, deadline?: string }) {
  let query = supabase
    .from('jobs')
    .select('*')
    .eq('user_id', userId);

  if (filters?.status) {
    query = query.eq('current_stage', filters.status);
  }
  
  if (filters?.deadline) {
    query = query.lte('deadline', filters.deadline);
  }

  const { data, error } = await query.order('created_at', { ascending: false });
  return { data, error };
}

// 2. GET SINGLE (for /api/jobs/:id) -> Returns job details
export async function getJobById(id: string, userId: string) {
  const { data, error } = await supabase
    .from('jobs')
    .select('*')
    .eq('id', id)
    .eq('user_id', userId) 
    .single();
  return { data, error };
}

// 3. CREATE (for POST /api/jobs)
export async function createJob(job: Job) {
  const { data, error } = await supabase
    .from('jobs')
    .insert(job)
    .select()
    .single();
  return { data, error };
}

// 4. UPDATE (for PUT /api/jobs/:id)
export async function updateJob(id: string, userId: string, updates: Partial<Job>) {
  const { data, error } = await supabase
    .from('jobs')
    .update(updates)
    .eq('id', id)
    .eq('user_id', userId)
    .select()
    .single();
  return { data, error };
}

// 5. DELETE (for DELETE /api/jobs/:id)
export async function deleteJob(id: string, userId: string) {
  const { error } = await supabase
    .from('jobs')
    .delete()
    .eq('id', id)
    .eq('user_id', userId);
  return { error };
}