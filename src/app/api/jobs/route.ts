import { NextResponse } from 'next/server';
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

export async function POST(request: Request) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    
    // Call the service you just fixed
    const newJob = await createJob(user.id, body);

    return NextResponse.json(newJob);
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'An unexpected error occurred';
    return NextResponse.json(
      { error: errorMessage }, 
      { status: 500 }
    );
  }
}
