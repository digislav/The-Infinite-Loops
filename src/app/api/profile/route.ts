import { createClient } from '@/lib/supabase/server';
import { apiSuccess, apiError } from '@/lib/utils/apiResponse';

export async function GET() {
  try {
    const supabase = await createClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return apiError('AUTH_REQUIRED', 401);
    }

    const { data: profile, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('user_id', user.id)
      .single();

    if (error && error.code !== 'PGRST116') {
      return apiError('INTERNAL_ERROR', 500);
    }

    return apiSuccess(profile ?? null);
  } catch {
    return apiError('INTERNAL_ERROR', 500);
  }
}

export async function PUT(request: Request) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return apiError('AUTH_REQUIRED', 401);
    }

    const body = await request.json();
    const { user_id: _stripped, id: _id, ...safeBody } = body;

    const { data, error } = await supabase
      .from('profiles')
      .upsert({ ...safeBody, user_id: user.id }, { onConflict: 'user_id' })
      .select()
      .single();

    if (error) {
      console.error('Profile save error:', error);
      return apiError('INTERNAL_ERROR', 500);
    }

    return apiSuccess(data);
  } catch {
    return apiError('INTERNAL_ERROR', 500);
  }
}
