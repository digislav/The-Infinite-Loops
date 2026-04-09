import { createClient } from '@/lib/supabase/server';
import { apiSuccess, apiError } from '@/lib/utils/apiResponse';
import { getProfile } from '@/lib/services/profileService';

// GET /api/profile
// Protected route — returns the authenticated user's profile data.
// Per S1-003 §2.3 — session verification is the first action.
// The old version used select('*') directly in this file which was
// the security vulnerability the professor flagged. It has been replaced
// with a call to profileService.ts which only selects specific columns.

export async function GET() {
  try {
    // Step 1: Create the server-side Supabase client.
    // Runs on the server — user cannot tamper with this from the browser.
    const supabase = await createClient();

    // Step 2: Verify the session before touching any data.
    // user.id is the only trusted identity — never from the request
    // body or URL params per S1-003 §5.4.
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    // Step 3: Reject unauthenticated requests with 401.
    // Per S1-001 §7.2 and S1-003 §5.5.
    if (authError || !user) return apiError('AUTH_REQUIRED', 401);

    // Step 4: Fetch through the service layer instead of querying directly.
    // profileService.ts uses select with specific columns only —
    // never select('*') — and enforces ownership via .eq('user_id', userId).
    const { data, error } = await getProfile(user.id);

    // Step 5: Handle the case where the user has no profile yet.
    // PGRST116 means no rows found — this is normal for new users.
    if (error && error.code !== 'PGRST116') {
      console.error('GET /api/profile failed', { userId: user.id, error });
      return apiError('INTERNAL_ERROR', 500);
    }

    // Step 6: Return the profile or null if none exists yet.
    return apiSuccess(data ?? null);
  } catch (error) {
    console.error('GET /api/profile unexpected failure', { error });
    return apiError('INTERNAL_ERROR', 500);
  }
}

// PUT /api/profile
// Protected route — creates or updates the authenticated user's profile.
// Uses upsert so it works for both new and existing profiles.
export async function PUT(request: Request) {
  try {
    // Step 1: Create the server-side Supabase client.
    const supabase = await createClient();

    // Step 2: Verify the session before touching any data.
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    // Step 3: Reject unauthenticated requests with 401.
    if (authError || !user) return apiError('AUTH_REQUIRED', 401);

    const body = await request.json();

    // Step 4: Strip user_id and id from the request body.
    // Per S1-003 §5.4 — user_id must always come from the session,
    // never from what the client sends. This prevents a user from
    // overwriting someone else's profile by injecting a different user_id.
    const { user_id: _stripped, id: _id, ...safeBody } = body;

    // Step 5: Upsert the profile using the session-verified user.id.
    // onConflict: 'user_id' means it updates if a row exists, inserts if not.
    const { data, error } = await supabase
      .from('profiles')
      .upsert({ ...safeBody, user_id: user.id }, { onConflict: 'user_id' })
      .select()
      .single();

    if (error) {
      // Log only safe metadata — never PII or stack traces per S1-003 §8.2.
      console.error('Profile save error:', { userId: user.id, error });
      return apiError('INTERNAL_ERROR', 500);
    }

    // Step 6: Return the saved profile in the standard response envelope.
    return apiSuccess(data);
  } catch (error) {
    console.error('PUT /api/profile unexpected failure', { error });
    return apiError('INTERNAL_ERROR', 500);
  }
}
