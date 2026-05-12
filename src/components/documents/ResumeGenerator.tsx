'use client';

import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Label } from '@/components/ui/label';

interface JobOption {
  id: string;
  job_title: string;
  company_name: string;
  current_stage: string;
}

// The structured data shape returned by the AI
interface ResumeData {
  name: string;
  headline: string;
  location: string;
  links?: {
    linkedin?: string | null;
    github?: string | null;
    portfolio?: string | null;
  };
  summary: string;
  experiences: {
    company: string;
    role: string;
    dateRange: string;
    bullets: string[];
  }[];
  education: {
    institution: string;
    degree: string;
    field: string;
    dateRange: string;
  }[];
  skills: string[];
}

const PRESET_INSTRUCTIONS = [
  {
    label: 'Make it more concise',
    value:
      'Make this resume more concise and to the point. Remove redundant wording while keeping the strongest achievements.',
  },
  {
    label: 'Make it more formal',
    value:
      'Rewrite this resume in a more formal and professional tone while preserving the same facts.',
  },
  {
    label: 'Make it more impactful',
    value:
      'Strengthen this resume with more action-oriented language and sharper achievement framing.',
  },
  {
    label: 'Add more technical detail',
    value:
      'Rewrite this resume to emphasize technical skills, tools, and implementation details more clearly.',
  },
  {
    label: 'Simplify the language',
    value: 'Rewrite this resume using simpler, clearer language that is easy to scan quickly.',
  },
  { label: 'Custom instruction...', value: 'custom' },
];

interface ResumeGeneratorProps {
  // S2-024: Called after a successful save so the parent can refresh
  // the saved documents list.
  onSaved?: () => void;
  presetJob?: JobOption;
  hideJobSelector?: boolean;
  // S3-003: When provided, saving adds a new version to this document
  // instead of creating a new one. Used by SavedDocuments rewrite flow.
  existingDocId?: string;
}

