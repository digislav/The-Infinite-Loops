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

// Type for all activity timeline events.
// Used by S2-009 (stage transitions), S2-010 (timeline display),
// and S2-011 (interview tracking).
export type JobActivity = {
  id?: string;
  job_id: string;
  activity_type: 'STAGE_CHANGE' | 'INTERVIEW_SCHEDULED' | 'NOTE_ADDED' | 'REMINDER_SET';
  timeline_event_type?: string;
  notes?: string;
  // Interview or reminder specific fields
  interview_round?: string;
  interview_date?: string;
  location_url?: string;
  is_completed?: boolean;
  activity_date: string;
  created_at?: string;
};

const ALLOWED_TRANSITIONS: Record<string, string[]> = {
  Saved: ['Applied', 'Withdrawn'],
  Applied: ['Interviewing', 'Declined', 'Withdrawn'],
  Interviewing: ['Offered', 'Declined', 'Withdrawn'],
  Offered: ['Accepted', 'Declined', 'Withdrawn'],
};

// 1. GET ALL
// Ownership enforced via .eq('user_id', userId) per S1-003 §5.2.
export async function getJobs(
  userId: string,
  filters?: { status?: string; deadline?: string; showArchived?: boolean; all?: boolean },
) {
  const supabase = await createClient();
  let query = supabase.from('jobs').select('*').eq('user_id', userId);

  if (filters?.all) {
    // Return all jobs including archived — used by StatsBar for accurate counts.
  } else if (filters?.status === 'Archived' || filters?.showArchived) {
    query = query.eq('is_archived', true);
  } else {
    query = query.eq('is_archived', false);
  }

  if (filters?.status) {
    query = query.eq('current_stage', filters.status);
  }

  if (filters?.deadline) {
    query = query.lte('deadline', filters.deadline);
  }

  return await query.order('created_at', { ascending: false });
}

// 2. GET SINGLE
// Ownership enforced via .eq('user_id', userId) per S1-003 §5.2.
// Returns null for non-owners — route handler returns 404 per S1-003 §5.5.
export async function getJobById(id: string, userId: string) {
  const supabase = await createClient();
  return await supabase.from('jobs').select('*').eq('id', id).eq('user_id', userId).single();
}

// 3. CREATE
// user_id always comes from the session (passed in by the route handler) —
// never from the request body per S1-003 §5.4.
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

  // Record the initial stage as the first activity event.
  // Only inserted after the job insert succeeds — prevents orphaned
  // activity records if the job insert fails.
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
// Ownership enforced via .eq('user_id', userId) on the jobs update.
// Activity recording happens AFTER the update succeeds — this prevents
// orphaned activity records if the update fails or the job doesn't
// belong to this user per S1-003 §5.2.
//show for b1.4
export async function updateJob(id: string, userId: string, updates: Partial<Job>) {
  const supabase = await createClient();

  // Update last_activity_date whenever the stage or notes change
  // so the dashboard always shows the correct last activity date.
  if (
    updates.current_stage ||
    updates.recruiter_notes !== undefined ||
    updates.custom_notes !== undefined ||
    updates.description !== undefined ||
    updates.compensation_notes !== undefined
  ) {
    updates.last_activity_date = new Date().toISOString();
  }

  // Perform the job update first — ownership enforced here.
  // If this user doesn't own the job the update returns no rows
  // and we skip activity recording entirely.
  const result = await supabase
    .from('jobs')
    .update(updates)
    .eq('id', id)
    .eq('user_id', userId)
    .select()
    .single();

  // Only record activities if the update actually succeeded.
  // Per S1-003 §5.2 — we never write child records for jobs
  // the user doesn't own.
  if (result.data) {
    // Record a STAGE_CHANGE activity if the stage changed.
    // Per S2-009 — stage transitions are recorded with timestamps.
    if (updates.current_stage) {
      try {
        await supabase.from('job_activities').insert({
          job_id: id,
          activity_type: 'STAGE_CHANGE',
          timeline_event_type: updates.current_stage,
          notes: `Transitioned to ${updates.current_stage}`,
          activity_date: new Date().toISOString(),
        });
      } catch (err) {
        console.error('Non-fatal: Stage activity recording failed:', err);
      }
    }

    // Record a NOTE_ADDED activity if any note field was updated.
    // This makes note changes visible as gray dots in the timeline
    // per S2-010. We check for undefined rather than falsy so that
    // clearing a note (empty string) also gets recorded.
    if (
      updates.recruiter_notes !== undefined ||
      updates.custom_notes !== undefined ||
      updates.description !== undefined ||
      updates.compensation_notes !== undefined
    ) {
      try {
        await supabase.from('job_activities').insert({
          job_id: id,
          activity_type: 'NOTE_ADDED',
          notes: 'Notes updated',
          activity_date: new Date().toISOString(),
        });
      } catch (err) {
        console.error('Non-fatal: Note activity recording failed:', err);
      }
    }
  }

  return result;
}

