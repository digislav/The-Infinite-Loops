'use client';

import { useEffect, useState, useCallback } from 'react';
import { BriefcaseIcon } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Flag } from 'lucide-react';
import { ChevronUp, ChevronDown } from 'lucide-react';
import { cn } from '@/lib/utils';
import { formatDeadline, formatTimestamp } from '@/lib/utils/dateFormatters';
import type { Job, PipelineStage, JobRecord } from '@/types/job.types';
import { toUIJob } from '@/types/job.types';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { JobFormModal } from './JobFormModal';
import type { JobFilters } from './BoardControls';
import { useJobDetail } from '@/hooks/useJobDetail';
import { JobDetailPanel } from './JobDetailPanel';

const stageStyles: Record<PipelineStage, string> = {
  Interested: 'bg-indigo-100 text-indigo-700',
  Applied: 'bg-blue-100 text-blue-700',
  Interview: 'bg-amber-100 text-amber-700',
  Offer: 'bg-emerald-100 text-emerald-700',
  Rejected: 'bg-red-100 text-red-700',
  Ghosted: 'bg-slate-200 text-slate-700',
  Archived: 'bg-gray-100 text-gray-500',
};

const STAGES: PipelineStage[] = [
  'Interested',
  'Applied',
  'Interview',
  'Offer',
  'Rejected',
  'Ghosted',
  'Archived',
];

// Valid stage transitions — mirrors backend enforcement.
// Only stages listed here are selectable from each current stage.
const ALLOWED_TRANSITIONS: Record<PipelineStage, PipelineStage[]> = {
  Interested: ['Applied', 'Archived'],
  Applied: ['Interview', 'Rejected', 'Ghosted', 'Archived'],
  Interview: ['Offer', 'Rejected', 'Ghosted', 'Archived'],
  Offer: ['Rejected', 'Archived'],
  Rejected: ['Archived'],
  Ghosted: ['Interview', 'Rejected', 'Archived'],
  Archived: [],
};

export function isDeadlineSoon(deadline?: string): boolean {
  if (!deadline) return false;
  const diff = new Date(deadline).getTime() - Date.now();
  return diff > 0 && diff <= 3 * 24 * 60 * 60 * 1000;
}

export function isDeadlineOverdue(deadline?: string): boolean {
  if (!deadline) return false;
  return new Date(deadline).getTime() < Date.now();
}

function UrgencyBadge({ deadline }: { deadline?: string }) {
  const overdue = isDeadlineOverdue(deadline);
  const soon = isDeadlineSoon(deadline);

  if (!overdue && !soon) return null;

  return (
    <Badge
      className={cn(
        'rounded-full border-0 px-2 py-0.5 text-xs font-medium',
        overdue && 'bg-red-100 text-red-700',
        soon && !overdue && 'bg-amber-100 text-amber-700',
      )}
    >
      {overdue ? 'Overdue' : 'Due Soon'}
    </Badge>
  );
}

interface BoardContentProps {
  filters: JobFilters;
  onLocationsReady: (locations: string[]) => void;
  searchQuery?: string;
  onJobsChanged?: () => void;
}

type SortField =
  | 'title'
  | 'company'
  | 'location'
  | 'pipelineStage'
  | 'lastActivityDate'
  | 'deadline';
type SortDirection = 'asc' | 'desc';

