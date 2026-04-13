//ownership check
import { createClient } from '@/lib/supabase/server';
import { apiSuccess, apiError } from '@/lib/utils/apiResponse';
import { getJobs, createJob } from '@/lib/services/jobServices';

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
    // This prevents a user from creating a job owned by someone else.
    const { user_id: _stripped, ...safeBody } = body;

    const { data, error } = await createJob({ ...safeBody, user_id: user.id });
    if (error) return apiError('INTERNAL_ERROR', 500);

    // 201 Created — per S1-001 §7.2 successful POST returns 201.
    return apiSuccess(data, 201);
  } catch {
    return apiError('INTERNAL_ERROR', 500);
  }
}
