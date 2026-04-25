import { createClient } from '@/lib/supabase/server';
import { apiSuccess, apiError } from '@/lib/utils/apiResponse';
import { getEducation, createEducation } from '@/lib/services/educationService';
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

// GET /api/profile/education
// Returns all education records for the authenticated user.
// Per S1-003 §2.3 — session verification is the first action.
// Per S1-003 §5.5 — returns 404 for ownership mismatches, never 403.

export async function GET() {
  try {
    // Step 1: Create the server-side Supabase client.
    // Runs on the server — user cannot tamper with this from the browser.
    const supabase = await createClient();

    // Step 2: Verify the session before touching any data.
    // user.id is the only trusted identity per S1-003 §5.4.
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    // Step 3: Reject unauthenticated requests with 401 per S1-001 §7.2.
    if (authError || !user) return apiError('AUTH_REQUIRED', 401);

    // Step 4: Fetch through the service layer.
    // getEducation enforces ownership via .eq('user_id', userId).
    const { data, error } = await getEducation(user.id);

    if (error) {
      console.error('GET /api/profile/education failed', { userId: user.id, error });
      return apiError('INTERNAL_ERROR', 500);
    }

    return apiSuccess(data ?? []);
  } catch (error) {
    console.error('GET /api/profile/education unexpected failure', { error });
    return apiError('INTERNAL_ERROR', 500);
  }
}

// POST /api/profile/education
// Creates a new education record for the authenticated user.
// Per S1-003 §5.4 — user_id always sourced from session, never request body.

export async function POST(req: Request) {
  try {
    const supabase = await createClient();

    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) return apiError('AUTH_REQUIRED', 401);

    const body = await req.json();

    // Strip user_id from the request body — per S1-003 §5.4.
    // user_id must always come from the session, never from the client.
    const { user_id: _stripped, ...safeBody } = body;
    const validationError = validateEducationDates(safeBody);
    if (validationError) return apiError('VALIDATION_ERROR', 400, { date: validationError });

    const { data, error } = await createEducation(user.id, safeBody);

    if (error) {
      console.error('POST /api/profile/education failed', { userId: user.id, error });
      return apiError('INTERNAL_ERROR', 500);
    }

    // 201 Created — per S1-001 §7.2 successful POST returns 201.
    return apiSuccess(data, 201);
  } catch (error) {
    console.error('POST /api/profile/education unexpected failure', { error });
    return apiError('INTERNAL_ERROR', 500);
  }
}
