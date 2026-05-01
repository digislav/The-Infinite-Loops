import { createClient } from '@/lib/supabase/server';
import { apiSuccess, apiError } from '@/lib/utils/apiResponse';
import { getJobById } from '@/lib/services/jobServices';

// POST /api/ai/generate-company-research
// Generates company research notes using the Gemini API based on a job record
// and user-provided context.
//
// Per S1-003 §2.3 — session verification is the first action.
// Per S1-003 §5.4 — user_id always sourced from session, never body.
// Per S1-004 — AI-generated content is clearly labelled as a draft/unverified.

export async function POST(req: Request) {
  try {
    const supabase = await createClient();

    // Step 1: Verify the session — first action per S1-003 §2.3.
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) return apiError('AUTH_REQUIRED', 401);

    // Step 2: Parse the request body to get jobId and context.
    const body = await req.json();
    const { jobId, context } = body;

    if (!jobId) return apiError('VALIDATION_ERROR', 400, { jobId: 'jobId is required' });

    // Step 3: Fetch the job record server-side using the verified session user.id.
    const { data: job, error: jobError } = await getJobById(jobId, user.id);

    if (jobError || !job) {
      return apiError('NOT_FOUND', 404, { message: 'Job not found' });
    }

    // Step 4: Build the prompt for Gemini.
    // The prompt guides the AI to generate structured business research.
    const userInstructions = context?.trim()
      ? `User provided the following specific focus areas/context for this research: "${context}"`
      : 'Provide a general overview of the company, focusing on its core products, recent news/funding, and culture.';

    const prompt = `
You are an expert business analyst and career coach.

Please research and summarize key information about the company "${job.company_name}" that would be highly relevant for a candidate applying for the role of "${job.job_title}".

${userInstructions}

If the company is well known, synthesize the most relevant information. 
Format your response as a clean, readable plain-text string. You may use simple dashes (-) for bullet points and standard line breaks. 
CRITICAL: Do NOT use ANY markdown formatting whatsoever. Do not use asterisks (*), hashtags (#), bold text, or markdown code blocks. Keep it professional, concise, and highly relevant to an interview setting.
`.trim();

    // Step 5: Call the Gemini API.
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
          generationConfig: {
            responseMimeType: 'text/plain',
          },
        }),
      },
    );

    if (!geminiRes.ok) {
      const errBody = await geminiRes.text();
      console.error('Gemini API error', { status: geminiRes.status, body: errBody });
      if (geminiRes.status === 503 || geminiRes.status === 429) {
        return apiError('AI_UNAVAILABLE', 503);
      }
      return apiError('AI_GENERATION_FAILED', 500);
    }

    const geminiData = await geminiRes.json();

    // Step 6: Extract the generated text from the Gemini response.
    const generatedText = geminiData?.candidates?.[0]?.content?.parts?.[0]?.text ?? '';

    if (!generatedText) {
      return apiError('AI_GENERATION_FAILED', 500);
    }

    // Step 7: Return the generated research text.
    return apiSuccess({ research: generatedText.trim() });
  } catch (error) {
    console.error('POST /api/ai/generate-company-research unexpected failure', { error });
    return apiError('INTERNAL_ERROR', 500);
  }
}
