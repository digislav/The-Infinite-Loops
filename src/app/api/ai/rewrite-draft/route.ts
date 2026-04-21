import { createClient } from '@/lib/supabase/server';
import { apiSuccess, apiError } from '@/lib/utils/apiResponse';

// POST /api/ai/rewrite-draft
// Takes an existing draft and a rewrite instruction and returns an
// improved version using the Gemini API.
//
// Per S1-003 §2.3 — session verification is the first action.
// Per S1-003 §5.4 — user_id always sourced from session, never body.
// Per S1-004 — AI output is returned as a draft for user review.

export async function POST(req: Request) {
  try {
    const supabase = await createClient();

    // Step 1: Verify the session — first action per S1-003 §2.3.
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) return apiError('AUTH_REQUIRED', 401);

    // Step 2: Parse the request body.
    const body = await req.json();
    const { draft, instruction } = body;

    // Step 3: Validate required fields.
    if (!draft || typeof draft !== 'string' || draft.trim().length === 0) {
      return apiError('DRAFT_REQUIRED', 400);
    }
    if (!instruction || typeof instruction !== 'string' || instruction.trim().length === 0) {
      return apiError('INSTRUCTION_REQUIRED', 400);
    }

    // Step 4: Enforce a reasonable length limit on the draft to prevent
    // abuse and excessive token usage per S1-003 §8.1.
    if (draft.length > 10000) {
      return apiError('DRAFT_TOO_LONG', 400);
    }

    // Step 5: Build the rewrite prompt for Gemini.
    // The prompt is constructed server-side per S1-004 §3.2.
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

    // Step 6: Call the Gemini API.
    // Per S1-003 §8.1 — API keys must never be exposed to the browser.
    const geminiApiKey = process.env.GEMINI_API_KEY;
    const geminiModel = process.env.GEMINI_MODEL || 'gemini-2.5-flash';

    if (!geminiApiKey) {
      console.error('GEMINI_API_KEY is not set in environment variables');
      return apiError('INTERNAL_ERROR', 500);
    }

    const geminiRes = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${geminiModel}:generateContent?key=${geminiApiKey}`,
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
      if (geminiRes.status === 503 || geminiRes.status === 429) {
        return apiError('AI_UNAVAILABLE', 503);
      }
      return apiError('AI_REWRITE_FAILED', 500);
    }

    const geminiData = await geminiRes.json();

    // Step 7: Extract the rewritten text from the Gemini response.
    const rewrittenText = geminiData?.candidates?.[0]?.content?.parts?.[0]?.text ?? '';

    if (!rewrittenText) {
      return apiError('AI_REWRITE_FAILED', 500);
    }

    // Step 8: Return the rewritten draft.
    // Per S1-004 — AI output is always returned as a draft for user review.
    return apiSuccess({ draft: rewrittenText });
  } catch (error) {
    console.error('POST /api/ai/rewrite-draft unexpected failure', { error });
    return apiError('INTERNAL_ERROR', 500);
  }
}
