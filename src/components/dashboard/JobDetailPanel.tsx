'use client';

import { LinkedDocumentsList } from '@/components/documents/LinkedDocumentsList';
import { InterviewSection } from './InterviewSection';
import { JobActivityTimeline } from './JobActivityTimeline';
import { ReminderSection } from './ReminderSection';
import { CoverLetterGenerator } from '@/components/documents/CoverLetterGenerator';
import { ResumeGenerator } from '@/components/documents/ResumeGenerator';
import { JobDocumentLinker } from '@/components/documents/JobDocumentLinker';
import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { Flag, MapPin, Building2, CalendarClock, Pencil, Save } from 'lucide-react';
import { cn } from '@/lib/utils';
import { formatDeadline, toLocalISOWithOffset, formatTimestamp } from '@/lib/utils/dateFormatters';
import { getTodayDateInputValue, isDateInputBeforeToday } from '@/lib/utils/dateValidation';
import type { JobDetail, PipelineStage } from '@/types/job.types';
import { InterviewPrepNotes } from './InterviewPrepNotes';

type DocumentTool = 'cover_letter' | 'resume' | null;

// Pipeline stage colour tokens — per S1-002 §4.5.
const stageStyles: Record<PipelineStage, string> = {
  Interested: 'bg-indigo-100 text-indigo-700',
  Applied: 'bg-blue-100 text-blue-700',
  Interview: 'bg-amber-100 text-amber-700',
  Offer: 'bg-emerald-100 text-emerald-700',
  Rejected: 'bg-red-100 text-red-700',
  Ghosted: 'bg-slate-200 text-slate-700',
  Archived: 'bg-gray-100 text-gray-500',
};

// All pipeline stages in display order — per S1-002 §4.5.
const PIPELINE_STAGES: PipelineStage[] = [
  'Interested',
  'Applied',
  'Interview',
  'Offer',
  'Rejected',
  'Ghosted',
  'Archived',
];

function isDeadlineSoon(deadline?: string): boolean {
  if (!deadline) return false;
  const diff = new Date(deadline).getTime() - Date.now();
  return diff > 0 && diff <= 3 * 24 * 60 * 60 * 1000;
}

function isDeadlineOverdue(deadline?: string): boolean {
  if (!deadline) return false;
  return new Date(deadline).getTime() < Date.now();
}

interface JobDetailPanelProps {
  job: JobDetail | null;
  isOpen: boolean;
  isLoading: boolean;
  error: string | null;
  onClose: () => void;
  onJobUpdated?: (updates: Partial<JobDetail>) => void;
}

