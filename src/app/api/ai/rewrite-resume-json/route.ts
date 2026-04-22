import { createClient } from '@/lib/supabase/server';
import { apiError, apiSuccess } from '@/lib/utils/apiResponse';

export async function POST(req: Request) {
  try {
    const supabase = await createClient();

    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) return apiError('AUTH_REQUIRED', 401);

    const body = await req.json();
    const { draft, instruction } = body;

    if (!draft || typeof draft !== 'object') {
      return apiError('DRAFT_REQUIRED', 400);
    }
    if (!instruction || typeof instruction !== 'string' || instruction.trim().length === 0) {
      return apiError('INSTRUCTION_REQUIRED', 400);
    }

    const draftJson = JSON.stringify(draft);
    if (draftJson.length > 20000) {
      return apiError('DRAFT_TOO_LONG', 400);
    }

    const prompt = `
You are a professional resume writer helping a job seeker improve an existing tailored resume draft.

Apply the instruction below to the resume JSON draft and return valid JSON only.
Do not add markdown, explanation, or commentary.
Preserve the same schema exactly:

{
  "name": "Full Name",
  "headline": "Professional headline",
  "location": "City, State",
  "links": {
    "linkedin": "url or null",
    "github": "url or null",
    "portfolio": "url or null"
  },
  "summary": "Professional summary",
  "experiences": [
    {
      "company": "Company Name",
      "role": "Role Title",
      "dateRange": "Start - End",
      "bullets": ["Bullet 1", "Bullet 2"]
    }
  ],
  "education": [
    {
      "institution": "School Name",
      "degree": "Degree",
      "field": "Field of Study",
      "dateRange": "Start - End"
    }
  ],
  "skills": ["Skill 1", "Skill 2"]
}

Keep the content factual and coherent. Do not invent employers, degrees, dates, or links.

INSTRUCTION:
${instruction.trim()}

RESUME JSON DRAFT:
${draftJson}

Return the improved resume JSON now:
    `.trim();

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
      console.error('Gemini API error on resume rewrite', {
        status: geminiRes.status,
        body: errBody,
      });
      if (geminiRes.status === 503 || geminiRes.status === 429) {
        return apiError('AI_UNAVAILABLE', 503);
      }
      return apiError('AI_REWRITE_FAILED', 500);
    }

    const geminiData = await geminiRes.json();
    const rewrittenText = geminiData?.candidates?.[0]?.content?.parts?.[0]?.text ?? '';

    if (!rewrittenText) {
      return apiError('AI_REWRITE_FAILED', 500);
    }

    let parsedData = {};
    try {
      parsedData = JSON.parse(rewrittenText);
    } catch {
      const cleaned = rewrittenText
        .replace(/```json/g, '')
        .replace(/```/g, '')
        .trim();
      parsedData = JSON.parse(cleaned);
    }

    return apiSuccess({ draft: parsedData });
  } catch (error) {
    console.error('POST /api/ai/rewrite-resume-json unexpected failure', { error });
    return apiError('INTERNAL_ERROR', 500);
  }
}
