import { NextRequest } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { apiSuccess, apiError } from '@/lib/utils/apiResponse';
import { getJobById, updateJob, deleteJob } from '@/lib/services/jobServices';

export async function GET(req: NextRequest, context: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await context.params;
    const supabase = await createClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) return apiError('AUTH_REQUIRED', 401);

    const { data, error } = await getJobById(id, user.id);
    if (error || !data) return apiError('NOT_FOUND', 404);

    return apiSuccess(data);
  } catch {
    return apiError('INTERNAL_ERROR', 500);
  }
}

export async function PUT(req: NextRequest, context: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await context.params;
    const supabase = await createClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) return apiError('AUTH_REQUIRED', 401);

    const body = await req.json();
    const { user_id: _stripped, ...safeBody } = body;

    const { data, error } = await updateJob(id, user.id, safeBody);
    if (error) return apiError('INTERNAL_ERROR', 500);

    return apiSuccess(data);
  } catch {
    return apiError('INTERNAL_ERROR', 500);
  }
}

export async function DELETE(req: NextRequest, context: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await context.params;
    const supabase = await createClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) return apiError('AUTH_REQUIRED', 401);

    const { error } = await deleteJob(id, user.id);
    if (error) return apiError('INTERNAL_ERROR', 500);

    return apiSuccess(null, 204);
  } catch {
    return apiError('INTERNAL_ERROR', 500);
  }
}
