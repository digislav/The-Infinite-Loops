'use client';

// Job detail panel for S2-005 — Job Card to Job Detail Expansion Pattern.
// Opens as a Dialog when a job row is clicked on the dashboard.
// Per S1-002 §4.4 — job detail must never feel disconnected from the dashboard.
// Per S1-002 §5.4 — shadcn Dialog is the only permitted modal component.
// Sheet is not installed in this project so Dialog is used here,
// consistent with how JobFormModal.tsx works.

import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Flag, MapPin, Building2, CalendarClock, FileText, Pencil, Save, X } from 'lucide-react';
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
  Ghosted: 'bg-slate-200 text-slate-700',
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
  // Called when the job is successfully updated inside the panel.
  // We pass up the new fields so the parent can optimistically apply them.
  onJobUpdated?: (updates: Partial<JobDetail>) => void;
}

export function JobDetailPanel({ job, isOpen, isLoading, error, onClose, onJobUpdated }: JobDetailPanelProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  // Form state
  const [deadlineStr, setDeadlineStr] = useState('');
  const [recruiterNotes, setRecruiterNotes] = useState('');
  const [customNotes, setCustomNotes] = useState('');

  // Sync state when entering edit mode or when job changes
  useEffect(() => {
    if (job) {
      setDeadlineStr(job.deadline ? job.deadline.split('T')[0] : '');
      setRecruiterNotes(job.recruiterNotes ?? '');
      setCustomNotes(job.customNotes ?? '');
    }
    if (!isOpen) {
      setIsEditing(false); // Reset edit mode when dialog closes
    }
  }, [job, isOpen]);

  async function handleSave() {
    if (!job) return;
    setIsSaving(true);
    try {
      const payload = {
        deadline: deadlineStr || undefined,
        recruiter_notes: recruiterNotes || undefined,
        custom_notes: customNotes || undefined,
      };

      const res = await fetch(`/api/jobs/${job.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (!res.ok) throw new Error('Failed to update job detail');
      
      // Update the parent's state so the UI reflects the change instantly without re-fetching
      onJobUpdated?.({
        deadline: deadlineStr ? new Date(deadlineStr).toISOString() : undefined,
        recruiterNotes,
        customNotes,
      });
      
      setIsEditing(false);
    } catch (err) {
      alert('Failed to save changes. Please try again.');
    } finally {
      setIsSaving(false);
    }
  }
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
            <DialogHeader className="-mt-1.5 mb-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <DialogTitle className="text-xl leading-tight font-bold text-gray-900">
                    {job.title}
                  </DialogTitle>
                  {job.priorityFlag && (
                    <Flag
                      size={16}
                      className="shrink-0 text-amber-500"
                      aria-label="Priority job"
                    />
                  )}
                </div>
                
                {/* Edit Toggle Buttons */}
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
                        {isSaving ? 'Saving...' : <><Save size={14} className="mr-1.5" /> Save Changes</>}
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

              {/* Deadline */}
              {isEditing ? (
                <div className="flex flex-col gap-1.5 mt-2">
                  <Label htmlFor="deadline" className="text-xs text-gray-500">Deadline</Label>
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
            </div>

            {/* DESCRIPTION — only rendered if the job has a description */}
            {job.description && (
              <div className="mt-5 flex flex-col gap-2 border-b border-gray-100 pb-5">
                <h3 className="text-sm font-semibold text-gray-700">Description</h3>
                <p className="text-sm leading-relaxed text-gray-600">{job.description}</p>
              </div>
            )}

            {/* NOTES / EDIT MODE SECTION */}
            {isEditing ? (
              <div className="mt-5 flex flex-col gap-5 border-b border-gray-100 pb-5">
                <h3 className="text-sm font-semibold text-gray-700">Edit Notes</h3>
                
                <div className="flex flex-col gap-1.5">
                  <Label htmlFor="recruiterNotes" className="text-xs text-gray-500">Recruiter Notes</Label>
                  <textarea
                    id="recruiterNotes"
                    value={recruiterNotes}
                    onChange={(e) => setRecruiterNotes(e.target.value)}
                    placeholder="Enter notes about the recruiter or contacts..."
                    className="min-h-[80px] w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-[#2E75B6]/50 focus:border-[#2E75B6]"
                  />
                </div>
                
                <div className="flex flex-col gap-1.5">
                  <Label htmlFor="customNotes" className="text-xs text-gray-500">Custom Notes</Label>
                  <textarea
                    id="customNotes"
                    value={customNotes}
                    onChange={(e) => setCustomNotes(e.target.value)}
                    placeholder="Enter any additional context or private notes..."
                    className="min-h-[80px] w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-[#2E75B6]/50 focus:border-[#2E75B6]"
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
                      <p className="whitespace-pre-wrap text-sm text-gray-600">{job.recruiterNotes}</p>
                    </div>
                  )}

                  {job.customNotes && (
                    <div className="flex flex-col gap-1">
                      <span className="text-xs font-medium text-gray-500">Custom Notes</span>
                      <p className="whitespace-pre-wrap text-sm text-gray-600">{job.customNotes}</p>
                    </div>
                  )}
                </div>
              )
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
