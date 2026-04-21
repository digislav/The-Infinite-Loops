import { createClient } from '@/lib/supabase/server';
import { apiSuccess, apiError } from '@/lib/utils/apiResponse';
import { getProfile } from '@/lib/services/profileService';
import { getJobById } from '@/lib/services/jobServices';
import { getExperience } from '@/lib/services/experienceServices';
import { getEducation } from '@/lib/services/educationService';
import { getSkills } from '@/lib/services/skillServices';

export async function POST(req: Request) {
  try {
    const supabase = await createClient();

    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) return apiError('AUTH_REQUIRED', 401);

    const body = await req.json();
    const { jobId } = body;

    if (!jobId) return apiError('JOB_ID_REQUIRED', 400);

    const [
      profileResult,
      jobResult,
      experienceResult,
      educationResult,
      skillsResult,
    ] = await Promise.all([
      getProfile(user.id),
      getJobById(jobId, user.id),
      getExperience(user.id),
      getEducation(user.id),
      getSkills(user.id),
    ]);

    if (profileResult.error || !profileResult.data) {
      return apiError('PROFILE_NOT_FOUND', 404);
    }
    if (jobResult.error || !jobResult.data) {
      return apiError('JOB_NOT_FOUND', 404);
    }

    const profile = profileResult.data;
    const job = jobResult.data;
    const experiences = experienceResult.data || [];
    const education = educationResult.data || [];
    const skills = skillsResult.data || [];

    // Explicitly block AI hallucination loops when there is literally zero data available natively.
    if (experiences.length === 0 && education.length === 0 && skills.length === 0) {
      return apiError('INSUFFICIENT_CONTEXT', 400);
    }

    const prompt = `
You are a professional resume writer helping a job seeker tailor their resume to a specific job description.

Your task is to take the user's raw profile data and rewrite their summary, experience bullets, and skills to highlight their qualifications specifically for the target job.
Keep the output entirely factual but optimize the phrasing to stand out to ATS systems and hiring managers.

Return valid JSON conforming EXACTLY to this schema. DO NOT output markdown blocks, DO NOT output intro text. Output ONLY the JSON object.

{
  "name": "Full Name",
  "headline": "The user's original headline verbatim, unless it is completely empty",
  "location": "City, State",
  "links": {
    "linkedin": "url or null",
    "github": "url or null",
    "portfolio": "url or null"
  },
  "summary": "A 3-sentence professional summary tailored to the job description",
  "experiences": [
    {
      "company": "Company Name",
      "role": "Role Title",
      "dateRange": "Start - End",
      "bullets": [
        "Action-oriented bullet point tailored to the job description, using metrics if possible.",
        "Another bullet point."
      ]
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

CANDIDATE RAW DATA:
Name: ${profile.first_name} ${profile.last_name}
Raw Headline: ${profile.headline || ''}
Location: ${profile.location || ''}
LinkedIn: ${profile.linkedin_url || 'None'}
GitHub: ${profile.github_url || 'None'}
Portfolio: ${profile.portfolio_url || 'None'}
Raw Summary: ${profile.summary || ''}

Raw Experiences:
${experiences.map((exp) => `- ${exp.role_title} at ${exp.company_name} (${exp.start_date} to ${exp.is_current ? 'Present' : exp.end_date}): ${exp.description || ''}`).join('\n')}

Raw Education:
${education.map((edu) => `- ${edu.degree} in ${edu.field_of_study} from ${edu.institution} (${edu.start_date || 'N/A'} to ${edu.is_current ? 'Present' : (edu.end_date || 'N/A')})`).join('\n')}

Raw Skills: 
${skills.map((skill) => skill.skill_name).join(', ')}

TARGET JOB DESCRIPTION:
Title: ${job.job_title}
Company: ${job.company_name}
Description: ${job.description || ''}

Remember: Return ONLY a raw JSON object string.
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
            responseMimeType: "application/json"
          }
        }),
      },
    );

    if (!geminiRes.ok) {
      const errBody = await geminiRes.text();
      console.error('Gemini API error', { status: geminiRes.status, body: errBody });
      if (geminiRes.status === 503) {
        return apiError('AI_UNAVAILABLE', 503);
      }
      return apiError('AI_GENERATION_FAILED', 500);
    }

    const geminiData = await geminiRes.json();
    const generatedText = geminiData?.candidates?.[0]?.content?.parts?.[0]?.text ?? '';

    if (!generatedText) {
      return apiError('AI_GENERATION_FAILED', 500);
    }

    // Parse it to make sure Gemini respected the JSON output
    let parsedData = {};
    try {
      parsedData = JSON.parse(generatedText);
    } catch {
      // Clean up markdown block if gemini hallucinated despite mimeType
      const cleaned = generatedText.replace(/```json/g, '').replace(/```/g, '').trim();
      parsedData = JSON.parse(cleaned);
    }

    return apiSuccess({ draft: parsedData });
  } catch (error) {
    console.error('POST /api/ai/generate-resume-json unexpected failure', { error });
    return apiError('INTERNAL_ERROR', 500);
  }
}
