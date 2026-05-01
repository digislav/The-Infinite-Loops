import { createClient } from '@/lib/supabase/server';
import { apiSuccess, apiError } from '@/lib/utils/apiResponse';
import { getJobById, updateJob, deleteJob } from '@/lib/services/jobServices';
import { revalidatePath } from 'next/cache';
import { isDateInputBeforeToday } from '@/lib/utils/dateValidation';
import { NextRequest, NextResponse } from 'next/server';
import { updateJobStage } from '@/lib/services/jobServices';

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  // 1. Check Auth
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { id } = await params;
  const body = await request.json();

  try {
    // 2. Pass all THREE arguments: id, user.id, and the new status
    const { data, error } = await updateJobStage(id, user.id, body.status);

    if (error) return NextResponse.json({ error: error.message }, { status: 400 });
    return NextResponse.json(data);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    return NextResponse.json({ error: message }, { status: 400 });
  }
}

function getDateOnly(value?: string) {
  return value?.slice(0, 10);
}

// GET /api/jobs/:id
// Protected route — returns the full detail record for a single job.
// Per S1-003 §5.2 — ownership enforced inside the service query via
// .eq('user_id', user.id). A non-owner gets null back and receives 404.
// Per S1-003 §5.5 — always 404 for ownership mismatches, never 403.
// Returning 403 would reveal the resource exists which is an info leak.

export async function GET(req: NextRequest, context: { params: Promise<{ id: string }> }) {
  try {
    // Await params per Next.js 15 dynamic route convention.
    const { id } = await context.params;

    // Step 1: Create the server-side Supabase client.
    // Runs on the server — user cannot tamper with this from the browser.
    const supabase = await createClient();

    // Step 2: Verify the session before touching any data.
    // user.id is the only trusted identity — never from the URL or
    // request body per S1-003 §5.4.
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    // Step 3: Reject unauthenticated requests with 401 per S1-001 §7.2.
    if (authError || !user) return apiError('AUTH_REQUIRED', 401);

    // Step 4: Fetch the job through the service layer.
    // getJobById includes .eq('user_id', user.id) — so even if someone
    // guesses another user's job ID from the URL, they get a 404.
    const { data, error } = await getJobById(id, user.id);

    // Step 5: Return 404 if not found or not owned by this user.
    if (error || !data) return apiError('NOT_FOUND', 404);

    // Step 6: Return in the standard apiSuccess envelope per S1-001 §7.1.
    return apiSuccess(data);
  } catch {
    return apiError('INTERNAL_ERROR', 500);
  }
}

// PUT /api/jobs/:id
// Protected route — updates a job record owned by the authenticated user.
// Per S1-003 §5.4 — user_id is stripped from the request body and
// ownership is enforced in the updateJob service query.
//show for b1.4
export async function PUT(req: NextRequest, context: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await context.params;
    const supabase = await createClient();

    // Verify session — first action in every protected handler per S1-003 §2.3.
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) return apiError('AUTH_REQUIRED', 401);

    const body = await req.json();

    // Strip user_id from the request body — per S1-003 §5.4 and §7.
    // user_id must always come from the session, never from what the
    // client sends. This prevents a user from overwriting another user's job.
    const { user_id: _stripped, ...safeBody } = body;
    const deadlineDate = getDateOnly(safeBody.deadline);

    // updateJob includes .eq('user_id', user.id) in its query —
    // so even if the job ID exists, only the owner can update it.
    const { data, error } = await updateJob(id, user.id, safeBody);

    if (error) return apiError('INTERNAL_ERROR', 500);

    // for cache issues
    revalidatePath('/dashboard');
    revalidatePath('/');

    return apiSuccess(data);
  } catch {
    return apiError('INTERNAL_ERROR', 500);
  }
}

// DELETE /api/jobs/:id
// Protected route — deletes a job record owned by the authenticated user.
// Per S1-003 §5.4 — deleteJob enforces ownership in the query so a user
// can never delete another user's job even if they know the job ID.

export async function DELETE(req: NextRequest, context: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await context.params;

    const supabase = await createClient();

    // Verify session — first action in every protected handler per S1-003 §2.3.
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) return apiError('AUTH_REQUIRED', 401);

    // deleteJob includes .eq('user_id', user.id) — ownership enforced
    // in the query itself per S1-003 §5.2.
    const { error } = await deleteJob(id, user.id);

    if (error) {
      // Log only safe metadata — never PII or stack traces per S1-003 §8.2.
      console.error('[DELETE /api/jobs/[id]] Supabase error:', error);
      return apiError('INTERNAL_ERROR', 500);
    }

    // 200 with deleted: true — the job no longer exists for this user.
    return apiSuccess({ deleted: true });
  } catch (err) {
    console.error('[DELETE /api/jobs/[id]] Unexpected error:', err);
    return apiError('INTERNAL_ERROR', 500);
  }
}
