'use client';

import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Flag, CalendarClock, MapPin, Building2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { Job, PipelineStage } from '@/types/job.types';

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

interface JobCardProps {
  job: Job;
  onClick?: () => void;
}

export function JobCard({ job, onClick }: JobCardProps) {
  const deadlineSoon = isDeadlineSoon(job.deadline);
  const deadlineOverdue = isDeadlineOverdue(job.deadline);

  return (
    <Card
      className={cn(
        'w-full cursor-pointer border border-gray-200 bg-white',
        'transition-colors duration-150',
        'hover:border-blue-300 hover:bg-blue-50',
        'focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:outline-none',
      )}
      onClick={onClick}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') onClick?.();
      }}
      tabIndex={0}
      role="button"
      aria-label={`${job.title} at ${job.company}`}
    >
      <CardContent className="flex items-center justify-between gap-4 px-6 py-4">
        {/* Left — job info */}
        <div className="flex min-w-0 flex-col gap-1">
          {/* Title + priority flag */}
          <div className="flex items-center gap-2">
            <span className="truncate text-base font-semibold text-gray-900">{job.title}</span>
            {job.priorityFlag && (
              <Flag size={14} className="shrink-0 text-amber-500" aria-label="Priority" />
            )}
          </div>

          {/* Company */}
          <div className="flex items-center gap-1 text-sm text-gray-500">
            <Building2 size={13} aria-hidden={true} />
            <span className="truncate">{job.company}</span>
          </div>

          {/* Location */}
          <div className="flex items-center gap-1 text-sm text-gray-500">
            <MapPin size={13} aria-hidden={true} />
            <span className="truncate">{job.location}</span>
          </div>
        </div>

        {/* Right — stage, date, deadline */}
        <div className="flex shrink-0 flex-col items-end gap-2">
          {/* Pipeline stage badge */}
          <Badge
            className={cn(
              'rounded-full border-0 px-2 py-0.5 text-xs font-medium',
              stageStyles[job.pipelineStage],
            )}
          >
            {job.pipelineStage}
          </Badge>

          {/* Last activity date */}
          <div className="flex items-center gap-1 text-xs text-gray-400">
            <CalendarClock size={12} aria-hidden={true} />
            <span>{job.lastActivityDate}</span>
          </div>

          {/* Deadline */}
          {job.deadline && (
            <span
              className={cn(
                'text-xs font-medium',
                deadlineOverdue && 'text-red-600',
                deadlineSoon && !deadlineOverdue && 'text-amber-600',
                !deadlineSoon && !deadlineOverdue && 'text-gray-400',
              )}
            >
              Due {job.deadline}
            </span>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
