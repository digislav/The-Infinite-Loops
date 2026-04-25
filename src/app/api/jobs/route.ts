//ownership check
import { createClient } from '@/lib/supabase/server';
import { apiSuccess, apiError } from '@/lib/utils/apiResponse';
import { getJobs, createJob } from '@/lib/services/jobServices';
import { isDateInputBeforeToday } from '@/lib/utils/dateValidation';

function getDateOnly(value?: string) {
  return value?.slice(0, 10);
}

export async function GET(req: Request) {
  try {
    //show for b1.4 backend enforcement
    const supabase = await createClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return apiError('AUTH_REQUIRED', 401);
    }

    const { searchParams } = new URL(req.url);
    const filters = {
      status: searchParams.get('status') || undefined,
      deadline: searchParams.get('deadline') || undefined,
      // Pass showArchived when filtering by Archived stage so
      // getJobs returns archived jobs instead of hiding them.
      showArchived: searchParams.get('status') === 'Archived' ? true : undefined,
      // Pass all=true when the stats bar needs a full count including
      // archived jobs for the Archived counter to show correctly.
      all: searchParams.get('all') === 'true' ? true : undefined,
    };

    const { data, error } = await getJobs(user.id, filters);
    if (error) return apiError('INTERNAL_ERROR', 500);
    return apiSuccess(data ?? []);
  } catch {
    return apiError('INTERNAL_ERROR', 500);
  }
}

export async function POST(req: Request) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    // Reject unauthenticated requests with 401 per S1-001 §7.2.
    if (authError || !user) return apiError('AUTH_REQUIRED', 401);

    const body = await req.json();

    // Strip user_id from the request body — per S1-003 §5.4.
    // user_id must always come from the session, never from the client.
    const { user_id: _stripped, ...safeBody } = body;
    const deadlineDate = getDateOnly(safeBody.deadline);
    if (deadlineDate && isDateInputBeforeToday(deadlineDate)) {
      return apiError('VALIDATION_ERROR', 400, { deadline: 'Deadline cannot be in the past.' });
    }

    try {
      const newJob = await createJob(user.id, safeBody);
      // 201 Created — per S1-001 §7.2 successful POST returns 201.
      return apiSuccess(newJob, 201);
    } catch {
      return apiError('INTERNAL_ERROR', 500);
    }
  } catch {
    return apiError('INTERNAL_ERROR', 500);
  }
}
