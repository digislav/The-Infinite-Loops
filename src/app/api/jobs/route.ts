import { createClient } from '@/lib/supabase/server';
import { apiSuccess, apiError } from '@/lib/utils/apiResponse';
import { getJobs, createJob } from '@/lib/services/jobServices';

export async function GET(req: Request) {
  try {
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

    if (authError || !user) {
      return apiError('AUTH_REQUIRED', 401);
    }

    const body = await req.json();
    const { user_id: _stripped, ...safeBody } = body;

    const { data, error } = await createJob({ ...safeBody, user_id: user.id });
    if (error) return apiError('INTERNAL_ERROR', 500);

    return apiSuccess(data, 201);
  } catch {
    return apiError('INTERNAL_ERROR', 500);
  }
}
