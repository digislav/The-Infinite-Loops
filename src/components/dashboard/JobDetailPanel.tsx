'use client';

import { InterviewSection } from './InterviewSection';
import { JobActivityTimeline } from './JobActivityTimeline';
import { ReminderSection } from './ReminderSection';
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
import { formatDateOnly } from '@/lib/utils/dateFormatters';
import type { JobDetail, PipelineStage } from '@/types/job.types';

// Pipeline stage colour tokens — per S1-002 §4.5.
// Must stay consistent with stageStyles in BoardContent.tsx and
// JobActivityTimeline.tsx so stage badges look identical everywhere.
const stageStyles: Record<PipelineStage, string> = {
  Interested: 'bg-indigo-100 text-indigo-700',
  Applied: 'bg-blue-100 text-blue-700',
  Interview: 'bg-amber-100 text-amber-700',
  Offer: 'bg-emerald-100 text-emerald-700',
  Rejected: 'bg-red-100 text-red-700',
  Ghosted: 'bg-slate-200 text-slate-700',
  Archived: 'bg-gray-100 text-gray-500',
};

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
  const [activityRefreshKey, setActivityRefreshKey] = useState(0);

  const [title, setTitle] = useState('');
  const [company, setCompany] = useState('');
  const [location, setLocation] = useState('');
  const [pipelineStage, setPipelineStage] = useState<PipelineStage>('Interested');
  const [priorityFlag, setPriorityFlag] = useState(false);
  const [deadlineStr, setDeadlineStr] = useState('');
  const [description, setDescription] = useState('');
  const [compensationNotes, setCompensationNotes] = useState('');
  const [recruiterNotes, setRecruiterNotes] = useState('');
  const [customNotes, setCustomNotes] = useState('');

  useEffect(() => {
    if (job) {
      setTitle(job.title);
      setCompany(job.company);
      setLocation(job.location);
      setPipelineStage(job.pipelineStage);
      setPriorityFlag(job.priorityFlag ?? false);
      setDeadlineStr(job.deadline ? job.deadline.split('T')[0] : '');
      setDescription(job.description ?? '');
      setCompensationNotes(job.compensationNotes ?? '');
      setRecruiterNotes(job.recruiterNotes ?? '');
      setCustomNotes(job.customNotes ?? '');
    }
    if (!isOpen) {
      setIsEditing(false);
    }
  }, [job, isOpen]);

  async function handleSave() {
    if (!job) return;
    setIsSaving(true);
    try {
      const payload = {
        job_title: title,
        company_name: company,
        location: location || undefined,
        // Only include current_stage if it actually changed.
        // This prevents jobServices from recording a false STAGE_CHANGE
        // activity when the user only updated notes or other fields.
        ...(pipelineStage !== job.pipelineStage && { current_stage: pipelineStage }),
        is_priority: priorityFlag,
        deadline: deadlineStr || undefined,
        description: description || undefined,
        compensation_notes: compensationNotes || undefined,
        recruiter_notes: recruiterNotes || undefined,
        custom_notes: customNotes || undefined,
      };

      // user_id is never included in the payload — the backend uses
      // the session identity per S1-003 §5.4.
      const res = await fetch(`/api/jobs/${job.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (!res.ok) throw new Error('Failed to update job detail');

      onJobUpdated?.({
        title,
        company,
        location,
        pipelineStage,
        priorityFlag,
        deadline: deadlineStr ? new Date(deadlineStr).toISOString() : undefined,
        description,
        compensationNotes,
        recruiterNotes,
        customNotes,
      });

      setIsEditing(false);
    } catch {
      // Human-friendly error — never raw error objects per S1-001 §6.3.
      alert('Failed to save changes. Please try again.');
    } finally {
      setIsSaving(false);
    }
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
        className="max-h-[85vh] w-full overflow-y-auto sm:max-w-lg"
        aria-label="Job detail"
      >
        {/* LOADING STATE — skeletons while data fetches per S1-002 §9.2 */}
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

        {/* ERROR STATE — human-friendly message per S1-001 §6.3 */}
        {!isLoading && error && (
          <div className="flex flex-col items-center justify-center gap-2 py-12 text-center">
            <p className="text-base font-semibold text-red-600">{error}</p>
            <p className="text-sm text-gray-500">Close this panel and try again.</p>
          </div>
        )}

        {/* MAIN CONTENT — only shown when data has loaded successfully */}
        {!isLoading && !error && job && (
          <>
            {/* HEADER — title, priority flag, stage badge, edit button */}
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
                        onClick={() => setIsEditing(false)}
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

              {/* Stage badge or stage selector when editing */}
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
                // Stage badge — colour-coded per S1-002 §4.5 and §5.5
                <Badge
                  className={cn(
                    'mt-1 w-fit rounded-full border-0 px-2 py-0.5 text-xs font-medium',
                    stageStyles[job.pipelineStage],
                  )}
                >
                  {job.pipelineStage}
                </Badge>
              )}
            </DialogHeader>

            {/* CORE INFO — company, location, last activity, deadline */}
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

              {/* Last activity date — always shown in read mode */}
              {job.lastActivityDate && (
                <div className="flex items-center gap-2 text-sm text-gray-500">
                  <CalendarClock size={15} aria-hidden={true} />
                  <span>Last activity: {formatDateOnly(job.lastActivityDate)}</span>
                </div>
              )}

              {/* Deadline — colour-coded for urgency per S1-002 §4.3 */}
              {isEditing ? (
                <div className="mt-2 flex flex-col gap-1.5">
                  <Label htmlFor="deadline" className="text-xs text-gray-500">
                    Deadline
                  </Label>
                  <Input
                    id="deadline"
                    type="date"
                    value={deadlineStr}
                    onChange={(e) => setDeadlineStr(e.target.value)}
                    className="w-full sm:w-1/2"
                  />
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
                  Deadline: {formatDateOnly(job.deadline)}
                  {deadlineOverdue && ' (Overdue)'}
                  {deadlineSoon && !deadlineOverdue && ' (Soon)'}
                </div>
              ) : null}

              {/* DESCRIPTION */}
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

              {/* COMPENSATION NOTES */}
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

            {/* NOTES SECTION — recruiter notes and custom notes */}
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
              (job.recruiterNotes || job.customNotes) && (
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

                  {job.customNotes && (
                    <div className="flex flex-col gap-1">
                      <span className="text-xs font-medium text-gray-500">Custom Notes</span>
                      <p className="text-sm whitespace-pre-wrap text-gray-600">{job.customNotes}</p>
                    </div>
                  )}
                </div>
              )
            )}

            {/* S2-011: Interview Section — shows scheduled interviews and
    allows adding new interview events with round type, date/time,
    location, and notes. Auth and ownership enforced on the backend. */}
            <div className="mt-5 border-b border-gray-100 pb-5">
              <InterviewSection jobId={job.id} />
            </div>

            <ReminderSection jobId={job.id} onReminderSaved={() => setActivityRefreshKey((prev) => prev + 1)} />

            {/* S2-010: Activity Timeline — shows all stage changes, interviews,
    and note updates for this job in reverse chronological order.
    The timeline component fetches from the protected API route which
    enforces ownership server-side per S1-003 §4.3.
    - Blue dot: stage changes
    - Amber dot: interview events (from S2-011)
    - Gray dot: note updates */}
            <div className="mt-5">
              <JobActivityTimeline jobId={job.id} refreshKey={activityRefreshKey} />
            </div>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
