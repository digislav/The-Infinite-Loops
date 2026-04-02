'use client';

import { useEffect, useState } from 'react';
import { BriefcaseIcon } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Flag } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { Job, PipelineStage, JobRecord } from '@/types/job.types';
import { toUIJob } from '@/types/job.types';

const stageStyles: Record<PipelineStage, string> = {
  Interested: 'bg-indigo-100 text-indigo-700',
  Applied: 'bg-blue-100 text-blue-700',
  Interview: 'bg-amber-100 text-amber-700',
  Offer: 'bg-emerald-100 text-emerald-700',
  Rejected: 'bg-red-100 text-red-700',
  Archived: 'bg-gray-100 text-gray-500',
};

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

  useEffect(() => {
    async function fetchJobs() {
      try {
        const res = await fetch('/api/jobs');
        if (!res.ok) throw new Error('Failed to fetch jobs');
        const json = await res.json();
        const records: JobRecord[] = json.data ?? [];
        setJobs(records.map(toUIJob));
      } catch {
        setError('Failed to load jobs. Please try again.');
      } finally {
        setLoading(false);
      }
    }
    fetchJobs();
  }, []);

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
        <Button
          disabled
          className="bg-[#2E75B6] text-white hover:bg-[#1F4E79] disabled:cursor-not-allowed disabled:opacity-50"
        >
          Add Job
        </Button>
      </div>
    );
  }

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
                onClick={() => console.log('Job clicked:', job.id)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') console.log('Job clicked:', job.id);
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
                  {job.lastActivityDate}
                </td>
                <td className="hidden px-4 py-3 lg:table-cell">
                  {job.deadline ? (
                    <span
                      className={cn(
                        'text-xs font-medium',
                        deadlineOverdue && 'text-red-600',
                        deadlineSoon && !deadlineOverdue && 'text-amber-600',
                        !deadlineSoon && !deadlineOverdue && 'text-gray-400',
                      )}
                    >
                      {job.deadline}
                    </span>
                  ) : (
                    <span className="text-gray-300">—</span>
                  )}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
