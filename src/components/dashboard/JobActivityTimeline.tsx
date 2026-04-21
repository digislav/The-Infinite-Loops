'use client';

// JobActivityTimeline — S2-010: Implement Job Activity Timeline.
// Fetches and displays all activity events for a job in reverse
// chronological order (most recent first).
//
// Activity types from the job_activities table:
// - STAGE_CHANGE: pipeline stage transitions recorded by S2-009
// - INTERVIEW_SCHEDULED: interview events recorded by S2-011
// - NOTE_ADDED: manual notes (future use)
//
// Per S1-002 §4.4 — this component lives inside the job detail panel.
// Per S1-003 — all data fetching goes through the protected API route.
// The backend verifies ownership before returning any activities.

import { useEffect, useState } from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';
import { formatDateOnly, formatTimestamp } from '@/lib/utils/dateFormatters';
import type { PipelineStage } from '@/types/job.types';

interface JobActivity {
  id: string;
  job_id: string;
  activity_type: 'STAGE_CHANGE' | 'INTERVIEW_SCHEDULED' | 'NOTE_ADDED' | 'REMINDER_SET';
  timeline_event_type?: string;
  notes?: string;
  activity_date: string;
  interview_round?: string;
  interview_date?: string;
  location_url?: string;
  is_completed?: boolean;
  created_at?: string;
}

const stageStyles: Record<string, string> = {
  Interested: 'bg-indigo-100 text-indigo-700',
  Applied: 'bg-blue-100 text-blue-700',
  Interview: 'bg-amber-100 text-amber-700',
  Offer: 'bg-emerald-100 text-emerald-700',
  Rejected: 'bg-red-100 text-red-700',
  Ghosted: 'bg-slate-200 text-slate-700',
  Archived: 'bg-gray-100 text-gray-500',
};

function ActivityIcon({
  type,
  completed,
}: {
  type: JobActivity['activity_type'];
  completed?: boolean;
}) {
  return (
    <div
      className={cn(
        'mt-1 h-2.5 w-2.5 shrink-0 rounded-full',
        type === 'STAGE_CHANGE' && 'bg-blue-400',
        type === 'INTERVIEW_SCHEDULED' && 'bg-amber-400',
        type === 'NOTE_ADDED' && 'bg-gray-400',
        type === 'REMINDER_SET' && (completed ? 'bg-emerald-400' : 'bg-amber-400'),
      )}
      aria-hidden={true}
    />
  );
}

function ActivityItem({
  activity,
  onToggleReminder,
}: {
  activity: JobActivity;
  onToggleReminder?: (activity: JobActivity, completed: boolean) => Promise<void>;
}) {
  const [isUpdating, setIsUpdating] = useState(false);

  const label =
    activity.activity_type === 'STAGE_CHANGE'
      ? `Stage: ${activity.timeline_event_type ?? 'Updated'}`
      : activity.activity_type === 'INTERVIEW_SCHEDULED'
        ? `Interview${activity.interview_round ? ` — ${activity.interview_round}` : ''}`
        : activity.activity_type === 'REMINDER_SET'
          ? 'Follow-up Reminder'
          : 'Note';

  const statusBadge =
    activity.activity_type === 'REMINDER_SET' ? (
      <Badge
        className={cn(
          'rounded-full border-0 px-2 py-0.5 text-xs font-medium',
          activity.is_completed ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700',
        )}
      >
        {activity.is_completed ? 'Completed' : 'Pending'}
      </Badge>
    ) : null;

  async function handleToggle() {
    if (!onToggleReminder) return;
    setIsUpdating(true);
    try {
      await onToggleReminder(activity, !activity.is_completed);
    } finally {
      setIsUpdating(false);
    }
  }

  return (
    <div className="flex items-start gap-3">
      <ActivityIcon type={activity.activity_type} completed={activity.is_completed} />

      <div className="flex min-w-0 flex-1 flex-col gap-0.5">
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-sm font-medium text-gray-800">{label}</span>

          {activity.activity_type === 'STAGE_CHANGE' && activity.timeline_event_type && (
            <Badge
              className={cn(
                'rounded-full border-0 px-2 py-0.5 text-xs font-medium',
                stageStyles[activity.timeline_event_type as PipelineStage] ??
                  'bg-gray-100 text-gray-500',
              )}
            >
              {activity.timeline_event_type}
            </Badge>
          )}

          {statusBadge}
        </div>

        {activity.notes && <p className="text-xs text-gray-500">{activity.notes}</p>}

        {activity.activity_type === 'INTERVIEW_SCHEDULED' && activity.interview_date && (
          <p className="text-xs text-gray-500">
            Scheduled: {formatTimestamp(activity.interview_date)}
          </p>
        )}

        {activity.activity_type === 'REMINDER_SET' && activity.interview_date && (
          <p className="text-xs text-gray-500">Due: {formatDateOnly(activity.interview_date)}</p>
        )}

        {activity.activity_type === 'REMINDER_SET' && (
          <div className="mt-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={handleToggle}
              disabled={isUpdating}
              className="h-7 rounded-full px-2 text-xs text-gray-600 hover:bg-gray-100"
            >
              {activity.is_completed ? 'Reopen reminder' : 'Mark completed'}
            </Button>
          </div>
        )}

        <span className="text-xs text-gray-400">{formatTimestamp(activity.activity_date)}</span>
      </div>
    </div>
  );
}