export function JobDetailPanel({
  job,
  isOpen,
  isLoading,
  error,
  onClose,
  onJobUpdated,
}: JobDetailPanelProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [editError, setEditError] = useState<string | null>(null);
  const [activityRefreshKey, setActivityRefreshKey] = useState(0);
  const [documentRefreshKey, setDocumentRefreshKey] = useState(0);
  const [activeDocumentTool, setActiveDocumentTool] = useState<DocumentTool>(null);

  const [title, setTitle] = useState('');
  const [company, setCompany] = useState('');
  const [location, setLocation] = useState('');
  const [pipelineStage, setPipelineStage] = useState<PipelineStage>('Interested');
  const [priorityFlag, setPriorityFlag] = useState(false);
  const [deadlineDateStr, setDeadlineDateStr] = useState('');
  const [deadlineTimeStr, setDeadlineTimeStr] = useState('');
  const [description, setDescription] = useState('');
  const [compensationNotes, setCompensationNotes] = useState('');
  const [recruiterNotes, setRecruiterNotes] = useState('');
  const [customNotes, setCustomNotes] = useState('');
  const [companyResearchNotes, setCompanyResearchNotes] = useState('');
  const [outcomeNotes, setOutcomeNotes] = useState('');
  const todayDate = getTodayDateInputValue();

  useEffect(() => {
    if (job) {
      setTitle(job.title);
      setCompany(job.company);
      setLocation(job.location);
      setPipelineStage(job.pipelineStage);
      setPriorityFlag(job.priorityFlag ?? false);
      if (job.deadline) {
        const d = new Date(job.deadline);
        const year = d.getFullYear();
        const month = String(d.getMonth() + 1).padStart(2, '0');
        const day = String(d.getDate()).padStart(2, '0');
        setDeadlineDateStr(`${year}-${month}-${day}`);
        const hours = d.getHours();
        const minutes = d.getMinutes();
        if (hours !== 0 || minutes !== 0) {
          setDeadlineTimeStr(
            `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}`,
          );
        } else {
          setDeadlineTimeStr('08:00');
        }
      } else {
        setDeadlineDateStr('');
        setDeadlineTimeStr('08:00');
      }
      setDescription(job.description ?? '');
      setCompensationNotes(job.compensationNotes ?? '');
      setRecruiterNotes(job.recruiterNotes ?? '');
      setCustomNotes(job.customNotes ?? '');
      setCompanyResearchNotes(job.companyResearchNotes ?? '');
      setOutcomeNotes(job.outcomeNotes ?? '');
    }
    if (!isOpen) {
      setIsEditing(false);
      setActiveDocumentTool(null);
      setEditError(null);
    }
  }, [job, isOpen]);

  useEffect(() => {
    setActiveDocumentTool(null);
  }, [job?.id]);

  async function handleSave() {
    if (!job) return;
    if (deadlineDateStr && isDateInputBeforeToday(deadlineDateStr)) {
      setEditError('Deadline cannot be in the past.');
      return;
    }

    setIsSaving(true);
    setEditError(null);
    try {
      const payload = {
        job_title: title,
        company_name: company,
        location: location || undefined,
        // Only include current_stage if it changed — avoids triggering a
        // STAGE_CHANGE activity when nothing moved per S2-009 conventions.
        ...(pipelineStage !== job.pipelineStage && { current_stage: pipelineStage }),
        is_priority: priorityFlag,
        deadline: deadlineDateStr
          ? toLocalISOWithOffset(
              deadlineTimeStr ? `${deadlineDateStr}T${deadlineTimeStr}` : deadlineDateStr,
            )
          : undefined,
        description: description || undefined,
        compensation_notes: compensationNotes || undefined,
        recruiter_notes: recruiterNotes || undefined,
        custom_notes: customNotes || undefined,
        company_research_notes: companyResearchNotes || undefined,
        outcome_notes: outcomeNotes || undefined,
      };

      // Use fetch() — never call Supabase directly from the frontend for
      // mutations. The API route enforces ownership via supabase.auth.getUser()
      // per S1-003 §2.3. user_id is never sent from the client.
      const res = await fetch(`/api/jobs/${job.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (!res.ok) throw new Error('Failed to update job detail');

      // Notify parent so the board card updates immediately without a refetch.
      onJobUpdated?.({
        title,
        company,
        location,
        pipelineStage,
        priorityFlag,
        deadline: deadlineDateStr
          ? toLocalISOWithOffset(
              deadlineTimeStr ? `${deadlineDateStr}T${deadlineTimeStr}` : deadlineDateStr,
            )
          : undefined,
        description,
        compensationNotes,
        recruiterNotes,
        customNotes,
        companyResearchNotes,
        outcomeNotes,
      });

      setIsEditing(false);
    } catch {
      // Human-friendly error — never expose raw server messages per S1-001 §6.3.
      setEditError('Failed to save changes. Please try again.');
    } finally {
      setIsSaving(false);
    }
  }

  // Increment documentRefreshKey to trigger a re-fetch in LinkedDocumentsList
  // and JobDocumentLinker whenever a document is saved, linked, or unlinked.
  function handleDocumentSaved() {
    setDocumentRefreshKey((current) => current + 1);
  }

  const deadlineSoon = isDeadlineSoon(job?.deadline);
  const deadlineOverdue = isDeadlineOverdue(job?.deadline);

  return (
    <Dialog
      open={isOpen}
      onOpenChange={(open) => {
        if (!open) onClose();
      }}
    >
      <DialogContent
        className={cn(
          'max-h-[85vh] w-full overflow-y-auto',
          activeDocumentTool ? 'sm:max-w-6xl' : 'sm:max-w-3xl',
        )}
        aria-label="Job detail"
      >
        {isLoading && (
          <div className="flex flex-col gap-4 pt-2">
            <Skeleton className="h-7 w-3/4" />
            <Skeleton className="h-5 w-1/2" />
            <Skeleton className="h-5 w-1/3" />
            <Skeleton className="h-4 w-1/4" />
            <div className="mt-4 flex flex-col gap-2">
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-4 w-2/3" />
            </div>
          </div>
        )}

        {!isLoading && error && (
          <div className="flex flex-col items-center justify-center gap-2 py-12 text-center">
            <p className="text-base font-semibold text-red-600">{error}</p>
            <p className="text-sm text-gray-500">Close this panel and try again.</p>
          </div>
        )}

        {!isLoading && !error && job && (
          <>
            <DialogHeader className="-mt-1.5 mb-4">
              <div className="flex items-center justify-between">
                <div className="mr-4 flex flex-1 items-center gap-2">
                  {isEditing ? (
                    <Input
                      value={title}
                      onChange={(e) => setTitle(e.target.value)}
                      className="h-9 w-full max-w-xs text-xl font-bold"
                      placeholder="Job Title"
                    />
                  ) : (
                    <DialogTitle className="text-xl leading-tight font-bold text-gray-900">
                      {job.title}
                    </DialogTitle>
                  )}

                  {isEditing ? (
                    <div className="ml-2 flex items-center gap-1.5">
                      <Checkbox
                        id="edit-priority"
                        checked={priorityFlag}
                        onCheckedChange={(checked) => setPriorityFlag(!!checked)}
                      />
                      <Label
                        htmlFor="edit-priority"
                        className="cursor-pointer text-xs font-medium text-amber-600"
                      >
                        Priority
                      </Label>
                    </div>
                  ) : (
                    job.priorityFlag && (
                      <Flag
                        size={16}
                        className="shrink-0 text-amber-500"
                        aria-label="Priority job"
                      />
                    )
                  )}
                </div>

                <div className="flex items-center gap-2 pr-6">
                  {isEditing ? (
                    <>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => {
                          setIsEditing(false);
                          setEditError(null);
                        }}
                        disabled={isSaving}
                        className="h-8 rounded-full px-3 text-xs font-medium text-gray-500 hover:text-gray-700"
                      >
                        Cancel
                      </Button>
                      <Button
                        size="sm"
                        onClick={handleSave}
                        disabled={isSaving}
                        className="h-8 rounded-full bg-[#2E75B6] px-4 text-xs font-semibold text-white shadow-sm transition-all hover:bg-[#1F4E79] hover:shadow"
                      >
                        {isSaving ? (
                          'Saving...'
                        ) : (
                          <>
                            <Save size={14} className="mr-1.5" /> Save Changes
                          </>
                        )}
                      </Button>
                    </>
                  ) : (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setIsEditing(true)}
                      className="h-8 rounded-full bg-blue-50 px-4 text-xs font-semibold text-blue-600 transition-colors hover:bg-blue-100 hover:text-blue-700"
                    >
                      <Pencil size={13} className="mr-1.5" /> Edit Details
                    </Button>
                  )}
                </div>
              </div>

              {isEditing ? (
                <Select
                  value={pipelineStage}
                  onValueChange={(val) => setPipelineStage(val as PipelineStage)}
                >
                  <SelectTrigger className="mt-1 h-7 w-[140px] text-xs">
                    <SelectValue placeholder="Stage" />
                  </SelectTrigger>
                  <SelectContent>
                    {PIPELINE_STAGES.map((s) => (
                      <SelectItem key={s} value={s} className="text-xs">
                        {s}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              ) : (
                <Badge
                  className={cn(
                    'mt-1 w-fit rounded-full border-0 px-2 py-0.5 text-xs font-medium',
                    stageStyles[job.pipelineStage],
                  )}
                >
                  {job.pipelineStage}
                </Badge>
              )}
              {isEditing && ['Rejected', 'Ghosted', 'Offer'].includes(pipelineStage) && (
                <div className="animate-in fade-in slide-in-from-top-2 mt-3 rounded-md border border-gray-100 bg-gray-50 p-3">
                  <Label htmlFor="outcomeNotes" className="text-sm font-semibold text-gray-700">
                    Outcome Notes (Optional)
                  </Label>
                  <textarea
                    id="outcomeNotes"
                    value={outcomeNotes}
                    onChange={(e) => setOutcomeNotes(e.target.value)}
                    placeholder={
                      pipelineStage === 'Offer'
                        ? 'What are the offer details? e.g. $120k / Remote'
                        : `Why did they mark you as ${pipelineStage}?`
                    }
                    className="mt-1.5 flex min-h-[60px] w-full rounded-md border border-gray-200 bg-white px-3 py-2 text-sm shadow-sm placeholder:text-gray-400 focus-visible:ring-1 focus-visible:ring-blue-500 focus-visible:outline-none"
                  />
                </div>
              )}
            </DialogHeader>

            <div className="flex flex-col gap-3 border-b border-gray-100 pb-5">
              {isEditing ? (
                <div className="flex items-center gap-2">
                  <Building2 size={15} className="text-gray-400" aria-hidden={true} />
                  <Input
                    value={company}
                    onChange={(e) => setCompany(e.target.value)}
                    className="h-7 w-full text-sm sm:w-1/2"
                    placeholder="Company Name"
                  />
                </div>
              ) : (
                <div className="flex items-center gap-2 text-sm text-gray-600">
                  <Building2 size={15} aria-hidden={true} />
                  <span>{job.company}</span>
                </div>
              )}

              {isEditing ? (
                <div className="flex items-center gap-2">
                  <MapPin size={15} className="text-gray-400" aria-hidden={true} />
                  <Input
                    value={location}
                    onChange={(e) => setLocation(e.target.value)}
                    className="h-7 w-full text-sm sm:w-1/2"
                    placeholder="Location (e.g. Remote, NY)"
                  />
                </div>
              ) : (
                job.location && (
                  <div className="flex items-center gap-2 text-sm text-gray-600">
                    <MapPin size={15} aria-hidden={true} />
                    <span>{job.location}</span>
                  </div>
                )
              )}

              {!isEditing && job.outcomeNotes && (
                <div className="relative mb-2 rounded-lg border border-slate-100 bg-slate-50 p-4">
                  <div className="mb-2 flex items-center gap-2">
                    <div className="flex h-6 w-6 items-center justify-center rounded-sm bg-slate-200">
                      <Flag size={14} className="text-slate-600" />
                    </div>
                    <h3 className="font-semibold text-gray-900">Final Outcome Notes</h3>
                  </div>
                  <p className="text-sm whitespace-pre-wrap text-gray-700">{job.outcomeNotes}</p>
                </div>
              )}

              {job.lastActivityDate && (
                <div className="flex items-center gap-2 text-sm text-gray-500">
                  <CalendarClock size={15} aria-hidden={true} />
                  <span>Last activity: {formatTimestamp(job.lastActivityDate)}</span>
                </div>
              )}

              {isEditing ? (
                <div className="mt-2 flex flex-col gap-1.5">
                  <Label htmlFor="deadline-date" className="text-xs text-gray-500">
                    Deadline
                  </Label>
                  <div className="flex items-center gap-2">
                    <Input
                      id="deadline-date"
                      type="date"
                      min={todayDate}
                      value={deadlineDateStr}
                      onChange={(e) => {
                        setDeadlineDateStr(e.target.value);
                        if (editError === 'Deadline cannot be in the past.') setEditError(null);
                      }}
                      className="w-full sm:w-1/3"
                    />
                    <Input
                      id="deadline-time"
                      type="time"
                      value={deadlineTimeStr}
                      onChange={(e) => setDeadlineTimeStr(e.target.value)}
                      className="w-full sm:w-1/4"
                    />
                  </div>
                  {deadlineDateStr &&
                    (() => {
                      const [year, month, day] = deadlineDateStr.split('-').map(Number);
                      const selected = new Date(year, month - 1, day);
                      const today = new Date();
                      today.setHours(0, 0, 0, 0);
                      return selected < today;
                    })() && (
                      <p className="animate-in fade-in slide-in-from-top-1 text-xs font-medium text-red-600">
                        Deadline cannot be in the past.
                      </p>
                    )}
                  {editError && <p className="text-xs font-medium text-red-600">{editError}</p>}
                </div>
              ) : job.deadline ? (
                <div
                  className={cn(
                    'text-sm font-medium',
                    deadlineOverdue && 'text-red-600',
                    deadlineSoon && !deadlineOverdue && 'text-amber-600',
                    !deadlineSoon && !deadlineOverdue && 'text-gray-500',
                  )}
                >
                  Deadline: {formatDeadline(job.deadline)}
                  {deadlineOverdue && ' (Overdue)'}
                  {deadlineSoon && !deadlineOverdue && ' (Soon)'}
                </div>
              ) : null}

              {isEditing ? (
                <div className="mt-2 flex flex-col gap-1.5">
                  <Label htmlFor="description" className="text-xs text-gray-500">
                    Description
                  </Label>
                  <textarea
                    id="description"
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    placeholder="Enter job description..."
                    className="min-h-[80px] w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm placeholder:text-gray-400 focus:border-[#2E75B6] focus:ring-2 focus:ring-[#2E75B6]/50 focus:outline-none"
                  />
                </div>
              ) : job.description ? (
                <div className="mt-2 flex flex-col gap-1">
                  <span className="text-xs font-medium text-gray-500">Description</span>
                  <p className="text-sm whitespace-pre-wrap text-gray-600">{job.description}</p>
                </div>
              ) : null}

              {isEditing ? (
                <div className="mt-2 flex flex-col gap-1.5">
                  <Label htmlFor="compensationNotes" className="text-xs text-gray-500">
                    Compensation Notes
                  </Label>
                  <textarea
                    id="compensationNotes"
                    value={compensationNotes}
                    onChange={(e) => setCompensationNotes(e.target.value)}
                    placeholder="Enter compensation details..."
                    className="min-h-[40px] w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm placeholder:text-gray-400 focus:border-[#2E75B6] focus:ring-2 focus:ring-[#2E75B6]/50 focus:outline-none"
                  />
                </div>
              ) : job.compensationNotes ? (
                <div className="mt-2 flex flex-col gap-1">
                  <span className="text-xs font-medium text-gray-500">Compensation</span>
                  <p className="text-sm whitespace-pre-wrap text-gray-600">
                    {job.compensationNotes}
                  </p>
                </div>
              ) : null}
            </div>

            {/* Document Tools section — generate cover letter or resume
                directly from this job context per S2-022/S2-023. */}
            <div className="mt-5 flex flex-col gap-3 border-b border-gray-100 pb-5 print:hidden">
              <div className="flex flex-col gap-1">
                <h3 className="text-sm font-semibold text-gray-700">Document Tools</h3>
                <p className="text-sm text-gray-500">
                  Generate a tailored resume or cover letter directly from this job.
                </p>
                <p className="text-xs text-gray-400">
                  Saved company research notes are included in AI prompt context for this job.
                </p>
              </div>

              <div className="flex flex-wrap gap-2">
                <Button
                  type="button"
                  variant={activeDocumentTool === 'cover_letter' ? 'default' : 'outline'}
                  onClick={() =>
                    setActiveDocumentTool((current) =>
                      current === 'cover_letter' ? null : 'cover_letter',
                    )
                  }
                  className={cn(
                    activeDocumentTool === 'cover_letter' &&
                      'bg-[#2E75B6] text-white hover:bg-[#1F4E79]',
                  )}
                >
                  {activeDocumentTool === 'cover_letter'
                    ? 'Hide Cover Letter Tool'
                    : 'Generate Cover Letter'}
                </Button>
                <Button
                  type="button"
                  variant={activeDocumentTool === 'resume' ? 'default' : 'outline'}
                  onClick={() =>
                    setActiveDocumentTool((current) => (current === 'resume' ? null : 'resume'))
                  }
                  className={cn(
                    activeDocumentTool === 'resume' && 'bg-[#2E75B6] text-white hover:bg-[#1F4E79]',
                  )}
                >
                  {activeDocumentTool === 'resume' ? 'Hide Resume Tool' : 'Generate Resume'}
                </Button>
              </div>

              {activeDocumentTool === 'cover_letter' && (
                <div className="rounded-lg border border-gray-200 bg-white p-4">
                  <div className="mb-4 flex flex-col gap-1">
                    <h4 className="text-base font-semibold text-gray-900">Cover Letter</h4>
                    <p className="text-sm text-gray-500">
                      Uses this job card as the target role and saves drafts to the document
                      library.
                    </p>
                  </div>
                  <CoverLetterGenerator
                    onSaved={handleDocumentSaved}
                    presetJob={{
                      id: job.id,
                      job_title: job.title,
                      company_name: job.company,
                      current_stage: job.pipelineStage,
                    }}
                    hideJobSelector
                  />
                </div>
              )}

              {activeDocumentTool === 'resume' && (
                <div className="rounded-lg border border-gray-200 bg-white p-4">
                  <div className="mb-4 flex flex-col gap-1">
                    <h4 className="text-base font-semibold text-gray-900">Resume</h4>
                    <p className="text-sm text-gray-500">
                      Tailors your resume against this job and saves drafts to the document library.
                    </p>
                  </div>
                  <ResumeGenerator
                    onSaved={handleDocumentSaved}
                    presetJob={{
                      id: job.id,
                      job_title: job.title,
                      company_name: job.company,
                      current_stage: job.pipelineStage,
                    }}
                    hideJobSelector
                  />
                </div>
              )}
            </div>

            {/* S3-010: Linked Documents — focused view of documents attached to
                this job. Shows type/status badges, inline preview, copy, export,
                and unlink actions. Refreshes when documentRefreshKey increments.
                Auth and ownership enforced on the backend per S1-003 §5.2. */}
            <div className="mt-5 flex flex-col gap-3 border-b border-gray-100 pb-5">
              <div className="flex flex-col gap-1">
                <h3 className="text-sm font-semibold text-gray-700">Linked Documents</h3>
                <p className="text-sm text-gray-500">
                  Documents attached to this job. Unlink to remove from this job without deleting
                  from your library.
                </p>
              </div>
              <LinkedDocumentsList
                jobId={job.id}
                refreshKey={documentRefreshKey}
                onUnlinked={handleDocumentSaved}
              />
            </div>

            {/* S3-009: Link Documents — allows linking/unlinking library
                documents to this job. Auth and ownership enforced on the
                backend per S1-003 §4.3. */}
            <div className="mt-5 flex flex-col gap-3 border-b border-gray-100 pb-5">
              <div className="flex flex-col gap-1">
                <h3 className="text-sm font-semibold text-gray-700">Link Documents</h3>
                <p className="text-sm text-gray-500">
                  Link existing documents from your library to this job.
                </p>
              </div>
              <JobDocumentLinker jobId={job.id} onLinkChanged={handleDocumentSaved} />
            </div>

            {isEditing ? (
              <div className="mt-5 flex flex-col gap-5 border-b border-gray-100 pb-5">
                <h3 className="text-sm font-semibold text-gray-700">Edit Notes</h3>

                <div className="flex flex-col gap-1.5">
                  <Label htmlFor="recruiterNotes" className="text-xs text-gray-500">
                    Recruiter Notes
                  </Label>
                  <textarea
                    id="recruiterNotes"
                    value={recruiterNotes}
                    onChange={(e) => setRecruiterNotes(e.target.value)}
                    placeholder="Enter notes about the recruiter or contacts..."
                    className="min-h-[80px] w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm placeholder:text-gray-400 focus:border-[#2E75B6] focus:ring-2 focus:ring-[#2E75B6]/50 focus:outline-none"
                  />
                </div>

                <div className="flex flex-col gap-1.5">
                  <Label htmlFor="companyResearchNotes" className="text-xs text-gray-500">
                    Company Research
                  </Label>
                  <p className="text-xs text-gray-400">
                    Used to guide AI cover letter and resume generation with company-specific
                    context.
                  </p>
                  <textarea
                    id="companyResearchNotes"
                    value={companyResearchNotes}
                    onChange={(e) => setCompanyResearchNotes(e.target.value)}
                    placeholder="Add company research, mission notes, product insights, or talking points for AI tailoring..."
                    className="min-h-[100px] w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm placeholder:text-gray-400 focus:border-[#2E75B6] focus:ring-2 focus:ring-[#2E75B6]/50 focus:outline-none"
                  />
                </div>

                <div className="flex flex-col gap-1.5">
                  <Label htmlFor="customNotes" className="text-xs text-gray-500">
                    Custom Notes
                  </Label>
                  <textarea
                    id="customNotes"
                    value={customNotes}
                    onChange={(e) => setCustomNotes(e.target.value)}
                    placeholder="Enter any additional context or private notes..."
                    className="min-h-[80px] w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm placeholder:text-gray-400 focus:border-[#2E75B6] focus:ring-2 focus:ring-[#2E75B6]/50 focus:outline-none"
                  />
                </div>
              </div>
            ) : (
              (job.recruiterNotes || job.companyResearchNotes || job.customNotes) && (
                <div className="mt-5 flex flex-col gap-4 border-b border-gray-100 pb-5">
                  <h3 className="text-sm font-semibold text-gray-700">Notes</h3>

                  {job.recruiterNotes && (
                    <div className="flex flex-col gap-1">
                      <span className="text-xs font-medium text-gray-500">Recruiter</span>
                      <p className="text-sm whitespace-pre-wrap text-gray-600">
                        {job.recruiterNotes}
                      </p>
                    </div>
                  )}

                  {job.companyResearchNotes && (
                    <div className="flex flex-col gap-1">
                      <span className="text-xs font-medium text-gray-500">Company Research</span>
                      <p className="text-sm whitespace-pre-wrap text-gray-600">
                        {job.companyResearchNotes}
                      </p>
                    </div>
                  )}

                  {job.customNotes && (
                    <div className="flex flex-col gap-1">
                      <span className="text-xs font-medium text-gray-500">Custom Notes</span>
                      <p className="text-sm whitespace-pre-wrap text-gray-600">{job.customNotes}</p>
                    </div>
                  )}
                </div>
              )
            )}

            <div className="mt-5 flex flex-col gap-3 border-b border-gray-100 pb-5">
              <InterviewPrepNotes
                jobId={job.id}
                initialNotes={job.customNotes ?? ''}
                onSaved={(updated) => onJobUpdated?.({ customNotes: updated })}
              />
            </div>

            <div className="mt-5 border-b border-gray-100 pb-5">
              <InterviewSection jobId={job.id} />
            </div>

            <ReminderSection
              jobId={job.id}
              onReminderSaved={() => setActivityRefreshKey((prev) => prev + 1)}
            />

            <div className="mt-5">
              <JobActivityTimeline jobId={job.id} refreshKey={activityRefreshKey} />
            </div>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
