'use client';

// Job detail panel for S2-005 — Job Card to Job Detail Expansion Pattern.
// Opens as a Dialog when a job row is clicked on the dashboard.
// Per S1-002 §4.4 — job detail must never feel disconnected from the dashboard.
// Per S1-002 §5.4 — shadcn Dialog is the only permitted modal component.
// Sheet is not installed in this project so Dialog is used here,
// consistent with how JobFormModal.tsx works.

import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Flag, MapPin, Building2, CalendarClock, FileText } from 'lucide-react';
import { cn } from '@/lib/utils';
import { formatDateOnly } from '@/lib/utils/dateFormatters';
import type { JobDetail, PipelineStage } from '@/types/job.types';

// Pipeline stage colour tokens — per S1-002 §4.5.
// Must stay identical to stageStyles in BoardContent.tsx and JobCard.tsx
// so stage indicators are visually consistent everywhere per S1-002 §12.1.
const stageStyles: Record<PipelineStage, string> = {
  Interested: 'bg-indigo-100 text-indigo-700',
  Applied: 'bg-blue-100 text-blue-700',
  Interview: 'bg-amber-100 text-amber-700',
  Offer: 'bg-emerald-100 text-emerald-700',
  Rejected: 'bg-red-100 text-red-700',
  Archived: 'bg-gray-100 text-gray-500',
};

// Deadline urgency helpers — same logic as JobCard.tsx and BoardContent.tsx.
// Kept identical so urgency cues behave consistently everywhere per S1-002 §12.1.
function isDeadlineSoon(deadline?: string): boolean {
  if (!deadline) return false;
  const diff = new Date(deadline).getTime() - Date.now();
  return diff > 0 && diff <= 3 * 24 * 60 * 60 * 1000;
}

function isDeadlineOverdue(deadline?: string): boolean {
  if (!deadline) return false;
  return new Date(deadline).getTime() < Date.now();
}

// Props interface — PascalCase per S1-001 §3.2.
interface JobDetailPanelProps {
  // The full detail record for the selected job, or null if nothing selected.
  job: JobDetail | null;
  // Whether the dialog is open.
  isOpen: boolean;
  // Whether the detail fetch is still in progress.
  isLoading: boolean;
  // Human-friendly error message or null — never a raw error object.
  error: string | null;
  // Called when the user closes the dialog.
  onClose: () => void;
}