export function BoardContent({
  filters,
  onLocationsReady,
  searchQuery = '',
  onJobsChanged,
}: BoardContentProps) {
  const [jobs, setJobs] = useState<Job[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [sortField, setSortField] = useState<SortField>('title');
  const [sortDirection, setSortDirection] = useState<SortDirection>('asc');
  const [jobToDelete, setJobToDelete] = useState<Job | null>(null);

  const [pendingOutcome, setPendingOutcome] = useState<{
    jobId: string;
    stage: PipelineStage;
  } | null>(null);
  const [modalOutcomeNotes, setModalOutcomeNotes] = useState('');
  const [isSubmittingOutcome, setIsSubmittingOutcome] = useState(false);

  function handleSort(field: SortField) {
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('asc');
    }
  }

  const q = searchQuery.trim().toLowerCase();
  const filteredJobs = jobs.filter((job) => {
    if (filters.stage !== 'Archived' && job.pipelineStage === 'Archived') return false;
    if (filters.stage !== 'all' && job.pipelineStage !== filters.stage) return false;
    if (filters.location !== 'all' && job.location !== filters.location) return false;
    if (filters.deadline === 'soon' && !isDeadlineSoon(job.deadline)) return false;
    if (filters.deadline === 'overdue' && !isDeadlineOverdue(job.deadline)) return false;
    if (filters.deadline === 'none' && job.deadline) return false;
    if (filters.priority === 'priority' && !job.priorityFlag) return false;
    if (
      q &&
      !job.title.toLowerCase().includes(q) &&
      !job.company.toLowerCase().includes(q) &&
      !(job.location ?? '').toLowerCase().includes(q)
    )
      return false;
    return true;
  });

  const sortedJobs = [...filteredJobs].sort((a, b) => {
    let aVal: string | number | Date, bVal: string | number | Date;
    switch (sortField) {
      case 'title':
        aVal = a.title.toLowerCase();
        bVal = b.title.toLowerCase();
        break;
      case 'company':
        aVal = a.company.toLowerCase();
        bVal = b.company.toLowerCase();
        break;
      case 'location':
        aVal = (a.location || '').toLowerCase();
        bVal = (b.location || '').toLowerCase();
        break;
      case 'pipelineStage':
        aVal = a.pipelineStage;
        bVal = b.pipelineStage;
        break;
      case 'lastActivityDate':
        aVal = new Date(a.lastActivityDate);
        bVal = new Date(b.lastActivityDate);
        break;
      case 'deadline':
        aVal = a.deadline ? new Date(a.deadline) : new Date(0);
        bVal = b.deadline ? new Date(b.deadline) : new Date(0);
        break;
    }
    if (aVal < bVal) return sortDirection === 'asc' ? -1 : 1;
    if (aVal > bVal) return sortDirection === 'asc' ? 1 : -1;
    return 0;
  });

  const {
    selectedJob,
    isOpen,
    isLoading: isDetailLoading,
    error: detailError,
    openJob,
    closeJob,
    updateJobState,
  } = useJobDetail();

  const fetchJobs = useCallback(async () => {
    try {
      const res = await fetch('/api/jobs?all=true');
      if (!res.ok) throw new Error('Failed to fetch jobs');
      const json = await res.json();
      const records: JobRecord[] = json.data ?? [];
      const uiJobs = records.map(toUIJob);
      setJobs(uiJobs);
      const uniqueLocations = [
        ...new Set(uiJobs.map((j) => j.location).filter(Boolean)),
      ] as string[];
      onLocationsReady(uniqueLocations);
    } catch {
      setError('Failed to load jobs. Please try again.');
    } finally {
      setLoading(false);
    }
  }, [onLocationsReady]);

  useEffect(() => {
    fetchJobs();
  }, [fetchJobs]);

  async function confirmDelete(): Promise<void> {
    if (!jobToDelete) return;
    const res = await fetch(`/api/jobs/${jobToDelete.id}`, { method: 'DELETE' });
    if (!res.ok) {
      alert('Failed to delete job. Please try again.');
      return;
    }
    setJobToDelete(null);
    await fetchJobs();
    onJobsChanged?.();
  }

  async function handleInlineStageUpdate(jobId: string, newStage: PipelineStage) {
    if (['Rejected', 'Ghosted', 'Offer'].includes(newStage)) {
      setPendingOutcome({ jobId, stage: newStage });
      setModalOutcomeNotes('');
      return;
    }

    try {
      const res = await fetch(`/api/jobs/${jobId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ current_stage: newStage }),
      });
      if (!res.ok) throw new Error('Failed to update stage');
      await fetchJobs();
      onJobsChanged?.();
    } catch (err) {
      console.error(err);
    }
  }

  async function submitOutcome() {
    if (!pendingOutcome) return;
    setIsSubmittingOutcome(true);
    try {
      const res = await fetch(`/api/jobs/${pendingOutcome.jobId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          current_stage: pendingOutcome.stage,
          outcome_notes: modalOutcomeNotes || undefined,
        }),
      });
      if (!res.ok) throw new Error('Failed to update outcome');
      await fetchJobs();
      onJobsChanged?.();
    } catch (err) {
      console.error(err);
    } finally {
      setIsSubmittingOutcome(false);
      setPendingOutcome(null);
    }
  }

  if (loading) {
    return (
      <div className="w-full overflow-x-auto rounded-lg border border-gray-200">
        <table className="w-full text-sm">
          <thead className="border-b border-gray-200 bg-gray-50">
            <tr>
              <th className="px-4 py-3 text-left font-semibold text-gray-600">Job Title</th>
              <th className="px-4 py-3 text-left font-semibold text-gray-600">Company</th>
              <th className="hidden px-4 py-3 text-left font-semibold text-gray-600 md:table-cell">
                Location
              </th>
              <th className="px-4 py-3 text-left font-semibold text-gray-600">Stage</th>
              <th className="hidden px-4 py-3 text-left font-semibold text-gray-600 lg:table-cell">
                Last Activity
              </th>
              <th className="hidden px-4 py-3 text-left font-semibold text-gray-600 lg:table-cell">
                Deadline
              </th>
            </tr>
          </thead>
          <tbody>
            {[1, 2, 3].map((i) => (
              <tr key={i} className="border-b border-gray-100">
                <td className="px-4 py-3">
                  <div className="h-4 w-32 animate-pulse rounded bg-gray-200" />
                </td>
                <td className="px-4 py-3">
                  <div className="h-4 w-24 animate-pulse rounded bg-gray-200" />
                </td>
                <td className="hidden px-4 py-3 md:table-cell">
                  <div className="h-4 w-20 animate-pulse rounded bg-gray-200" />
                </td>
                <td className="px-4 py-3">
                  <div className="h-4 w-16 animate-pulse rounded bg-gray-200" />
                </td>
                <td className="hidden px-4 py-3 lg:table-cell">
                  <div className="h-4 w-20 animate-pulse rounded bg-gray-200" />
                </td>
                <td className="hidden px-4 py-3 lg:table-cell">
                  <div className="h-4 w-16 animate-pulse rounded bg-gray-200" />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center gap-4 py-20 text-center">
        <p className="text-lg font-semibold text-red-600">{error}</p>
        <Button
          onClick={() => window.location.reload()}
          className="bg-[#2E75B6] text-white hover:bg-[#1F4E79]"
        >
          Retry
        </Button>
      </div>
    );
  }

  if (sortedJobs.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center gap-4 py-20 text-center">
        <div className="flex h-16 w-16 items-center justify-center rounded-full bg-[#D9E2F3]">
          <BriefcaseIcon className="h-8 w-8 text-[#2E75B6]" aria-hidden="true" />
        </div>
        <div className="flex flex-col gap-1">
          <p className="text-lg font-semibold text-gray-900">
            {jobs.length === 0 ? 'No jobs yet' : 'No jobs match your filters'}
          </p>
          <p className="text-sm text-gray-500">
            {jobs.length === 0
              ? 'Add your first job to get started.'
              : 'Try adjusting or clearing your filters.'}
          </p>
        </div>
        {jobs.length === 0 && (
          <JobFormModal
            onSubmit={async (data) => {
              const payload = {
                job_title: data.title,
                company_name: data.company,
                location: data.location || undefined,
                current_stage: data.pipelineStage,
                deadline: data.deadline || undefined,
                is_priority: data.priorityFlag,
              };
              const res = await fetch('/api/jobs', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload),
              });
              if (!res.ok) throw new Error('Failed to create job');
              await fetchJobs();
              onJobsChanged?.();
            }}
          />
        )}
      </div>
    );
  }

  return (
    <>
      <div className="w-full overflow-x-auto rounded-lg border border-gray-200">
        <table className="w-full text-sm">
          <thead className="border-b border-gray-200 bg-gray-50">
            <tr>
              <th className="px-4 py-3 text-left font-semibold text-gray-600">
                <button
                  onClick={() => handleSort('title')}
                  className="flex items-center gap-1 hover:text-gray-800"
                >
                  Job Title
                  {sortField === 'title' &&
                    (sortDirection === 'asc' ? <ChevronUp size={14} /> : <ChevronDown size={14} />)}
                </button>
              </th>
              <th className="px-4 py-3 text-left font-semibold text-gray-600">
                <button
                  onClick={() => handleSort('company')}
                  className="flex items-center gap-1 hover:text-gray-800"
                >
                  Company
                  {sortField === 'company' &&
                    (sortDirection === 'asc' ? <ChevronUp size={14} /> : <ChevronDown size={14} />)}
                </button>
              </th>
              <th className="hidden px-4 py-3 text-left font-semibold text-gray-600 md:table-cell">
                <button
                  onClick={() => handleSort('location')}
                  className="flex items-center gap-1 hover:text-gray-800"
                >
                  Location
                  {sortField === 'location' &&
                    (sortDirection === 'asc' ? <ChevronUp size={14} /> : <ChevronDown size={14} />)}
                </button>
              </th>
              <th className="px-4 py-3 text-left font-semibold text-gray-600">
                <button
                  onClick={() => handleSort('pipelineStage')}
                  className="flex items-center gap-1 hover:text-gray-800"
                >
                  Stage
                  {sortField === 'pipelineStage' &&
                    (sortDirection === 'asc' ? <ChevronUp size={14} /> : <ChevronDown size={14} />)}
                </button>
              </th>
              <th className="hidden px-4 py-3 text-left font-semibold text-gray-600 lg:table-cell">
                <button
                  onClick={() => handleSort('lastActivityDate')}
                  className="flex items-center gap-1 hover:text-gray-800"
                >
                  Last Activity
                  {sortField === 'lastActivityDate' &&
                    (sortDirection === 'asc' ? <ChevronUp size={14} /> : <ChevronDown size={14} />)}
                </button>
              </th>
              <th className="hidden px-4 py-3 text-left font-semibold text-gray-600 lg:table-cell">
                <button
                  onClick={() => handleSort('deadline')}
                  className="flex items-center gap-1 hover:text-gray-800"
                >
                  Deadline
                  {sortField === 'deadline' &&
                    (sortDirection === 'asc' ? <ChevronUp size={14} /> : <ChevronDown size={14} />)}
                </button>
              </th>
              <th className="px-4 py-3 text-right font-semibold text-gray-600">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100 bg-white">
            {sortedJobs.map((job) => {
              return (
                <tr
                  key={job.id}
                  className="cursor-pointer transition-colors duration-150 hover:bg-blue-50"
                  tabIndex={0}
                  role="button"
                  aria-label={`${job.title} at ${job.company}`}
                  onClick={() => openJob(job.id)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') openJob(job.id);
                  }}
                >
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <span className="font-medium text-gray-900">{job.title}</span>
                      {job.priorityFlag && (
                        <Flag size={13} className="shrink-0 text-amber-500" aria-label="Priority" />
                      )}
                    </div>
                  </td>
                  <td className="px-4 py-3 text-gray-600">{job.company}</td>
                  <td className="hidden px-4 py-3 text-gray-500 md:table-cell">{job.location}</td>
                  <td className="px-4 py-3">
                    <div
                      onClick={(e) => e.stopPropagation()}
                      onKeyDown={(e) => e.stopPropagation()}
                    >
                      <Select
                        value={job.pipelineStage}
                        onValueChange={(val) =>
                          handleInlineStageUpdate(job.id, val as PipelineStage)
                        }
                      >
                        <SelectTrigger
                          className={cn(
                            'h-fit w-fit rounded-full border-0 px-2 py-0.5 text-xs font-medium shadow-none focus:ring-0 focus:ring-offset-0',
                            stageStyles[job.pipelineStage],
                          )}
                        >
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {STAGES.map((s) => (
                            <SelectItem
                              key={s}
                              value={s}
                              className="text-sm"
                              disabled={!ALLOWED_TRANSITIONS[job.pipelineStage].includes(s)}
                            >
                              {s}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </td>
                  <td className="hidden px-4 py-3 text-gray-500 lg:table-cell">
                    {formatTimestamp(job.lastActivityDate)}
                  </td>
                  <td className="hidden px-4 py-3 lg:table-cell">
                    {job.deadline ? (
                      <div className="flex flex-col gap-1">
                        <span className="text-sm text-gray-500">
                          {formatDeadline(job.deadline)}
                        </span>
                        <UrgencyBadge deadline={job.deadline} />
                      </div>
                    ) : (
                      <span className="text-gray-300">—</span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-right" onClick={(e) => e.stopPropagation()}>
                    <Button
                      variant="ghost"
                      onClick={() => setJobToDelete(job)}
                      className="h-8 w-8 p-0 text-gray-400 hover:text-red-600"
                      aria-label="Delete job"
                    >
                      <svg
                        xmlns="http://www.w3.org/2000/svg"
                        width="15"
                        height="15"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      >
                        <path d="M3 6h18" />
                        <path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6" />
                        <path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2" />
                        <line x1="10" x2="10" y1="11" y2="17" />
                        <line x1="14" x2="14" y1="11" y2="17" />
                      </svg>
                    </Button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <JobDetailPanel
        job={selectedJob}
        isOpen={isOpen}
        isLoading={isDetailLoading}
        error={detailError}
        onClose={closeJob}
        onJobUpdated={(updates) => {
          updateJobState(updates);
          void fetchJobs();
          onJobsChanged?.();
        }}
      />

      <Dialog open={!!pendingOutcome} onOpenChange={(open) => !open && setPendingOutcome(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Outcome Notes</DialogTitle>
          </DialogHeader>
          <div className="flex flex-col gap-3 py-4">
            <p className="text-sm text-gray-500">
              You are moving this job to{' '}
              <strong className="text-gray-900">{pendingOutcome?.stage}</strong>. Would you like to
              record any final notes?
            </p>
            <div className="grid w-full items-center gap-1.5">
              <Label htmlFor="inlineOutcomeNotes" className="font-semibold text-gray-700">
                Notes (Optional)
              </Label>
              <textarea
                id="inlineOutcomeNotes"
                value={modalOutcomeNotes}
                onChange={(e) => setModalOutcomeNotes(e.target.value)}
                placeholder={
                  pendingOutcome?.stage === 'Offer'
                    ? 'What are the offer details? e.g. $120k / Remote'
                    : `Why did they mark you as ${pendingOutcome?.stage}?`
                }
                className="mt-1.5 flex min-h-[80px] w-full rounded-md border border-gray-200 bg-white px-3 py-2 text-sm shadow-sm placeholder:text-gray-400 focus-visible:ring-1 focus-visible:ring-blue-500 focus-visible:outline-none"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setPendingOutcome(null)}>
              Cancel
            </Button>
            <Button onClick={submitOutcome} disabled={isSubmittingOutcome}>
              Save Outcome
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog
        open={!!jobToDelete}
        onOpenChange={(open) => {
          if (!open) setJobToDelete(null);
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete this job?</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete &quot;{jobToDelete?.title}&quot; at{' '}
              {jobToDelete?.company}? This cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmDelete}
              className="bg-red-600 text-white hover:bg-red-700"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
