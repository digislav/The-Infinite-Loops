import { NextRequest } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { updateReminderCompletion, getJobById } from '@/lib/services/jobServices';
import { apiError, apiSuccess } from '@/lib/utils/apiResponse';

export async function PATCH(
  req: NextRequest,
  context: { params: Promise<{ id: string; activityId: string }> },
) {
  try {
    const { id, activityId } = await context.params;
    const supabase = await createClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) return apiError('AUTH_REQUIRED', 401);

    const { data: job, error: jobError } = await getJobById(id, user.id);
    if (jobError || !job) return apiError('NOT_FOUND', 404);

    const body = await req.json();
    if (typeof body.is_completed !== 'boolean') {
      return apiError('VALIDATION_ERROR', 400);
    }

    const { data, error } = await updateReminderCompletion(user.id, id, activityId, body.is_completed);
    if (error) {
      console.error('PATCH /api/jobs/[id]/activities/[activityId] failed', { jobId: id, activityId, error });
      return apiError('INTERNAL_ERROR', 500);
    }

    return apiSuccess(data);
  } catch (error) {
    console.error('PATCH /api/jobs/[id]/activities/[activityId] unexpected failure', { error });
    return apiError('INTERNAL_ERROR', 500);
  }
}
