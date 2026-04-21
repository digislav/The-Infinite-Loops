'use client';

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

export function ResumeGenerator() {
  const [jobs, setJobs] = useState<JobOption[]>([]);
  const [jobsLoading, setJobsLoading] = useState(true);
  const [selectedJobId, setSelectedJobId] = useState('');
  
  const [isGenerating, setIsGenerating] = useState(false);
  const [draft, setDraft] = useState<ResumeData | null>(null);
  const [error, setError] = useState<string | null>(null);

  // 'classic' or 'modern' templates
  const [template, setTemplate] = useState<'classic' | 'modern'>('classic');

  useEffect(() => {
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
  }, []);

  async function handleGenerate() {
    if (!selectedJobId) return;

    setIsGenerating(true);
    setError(null);
    setDraft(null);

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
          setError('Insufficient profile data! You must fill out at least one Experience or Education block in your Profile before tailoring a resume.');
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

  function handlePrint() {
    const originalTitle = document.title;
    // Overwrite the document title so the browser print header looks clean
    document.title = draft?.name ? `${draft.name.replace(/\s+/g, '_')}_Resume` : 'Resume';
    window.print();
    // Restore the title immediately after the print dialog closes
    document.title = originalTitle;
  }

  return (
    <div className="flex flex-col gap-6 print:m-0 print:gap-0">
      {/* CONTROLS AREA — Hidden when printing */}
      <div className="flex flex-col gap-6 print:hidden">
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

        <div className="flex items-center gap-3">
          <Button
            onClick={handleGenerate}
            disabled={!selectedJobId || isGenerating}
            className="bg-[#2E75B6] text-white hover:bg-[#1F4E79] disabled:opacity-50"
          >
            {isGenerating ? 'Structuring Resume...' : 'Generate Tailored Resume'}
          </Button>
          {isGenerating && <p className="text-sm text-gray-400">Analyzing skills & generating JSON... (Takes ~10s)</p>}
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
        <div className="flex flex-col gap-4 mt-4 print:mt-0">
          
          {/* Templating Controls & Actions */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 rounded-md border border-gray-200 bg-gray-50 p-4 print:hidden">
            <div className="flex items-center gap-3">
              <Label className="font-semibold text-gray-700">Template Style:</Label>
              <Select value={template} onValueChange={(val) => setTemplate(val as 'classic' | 'modern')}>
                <SelectTrigger className="w-[180px] bg-white">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="classic">Classic (Traditional)</SelectItem>
                  <SelectItem value="modern">Modern (Accent List)</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            <Button
              onClick={handlePrint}
              className="bg-black text-white hover:bg-gray-800"
            >
              Print / Save as PDF
            </Button>
          </div>

          <div className="text-xs text-amber-600 font-medium mb-2 print:hidden">
             ⚠ This is an AI-generated draft. All bullet points have been rewritten to match the target job description.
          </div>

          {/* THE RESUME CANVAS */}
          <div 
            id="resume-print-canvas"
            className="w-full bg-white border border-gray-300 shadow-sm p-8 min-h-[800px] text-gray-900 print:w-full print:border-none print:shadow-none print:p-0 print:m-0"
          >
            {template === 'classic' && (
              <div className="flex flex-col gap-6 max-w-3xl mx-auto">
                <div className="text-center border-b-2 border-gray-900 pb-4">
                  <h1 className="text-3xl font-serif font-bold uppercase tracking-wide">{draft.name}</h1>
                  <p className="text-sm font-medium mt-1">{draft.headline}</p>
                  <p className="text-xs text-gray-600 mt-0.5">{draft.location}</p>
                  {draft.links && (draft.links.linkedin || draft.links.github || draft.links.portfolio) && (
                    <div className="flex justify-center flex-wrap gap-4 mt-2 text-xs font-semibold text-[#2E75B6]">
                      {draft.links.linkedin && draft.links.linkedin !== 'None' && <a href={draft.links.linkedin} target="_blank" rel="noreferrer" className="hover:underline">LinkedIn</a>}
                      {draft.links.github && draft.links.github !== 'None' && <a href={draft.links.github} target="_blank" rel="noreferrer" className="hover:underline">GitHub</a>}
                      {draft.links.portfolio && draft.links.portfolio !== 'None' && <a href={draft.links.portfolio} target="_blank" rel="noreferrer" className="hover:underline">Portfolio</a>}
                    </div>
                  )}
                </div>
                
                <div>
                  <h2 className="text-sm font-bold uppercase tracking-wider border-b border-gray-300 mb-2 pb-1">Professional Summary</h2>
                  <p className="text-sm leading-relaxed">{draft.summary}</p>
                </div>

                <div>
                  <h2 className="text-sm font-bold uppercase tracking-wider border-b border-gray-300 mb-2 pb-1">Experience</h2>
                  <div className="flex flex-col gap-4">
                    {draft.experiences?.map((exp, i) => (
                      <div key={i}>
                        <div className="flex justify-between items-baseline">
                          <h3 className="font-bold text-sm">{exp.role}</h3>
                          <span className="text-xs font-semibold">{exp.dateRange}</span>
                        </div>
                        <div className="text-sm italic mb-1.5">{exp.company}</div>
                        <ul className="list-disc pl-5 text-sm flex flex-col gap-1">
                          {exp.bullets?.map((bull, j) => (
                            <li key={j}>{bull}</li>
                          ))}
                        </ul>
                      </div>
                    ))}
                  </div>
                </div>

                <div>
                  <h2 className="text-sm font-bold uppercase tracking-wider border-b border-gray-300 mb-2 pb-1">Education</h2>
                  <div className="flex flex-col gap-3">
                    {draft.education?.map((edu, i) => (
                      <div key={i} className="flex justify-between items-baseline">
                        <div>
                          <div className="font-bold text-sm">{edu.institution}</div>
                          <div className="text-sm italic">{edu.degree} in {edu.field}</div>
                        </div>
                        <div className="text-xs font-semibold">{edu.dateRange}</div>
                      </div>
                    ))}
                  </div>
                </div>

                <div>
                  <h2 className="text-sm font-bold uppercase tracking-wider border-b border-gray-300 mb-2 pb-1">Skills</h2>
                  <p className="text-sm leading-relaxed">{draft.skills?.join(', ')}</p>
                </div>
              </div>
            )}

            {template === 'modern' && (
              <div className="flex max-w-3xl mx-auto h-full min-h-[800px]">
                {/* Left Accent Column */}
                <div className="w-1/3 bg-[#f8f9fa] border-r border-gray-200 p-6 flex flex-col gap-6 print:bg-[#f8f9fa]">
                  <div>
                    <h1 className="text-2xl font-bold tracking-tight text-[#2E75B6]">{draft.name}</h1>
                    <p className="text-sm font-semibold text-gray-700 mt-1">{draft.headline}</p>
                    <p className="text-xs text-gray-500 mt-1">{draft.location}</p>
                    {draft.links && (draft.links.linkedin || draft.links.github || draft.links.portfolio) && (
                      <div className="flex flex-col gap-1 mt-3">
                        {draft.links.linkedin && draft.links.linkedin !== 'None' && <a href={draft.links.linkedin} target="_blank" rel="noreferrer" className="text-xs font-semibold text-gray-600 hover:text-[#2E75B6] hover:underline">LinkedIn</a>}
                        {draft.links.github && draft.links.github !== 'None' && <a href={draft.links.github} target="_blank" rel="noreferrer" className="text-xs font-semibold text-gray-600 hover:text-[#2E75B6] hover:underline">GitHub</a>}
                        {draft.links.portfolio && draft.links.portfolio !== 'None' && <a href={draft.links.portfolio} target="_blank" rel="noreferrer" className="text-xs font-semibold text-gray-600 hover:text-[#2E75B6] hover:underline">Portfolio</a>}
                      </div>
                    )}
                  </div>

                  <div>
                    <h2 className="text-xs font-bold uppercase tracking-wider text-[#2E75B6] mb-2">Education</h2>
                    <div className="flex flex-col gap-3">
                      {draft.education?.map((edu, i) => (
                        <div key={i}>
                          <div className="text-sm font-bold text-gray-800">{edu.degree}</div>
                          <div className="text-xs text-gray-600">{edu.field}</div>
                          <div className="text-xs text-gray-500 italic mt-0.5">{edu.institution}</div>
                          <div className="text-xs text-gray-400 mt-0.5">{edu.dateRange}</div>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div>
                    <h2 className="text-xs font-bold uppercase tracking-wider text-[#2E75B6] mb-2">Capabilities</h2>
                    <div className="flex flex-col gap-1.5">
                      {draft.skills?.map((skill, i) => (
                        <div key={i} className="text-xs font-medium text-gray-700">{skill}</div>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Right Main Column */}
                <div className="w-2/3 p-6 flex flex-col gap-6">
                  <div>
                    <h2 className="text-xs font-bold uppercase tracking-wider text-[#2E75B6] border-b border-gray-200 mb-2 pb-1">Profile Profile</h2>
                    <p className="text-sm leading-relaxed text-gray-800">{draft.summary}</p>
                  </div>

                  <div>
                    <h2 className="text-xs font-bold uppercase tracking-wider text-[#2E75B6] border-b border-gray-200 mb-2 pb-1">Professional Experience</h2>
                    <div className="flex flex-col gap-5">
                      {draft.experiences?.map((exp, i) => (
                        <div key={i}>
                          <div className="flex justify-between items-baseline mb-0.5">
                            <h3 className="font-bold text-sm text-gray-900">{exp.role}</h3>
                            <span className="text-xs font-medium text-[#2E75B6]">{exp.dateRange}</span>
                          </div>
                          <div className="text-sm text-gray-600 mb-2">{exp.company}</div>
                          <ul className="list-outside list-disc pl-4 text-xs text-gray-700 leading-relaxed space-y-1">
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
