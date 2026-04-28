'use client';

import { useState } from 'react';
import { CoverLetterGenerator } from '@/components/documents/CoverLetterGenerator';
import { ResumeGenerator } from '@/components/documents/ResumeGenerator';
import { SavedDocuments } from '@/components/documents/SavedDocuments';

// DocumentsPage — S2-022, S2-023, S2-024.
// Hosts the cover letter generator, resume generator, and saved documents list.
// Per S1-002 §4.1 — Document Library is a required app screen.

export default function DocumentsPage() {
  const [refreshKey, setRefreshKey] = useState(0);

  function handleDocumentSaved() {
    setRefreshKey((prev) => prev + 1);
  }

  return (
    <div className="mx-auto max-w-3xl pb-24 print:w-full print:max-w-none print:pb-0">
      <div className="mb-8 print:hidden">
        <h1 className="text-foreground text-3xl font-bold">Document Library</h1>
        <p className="text-muted-foreground mt-2">
          Generate tailored cover letters and resumes from your profile and job data.
        </p>
      </div>

      {/* Cover Letter Generator — S2-022/S2-023 */}
      <div className="flex flex-col gap-4 rounded-lg border border-gray-200 bg-white p-6 print:m-0 print:border-none print:p-0 print:shadow-none">
        <div className="flex flex-col gap-1 print:hidden">
          <h2 className="text-xl font-semibold text-gray-900">Cover Letter Generator</h2>
          <p className="text-sm text-gray-500">
            Select a job from your pipeline and we will generate a tailored cover letter using your
            profile information and the job details.
          </p>
        </div>
        <CoverLetterGenerator onSaved={handleDocumentSaved} />
      </div>

      {/* Resume Generator — S2-021 */}
      <div className="mt-8 flex flex-col gap-4 rounded-lg border border-gray-200 bg-white p-6 print:m-0 print:border-none print:p-0 print:shadow-none">
        <div className="flex flex-col gap-1 print:hidden">
          <h2 className="text-xl font-semibold text-gray-900">AI Resume Tailoring</h2>
          <p className="text-sm text-gray-500">
            Select a job from your pipeline and we will contextually rewrite your entire profile
            into structured templates guaranteed to hit the exact keywords the job description
            requires.
          </p>
        </div>
        <ResumeGenerator onSaved={handleDocumentSaved} />
      </div>

      {/* Saved Documents — S2-024 */}
      <div className="mt-8 flex flex-col gap-4 rounded-lg border border-gray-200 bg-white p-6">
        <div className="flex flex-col gap-1">
          <h2 className="text-xl font-semibold text-gray-900">Saved Documents</h2>
          <p className="text-sm text-gray-500">
            Your saved cover letters and resumes linked to job context.
          </p>
        </div>
        <SavedDocuments refreshKey={refreshKey} />
      </div>
    </div>
  );
}