interface JobActivityTimelineProps {
  jobId: string;
  refreshKey?: number;
}

export function JobActivityTimeline({ jobId, refreshKey }: JobActivityTimelineProps) {
  const [activities, setActivities] = useState<JobActivity[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    const loadActivities = async () => {
      if (!cancelled) {
        setLoading(true);
        setError(null);
        setActivities([]);
      }

      try {
        const res = await fetch(`/api/jobs/${jobId}/activities`);
        if (!res.ok) {
          if (!cancelled) setError('Could not load activity timeline.');
          return;
        }
        const json = await res.json();
        if (!cancelled) setActivities(json.data ?? []);
      } catch {
        if (!cancelled) setError('Could not load activity timeline.');
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    loadActivities();

    return () => {
      cancelled = true;
    };
  }, [jobId, refreshKey]);

  if (loading) {
    return (
      <div className="flex flex-col gap-3">
        <Skeleton className="h-4 w-1/3" />
        <div className="flex flex-col gap-4">
          {[1, 2, 3].map((i) => (
            <div key={i} className="flex items-start gap-3">
              <div className="mt-1 h-2.5 w-2.5 animate-pulse rounded-full bg-gray-200" />
              <div className="flex flex-col gap-1">
                <Skeleton className="h-4 w-32" />
                <Skeleton className="h-3 w-24" />
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (error) {
    return <p className="text-sm text-red-500">{error}</p>;
  }

  if (activities.length === 0) {
    return (
      <div className="flex flex-col gap-1">
        <p className="text-sm font-semibold text-gray-700">Activity Timeline</p>
        <p className="text-sm text-gray-400">No activity recorded yet.</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-3">
      <p className="text-sm font-semibold text-gray-700">Activity Timeline</p>
      <div className="relative flex flex-col gap-4 pl-1">
        <div className="absolute top-2 left-[4px] h-full w-px bg-gray-100" aria-hidden={true} />
        {activities.map((activity) => (
          <ActivityItem
            key={activity.id}
            activity={activity}
            onToggleReminder={async (activityToUpdate, completed) => {
              try {
                const res = await fetch(`/api/jobs/${jobId}/activities/${activityToUpdate.id}`, {
                  method: 'PATCH',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({ is_completed: completed }),
                });

                if (!res.ok) {
                  throw new Error('Failed to update reminder.');
                }

                const json = await res.json();
                if (!json?.success) {
                  throw new Error('Failed to update reminder.');
                }

                setActivities((current) =>
                  current.map((item) =>
                    item.id === activityToUpdate.id ? { ...item, is_completed: completed } : item,
                  ),
                );
              } catch {
                alert('Unable to update reminder status. Please try again.');
              }
            }}
          />
        ))}
      </div>
    </div>
  );
}
