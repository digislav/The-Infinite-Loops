'use client';

import { useEffect, useState } from 'react';
import { BriefcaseIcon } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Flag } from 'lucide-react';
import { cn } from '@/lib/utils';
import { formatDateOnly, formatTimestamp } from '@/lib/utils/dateFormatters';
import type { Job, PipelineStage, JobRecord } from '@/types/job.types';
import { toUIJob } from '@/types/job.types';
import { JobFormModal } from './JobFormModal';
import type { JobFormValues } from './JobForm';
// S2-005: Import the detail hook and panel component.
// useJobDetail manages which job is open and fetches its full record.
// JobDetailPanel renders the dialog overlay.
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
  Archived: 'bg-gray-100 text-gray-500',
};

// Deadline urgency helpers — consistent with JobCard.tsx and JobDetailPanel.tsx.
function isDeadlineSoon(deadline?: string): boolean {
  if (!deadline) return false;
  const diff = new Date(deadline).getTime() - Date.now();
  return diff > 0 && diff <= 3 * 24 * 60 * 60 * 1000;
}

function isDeadlineOverdue(deadline?: string): boolean {
  if (!deadline) return false;
  return new Date(deadline).getTime() < Date.now();
}

export function BoardContent() {
  const [jobs, setJobs] = useState<Job[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // S2-005: Wire up the job detail hook.
  // openJob fetches the full detail and opens the panel.
  // closeJob dismisses the panel and resets all state.
  const {
    selectedJob,
    isOpen,
    isLoading: isDetailLoading,
    error: detailError,
    openJob,
    closeJob,
  } = useJobDetail();

  // Fetch all jobs for the authenticated user.
  // The API route enforces auth and ownership server-side —
  // we never pass a user_id from the client per S1-003 §5.4.
  async function fetchJobs() {
    try {
      const res = await fetch('/api/jobs');
      if (!res.ok) throw new Error('Failed to fetch jobs');
      const json = await res.json();
      const records: JobRecord[] = json.data ?? [];
      setJobs(records.map(toUIJob));
    } catch {
      // Human-friendly error — never raw error objects per S1-001 §6.3.
      setError('Failed to load jobs. Please try again.');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    fetchJobs();
  }, []);

  // handleEditJob — called when the edit form is submitted.
  // Sends a PUT to the protected API route then re-fetches the list.
  // user_id is never included in the payload — the backend uses
  // the session identity per S1-003 §5.4.
  async function handleEditJob(job: Job, data: JobFormValues): Promise<void> {
    const payload = {
      job_title: data.title,
      company_name: data.company,
      location: data.location || undefined,
      current_stage: data.pipelineStage,
      deadline: data.deadline || undefined,
      is_priority: data.priorityFlag,
    };
    const res = await fetch(`/api/jobs/${job.id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    if (!res.ok) throw new Error('Failed to update job');
    await fetchJobs();
  }

  // handleDeleteJob — called from the edit modal's delete button.
  // Per S1-002 §9.4 — destructive actions require a confirmation dialog.
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

  // EMPTY STATE — shown when the user has no jobs yet.
  // Per S1-002 §5.7 — every list that can be empty must have an empty state
  // with an icon, explanatory message, and a primary action button.
  if (jobs.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center gap-4 py-20 text-center">
        <div className="flex h-16 w-16 items-center justify-center rounded-full bg-[#D9E2F3]">
          <BriefcaseIcon className="h-8 w-8 text-[#2E75B6]" aria-hidden="true" />
        </div>
        <div className="flex flex-col gap-1">
          <p className="text-lg font-semibold text-gray-900">No jobs yet</p>
          <p className="text-sm text-gray-500">Add your first job to get started.</p>
        </div>
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
      </div>
    );
  }

  // MAIN TABLE — renders when jobs have loaded successfully.
  // Per S1-002 §4.1 — team chose Option C (List View) for the dashboard.
  // Wrapped in a fragment so the JobDetailPanel can sit outside the table
  // without breaking the table DOM structure.
  return (
    <>
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
              <th className="px-4 py-3 text-right font-semibold text-gray-600">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100 bg-white">
            {jobs.map((job) => {
              const deadlineSoon = isDeadlineSoon(job.deadline);
              const deadlineOverdue = isDeadlineOverdue(job.deadline);
              return (
                <tr
                  key={job.id}
                  className="cursor-pointer transition-colors duration-150 hover:bg-blue-50"
                  tabIndex={0}
                  role="button"
                  aria-label={`${job.title} at ${job.company}`}
                  // S2-005: openJob fetches the detail and opens the panel.
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
                      {job.priorityFlag && (
                        <Flag size={13} className="shrink-0 text-amber-500" aria-label="Priority" />
                      )}
                    </div>
                  </td>
                  <td className="px-4 py-3 text-gray-600">{job.company}</td>
                  <td className="hidden px-4 py-3 text-gray-500 md:table-cell">{job.location}</td>
                  <td className="px-4 py-3">
                    {/* Stage badge — colour-coded per S1-002 §4.5 and §5.5 */}
                    <Badge
                      className={cn(
                        'rounded-full border-0 px-2 py-0.5 text-xs font-medium',
                        stageStyles[job.pipelineStage],
                      )}
                    >
                      {job.pipelineStage}
                    </Badge>
                  </td>
                  <td className="hidden px-4 py-3 text-gray-500 lg:table-cell">
                    {formatTimestamp(job.lastActivityDate)}
                  </td>
                  <td className="hidden px-4 py-3 lg:table-cell">
                    {job.deadline ? (
                      <span
                        className={cn(
                          'text-sm font-medium',
                          deadlineOverdue && 'text-red-600',
                          deadlineSoon && !deadlineOverdue && 'text-amber-600',
                          !deadlineSoon && !deadlineOverdue && 'text-gray-400',
                        )}
                      >
                        {formatDateOnly(job.deadline)}
                      </span>
                    ) : (
                      <span className="text-gray-300">—</span>
                    )}
                  </td>
                  {/* stopPropagation prevents the edit button click from
                      also firing the row click and opening the detail panel. */}
                  <td className="px-4 py-3 text-right" onClick={(e) => e.stopPropagation()}>
                    <JobFormModal
                      job={{
                        id: job.id,
                        title: job.title,
                        company: job.company,
                        location: job.location,
                        pipelineStage: job.pipelineStage,
                        deadline: job.deadline ? job.deadline.split('T')[0] : undefined,
                        priorityFlag: job.priorityFlag,
                      }}
                      onSubmit={(data) => handleEditJob(job, data)}
                      onDelete={() => handleDeleteJob(job)}
                    />
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* S2-005: Job detail panel — rendered outside the table so it
          overlays the entire dashboard without disrupting the table DOM.
          Controlled entirely by the useJobDetail hook state. */}
      <JobDetailPanel
        job={selectedJob}
        isOpen={isOpen}
        isLoading={isDetailLoading}
        error={detailError}
        onClose={closeJob}
      />
    </>
  );
}
