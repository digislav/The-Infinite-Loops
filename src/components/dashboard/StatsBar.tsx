'use client';

// S2-025: Implement Dashboard Metrics (Stage Counts and Response Tracking)
// Displays baseline metrics computed from stored job and outcome data.
// Shows counts per pipeline stage plus response rate and interview rate.
//
// Response rate = jobs that received any employer response / total active jobs
// Interview rate = jobs that reached interview or offer stage / total active jobs
// Per S1-002 §4.2 — Stats Bar is a required dashboard layout zone.
// Per S1-003 — data fetched from protected API route, never directly from DB.

import { useEffect, useState } from 'react';
import { Card } from '@/components/ui/card';

// Stage counts shape — one entry per pipeline stage plus total.
type StageCounts = {
  Total: number;
  Interested: number;
  Applied: number;
  Interview: number;
  Offer: number;
  Rejected: number;
  Ghosted: number;
  Archived: number;
};

// Metrics shape — stage counts plus computed response tracking metrics.
// Per S2-025 — dashboard must display baseline metrics from stored job data.
type DashboardMetrics = {
  counts: StageCounts;
  // Response rate — percentage of active jobs that received any employer response.
  // Calculated as: jobs with Interview/Offer/Rejected/Ghosted / total active jobs.
  responseRate: number;
  // Interview rate — percentage of active jobs that reached interview or offer stage.
  interviewRate: number;
  // Active jobs — total jobs excluding Archived and Interested.
  // These are jobs that have been formally applied to.
  activeJobs: number;
};

interface StatsBarProps {
  // refreshKey increments every time a job is added, updated, archived,
  // or deleted — triggering the stats to re-fetch automatically.
  // Per S2-025 — metrics must update from stored job data.
  refreshKey: number;
}

