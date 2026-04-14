'use client';

// S2-004: Implement Stage/Status Indicators on Job Cards.
// This file already had stage badges and deadline colour coding.
// S2-004 adds a dedicated UrgencyBadge component that makes urgency
// cues explicit and immediately visible at a glance — not just coloured text.
// Per S1-002 §4.3 — deadline must be highlighted if within 3 days.
// Per S1-002 §5.5 — always use the Badge component for status indicators.

import { useEffect, useState, useCallback } from 'react';
import { BriefcaseIcon } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Flag } from 'lucide-react';
import { ChevronUp, ChevronDown } from 'lucide-react';
import { cn } from '@/lib/utils';
import { formatDateOnly, formatTimestamp } from '@/lib/utils/dateFormatters';
import type { Job, PipelineStage, JobRecord } from '@/types/job.types';
import { toUIJob } from '@/types/job.types';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { JobFormModal } from './JobFormModal';
import type { JobFilters } from './BoardControls';
import { useJobDetail } from '@/hooks/useJobDetail';
import { JobDetailPanel } from './JobDetailPanel';

// Pipeline stage colour tokens — per S1-002 §4.5.
// Must stay identical to stageStyles in JobCard.tsx and JobDetailPanel.tsx
// so stage badges look consistent everywhere per S1-002 §12.1.
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

// isDeadlineSoon — returns true if the deadline is within 3 days but not yet passed.
// Per S1-002 §4.3 — deadline must be highlighted if within 3 days.
export function isDeadlineSoon(deadline?: string): boolean {
  if (!deadline) return false;
  const diff = new Date(deadline).getTime() - Date.now();
  return diff > 0 && diff <= 3 * 24 * 60 * 60 * 1000;
}

// isDeadlineOverdue — returns true if the deadline has already passed.
// Exported so it can be unit tested directly per S1-001 §8.
export function isDeadlineOverdue(deadline?: string): boolean {
  if (!deadline) return false;
  return new Date(deadline).getTime() < Date.now();
}

