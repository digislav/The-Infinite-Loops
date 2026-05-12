'use client';

// CoverLetterGenerator — S2-022 + S2-023 + S2-024 + S3-003.
// S2-022: Generates a tailored cover letter draft using the user's
// profile data and a selected job via the Gemini AI API.
// S2-023: Adds rewrite/improve actions so users can refine the draft
// with a custom instruction.
// S2-024: Adds save draft functionality so users can persist generated
// cover letters linked to job context.
// S3-003: existingDocId prop — when set, saving adds a new version to
// the existing document instead of creating a new one.
//
// Per S1-004 — AI-generated content is clearly labelled as a draft.
// Per S1-002 §5.3 — uses controlled inputs throughout.
// Per S1-003 — auth and ownership enforced on the backend.
//   We never send profile data from the client — only jobId.

import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

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

// Preset rewrite instructions — common improvement actions.
const PRESET_INSTRUCTIONS = [
  {
    label: 'Make it more concise',
    value: 'Make this cover letter more concise and to the point. Remove any redundant sentences.',
  },
  {
    label: 'Make it more formal',
    value: 'Rewrite this cover letter in a more formal and professional tone.',
  },
  {
    label: 'Make it more enthusiastic',
    value:
      'Rewrite this cover letter with more enthusiasm and energy while keeping it professional.',
  },
  {
    label: 'Add more technical detail',
    value: 'Expand the cover letter to include more specific technical skills and experiences.',
  },
  {
    label: 'Simplify the language',
    value: 'Rewrite this cover letter using simpler, clearer language that is easy to read.',
  },
  { label: 'Custom instruction...', value: 'custom' },
];

interface CoverLetterGeneratorProps {
  // S2-024: Called after a successful save so the parent can refresh
  // the saved documents list.
  onSaved?: () => void;
  presetJob?: JobOption;
  hideJobSelector?: boolean;
  // S3-003: When provided, saving adds a new version to this document
  // instead of creating a new one. Used by SavedDocuments rewrite flow.
  existingDocId?: string;
}