export function ResumeGenerator({
  onSaved,
  presetJob,
  hideJobSelector = false,
  existingDocId,
}: ResumeGeneratorProps) {
  const [jobs, setJobs] = useState<JobOption[]>([]);
  const [jobsLoading, setJobsLoading] = useState(!presetJob);
  const [selectedJobId, setSelectedJobId] = useState(presetJob?.id ?? '');
  const [isGenerating, setIsGenerating] = useState(false);
  const [draft, setDraft] = useState<ResumeData | null>(null);
  const [error, setError] = useState<string | null>(null);

  // 'classic' or 'modern' templates
  const [template, setTemplate] = useState<'classic' | 'modern'>('classic');

  // S2-024: Save state
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
    setTemplate('classic');
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
      const res = await fetch('/api/ai/generate-resume-json', {
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
            'Insufficient profile data! You must fill out at least one Experience or Education block in your Profile before tailoring a resume.',
          );
          return;
        }
        setError('Failed to generate tailored resume. Please try again.');
        return;
      }

      setDraft(resJson.data?.draft ?? null);
    } catch {
      setError('Failed to generate tailored resume. Please try again.');
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
      setRewriteError('No draft to rewrite. Generate a resume first.');
      return;
    }

    setIsRewriting(true);
    setRewriteError(null);
    setSaveStatus('idle');

    try {
      const res = await fetch('/api/ai/rewrite-resume-json', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ draft, instruction }),
      });

      if (!res.ok) {
        setRewriteError('Failed to rewrite resume. Please try again.');
        return;
      }

      const json = await res.json();
      setDraft(json.data?.draft ?? draft);
      setSelectedPreset('');
      setCustomInstruction('');
    } catch {
      setRewriteError('Failed to rewrite resume. Please try again.');
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
      const title = job ? `Resume — ${job.job_title} at ${job.company_name}` : 'Resume Draft';

      let res: Response;

      if (existingDocId) {
        // S3-003: Save as a new version of the existing document.
        // Calls POST /api/documents/:id/versions which appends a version
        // entry and updates the document's main content column.
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
          // Only send job_id, type, name, content — never user_id per S1-003 §5.4.
          body: JSON.stringify({
            job_id: selectedJobId,
            type: 'resume',
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

  function handlePrint() {
    const originalTitle = document.title;
    document.title = draft?.name ? `${draft.name.replace(/\s+/g, '_')}_Resume` : 'Resume';
    window.print();
    document.title = originalTitle;
  }

  return (
    <div className="flex flex-col gap-6 print:m-0 print:gap-0">
      {/* CONTROLS AREA — Hidden when printing */}
      <div className="flex flex-col gap-6 print:hidden">
        {!hideJobSelector && (
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="resume-job-select" className="text-sm font-medium text-gray-700">
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
                <SelectTrigger id="resume-job-select" className="w-full">
                  <SelectValue placeholder="Choose the job description to tailor this resume against...">
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
            {isGenerating ? 'Structuring Resume...' : 'Generate Tailored Resume'}
          </Button>
          {isGenerating && (
            <p className="text-sm text-gray-400">
              Analyzing skills & generating JSON... (Takes ~10s)
            </p>
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

      {/* DRAFT OUTPUT - The actual HTML Template Canvas */}
      {draft && !isGenerating && (
        <div className="mt-4 flex flex-col gap-4 print:mt-0">
          {/* Templating Controls & Actions */}
          <div className="flex flex-col justify-between gap-4 rounded-md border border-gray-200 bg-gray-50 p-4 sm:flex-row sm:items-center print:hidden">
            <div className="flex items-center gap-3">
              <Label className="font-semibold text-gray-700">Template Style:</Label>
              <Select
                value={template}
                onValueChange={(val) => setTemplate((val ?? 'classic') as 'classic' | 'modern')}
              >
                <SelectTrigger className="w-[180px] bg-white">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="classic">Classic (Traditional)</SelectItem>
                  <SelectItem value="modern">Modern (Accent List)</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="flex items-center gap-3">
              {/* S2-024 + S3-003: Save button — creates new version if
                  existingDocId is set, otherwise creates a new document. */}
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
              <Button onClick={handlePrint} className="bg-black text-white hover:bg-gray-800">
                Print / Save as PDF
              </Button>
            </div>
          </div>

          <div className="mb-2 text-xs font-medium text-amber-600 print:hidden">
            ⚠ This is an AI-generated draft. All bullet points have been rewritten to match the
            target job description.
          </div>

          <div className="print:hidden">
            <Label className="mb-2 block text-sm font-medium text-gray-700">
              Current Resume Draft
            </Label>
            <div className="rounded-md border border-gray-300 bg-white px-4 py-4 text-sm text-gray-700">
              <div className="border-b border-gray-200 pb-4 text-center">
                <h3 className="font-serif text-2xl font-bold tracking-wide uppercase">
                  {draft.name}
                </h3>
                <p className="mt-1 font-medium">{draft.headline}</p>
                <p className="mt-0.5 text-xs text-gray-500">{draft.location}</p>
                {draft.links &&
                  (draft.links.linkedin || draft.links.github || draft.links.portfolio) && (
                    <div className="mt-2 flex flex-wrap justify-center gap-3 text-xs font-semibold text-[#2E75B6]">
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

              <div className="mt-4 space-y-4">
                <div>
                  <h4 className="mb-1 text-xs font-bold tracking-wider text-gray-900 uppercase">
                    Professional Summary
                  </h4>
                  <p className="leading-relaxed">{draft.summary}</p>
                </div>

                <div>
                  <h4 className="mb-1 text-xs font-bold tracking-wider text-gray-900 uppercase">
                    Experience
                  </h4>
                  <div className="space-y-3">
                    {draft.experiences?.map((experience, index) => (
                      <div key={index}>
                        <div className="flex items-baseline justify-between gap-3">
                          <p className="font-semibold text-gray-900">{experience.role}</p>
                          <span className="text-xs font-medium text-gray-500">
                            {experience.dateRange}
                          </span>
                        </div>
                        <p className="text-sm text-gray-600 italic">{experience.company}</p>
                        <ul className="mt-1 list-disc space-y-1 pl-5 text-sm">
                          {experience.bullets?.map((bullet, bulletIndex) => (
                            <li key={bulletIndex}>{bullet}</li>
                          ))}
                        </ul>
                      </div>
                    ))}
                  </div>
                </div>

                <div>
                  <h4 className="mb-1 text-xs font-bold tracking-wider text-gray-900 uppercase">
                    Education
                  </h4>
                  <div className="space-y-2">
                    {draft.education?.map((education, index) => (
                      <div key={index} className="flex items-baseline justify-between gap-3">
                        <div>
                          <p className="font-semibold text-gray-900">{education.institution}</p>
                          <p className="text-sm text-gray-600 italic">
                            {education.degree} in {education.field}
                          </p>
                        </div>
                        <span className="text-xs font-medium text-gray-500">
                          {education.dateRange}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>

                <div>
                  <h4 className="mb-1 text-xs font-bold tracking-wider text-gray-900 uppercase">
                    Skills
                  </h4>
                  <p className="leading-relaxed">{draft.skills?.join(', ')}</p>
                </div>
              </div>
            </div>
          </div>

          <div className="flex flex-col gap-3 rounded-lg border border-gray-100 bg-gray-50 p-4 print:hidden">
            <h4 className="text-sm font-semibold text-gray-700">Improve this Draft</h4>
            <p className="text-xs text-gray-400">
              Select a preset action or write your own instruction to refine the resume draft.
            </p>

            <div className="flex flex-col gap-1.5">
              <Label htmlFor="resume-rewrite-preset" className="text-xs text-gray-500">
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
                <SelectTrigger id="resume-rewrite-preset" className="w-full text-sm">
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
                <Label htmlFor="resume-custom-instruction" className="text-xs text-gray-500">
                  Your instruction
                </Label>
                <Input
                  id="resume-custom-instruction"
                  value={customInstruction}
                  onChange={(e) => {
                    setCustomInstruction(e.target.value);
                    setRewriteError(null);
                  }}
                  placeholder="e.g. Make the experience bullets more achievement-focused"
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
                {isRewriting ? 'Improving...' : 'Improve Resume Draft'}
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

            {isRewriting && <p className="text-xs text-gray-400">Refining your resume...</p>}
          </div>

          <div
            id="resume-print-canvas"
            className="min-h-[800px] w-full border border-gray-300 bg-white p-8 text-gray-900 shadow-sm print:w-full print:border-none print:shadow-none"
          >
            {/* Template 1: Classic (Traditional 1-column layout) */}
            {template === 'classic' && (
              <div className="mx-auto flex max-w-3xl flex-col gap-6">
                <div className="border-b-2 border-gray-900 pb-4 text-center">
                  <h1 className="font-serif text-3xl font-bold tracking-wide uppercase">
                    {draft.name}
                  </h1>
                  <p className="mt-1 text-sm font-medium">{draft.headline}</p>
                  <p className="mt-0.5 text-xs text-gray-600">{draft.location}</p>
                  {draft.links &&
                    (draft.links.linkedin || draft.links.github || draft.links.portfolio) && (
                      <div className="mt-2 flex flex-wrap justify-center gap-4 text-xs font-semibold text-[#2E75B6]">
                        {draft.links.linkedin && draft.links.linkedin !== 'None' && (
                          <a
                            href={draft.links.linkedin}
                            target="_blank"
                            rel="noreferrer"
                            className="hover:underline"
                          >
                            LinkedIn
                          </a>
                        )}
                        {draft.links.github && draft.links.github !== 'None' && (
                          <a
                            href={draft.links.github}
                            target="_blank"
                            rel="noreferrer"
                            className="hover:underline"
                          >
                            GitHub
                          </a>
                        )}
                        {draft.links.portfolio && draft.links.portfolio !== 'None' && (
                          <a
                            href={draft.links.portfolio}
                            target="_blank"
                            rel="noreferrer"
                            className="hover:underline"
                          >
                            Portfolio
                          </a>
                        )}
                      </div>
                    )}
                </div>

                <div>
                  <h2 className="mb-2 border-b border-gray-300 pb-1 text-sm font-bold tracking-wider uppercase">
                    Professional Summary
                  </h2>
                  <p className="text-sm leading-relaxed">{draft.summary}</p>
                </div>

                <div>
                  <h2 className="mb-2 border-b border-gray-300 pb-1 text-sm font-bold tracking-wider uppercase">
                    Experience
                  </h2>
                  <div className="flex flex-col gap-4">
                    {draft.experiences?.map((exp, i) => (
                      <div key={i}>
                        <div className="flex items-baseline justify-between">
                          <h3 className="text-sm font-bold">{exp.role}</h3>
                          <span className="text-xs font-semibold">{exp.dateRange}</span>
                        </div>
                        <div className="mb-1.5 text-sm italic">{exp.company}</div>
                        <ul className="flex list-disc flex-col gap-1 pl-5 text-sm">
                          {exp.bullets?.map((bull, j) => (
                            <li key={j}>{bull}</li>
                          ))}
                        </ul>
                      </div>
                    ))}
                  </div>
                </div>

                <div>
                  <h2 className="mb-2 border-b border-gray-300 pb-1 text-sm font-bold tracking-wider uppercase">
                    Education
                  </h2>
                  <div className="flex flex-col gap-3">
                    {draft.education?.map((edu, i) => (
                      <div key={i} className="flex items-baseline justify-between">
                        <div>
                          <div className="text-sm font-bold">{edu.institution}</div>
                          <div className="text-sm italic">
                            {edu.degree} in {edu.field}
                          </div>
                        </div>
                        <div className="text-xs font-semibold">{edu.dateRange}</div>
                      </div>
                    ))}
                  </div>
                </div>

                <div>
                  <h2 className="mb-2 border-b border-gray-300 pb-1 text-sm font-bold tracking-wider uppercase">
                    Skills
                  </h2>
                  <p className="text-sm leading-relaxed">{draft.skills?.join(', ')}</p>
                </div>
              </div>
            )}

            {template === 'modern' && (
              <div className="mx-auto flex h-full min-h-[800px] max-w-3xl">
                {/* Left Accent Column */}
                <div className="flex w-1/3 flex-col gap-6 border-r border-gray-200 bg-[#f8f9fa] p-6 print:bg-[#f8f9fa]">
                  <div>
                    <h1 className="text-2xl font-bold tracking-tight text-[#2E75B6]">
                      {draft.name}
                    </h1>
                    <p className="mt-1 text-sm font-semibold text-gray-700">{draft.headline}</p>
                    <p className="mt-1 text-xs text-gray-500">{draft.location}</p>
                    {draft.links &&
                      (draft.links.linkedin || draft.links.github || draft.links.portfolio) && (
                        <div className="mt-3 flex flex-col gap-1">
                          {draft.links.linkedin && draft.links.linkedin !== 'None' && (
                            <a
                              href={draft.links.linkedin}
                              target="_blank"
                              rel="noreferrer"
                              className="text-xs font-semibold text-gray-600 hover:text-[#2E75B6] hover:underline"
                            >
                              LinkedIn
                            </a>
                          )}
                          {draft.links.github && draft.links.github !== 'None' && (
                            <a
                              href={draft.links.github}
                              target="_blank"
                              rel="noreferrer"
                              className="text-xs font-semibold text-gray-600 hover:text-[#2E75B6] hover:underline"
                            >
                              GitHub
                            </a>
                          )}
                          {draft.links.portfolio && draft.links.portfolio !== 'None' && (
                            <a
                              href={draft.links.portfolio}
                              target="_blank"
                              rel="noreferrer"
                              className="text-xs font-semibold text-gray-600 hover:text-[#2E75B6] hover:underline"
                            >
                              Portfolio
                            </a>
                          )}
                        </div>
                      )}
                  </div>

                  <div>
                    <h2 className="mb-2 text-xs font-bold tracking-wider text-[#2E75B6] uppercase">
                      Education
                    </h2>
                    <div className="flex flex-col gap-3">
                      {draft.education?.map((edu, i) => (
                        <div key={i}>
                          <div className="text-sm font-bold text-gray-800">{edu.degree}</div>
                          <div className="text-xs text-gray-600">{edu.field}</div>
                          <div className="mt-0.5 text-xs text-gray-500 italic">
                            {edu.institution}
                          </div>
                          <div className="mt-0.5 text-xs text-gray-400">{edu.dateRange}</div>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div>
                    <h2 className="mb-2 text-xs font-bold tracking-wider text-[#2E75B6] uppercase">
                      Capabilities
                    </h2>
                    <div className="flex flex-col gap-1.5">
                      {draft.skills?.map((skill, i) => (
                        <div key={i} className="text-xs font-medium text-gray-700">
                          {skill}
                        </div>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Right Main Column */}
                <div className="flex w-2/3 flex-col gap-6 p-6">
                  <div>
                    <h2 className="mb-2 border-b border-gray-200 pb-1 text-xs font-bold tracking-wider text-[#2E75B6] uppercase">
                      Profile
                    </h2>
                    <p className="text-sm leading-relaxed text-gray-800">{draft.summary}</p>
                  </div>

                  <div>
                    <h2 className="mb-2 border-b border-gray-200 pb-1 text-xs font-bold tracking-wider text-[#2E75B6] uppercase">
                      Professional Experience
                    </h2>
                    <div className="flex flex-col gap-5">
                      {draft.experiences?.map((exp, i) => (
                        <div key={i}>
                          <div className="mb-0.5 flex items-baseline justify-between">
                            <h3 className="text-sm font-bold text-gray-900">{exp.role}</h3>
                            <span className="text-xs font-medium text-[#2E75B6]">
                              {exp.dateRange}
                            </span>
                          </div>
                          <div className="mb-2 text-sm text-gray-600">{exp.company}</div>
                          <ul className="list-outside list-disc space-y-1 pl-4 text-xs leading-relaxed text-gray-700">
                            {exp.bullets?.map((bull, j) => (
                              <li key={j}>{bull}</li>
                            ))}
                          </ul>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
