import { NextRequest } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { apiSuccess, apiError } from '@/lib/utils/apiResponse';
import { getJobById } from '@/lib/services/jobServices';

// PATCH /api/jobs/[id]/documents/[documentId]
// Links or unlinks a document to/from a job by updating the job_id field.
// Linking: sets job_id to the current job.
// Unlinking: sets job_id to null.
//
// Per S1-003 §2.3 — session verification is the first action.
// Per S1-003 §5.2 — ownership enforced on both the job and document.
// Per S1-003 §5.4 — user_id always sourced from session, never body.

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; documentId: string }> },
) {
  try {
    const { id, documentId } = await params;
    const supabase = await createClient();

    // Step 1: Verify the session — first action per S1-003 §2.3.
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) return apiError('AUTH_REQUIRED', 401);

    // Step 2: Parse body to get the action.
    // action: 'link' | 'unlink'
    const body = await request.json();
    const { action } = body;

    if (!action || !['link', 'unlink'].includes(action)) {
      return apiError('VALIDATION_ERROR', 400);
    }

    // Step 3: Verify the caller owns the job they are linking to.
    // Per S1-003 §4.3 — ownership of linked documents verified through parent.
    // Only needed for link — unlink just sets job_id to null.
    if (action === 'link') {
      const { data: job, error: jobError } = await getJobById(id, user.id);
      if (jobError || !job) return apiError('NOT_FOUND', 404);
    }

    // Step 4: Verify the caller owns the document being linked/unlinked.
    // Per S1-003 §5.2 — ownership enforced via .eq('user_id', user.id).
    const { data: doc, error: docError } = await supabase
      .from('documents')
      .select('id, user_id')
      .eq('id', documentId)
      .eq('user_id', user.id)
      .single();

    if (docError || !doc) {
      // Return 404 for ownership mismatches — never 403 per S1-003 §5.5.
      return apiError('NOT_FOUND', 404);
    }

    // Step 5: Update the document's job_id.
    // Link: set job_id to the current job.
    // Unlink: set job_id to null.
    const { data, error } = await supabase
      .from('documents')
      .update({
        job_id: action === 'link' ? id : null,
        updated_at: new Date().toISOString(),
      })
      .eq('id', documentId)
      // Double ownership check — ensure user still owns the document.
      .eq('user_id', user.id)
      .select()
      .single();

    if (error) {
      console.error('PATCH /api/jobs/[id]/documents/[documentId] failed', { error });
      return apiError('INTERNAL_ERROR', 500);
    }

    return apiSuccess(data);
  } catch (error) {
    console.error('PATCH /api/jobs/[id]/documents/[documentId] unexpected failure', { error });
    return apiError('INTERNAL_ERROR', 500);
  }
}
