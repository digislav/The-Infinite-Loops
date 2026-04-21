import { CoverLetterGenerator } from '@/components/documents/CoverLetterGenerator';
import { ResumeGenerator } from '@/components/documents/ResumeGenerator';

// DocumentsPage — S2-022: Implement AI Cover Letter Draft.
// Hosts the cover letter generator which uses the user's profile data
// and a selected job record to generate a tailored draft via Gemini AI.
// Per S1-002 §4.1 — Document Library is a required app screen.

export default function DocumentsPage() {
  return (
    <div className="mx-auto max-w-3xl print:max-w-none print:w-full">
      <div className="mb-8 print:hidden">
        <h1 className="text-foreground text-3xl font-bold">Document Library</h1>
        <p className="text-muted-foreground mt-2">
          Generate tailored cover letters and resumes from your profile and job data.
        </p>
      </div>

      {/* Cover Letter Generator — S2-022 */}
      <div className="flex flex-col gap-4 rounded-lg border border-gray-200 bg-white p-6 print:m-0 print:p-0 print:border-none print:shadow-none">
        <div className="flex flex-col gap-1 print:hidden">
          <h2 className="text-xl font-semibold text-gray-900">Cover Letter Generator</h2>
          <p className="text-sm text-gray-500">
            Select a job from your pipeline and we will generate a tailored cover letter using your
            profile information and the job details.
          </p>
        </div>
        <CoverLetterGenerator />
      </div>

      {/* Resume Generator — S2-021 */}
      <div className="mt-8 flex flex-col gap-4 rounded-lg border border-gray-200 bg-white p-6 print:m-0 print:p-0 print:border-none print:shadow-none">
        <div className="flex flex-col gap-1 print:hidden">
          <h2 className="text-xl font-semibold text-gray-900">AI Resume Tailoring</h2>
          <p className="text-sm text-gray-500">
            Select a job from your pipeline and we will contextually rewrite your entire profile into structured templates guaranteed to hit the exact keywords the job description requires.
          </p>
        </div>
        <ResumeGenerator />
      </div>
    </div>
  );
}
