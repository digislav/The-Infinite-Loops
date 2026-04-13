import { createClient } from '../supabase/server';

export type Job = {
  id?: string;
  user_id: string;
  job_title: string;
  company_name: string;
  location?: string;
  current_stage?:
    | 'Interested'
    | 'Applied'
    | 'Interview'
    | 'Offer'
    | 'Rejected'
    | 'Ghosted'
    | 'Archived';
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

// New type for interviews (S2-011)
export type JobActivity = {
  id?: string;
  job_id: string;
  activity_type: 'STAGE_CHANGE' | 'INTERVIEW_SCHEDULED' | 'NOTE_ADDED';
  timeline_event_type?: string;
  notes?: string;
  // Interview specific fields (S2-011)
  interview_round?: string;
  interview_date?: string;
  location_url?: string;
  activity_date: string;
  created_at?: string;
};

// 1. GET ALL
export async function getJobs(userId: string, filters?: { status?: string; deadline?: string }) {
  const supabase = await createClient();
  let query = supabase.from('jobs').select('*').eq('user_id', userId);

  if (filters?.status) {
    query = query.eq('current_stage', filters.status);
  }

  if (filters?.deadline) {
    query = query.lte('deadline', filters.deadline);
  }

  return await query.order('created_at', { ascending: false });
}

// 2. GET SINGLE
export async function getJobById(id: string, userId: string) {
  const supabase = await createClient();
  return await supabase.from('jobs').select('*').eq('id', id).eq('user_id', userId).single();
}

// 3. CREATE
export async function createJob(userId: string, jobData: Partial<Job>) {
  const supabase = await createClient();

  const { data: newJob, error: jobError } = await supabase
    .from('jobs')
    .insert({
      ...jobData,
      user_id: userId,
      current_stage: jobData.current_stage || 'Interested',
    })
    .select()
    .single();

  if (jobError) throw jobError;

  if (newJob) {
    try {
      await supabase.from('job_activities').insert({
        job_id: newJob.id,
        activity_type: 'STAGE_CHANGE',
        timeline_event_type: newJob.current_stage,
        notes: 'Job entry created',
        activity_date: new Date().toISOString(),
      });
    } catch (err) {
      console.error('Non-fatal: Activity creation failed:', err);
    }
  }

  return newJob;
}

// 4. UPDATE
export async function updateJob(id: string, userId: string, updates: Partial<Job>) {
  const supabase = await createClient();

  if (updates.current_stage) {
    try {
      await supabase.from('job_activities').insert({
        job_id: id,
        activity_type: 'STAGE_CHANGE',
        timeline_event_type: updates.current_stage,
        notes: `Transitioned to ${updates.current_stage}`,
        activity_date: new Date().toISOString(),
      });
      updates.last_activity_date = new Date().toISOString();
    } catch (err) {
      console.error('Non-fatal: Update activity failed:', err);
    }
  }

  return await supabase
    .from('jobs')
    .update(updates)
    .eq('id', id)
    .eq('user_id', userId)
    .select()
    .single();
}

// 5. DELETE
export async function deleteJob(id: string, userId: string) {
  const supabase = await createClient();
  return await supabase.from('jobs').delete().eq('id', id).eq('user_id', userId);
}

// GET interviews — fetches only INTERVIEW_SCHEDULED events for a job.
export async function getInterviewsByJob(jobId: string) {
  const supabase = await createClient();
  return await supabase
    .from('job_activities')
    .select('*')
    .eq('job_id', jobId)
    .eq('activity_type', 'INTERVIEW_SCHEDULED')
    .order('interview_date', { ascending: true });
}

// POST interview — saves a new interview event for a job.
export async function addInterview(userId: string, jobId: string, data: Partial<JobActivity>) {
  const supabase = await createClient();
  return await supabase
    .from('job_activities')
    .insert({
      ...data,
      job_id: jobId,
      activity_type: 'INTERVIEW_SCHEDULED',
      activity_date: new Date().toISOString(),
    })
    .select()
    .single();
}

// GET activities — S2-010: fetches ALL activity timeline events for a job.
// Ownership is enforced through the parent job join per S1-003 §4.3 —
// child tables never store a redundant user_id, ownership is always
// verified through the parent. The join ensures a user can only get
// activities for jobs they own.
export async function getActivitiesByJob(jobId: string, userId: string) {
  const supabase = await createClient();
  return await supabase
    .from('job_activities')
    .select('*, jobs!inner(user_id)')
    // Filter by job ID
    .eq('job_id', jobId)
    // Ownership enforced through parent job — per S1-003 §4.3
    .eq('jobs.user_id', userId)
    // Most recent activity first
    .order('activity_date', { ascending: false });
}
