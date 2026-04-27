import { NextRequest } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { apiSuccess, apiError } from '@/lib/utils/apiResponse';
import { getJobById } from '@/lib/services/jobServices';

// GET /api/jobs/[id]/documents
// Returns all documents linked to a specific job.
// Ownership enforced — only returns documents owned by the session user
// that are linked to a job the session user also owns.
// Per S1-003 §2.3 — session verification is the first action.
// Per S1-003 §4.3 — child ownership verified through parent.

export async function GET(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const supabase = await createClient();

    // Step 1: Verify the session — first action per S1-003 §2.3.
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) return apiError('AUTH_REQUIRED', 401);

    // Step 2: Verify the caller owns the parent job.
    // Per S1-003 §4.3 — ownership of linked documents is verified
    // through the parent job.
    const { data: job, error: jobError } = await getJobById(id, user.id);
    if (jobError || !job) return apiError('NOT_FOUND', 404);

    // Step 3: Fetch all documents linked to this job owned by this user.
    // Double ownership check — both job_id and user_id must match.
    const { data, error } = await supabase
      .from('documents')
      .select('*')
      .eq('job_id', id)
      .eq('user_id', user.id)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('GET /api/jobs/[id]/documents failed', { jobId: id, error });
      return apiError('INTERNAL_ERROR', 500);
    }

    return apiSuccess(data ?? []);
  } catch (error) {
    console.error('GET /api/jobs/[id]/documents unexpected failure', { error });
    return apiError('INTERNAL_ERROR', 500);
  }
}