export function JobDetailPanel({ job, isOpen, isLoading, error, onClose }: JobDetailPanelProps) {
  const deadlineSoon = isDeadlineSoon(job?.deadline);
  const deadlineOverdue = isDeadlineOverdue(job?.deadline);

  return (
    // shadcn Dialog — consistent with JobFormModal.tsx per S1-002 §5.4.
    // onOpenChange fires when the X button is clicked or the user
    // clicks outside — both correctly call onClose to reset hook state.
    <Dialog
      open={isOpen}
      onOpenChange={(open) => {
        if (!open) onClose();
      }}
    >
      <DialogContent
        className="max-h-[85vh] w-full overflow-y-auto sm:max-w-lg"
        // Accessible label for screen readers per S1-002 §10.1.
        aria-label="Job detail"
      >
        {/* LOADING STATE
            Skeleton placeholders while the fetch is in progress.
            Per S1-002 §9.2 — never show a blank box while loading.
            shadcn Skeleton uses animate-pulse per S1-002 §9.5. */}
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

        {/* ERROR STATE
            Human-friendly message — never raw error objects or HTTP codes
            per S1-001 §6.3. */}
        {!isLoading && error && (
          <div className="flex flex-col items-center justify-center gap-2 py-12 text-center">
            <p className="text-base font-semibold text-red-600">{error}</p>
            <p className="text-sm text-gray-500">Close this panel and try again.</p>
          </div>
        )}

        {/* MAIN CONTENT
            Only shown when data has loaded successfully. */}
        {!isLoading && !error && job && (
          <>
            {/* Header — title, priority flag, stage badge */}
            <DialogHeader className="mb-4">
              <div className="flex items-start gap-2">
                {/* Job title — most prominent element per S1-002 §4.3 */}
                <DialogTitle className="text-xl leading-tight font-bold text-gray-900">
                  {job.title}
                </DialogTitle>
                {/* Priority flag — only shown when set per S1-002 §4.3.
                    aria-label makes it accessible per S1-002 §10.1. */}
                {job.priorityFlag && (
                  <Flag
                    size={16}
                    className="mt-1 shrink-0 text-amber-500"
                    aria-label="Priority job"
                  />
                )}
              </div>

              {/* Pipeline stage badge — colour-coded per S1-002 §4.5 and §5.5.
                  Always uses the Badge component, never free-form colour. */}
              <Badge
                className={cn(
                  'mt-1 w-fit rounded-full border-0 px-2 py-0.5 text-xs font-medium',
                  stageStyles[job.pipelineStage],
                )}
              >
                {job.pipelineStage}
              </Badge>
            </DialogHeader>

            {/* CORE JOB INFO
                Company, location, last activity, deadline.
                Matches the required fields from S1-002 §4.3. */}
            <div className="flex flex-col gap-3 border-b border-gray-100 pb-5">
              {/* Company name */}
              <div className="flex items-center gap-2 text-sm text-gray-600">
                {/* aria-hidden on decorative icons per S1-002 §10.1 */}
                <Building2 size={15} aria-hidden={true} />
                <span>{job.company}</span>
              </div>

              {/* Location — only shown if present */}
              {job.location && (
                <div className="flex items-center gap-2 text-sm text-gray-600">
                  <MapPin size={15} aria-hidden={true} />
                  <span>{job.location}</span>
                </div>
              )}

              {/* Last activity date */}
              {job.lastActivityDate && (
                <div className="flex items-center gap-2 text-sm text-gray-500">
                  <CalendarClock size={15} aria-hidden={true} />
                  <span>Last activity: {formatDateOnly(job.lastActivityDate)}</span>
                </div>
              )}

              {/* Deadline — colour changes based on urgency per S1-002 §4.3.
                  Red if overdue, amber if within 3 days, gray otherwise.
                  Same logic as JobCard.tsx and BoardContent.tsx. */}
              {job.deadline && (
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
              )}
            </div>

            {/* DESCRIPTION — only rendered if the job has a description */}
            {job.description && (
              <div className="mt-5 flex flex-col gap-2 border-b border-gray-100 pb-5">
                <h3 className="text-sm font-semibold text-gray-700">Description</h3>
                <p className="text-sm leading-relaxed text-gray-600">{job.description}</p>
              </div>
            )}

            {/* NOTES — recruiter and custom notes, only shown if at least one is set */}
            {(job.recruiterNotes || job.customNotes) && (
              <div className="mt-5 flex flex-col gap-4 border-b border-gray-100 pb-5">
                <h3 className="text-sm font-semibold text-gray-700">Notes</h3>

                {job.recruiterNotes && (
                  <div className="flex flex-col gap-1">
                    <span className="text-xs font-medium text-gray-500">Recruiter</span>
                    <p className="text-sm text-gray-600">{job.recruiterNotes}</p>
                  </div>
                )}

                {job.customNotes && (
                  <div className="flex flex-col gap-1">
                    <span className="text-xs font-medium text-gray-500">Custom Notes</span>
                    <p className="text-sm text-gray-600">{job.customNotes}</p>
                  </div>
                )}
              </div>
            )}

            {/* SPRINT 2 PLACEHOLDER SECTIONS
    Reserves space in the UI layout so future stories have a
    consistent home to plug into.
    S2-006 — editing, S2-008 — stage controls,
    S2-010 — activity timeline, S2-011 — interview tracking. */}
            <div className="mt-5 flex flex-col gap-3">
              <div className="flex items-center gap-2 rounded-lg border border-dashed border-gray-200 p-4">
                <FileText size={15} className="text-gray-300" aria-hidden={true} />
                <span className="text-sm text-gray-400"></span>
              </div>
            </div>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
