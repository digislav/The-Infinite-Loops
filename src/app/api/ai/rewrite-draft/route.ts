import { createClient } from '@/lib/supabase/server';
import { apiSuccess, apiError } from '@/lib/utils/apiResponse';

// POST /api/ai/rewrite-draft
// Takes an existing draft and a rewrite instruction and returns an
// improved version using the Gemini API.
//
// Per S1-003 §2.3 — session verification is the first action.
// Per S1-003 §5.4 — user_id always sourced from session, never body.
// Per S1-004 — AI output is returned as a draft for user review.
// The draft content is user-owned data — we verify the session before
// processing it even though it is not a DB record.

export async function POST(req: Request) {
  try {
    // Step 1: Create the server-side Supabase client.
    const supabase = await createClient();

    // Step 2: Verify the session — first action per S1-003 §2.3.
    // We verify auth even for rewrite since the draft may contain
    // sensitive profile or job data the user submitted.
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) return apiError('AUTH_REQUIRED', 401);

    // Step 3: Parse the request body.
    // We accept the draft text and a rewrite instruction from the client.
    // No DB lookups needed — the user is submitting their own draft.
    const body = await req.json();
    const { draft, instruction } = body;

    // Step 4: Validate required fields.
    if (!draft || typeof draft !== 'string' || draft.trim().length === 0) {
      return apiError('DRAFT_REQUIRED', 400);
    }
    if (!instruction || typeof instruction !== 'string' || instruction.trim().length === 0) {
      return apiError('INSTRUCTION_REQUIRED', 400);
    }

    // Step 5: Enforce a reasonable length limit on the draft to prevent
    // abuse and excessive token usage per S1-003 §8.1.
    if (draft.length > 10000) {
      return apiError('DRAFT_TOO_LONG', 400);
    }

    // Step 6: Build the rewrite prompt for Gemini.
    // The prompt is constructed server-side per S1-004 §3.2.
    // We clearly separate the instruction from the draft content
    // to prevent prompt injection from user-supplied text.
    const prompt = `
You are a professional career coach helping a job seeker improve their cover letter draft.

Apply the following instruction to the cover letter draft below.
Return only the improved cover letter — no explanation, no preamble, no commentary.
Keep the same overall structure and length unless the instruction specifically asks to change it.

INSTRUCTION:
${instruction.trim()}

COVER LETTER DRAFT:
${draft.trim()}

Return the improved cover letter now:
    `.trim();

    // Step 7: Call the Gemini API.
    // The API key is read from environment variables — never from the client.
    // Per S1-003 §8.1 — API keys must never be exposed to the browser.
    const geminiApiKey = process.env.GEMINI_API_KEY;
    if (!geminiApiKey) {
      console.error('GEMINI_API_KEY is not set in environment variables');
      return apiError('INTERNAL_ERROR', 500);
    }

    const geminiRes = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${geminiApiKey}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }],
        }),
      },
    );

    if (!geminiRes.ok) {
      const errBody = await geminiRes.text();
      console.error('Gemini API error on rewrite', { status: geminiRes.status, body: errBody });
      return apiError('AI_REWRITE_FAILED', 500);
    }

    const geminiData = await geminiRes.json();

    // Step 8: Extract the rewritten text from the Gemini response.
    const rewrittenText = geminiData?.candidates?.[0]?.content?.parts?.[0]?.text ?? '';

    if (!rewrittenText) {
      return apiError('AI_REWRITE_FAILED', 500);
    }

    // Step 9: Return the rewritten draft.
    // Per S1-004 — AI output is always returned as a draft for user review.
    return apiSuccess({ draft: rewrittenText });
  } catch (error) {
    console.error('POST /api/ai/rewrite-draft unexpected failure', { error });
    return apiError('INTERNAL_ERROR', 500);
  }
}
