import { createClient } from '@/lib/supabase/server';
import { apiSuccess, apiError } from '@/lib/utils/apiResponse';
import { updateEducation, deleteEducation } from '@/lib/services/educationService';
import { isEndDateBeforeStartDate } from '@/lib/utils/dateValidation';

function validateEducationDates(body: {
  start_date?: string;
  end_date?: string;
  is_current?: boolean;
}) {
  if (!body.is_current && isEndDateBeforeStartDate(body.start_date ?? '', body.end_date ?? '')) {
    return 'End date cannot be before the start date.';
  }
  return null;
}

// PUT /api/profile/education/:id
// Updates an existing education record owned by the authenticated user.
// Per S1-003 §5.4 — user_id stripped from body, sourced from session.

export async function PUT(req: Request, context: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await context.params;
    const supabase = await createClient();

    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) return apiError('AUTH_REQUIRED', 401);

    const body = await req.json();

    // Strip user_id from the request body — per S1-003 §5.4.
    const { user_id: _stripped, ...safeBody } = body;
    const validationError = validateEducationDates(safeBody);
    if (validationError) return apiError('VALIDATION_ERROR', 400, { date: validationError });

    // updateEducation includes .eq('user_id', userId) —
    // a user can only update their own records per S1-003 §5.2.
    const { data, error } = await updateEducation(id, user.id, safeBody);

    if (error || !data) return apiError('NOT_FOUND', 404);

    return apiSuccess(data);
  } catch (error) {
    console.error('PUT /api/profile/education/[id] unexpected failure', { error });
    return apiError('INTERNAL_ERROR', 500);
  }
}

// DELETE /api/profile/education/:id
// Deletes an education record owned by the authenticated user.
// Per S1-003 §5.5 — returns 404 for ownership mismatches, never 403.

export async function DELETE(_req: Request, context: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await context.params;
    const supabase = await createClient();

    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) return apiError('AUTH_REQUIRED', 401);

    // deleteEducation includes .eq('user_id', userId) —
    // a user can only delete their own records per S1-003 §5.2.
    const { error } = await deleteEducation(id, user.id);

    if (error) {
      console.error('DELETE /api/profile/education/[id] failed', { id, error });
      return apiError('INTERNAL_ERROR', 500);
    }

    // 204 No Content — per S1-001 §7.2 successful DELETE returns 204.
    return apiSuccess({ deleted: true });
  } catch (error) {
    console.error('DELETE /api/profile/education/[id] unexpected failure', { error });
    return apiError('INTERNAL_ERROR', 500);
  }
}