// UrgencyBadge — S2-004 core component.
// Renders a colour-coded badge showing the urgency state of a job's deadline.
// Uses the shadcn Badge component per S1-002 §5.5 — never free-form colour.
// Shows nothing if there is no deadline or no urgency.
//
// States:
// - Overdue: red badge — deadline has passed
// - Due Soon: amber badge — deadline within 3 days
// - No badge: deadline is far away or not set
function UrgencyBadge({ deadline }: { deadline?: string }) {
  const overdue = isDeadlineOverdue(deadline);
  const soon = isDeadlineSoon(deadline);

  // No urgency — render nothing so the row stays clean.
  if (!overdue && !soon) return null;

  return (
    <Badge
      className={cn(
        'rounded-full border-0 px-2 py-0.5 text-xs font-medium',
        // Red for overdue — per S1-002 §4.5 error colour token.
        overdue && 'bg-red-100 text-red-700',
        // Amber for due soon — per S1-002 §4.5 warning colour token.
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
}

type SortField =
  | 'title'
  | 'company'
  | 'location'
  | 'pipelineStage'
  | 'lastActivityDate'
  | 'deadline';
type SortDirection = 'asc' | 'desc';

export function BoardContent({ filters, onLocationsReady, searchQuery = '' }: BoardContentProps) {
  const [jobs, setJobs] = useState<Job[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [sortField, setSortField] = useState<SortField>('title');
  const [sortDirection, setSortDirection] = useState<SortDirection>('asc');

  function handleSort(field: SortField) {
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('asc');
    }
  }

  // Apply both filter dropdown selections and free-text search.
  // Search matches case-insensitively against title, company, and location.
  const q = searchQuery.trim().toLowerCase();
  const filteredJobs = jobs.filter((job) => {
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
  // Sort the filtered jobs based on the current sort field and direction.
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
  // useJobDetail manages which job is selected and fetches its full record.
  // openJob is called when a row is clicked; closeJob dismisses the panel.
  const {
    selectedJob,
    isOpen,
    isLoading: isDetailLoading,
    error: detailError,
    openJob,
    closeJob,
    updateJobState,
  } = useJobDetail();

  // Fetch all jobs for the authenticated user.
  // The API route enforces auth and ownership server-side —
  // we never pass a user_id from the client per S1-003 §5.4.
  const fetchJobs = useCallback(async () => {
    try {
      const res = await fetch('/api/jobs');
      if (!res.ok) throw new Error('Failed to fetch jobs');
      const json = await res.json();
      const records: JobRecord[] = json.data ?? [];
      const uiJobs = records.map(toUIJob);
      setJobs(uiJobs);
      // Extract unique locations to populate the location filter dropdown.
      const uniqueLocations = [
        ...new Set(uiJobs.map((j) => j.location).filter(Boolean)),
      ] as string[];
      onLocationsReady(uniqueLocations);
    } catch {
      // Human-friendly error — never raw error objects per S1-001 §6.3.
      setError('Failed to load jobs. Please try again.');
    } finally {
      setLoading(false);
    }
  }, [onLocationsReady]);

  useEffect(() => {
    fetchJobs();
  }, [fetchJobs]);

  // handleDeleteJob — per S1-002 §9.4 destructive actions require confirmation.
  async function handleDeleteJob(job: Job): Promise<void> {
    const confirmed = window.confirm(
      `Are you sure you want to delete "${job.title}" at ${job.company}? This cannot be undone.`,
    );
    if (!confirmed) return;
    const res = await fetch(`/api/jobs/${job.id}`, { method: 'DELETE' });
    if (!res.ok) {
      alert('Failed to delete job. Please try again.');
      return;
    }
    await fetchJobs();
  }

  async function handleInlineStageUpdate(jobId: string, newStage: PipelineStage) {
    try {
      const res = await fetch(`/api/jobs/${jobId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ current_stage: newStage }),
      });
      if (!res.ok) throw new Error('Failed to update stage');
      await fetchJobs();
    } catch (err) {
      console.error(err);
    }
  }

  // LOADING STATE — skeleton rows while data is fetching.
  // Per S1-002 §9.2 — never show a blank white box while loading.
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

  // ERROR STATE — friendly message with a retry button.
  // Per S1-001 §6.3 and S1-002 §9.3.
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

  // EMPTY STATE — per S1-002 §5.7 every list that can be empty must have
  // an empty state with an icon, message, and primary action button.
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
            }}
          />
        )}
      </div>
    );
  }

  // MAIN TABLE — renders when jobs have loaded successfully.
  // Per S1-002 §4.1 — team chose Option C (List View) for the dashboard.
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
              {/* S2-004: Deadline column now shows both the date and
                  an UrgencyBadge so urgency is immediately visible. */}
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
                  // openJob fetches the full detail and opens the panel.
                  // The backend verifies auth and ownership — we only pass the ID.
                  onClick={() => openJob(job.id)}
                  onKeyDown={(e) => {
                    // Keyboard accessible — Enter and Space open the panel
                    // per S1-002 §10.1.
                    if (e.key === 'Enter' || e.key === ' ') openJob(job.id);
                  }}
                >
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <span className="font-medium text-gray-900">{job.title}</span>
                      {/* Priority flag — amber star icon per S1-002 §4.3 */}
                      {job.priorityFlag && (
                        <Flag size={13} className="shrink-0 text-amber-500" aria-label="Priority" />
                      )}
                    </div>
                  </td>
                  <td className="px-4 py-3 text-gray-600">{job.company}</td>
                  <td className="hidden px-4 py-3 text-gray-500 md:table-cell">{job.location}</td>
                  <td className="px-4 py-3">
                    <div onClick={(e) => e.stopPropagation()} onKeyDown={(e) => e.stopPropagation()}>
                      <Select
                        value={job.pipelineStage}
                        onValueChange={(val) => handleInlineStageUpdate(job.id, val as PipelineStage)}
                      >
                        <SelectTrigger
                          className={cn(
                            'h-fit w-fit border-0 px-2 py-0.5 text-xs font-medium rounded-full shadow-none focus:ring-0 focus:ring-offset-0',
                            stageStyles[job.pipelineStage]
                          )}
                        >
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {STAGES.map((s) => (
                            <SelectItem key={s} value={s} className="text-sm">
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
                      // S2-004: Deadline cell now shows both the formatted date
                      // AND an UrgencyBadge so the user can see at a glance
                      // whether a deadline needs immediate attention.
                      <div className="flex flex-col gap-1">
                        <span className="text-sm text-gray-500">
                          {formatDateOnly(job.deadline)}
                        </span>
                        {/* UrgencyBadge renders nothing if no urgency */}
                        <UrgencyBadge deadline={job.deadline} />
                      </div>
                    ) : (
                      <span className="text-gray-300">—</span>
                    )}
                  </td>
                  {/* stopPropagation prevents the edit button click from
                      also firing the row click and opening the detail panel. */}
                  <td className="px-4 py-3 text-right" onClick={(e) => e.stopPropagation()}>
                    <Button
                      variant="ghost"
                      onClick={() => handleDeleteJob(job)}
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

      {/* Job detail panel — rendered outside the table so it overlays
          the entire dashboard without disrupting the table DOM structure. */}
      <JobDetailPanel
        job={selectedJob}
        isOpen={isOpen}
        isLoading={isDetailLoading}
        error={detailError}
        onClose={closeJob}
        onJobUpdated={(updates) => {
          updateJobState(updates);
          void fetchJobs(); // Background refresh the main grid
        }}
      />
    </>
  );
}
