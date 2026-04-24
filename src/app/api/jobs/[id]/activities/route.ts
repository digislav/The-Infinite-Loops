import { NextRequest } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { apiSuccess, apiError } from '@/lib/utils/apiResponse';
import { getJobById, getActivitiesByJob, addReminder } from '@/lib/services/jobServices';

// GET /api/jobs/:id/activities
// Protected route — returns all activity timeline events for a job.
// Per S1-003 §4.3 — child table ownership is verified through the parent.
// We first confirm the caller owns the job, then fetch its activities.
// Per S1-003 §5.5 — returns 404 for ownership mismatches, never 403.

export async function GET(_req: NextRequest, context: { params: Promise<{ id: string }> }) {
  try {
    // Await params per Next.js 15 dynamic route convention.
    const { id } = await context.params;

    // Step 1: Create the server-side Supabase client.
    // Runs on the server — user cannot tamper with this from the browser.
    const supabase = await createClient();

    // Step 2: Verify the session before touching any data.
    // user.id is the only trusted identity per S1-003 §5.4.
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    // Step 3: Reject unauthenticated requests with 401 per S1-001 §7.2.
    if (authError || !user) return apiError('AUTH_REQUIRED', 401);

    // Step 4: Verify the caller owns the parent job.
    // Per S1-003 §4.3 — ownership of a child entity (job_activities)
    // is always verified through its parent (jobs).
    // If the job doesn't exist or belongs to another user, return 404.
    const { data: job, error: jobError } = await getJobById(id, user.id);
    if (jobError || !job) return apiError('NOT_FOUND', 404);

    // Step 5: Fetch activities through the service layer.
    // getActivitiesByJob joins through the parent job to enforce ownership —
    // a user can only ever see activities for their own jobs.
    const { data, error } = await getActivitiesByJob(id, user.id);

    if (error) {
      // Log only safe metadata — never PII or stack traces per S1-003 §8.2.
      console.error('GET /api/jobs/[id]/activities failed', { jobId: id, error });
      return apiError('INTERNAL_ERROR', 500);
    }

    // Step 6: Return activities in the standard apiSuccess envelope per S1-001 §7.1.
    return apiSuccess(data ?? []);
  } catch (error) {
    console.error('GET /api/jobs/[id]/activities unexpected failure', { error });
    return apiError('INTERNAL_ERROR', 500);
  }
}

export async function POST(req: NextRequest, context: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await context.params;
    const supabase = await createClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) return apiError('AUTH_REQUIRED', 401);

    // Verify the caller owns the parent job before proceeding.
    // Per S1-003 §4.3 — child entity ownership verified through parent.
    const { data: job, error: jobError } = await getJobById(id, user.id);
    if (jobError || !job) return apiError('NOT_FOUND', 404);

    const body = await req.json();
    if (!body.reminder_date) {
      return apiError('VALIDATION_ERROR', 400, { reminder_date: 'Reminder date is required' });
    }

    const reminderDate = new Date(body.reminder_date);
    if (Number.isNaN(reminderDate.getTime())) {
      return apiError('VALIDATION_ERROR', 400, { reminder_date: 'Invalid reminder date' });
    }

    const { data, error } = await addReminder(user.id, id, {
      notes: body.notes || undefined,
      interview_date: reminderDate.toISOString(),
      activity_date: reminderDate.toISOString(),
      is_completed: false,
      timeline_event_type: 'Follow Up',
    });

    if (error) {
      console.error('POST /api/jobs/[id]/activities failed', { jobId: id, error });
      return apiError('INTERNAL_ERROR', 500);
    }

    return apiSuccess(data);
  } catch (error) {
    console.error('POST /api/jobs/[id]/activities unexpected failure', { error });
    return apiError('INTERNAL_ERROR', 500);
  }
}
