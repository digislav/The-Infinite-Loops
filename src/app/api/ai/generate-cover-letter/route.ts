import { createClient } from '@/lib/supabase/server';
import { apiSuccess, apiError } from '@/lib/utils/apiResponse';
import { getProfile } from '@/lib/services/profileService';
import { getJobById } from '@/lib/services/jobServices';

// POST /api/ai/generate-cover-letter
// Generates a cover letter draft using the Gemini API based on the
// authenticated user's profile data and a specific job record.
//
// Per S1-003 §2.3 — session verification is the first action.
// Per S1-003 §5.4 — user_id always sourced from session, never body.
// Per S1-004 — AI-generated content is clearly labelled as a draft.
// The prompt is constructed server-side so the client never sees
// the raw profile data being sent to the AI provider.

export async function POST(req: Request) {
  try {
    const supabase = await createClient();

    // Step 1: Verify the session — first action per S1-003 §2.3.
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) return apiError('AUTH_REQUIRED', 401);

    // Step 2: Parse the request body to get the job ID.
    // We only accept jobId from the client — all other data is
    // fetched server-side from the verified user's own records.
    const body = await req.json();
    const { jobId } = body;

    if (!jobId) return apiError('JOB_ID_REQUIRED', 400);

    // Step 3: Fetch the user's profile and the job record in parallel.
    // Both are fetched server-side using the verified session user.id —
    // we never trust IDs from the request body per S1-003 §5.4.
    const [profileResult, jobResult] = await Promise.all([
      getProfile(user.id),
      getJobById(jobId, user.id),
    ]);

    // Step 4: Validate that both records exist and belong to this user.
    if (profileResult.error || !profileResult.data) {
      return apiError('PROFILE_NOT_FOUND', 404);
    }
    if (jobResult.error || !jobResult.data) {
      return apiError('JOB_NOT_FOUND', 404);
    }

    const profile = profileResult.data;
    const job = jobResult.data;

    // Step 5: Build the prompt for Gemini.
    // The prompt is constructed entirely server-side — the client
    // never sees the raw profile data being sent to the AI.
    // Per S1-004 — prompts must be structured and reviewable.
    const prompt = `
You are a professional career coach helping a job seeker write a tailored cover letter.

Write a professional cover letter for the candidate applying to the specified target job.
The cover letter should be 3-4 paragraphs, professional in tone, and tailored to the specific role.
Do not include placeholder text — write the full letter ready to use.

Return valid JSON conforming EXACTLY to this schema. DO NOT output markdown blocks or intro text.

{
  "name": "Candidate Full Name",
  "location": "Candidate Location",
  "links": {
    "linkedin": "url or null",
    "github": "url or null",
    "portfolio": "url or null"
  },
  "date": "Today's specific date",
  "greeting": "Dear Hiring Manager,",
  "body": "The full 3-4 paragraph text of the cover letter. Use double newlines to separate paragraphs.",
  "signoff": "Sincerely,\\n\\n[Candidate Name]"
}

CANDIDATE PROFILE:
Name: ${profile.first_name} ${profile.last_name}
Current Letter Date: ${new Date().toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}
Headline: ${profile.headline ?? 'Not provided'}
Summary: ${profile.summary ?? 'Not provided'}
Location: ${profile.location ?? 'Not provided'}
LinkedIn: ${profile.linkedin_url || 'None'}
GitHub: ${profile.github_url || 'None'}
Portfolio: ${profile.portfolio_url || 'None'}

JOB DETAILS:
Job Title: ${job.job_title}
Company: ${job.company_name}
Location: ${job.location ?? 'Not specified'}
Description: ${job.description ?? 'Not provided'}

Remember: Return ONLY a raw JSON object string.
    `.trim();

    // Step 6: Call the Gemini API.
    // The API key is read from the environment — never from the client.
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
          generationConfig: {
            responseMimeType: 'application/json',
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

    // Step 7: Extract the generated text from the Gemini response.
    const generatedText = geminiData?.candidates?.[0]?.content?.parts?.[0]?.text ?? '';

    if (!generatedText) {
      return apiError('AI_GENERATION_FAILED', 500);
    }

    let parsedData = {};
    try {
      parsedData = JSON.parse(generatedText);
    } catch {
      const cleaned = generatedText
        .replace(/```json/g, '')
        .replace(/```/g, '')
        .trim();
      parsedData = JSON.parse(cleaned);
    }

    // Step 8: Return the generated cover letter draft.
    // Per S1-004 — AI output is returned as a draft for user review.
    return apiSuccess({ draft: parsedData });
  } catch (error) {
    console.error('POST /api/ai/generate-cover-letter unexpected failure', { error });
    return apiError('INTERNAL_ERROR', 500);
  }
}
