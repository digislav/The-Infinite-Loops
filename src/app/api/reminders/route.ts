import { createClient } from '@/lib/supabase/server';
import { apiSuccess, apiError } from '@/lib/utils/apiResponse';

// GET /api/reminders
// Returns all upcoming, incomplete reminders for the authenticated user across all jobs.
// Ownership enforced through parent job join per S1-003 §4.3.
// "Upcoming" = interview_date is in the future and is_completed is false.
export async function GET() {
  const supabase = await createClient();

  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) return apiError('AUTH_REQUIRED', 401);

  const { data, error } = await supabase
    .from('job_activities')
    .select(
      'id, notes, interview_date, timeline_event_type, job_id, jobs!inner(job_title, company_name)',
    )
    .eq('jobs.user_id', user.id)
    .eq('activity_type', 'REMINDER_SET')
    .eq('is_completed', false)
    .gt('interview_date', new Date().toISOString())
    .order('interview_date', { ascending: true });

  if (error) {
    console.error('GET /api/reminders failed', { error });
    return apiError('INTERNAL_ERROR', 500);
  }

  return apiSuccess(data ?? []);
}