export function StatsBar({ refreshKey }: StatsBarProps) {
  const [metrics, setMetrics] = useState<DashboardMetrics>({
    counts: {
      Total: 0,
      Interested: 0,
      Applied: 0,
      Interview: 0,
      Offer: 0,
      Rejected: 0,
      Ghosted: 0,
      Archived: 0,
    },
    responseRate: 0,
    interviewRate: 0,
    activeJobs: 0,
  });

  // Re-fetch metrics whenever refreshKey changes.
  // refreshKey is incremented by DashboardPage whenever a job action completes.
  useEffect(() => {
    async function fetchMetrics() {
      try {
        // Fetch all jobs including archived so counts are accurate.
        // Per S1-003 — auth and ownership enforced on the backend.
        // We never pass user_id from the client.
        const res = await fetch('/api/jobs?all=true');
        if (!res.ok) return;
        const json = await res.json();
        const jobs = json.data ?? [];

        // Build stage counts from the fetched job records.
        const newCounts: StageCounts = {
          Total: jobs.length,
          Interested: 0,
          Applied: 0,
          Interview: 0,
          Offer: 0,
          Rejected: 0,
          Ghosted: 0,
          Archived: 0,
        };

        for (const job of jobs) {
          const stage = job.current_stage as keyof StageCounts;
          if (stage in newCounts) {
            newCounts[stage]++;
          }
        }

        // Calculate response tracking metrics — per S2-025 requirement.
        // Active jobs = all jobs formally applied to (not Interested or Archived).
        const activeJobs =
          newCounts.Applied +
          newCounts.Interview +
          newCounts.Offer +
          newCounts.Rejected +
          newCounts.Ghosted;

        // Responded = jobs that received any employer response.
        const responded = newCounts.Interview + newCounts.Offer + newCounts.Rejected;

        // Response rate = responded / active * 100, rounded to nearest integer.
        const responseRate = activeJobs > 0 ? Math.round((responded / activeJobs) * 100) : 0;

        // Interview rate = jobs at interview or offer stage / active * 100.
        const interviewRate =
          activeJobs > 0
            ? Math.round(((newCounts.Interview + newCounts.Offer) / activeJobs) * 100)
            : 0;

        setMetrics({ counts: newCounts, responseRate, interviewRate, activeJobs });
      } catch {
        // Silently fail — metrics stay at previous values per S1-001 §6.3.
      }
    }
    fetchMetrics();
  }, [refreshKey]); // re-runs whenever refreshKey changes

  return (
    <div className="flex flex-col gap-3">
      {/* STAGE COUNT CARDS — one card per pipeline stage plus total.
          Per S1-002 §4.2 — Stats Bar is a required dashboard zone.
          Per S1-002 §6.3 — stats bar uses flex row with equal-width blocks. */}
      <div className="flex flex-wrap gap-3">
        {(Object.entries(metrics.counts) as [keyof StageCounts, number][]).map(([label, count]) => (
          <Card
            key={label}
            className="flex min-w-[100px] flex-1 flex-col items-center justify-center gap-1 border border-gray-200 bg-white p-4"
          >
            <span className="text-2xl font-bold text-gray-900">{count}</span>
            <span className="text-sm font-medium text-gray-500">{label}</span>
          </Card>
        ))}
      </div>

      {/* RESPONSE TRACKING METRICS — S2-025 core addition.
          Only shown when there are active jobs to avoid displaying
          0% misleadingly for users who haven't applied yet. */}
      {metrics.activeJobs > 0 && (
        <div className="flex flex-wrap gap-3">
          {/* Response Rate — percentage of applications that received a response.
              Green if >= 50%, amber if >= 25%, red if below 25%. */}
          <Card className="flex min-w-[200px] flex-1 flex-col gap-1 border border-gray-200 bg-white p-4">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium text-gray-500">Response Rate</span>
              <span
                className={
                  metrics.responseRate >= 50
                    ? 'text-sm font-bold text-emerald-600'
                    : metrics.responseRate >= 25
                      ? 'text-sm font-bold text-amber-600'
                      : 'text-sm font-bold text-red-500'
                }
              >
                {metrics.responseRate}%
              </span>
            </div>
            {/* Progress bar showing response rate visually.
                Accessible via role and aria attributes per S1-002 §10.1. */}
            <div className="mt-1 h-2 w-full overflow-hidden rounded-full bg-gray-100">
              <div
                className={
                  metrics.responseRate >= 50
                    ? 'h-full rounded-full bg-emerald-500 transition-all duration-300'
                    : metrics.responseRate >= 25
                      ? 'h-full rounded-full bg-amber-500 transition-all duration-300'
                      : 'h-full rounded-full bg-red-400 transition-all duration-300'
                }
                style={{ width: `${metrics.responseRate}%` }}
                role="progressbar"
                aria-valuenow={metrics.responseRate}
                aria-valuemin={0}
                aria-valuemax={100}
                aria-label={`Response rate: ${metrics.responseRate}%`}
              />
            </div>
            <p className="mt-1 text-xs text-gray-400">
              {metrics.counts.Interview + metrics.counts.Offer + metrics.counts.Rejected} of{' '}
              {metrics.activeJobs} applications received a response
            </p>
          </Card>

          {/* Active Applications — jobs formally applied to */}
          <Card className="flex min-w-[200px] flex-1 flex-col gap-1 border border-gray-200 bg-white p-4">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium text-gray-500">Active Applications</span>
              <span className="text-sm font-bold text-gray-900">{metrics.activeJobs}</span>
            </div>
            <p className="mt-1 text-xs text-gray-400">
              Jobs formally applied to (excluding Interested &amp; Archived)
            </p>
          </Card>

          {/* Interview Rate — percentage of applications that reached interview stage */}
          <Card className="flex min-w-[200px] flex-1 flex-col gap-1 border border-gray-200 bg-white p-4">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium text-gray-500">Interview Rate</span>
              <span className="text-sm font-bold text-amber-600">{metrics.interviewRate}%</span>
            </div>
            <p className="mt-1 text-xs text-gray-400">
              {metrics.counts.Interview + metrics.counts.Offer} of {metrics.activeJobs} applications
              reached interview stage
            </p>
          </Card>
        </div>
      )}
    </div>
  );
}
