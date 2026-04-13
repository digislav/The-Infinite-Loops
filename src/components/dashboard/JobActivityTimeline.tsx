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
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';
import { formatDateOnly } from '@/lib/utils/dateFormatters';
import type { PipelineStage } from '@/types/job.types';

// Shape of a single activity record from the API.
// Matches the job_activities table columns per S1-003 §3.1.
interface JobActivity {
  id: string;
  job_id: string;
  activity_type: 'STAGE_CHANGE' | 'INTERVIEW_SCHEDULED' | 'NOTE_ADDED';
  timeline_event_type?: string;
  notes?: string;
  activity_date: string;
  interview_round?: string;
  interview_date?: string;
  location_url?: string;
  created_at?: string;
}

// Pipeline stage colour tokens — per S1-002 §4.5.
// Must stay consistent with stageStyles in BoardContent.tsx and
// JobDetailPanel.tsx so stage badges look identical everywhere.
const stageStyles: Record<string, string> = {
  Interested: 'bg-indigo-100 text-indigo-700',
  Applied: 'bg-blue-100 text-blue-700',
  Interview: 'bg-amber-100 text-amber-700',
  Offer: 'bg-emerald-100 text-emerald-700',
  Rejected: 'bg-red-100 text-red-700',
  Ghosted: 'bg-slate-200 text-slate-700',
  Archived: 'bg-gray-100 text-gray-500',
};

// ActivityIcon — renders a small coloured dot indicating the activity type.
// Uses simple colour coding so the timeline is scannable at a glance.
// Per S1-002 §5.5 — status indicators use consistent colour tokens.
function ActivityIcon({ type }: { type: JobActivity['activity_type'] }) {
  return (
    <div
      className={cn(
        'mt-1 h-2.5 w-2.5 shrink-0 rounded-full',
        // Blue dot for stage changes
        type === 'STAGE_CHANGE' && 'bg-blue-400',
        // Amber dot for interviews
        type === 'INTERVIEW_SCHEDULED' && 'bg-amber-400',
        // Gray dot for notes
        type === 'NOTE_ADDED' && 'bg-gray-400',
      )}
      aria-hidden={true}
    />
  );
}

// ActivityItem — renders a single timeline event.
// Shows the event type, description, optional stage badge, and date.
function ActivityItem({ activity }: { activity: JobActivity }) {
  // Build a human-readable label for each activity type.
  const label =
    activity.activity_type === 'STAGE_CHANGE'
      ? `Stage: ${activity.timeline_event_type ?? 'Updated'}`
      : activity.activity_type === 'INTERVIEW_SCHEDULED'
        ? `Interview${activity.interview_round ? ` — ${activity.interview_round}` : ''}`
        : 'Note';

  return (
    <div className="flex items-start gap-3">
      {/* Coloured dot indicator */}
      <ActivityIcon type={activity.activity_type} />

      <div className="flex min-w-0 flex-1 flex-col gap-0.5">
        <div className="flex flex-wrap items-center gap-2">
          {/* Activity label */}
          <span className="text-sm font-medium text-gray-800">{label}</span>

          {/* Stage badge for stage change events — colour-coded per S1-002 §4.5 */}
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
        </div>

        {/* Activity notes — shown if present */}
        {activity.notes && <p className="text-xs text-gray-500">{activity.notes}</p>}

        {/* Interview date — shown for interview events if set */}
        {activity.activity_type === 'INTERVIEW_SCHEDULED' && activity.interview_date && (
          <p className="text-xs text-gray-500">
            Scheduled: {formatDateOnly(activity.interview_date)}
          </p>
        )}

        {/* Activity date — when the event was recorded */}
        <span className="text-xs text-gray-400">{formatDateOnly(activity.activity_date)}</span>
      </div>
    </div>
  );
}

interface JobActivityTimelineProps {
  // The ID of the job whose activities to display.
  // The backend verifies the caller owns this job before returning data.
  jobId: string;
}

export function JobActivityTimeline({ jobId }: JobActivityTimelineProps) {
  const [activities, setActivities] = useState<JobActivity[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // Use a flag to prevent state updates if the component unmounts
    // or jobId changes before the fetch completes.
    let cancelled = false;

    const loadActivities = async () => {
      // Reset state at the start of each fetch.
      if (!cancelled) {
        setLoading(true);
        setError(null);
        setActivities([]);
      }

      try {
        // Fetch activities from the protected API route.
        // The backend verifies the session and ownership before returning data —
        // we never send a user_id from the client per S1-003 §5.4.
        const res = await fetch(`/api/jobs/${jobId}/activities`);
        if (!res.ok) {
          // Human-friendly error — never raw HTTP codes per S1-001 §6.3.
          if (!cancelled) setError('Could not load activity timeline.');
          return;
        }
        const json = await res.json();
        if (!cancelled) setActivities(json.data ?? []);
      } catch {
        // Network or parse failure — safe friendly message.
        if (!cancelled) setError('Could not load activity timeline.');
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    loadActivities();

    // Cleanup — if jobId changes before fetch completes, ignore the result.
    return () => {
      cancelled = true;
    };
  }, [jobId]);

  // LOADING STATE — skeleton placeholders per S1-002 §9.2.
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

  // ERROR STATE — human-friendly message per S1-001 §6.3.
  if (error) {
    return <p className="text-sm text-red-500">{error}</p>;
  }

  // EMPTY STATE — per S1-002 §5.7 every list must have an empty state.
  if (activities.length === 0) {
    return (
      <div className="flex flex-col gap-1">
        <p className="text-sm font-semibold text-gray-700">Activity Timeline</p>
        <p className="text-sm text-gray-400">No activity recorded yet.</p>
      </div>
    );
  }

  // TIMELINE — renders all activities in reverse chronological order.
  return (
    <div className="flex flex-col gap-3">
      <p className="text-sm font-semibold text-gray-700">Activity Timeline</p>
      <div className="relative flex flex-col gap-4 pl-1">
        {/* Thin vertical line connecting the dots */}
        <div className="absolute top-2 left-[4px] h-full w-px bg-gray-100" aria-hidden={true} />
        {activities.map((activity) => (
          <ActivityItem key={activity.id} activity={activity} />
        ))}
      </div>
    </div>
  );
}