// 5. DELETE
// Ownership enforced via .eq('user_id', userId) per S1-003 §5.2.
export async function deleteJob(id: string, userId: string) {
  const supabase = await createClient();
  return await supabase.from('jobs').delete().eq('id', id).eq('user_id', userId);
}

// GET interviews — fetches only INTERVIEW_SCHEDULED events for a job.
// S2-011 fix: ownership enforced through parent job join per S1-003 §4.3.
// Previously this function had no ownership check — any job ID could be
// passed and activities for jobs the user doesn't own would be returned.
export async function getInterviewsByJob(jobId: string, userId: string) {
  const supabase = await createClient();
  return await supabase
    .from('job_activities')
    .select('*, jobs!inner(user_id)')
    .eq('job_id', jobId)
    // Ownership enforced through parent job — per S1-003 §4.3.
    .eq('jobs.user_id', userId)
    .eq('activity_type', 'INTERVIEW_SCHEDULED')
    .order('interview_date', { ascending: true });
}

// POST interview — saves a new interview event for a job.
// S2-011 fix: ownership of the parent job is verified before inserting.
// Previously this function accepted any jobId without verifying the
// caller owns that job — relying solely on RLS as the only guard.
// Per S1-003 §5.2 — ownership must be verified at the service layer.
export async function addInterview(userId: string, jobId: string, data: Partial<JobActivity>) {
  const supabase = await createClient();

  // Step 1: Verify the caller owns the parent job before inserting.
  // Per S1-003 §4.3 — child entity ownership verified through parent.
  // Returns null if the job doesn't exist or belongs to another user.
  const { data: job } = await supabase
    .from('jobs')
    .select('id')
    .eq('id', jobId)
    .eq('user_id', userId)
    .single();

  // Step 2: Return a safe error if ownership check fails.
  // Per S1-003 §5.5 — never expose whether the resource exists to
  // non-owners. The route handler will return 404.
  if (!job) {
    return { data: null, error: { message: 'Job not found or not owned by user' } };
  }

  // Step 3: Insert the interview activity now that ownership is confirmed.
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

// POST reminder — saves a new reminder event for a job.
// Mirrors addInterview S2-011 fix: ownership of the parent job is verified before inserting.
// Per S1-003 §5.2 — ownership must be verified at the service layer.
export async function addReminder(userId: string, jobId: string, data: Partial<JobActivity>) {
  const supabase = await createClient();

  // Verify the caller owns the parent job before inserting.
  // Per S1-003 §4.3 — child entity ownership verified through parent.
  const { data: job } = await supabase
    .from('jobs')
    .select('id')
    .eq('id', jobId)
    .eq('user_id', userId)
    .single();

  // Return a safe error if ownership check fails.
  // Per S1-003 §5.5 — route handler will return 404.
  if (!job) {
    return { data: null, error: { message: 'Job not found or not owned by user' } };
  }

  return await supabase
    .from('job_activities')
    .insert({
      ...data,
      job_id: jobId,
      activity_type: 'REMINDER_SET',
      is_completed: false,
      timeline_event_type: data.timeline_event_type ?? 'Follow Up',
      activity_date: data.activity_date ?? new Date().toISOString(),
    })
    .select()
    .single();
}

export async function updateReminderCompletion(
  userId: string,
  jobId: string,
  activityId: string,
  isCompleted: boolean,
) {
  const supabase = await createClient();
  return await supabase
    .from('job_activities')
    .update({ is_completed: isCompleted })
    .eq('id', activityId)
    .eq('job_id', jobId)
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

export async function updateJobStage(jobId: string, userId: string, newStage: string) {
  const supabase = await createClient();

  // Fetch current stage to validate the transition
  const { data: job, error: fetchError } = await supabase
    .from('jobs')
    .select('status')
    .eq('id', jobId)
    .eq('user_id', userId)
    .single();

  if (fetchError || !job) throw new Error('Job not found');

  const currentStage = job.status;
  const allowed = ALLOWED_TRANSITIONS[currentStage] || [];

  if (!allowed.includes(newStage)) {
    throw new Error(`Invalid transition: ${currentStage} -> ${newStage}`);
  }

  return await supabase
    .from('jobs')
    .update({ status: newStage })
    .eq('id', jobId)
    .eq('user_id', userId)
    .select()
    .single();
}
