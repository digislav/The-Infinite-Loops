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

interface CoverLetterData {
  name: string;
  location: string;
  links?: {
    linkedin?: string | null;
    github?: string | null;
    portfolio?: string | null;
  };
  date: string;
  greeting: string;
  body: string;
  signoff: string;
}

export function CoverLetterGenerator() {
  const [jobs, setJobs] = useState<JobOption[]>([]);
  const [jobsLoading, setJobsLoading] = useState(true);
  const [selectedJobId, setSelectedJobId] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [draft, setDraft] = useState<CoverLetterData | null>(null);
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
    setDraft(null);
    setCopied(false);

    try {
      const res = await fetch('/api/ai/generate-cover-letter', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        // Only send jobId — profile data is fetched server-side
        // per S1-003 §5.4. user_id comes from the session.
        body: JSON.stringify({ jobId: selectedJobId }),
      });

      const resJson = await res.json();

      if (!res.ok) {
        if (resJson.error?.code === 'AI_UNAVAILABLE') {
          setError('AI services are currently experiencing high demand. Please try again later.');
          return;
        }
        if (resJson.error?.code === 'INSUFFICIENT_CONTEXT') {
          setError('Insufficient profile data! You must verify your Profile is filled out.');
          return;
        }
        setError('Failed to generate cover letter. Please try again.');
        return;
      }

      setDraft(resJson.data?.draft ?? null);
    } catch {
      setError('Failed to generate cover letter. Please try again.');
    } finally {
      setIsGenerating(false);
    }
  }

  // handleCopy — copies the draft to clipboard.
  async function handleCopy() {
    if (!draft) return;
    const fullText = `${draft.name}\n${draft.location}\n\n${draft.date}\n\n${draft.greeting}\n\n${draft.body}\n\n${draft.signoff}`;
    await navigator.clipboard.writeText(fullText);
    setCopied(true);
    // Reset copied state after 2 seconds.
    setTimeout(() => setCopied(false), 2000);
  }

  function handlePrint() {
    const originalTitle = document.title;
    document.title = draft?.name ? `${draft.name.replace(/\s+/g, '_')}_Cover_Letter` : 'Cover_Letter';
    window.print();
    document.title = originalTitle;
  }

  return (
    <div className="flex flex-col gap-6 print:m-0 print:gap-0">
      {/* Job selector — pick which job to tailor the cover letter for */}
      <div className="flex flex-col gap-1.5 print:hidden">
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
      <div className="flex items-center gap-3 print:hidden">
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
      {error && <p className="text-sm text-red-500 print:hidden">{error}</p>}

      {/* LOADING STATE — skeleton while generating */}
      {isGenerating && (
        <div className="flex flex-col gap-2 print:hidden">
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-3/4" />
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-5/6" />
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-2/3" />
        </div>
      )}

      {/* DRAFT OUTPUT */}
      {draft && !isGenerating && (
        <div className="flex flex-col gap-4 mt-4 print:mt-0">
          
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 rounded-md border border-gray-200 bg-gray-50 p-4 print:hidden">
            <div className="flex flex-col gap-0.5">
              <h3 className="text-sm font-semibold text-gray-700">AI-Generated Draft</h3>
              <p className="text-xs text-amber-600">
                ⚠ Review and edit the body text below before printing or copying.
              </p>
            </div>
            
            <div className="flex items-center gap-3">
              <Button
                variant="ghost"
                size="sm"
                onClick={handleCopy}
                className="h-9 px-4 text-xs font-semibold text-gray-600 hover:bg-gray-200"
              >
                {copied ? '✓ Copied!' : 'Copy Text'}
              </Button>
              <Button
                onClick={handlePrint}
                className="bg-black text-white hover:bg-gray-800"
              >
                Print / Save as PDF
              </Button>
            </div>
          </div>

          <div className="print:hidden">
            <Label className="text-sm font-medium text-gray-700 mb-2 block">Edit Letter Body</Label>
            <textarea
              value={draft.body}
              onChange={(e) => setDraft({ ...draft, body: e.target.value })}
              rows={12}
              className="w-full rounded-md border border-gray-300 bg-white px-4 py-3 text-sm leading-relaxed text-gray-700 placeholder:text-gray-400 focus:border-[#2E75B6] focus:ring-2 focus:ring-[#2E75B6]/50 focus:outline-none"
            />
          </div>

          {/* THE COVER LETTER CANVAS */}
          <div 
            id="cover-letter-print-canvas"
            className="w-full bg-white border border-gray-300 shadow-sm p-12 min-h-[800px] text-gray-900 print:w-full print:border-none print:shadow-none print:p-0 print:m-0"
          >
            <div className="flex flex-col gap-6 max-w-3xl mx-auto font-serif">
              <div className="flex flex-col">
                <h1 className="text-3xl font-bold uppercase tracking-wide">{draft.name}</h1>
                <p className="text-sm mt-1">{draft.location}</p>
                {draft.links && (draft.links.linkedin || draft.links.github || draft.links.portfolio) && (
                    <div className="flex flex-wrap gap-4 mt-2 text-xs font-semibold text-[#2E75B6]">
                      {draft.links.linkedin && draft.links.linkedin !== 'None' && <a href={draft.links.linkedin} target="_blank" rel="noreferrer" className="hover:underline">LinkedIn</a>}
                      {draft.links.github && draft.links.github !== 'None' && <a href={draft.links.github} target="_blank" rel="noreferrer" className="hover:underline">GitHub</a>}
                      {draft.links.portfolio && draft.links.portfolio !== 'None' && <a href={draft.links.portfolio} target="_blank" rel="noreferrer" className="hover:underline">Portfolio</a>}
                    </div>
                )}
              </div>
              
              <div className="text-sm mt-8">{draft.date}</div>
              
              <div className="text-sm mt-8">{draft.greeting}</div>
              
              <div className="text-sm leading-loose whitespace-pre-wrap mt-2">{draft.body}</div>
              
              <div className="text-sm mt-6 whitespace-pre-wrap">{draft.signoff}</div>
            </div>
          </div>

        </div>
      )}
    </div>
  );
}