export function CoverLetterGenerator({
  onSaved,
  presetJob,
  hideJobSelector = false,
  existingDocId,
}: CoverLetterGeneratorProps) {
  const [jobs, setJobs] = useState<JobOption[]>([]);
  const [jobsLoading, setJobsLoading] = useState(!presetJob);
  const [selectedJobId, setSelectedJobId] = useState(presetJob?.id ?? '');
  const [isGenerating, setIsGenerating] = useState(false);
  const [draft, setDraft] = useState<CoverLetterData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [saveStatus, setSaveStatus] = useState<'idle' | 'success' | 'error'>('idle');
  const [selectedPreset, setSelectedPreset] = useState('');
  const [customInstruction, setCustomInstruction] = useState('');
  const [isRewriting, setIsRewriting] = useState(false);
  const [rewriteError, setRewriteError] = useState<string | null>(null);

  useEffect(() => {
    setSelectedJobId(presetJob?.id ?? '');
    setDraft(null);
    setError(null);
    setSaveStatus('idle');
    setSelectedPreset('');
    setCustomInstruction('');
    setRewriteError(null);
  }, [presetJob]);

  useEffect(() => {
    if (presetJob) {
      setJobs([presetJob]);
      setJobsLoading(false);
      return;
    }

    let cancelled = false;

    const loadJobs = async () => {
      try {
        const res = await fetch('/api/jobs');
        if (!res.ok) return;
        const json = await res.json();
        const activeJobs = (json.data ?? []).filter(
          (j: JobOption) => j.current_stage !== 'Archived',
        );
        if (!cancelled) setJobs(activeJobs);
      } catch {
      } finally {
        if (!cancelled) setJobsLoading(false);
      }
    };

    loadJobs();
    return () => {
      cancelled = true;
    };
  }, [presetJob]);

  const selectedJob = presetJob ?? jobs.find((job) => job.id === selectedJobId);

  async function handleGenerate() {
    if (!selectedJobId) return;

    setIsGenerating(true);
    setError(null);
    setDraft(null);
    setSaveStatus('idle');
    setSelectedPreset('');
    setCustomInstruction('');
    setRewriteError(null);

    try {
      const res = await fetch('/api/ai/generate-cover-letter', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ jobId: selectedJobId }),
      });

      const resJson = await res.json();

      if (!res.ok) {
        if (resJson.error?.code === 'AI_UNAVAILABLE') {
          setError('AI services are currently experiencing high demand. Please try again later.');
          return;
        }
        if (resJson.error?.code === 'INSUFFICIENT_CONTEXT') {
          setError(
            'Insufficient profile data. Please fill out your Experience, Education, or Skills in your Profile.',
          );
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

  async function handleRewrite() {
    const instruction = selectedPreset === 'custom' ? customInstruction : selectedPreset;

    if (!instruction.trim()) {
      setRewriteError('Please select or enter a rewrite instruction.');
      return;
    }

    if (!draft) {
      setRewriteError('No draft to rewrite. Generate a cover letter first.');
      return;
    }

    setIsRewriting(true);
    setRewriteError(null);
    setSaveStatus('idle');

    try {
      const res = await fetch('/api/ai/rewrite-draft', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ draft, instruction }),
      });

      if (!res.ok) {
        setRewriteError('Failed to rewrite cover letter. Please try again.');
        return;
      }

      const json = await res.json();
      setDraft(json.data?.draft ?? draft);
      setSelectedPreset('');
      setCustomInstruction('');
    } catch {
      setRewriteError('Failed to rewrite cover letter. Please try again.');
    } finally {
      setIsRewriting(false);
    }
  }

  // handleSave — S2-024 + S3-003.
  // If existingDocId is provided, saves as a new version of that document
  // via POST /api/documents/:id/versions — per S3-003 versioning flow.
  // Otherwise creates a new document via POST /api/documents.
  // user_id always comes from the session server-side per S1-003 §5.4.
  async function handleSave() {
    if (!draft || !selectedJobId) return;

    setIsSaving(true);
    setSaveStatus('idle');

    try {
      const job = selectedJob;
      const title = job
        ? `Cover Letter — ${job.job_title} at ${job.company_name}`
        : 'Cover Letter Draft';

      let res: Response;

      if (existingDocId) {
        // S3-003: Save as a new version of the existing document.
        // Never sends user_id — ownership enforced server-side per S1-003 §5.4.
        res = await fetch(`/api/documents/${existingDocId}/versions`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ content: JSON.stringify(draft) }),
        });
      } else {
        // Default: create a brand new document.
        res = await fetch('/api/documents', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            job_id: selectedJobId,
            type: 'cover_letter',
            name: title,
            content: JSON.stringify(draft),
          }),
        });
      }

      if (!res.ok) {
        setSaveStatus('error');
        return;
      }

      setSaveStatus('success');
      if (onSaved) onSaved();
    } catch {
      setSaveStatus('error');
    } finally {
      setIsSaving(false);
    }
  }

  async function handleCopy() {
    if (!draft) return;
    const text = `${draft.greeting}\n\n${draft.body}\n\n${draft.signoff}`;
    await navigator.clipboard.writeText(text);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 2000);
  }

  function handlePrint() {
    const originalTitle = document.title;
    document.title = draft?.name
      ? `${draft.name.replace(/\s+/g, '_')}_Cover_Letter`
      : 'Cover_Letter';
    window.print();
    document.title = originalTitle;
  }

  return (
    <div className="flex flex-col gap-6 print:m-0 print:gap-0">
      <div className="flex flex-col gap-6 print:hidden">
        {!hideJobSelector && (
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="cover-letter-job-select" className="text-sm font-medium text-gray-700">
              Select a Target Job <span className="text-red-500">*</span>
            </Label>
            {jobsLoading ? (
              <Skeleton className="h-10 w-full" />
            ) : jobs.length === 0 ? (
              <p className="text-sm text-gray-400">
                No active jobs found. Add a job to the dashboard first.
              </p>
            ) : (
              <Select value={selectedJobId} onValueChange={(val) => setSelectedJobId(val ?? '')}>
                <SelectTrigger id="cover-letter-job-select" className="w-full">
                  <SelectValue placeholder="Choose the job to tailor this cover letter for...">
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
        )}

        {hideJobSelector && selectedJob && selectedJob.job_title && (
          <div className="rounded-md border border-blue-100 bg-blue-50/60 px-4 py-3">
            <p className="text-sm font-medium text-blue-900">
              Generating for {selectedJob.job_title} at {selectedJob.company_name}
            </p>
          </div>
        )}

        <div className="flex items-center gap-3">
          <Button
            onClick={handleGenerate}
            disabled={!selectedJobId || isGenerating}
            className="bg-[#2E75B6] text-white hover:bg-[#1F4E79] disabled:opacity-50"
          >
            {isGenerating ? 'Generating...' : 'Generate Cover Letter'}
          </Button>
          {isGenerating && (
            <p className="text-sm text-gray-400">Tailoring to job description... (Takes ~10s)</p>
          )}
        </div>

        {error && <p className="text-sm text-red-500">{error}</p>}
      </div>

      {isGenerating && (
        <div className="flex flex-col gap-4 print:hidden">
          <Skeleton className="h-12 w-full" />
          <Skeleton className="h-[200px] w-full" />
        </div>
      )}

      {draft && !isGenerating && (
        <div className="mt-4 flex flex-col gap-4 print:mt-0">
          {/* Action bar */}
          <div className="flex flex-wrap items-center justify-between gap-3 rounded-md border border-gray-200 bg-gray-50 p-4 print:hidden">
            <div className="flex items-center gap-2">
              <Button
                variant="ghost"
                size="sm"
                onClick={handleCopy}
                className="h-9 px-4 text-xs font-semibold text-gray-600 hover:bg-gray-200"
              >
                {copied ? '✓ Copied!' : 'Copy Text'}
              </Button>

              {/* S2-024 + S3-003: Save button — label changes based on context. */}
              <Button
                variant="ghost"
                size="sm"
                onClick={handleSave}
                disabled={isSaving}
                className="h-9 px-4 text-xs font-semibold text-gray-600 hover:bg-gray-200 disabled:opacity-50"
              >
                {isSaving
                  ? 'Saving...'
                  : saveStatus === 'success'
                    ? existingDocId
                      ? '✓ Version Saved!'
                      : '✓ Saved!'
                    : saveStatus === 'error'
                      ? 'Save Failed'
                      : existingDocId
                        ? 'Save as New Version'
                        : 'Save to Documents'}
              </Button>
            </div>

            <Button onClick={handlePrint} className="bg-black text-white hover:bg-gray-800">
              Print / Save as PDF
            </Button>
          </div>

          <div className="mb-2 text-xs font-medium text-amber-600 print:hidden">
            ⚠ This is an AI-generated draft. Review carefully before sending.
          </div>

          {/* Improve this Draft section */}
          <div className="flex flex-col gap-3 rounded-lg border border-gray-100 bg-gray-50 p-4 print:hidden">
            <h4 className="text-sm font-semibold text-gray-700">Improve this Draft</h4>
            <p className="text-xs text-gray-400">
              Select a preset action or write your own instruction to refine the cover letter.
            </p>

            <div className="flex flex-col gap-1.5">
              <Label htmlFor="cover-letter-rewrite-preset" className="text-xs text-gray-500">
                Choose an action
              </Label>
              <Select
                value={selectedPreset}
                onValueChange={(val) => {
                  setSelectedPreset(val ?? '');
                  if (val !== 'custom') setCustomInstruction('');
                  setRewriteError(null);
                }}
              >
                <SelectTrigger id="cover-letter-rewrite-preset" className="w-full text-sm">
                  <SelectValue placeholder="Select an improvement action..." />
                </SelectTrigger>
                <SelectContent>
                  {PRESET_INSTRUCTIONS.map((preset) => (
                    <SelectItem key={preset.value} value={preset.value} className="text-sm">
                      {preset.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {selectedPreset === 'custom' && (
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="cover-letter-custom-instruction" className="text-xs text-gray-500">
                  Your instruction
                </Label>
                <Input
                  id="cover-letter-custom-instruction"
                  value={customInstruction}
                  onChange={(e) => {
                    setCustomInstruction(e.target.value);
                    setRewriteError(null);
                  }}
                  placeholder="e.g. Make the opening paragraph more compelling"
                  className="text-sm"
                />
              </div>
            )}

            {rewriteError && <p className="text-xs text-red-600">{rewriteError}</p>}

            <div className="flex items-center gap-2">
              <Button
                size="sm"
                onClick={handleRewrite}
                disabled={isRewriting || !selectedPreset}
                className="bg-[#2E75B6] text-white hover:bg-[#1F4E79] disabled:opacity-50"
              >
                {isRewriting ? 'Improving...' : 'Improve Cover Letter'}
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={handleGenerate}
                disabled={isGenerating || isRewriting}
                className="text-xs text-gray-500 hover:text-gray-700"
              >
                Regenerate from scratch
              </Button>
            </div>

            {isRewriting && <p className="text-xs text-gray-400">Refining your cover letter...</p>}
          </div>

          {/* Cover letter preview */}
          <div
            id="cover-letter-print-canvas"
            className="min-h-[600px] w-full border border-gray-300 bg-white p-10 text-gray-900 shadow-sm print:w-full print:border-none print:p-0 print:shadow-none"
          >
            <div className="mx-auto flex max-w-2xl flex-col gap-6 font-serif">
              <div>
                <h2 className="text-xl font-bold tracking-wide uppercase">{draft.name}</h2>
                <p className="mt-0.5 text-sm text-gray-600">{draft.location}</p>
                {draft.links && (
                  <div className="mt-1 flex flex-wrap gap-4 text-xs font-semibold text-[#2E75B6]">
                    {draft.links.linkedin && draft.links.linkedin !== 'None' && (
                      <span>{draft.links.linkedin}</span>
                    )}
                    {draft.links.github && draft.links.github !== 'None' && (
                      <span>{draft.links.github}</span>
                    )}
                    {draft.links.portfolio && draft.links.portfolio !== 'None' && (
                      <span>{draft.links.portfolio}</span>
                    )}
                  </div>
                )}
              </div>
              <p className="text-sm">{draft.date}</p>
              <p className="text-sm">{draft.greeting}</p>
              <p className="text-sm leading-relaxed whitespace-pre-wrap">{draft.body}</p>
              <p className="text-sm whitespace-pre-wrap">{draft.signoff}</p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
