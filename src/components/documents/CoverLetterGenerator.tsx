'use client';

// CoverLetterGenerator — S2-022: Implement AI Cover Letter Draft.
// Allows the user to select a job from their pipeline and generate
// a tailored cover letter draft using their profile data and the
// job details via the Gemini AI API.
//
// Per S1-004 — AI-generated content is clearly labelled as a draft
// and the user can edit it before saving or copying.
// Per S1-002 §5.3 — uses controlled inputs throughout.
// Per S1-003 — auth and ownership enforced on the backend.
//   We never send profile data from the client — only jobId.

import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Label } from '@/components/ui/label';

// Minimal job shape needed for the job selector dropdown.
interface JobOption {
  id: string;
  job_title: string;
  company_name: string;
  current_stage: string;
}

export function CoverLetterGenerator() {
  const [jobs, setJobs] = useState<JobOption[]>([]);
  const [jobsLoading, setJobsLoading] = useState(true);
  const [selectedJobId, setSelectedJobId] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [draft, setDraft] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  // Fetch the user's jobs on mount to populate the job selector.
  // Auth and ownership enforced server-side per S1-003 §5.4.
  useEffect(() => {
    let cancelled = false;

    const loadJobs = async () => {
      try {
        const res = await fetch('/api/jobs');
        if (!res.ok) return;
        const json = await res.json();
        // Filter out archived jobs — no cover letter needed for those.
        const activeJobs = (json.data ?? []).filter(
          (j: JobOption) => j.current_stage !== 'Archived',
        );
        if (!cancelled) setJobs(activeJobs);
      } catch {
        // Silently fail — user will see empty dropdown.
      } finally {
        if (!cancelled) setJobsLoading(false);
      }
    };

    loadJobs();
    return () => {
      cancelled = true;
    };
  }, []);

  // handleGenerate — sends the selected jobId to the backend API.
  // The backend fetches the profile and job data server-side and
  // constructs the prompt — we never send raw profile data from the client.
  async function handleGenerate() {
    if (!selectedJobId) return;

    setIsGenerating(true);
    setError(null);
    setDraft('');
    setCopied(false);

    try {
      const res = await fetch('/api/ai/generate-cover-letter', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        // Only send jobId — profile data is fetched server-side
        // per S1-003 §5.4. user_id comes from the session.
        body: JSON.stringify({ jobId: selectedJobId }),
      });

      if (!res.ok) {
        // Human-friendly error — never raw HTTP codes per S1-001 §6.3.
        setError('Failed to generate cover letter. Please try again.');
        return;
      }

      const json = await res.json();
      setDraft(json.data?.draft ?? '');
    } catch {
      setError('Failed to generate cover letter. Please try again.');
    } finally {
      setIsGenerating(false);
    }
  }

  // handleCopy — copies the draft to clipboard.
  async function handleCopy() {
    if (!draft) return;
    await navigator.clipboard.writeText(draft);
    setCopied(true);
    // Reset copied state after 2 seconds.
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <div className="flex flex-col gap-6">
      {/* Job selector — pick which job to tailor the cover letter for */}
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="job-select" className="text-sm font-medium text-gray-700">
          Select a Job <span className="text-red-500">*</span>
        </Label>
        {jobsLoading ? (
          <Skeleton className="h-10 w-full" />
        ) : jobs.length === 0 ? (
          <p className="text-sm text-gray-400">
            No active jobs found. Add a job to the dashboard first.
          </p>
        ) : (
          <Select value={selectedJobId} onValueChange={(val) => setSelectedJobId(val ?? '')}>
            <SelectTrigger id="job-select" className="w-full">
              <SelectValue placeholder="Choose a job to tailor this cover letter for...">
                {selectedJobId
                  ? (() => {
                      const job = jobs.find((j) => j.id === selectedJobId);
                      return job ? `${job.job_title} — ${job.company_name}` : selectedJobId;
                    })()
                  : null}
              </SelectValue>
            </SelectTrigger>
            <SelectContent>
              {jobs.map((job) => (
                <SelectItem key={job.id} value={job.id}>
                  {job.job_title} — {job.company_name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}
      </div>

      {/* Generate button */}
      <div className="flex items-center gap-3">
        <Button
          onClick={handleGenerate}
          disabled={!selectedJobId || isGenerating}
          className="bg-[#2E75B6] text-white hover:bg-[#1F4E79] disabled:opacity-50"
        >
          {isGenerating ? 'Generating...' : 'Generate Cover Letter'}
        </Button>
        {isGenerating && <p className="text-sm text-gray-400">This may take a few seconds...</p>}
      </div>

      {/* Error state — human-friendly per S1-001 §6.3 */}
      {error && <p className="text-sm text-red-500">{error}</p>}

      {/* LOADING STATE — skeleton while generating */}
      {isGenerating && (
        <div className="flex flex-col gap-2">
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-3/4" />
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-5/6" />
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-2/3" />
        </div>
      )}

      {/* DRAFT OUTPUT — shown after successful generation.
          Per S1-004 — clearly labelled as an AI-generated draft.
          User can edit the textarea before copying or saving. */}
      {draft && !isGenerating && (
        <div className="flex flex-col gap-3">
          <div className="flex items-center justify-between">
            <div className="flex flex-col gap-0.5">
              <h3 className="text-sm font-semibold text-gray-700">AI-Generated Draft</h3>
              {/* Per S1-004 — AI output must be clearly labelled as a draft */}
              <p className="text-xs text-amber-600">
                ⚠ This is an AI-generated draft. Review and edit before sending.
              </p>
            </div>
            {/* Copy to clipboard button */}
            <Button
              variant="ghost"
              size="sm"
              onClick={handleCopy}
              className="h-8 rounded-full bg-gray-50 px-4 text-xs font-semibold text-gray-600 hover:bg-gray-100"
            >
              {copied ? '✓ Copied!' : 'Copy to Clipboard'}
            </Button>
          </div>

          {/* Editable textarea so user can refine the draft */}
          <textarea
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            rows={20}
            className="w-full rounded-md border border-gray-300 bg-white px-4 py-3 text-sm leading-relaxed text-gray-700 placeholder:text-gray-400 focus:border-[#2E75B6] focus:ring-2 focus:ring-[#2E75B6]/50 focus:outline-none"
          />

          {/* Regenerate button — lets user try again with same job */}
          <div className="flex justify-end">
            <Button
              variant="ghost"
              size="sm"
              onClick={handleGenerate}
              disabled={isGenerating}
              className="text-xs text-gray-500 hover:text-gray-700"
            >
              Regenerate
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
