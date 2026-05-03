'use client';

// StatsBar — S2-025 + S3-014.
// S2-025: Stage counts, response rate, interview rate.
// S3-014: Stage conversion funnel and average time-in-stage analytics
//         computed from stored STAGE_CHANGE activity events.
//
// Per S1-002 §4.2 — Stats Bar is a required dashboard layout zone.
// Per S1-003 — all data fetched from protected API routes. Never calls
//   Supabase directly. Never sends user_id from the client.

import { useEffect, useState } from 'react';
import { Card } from '@/components/ui/card';
import { ChevronDown, ChevronUp, BarChart2 } from 'lucide-react';

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

// Core metrics shape from S2-025.
type DashboardMetrics = {
  counts: StageCounts;
  responseRate: number;
  interviewRate: number;
  activeJobs: number;
};

// Conversion rate for one funnel step — e.g. Applied → Interview.
type ConversionRate = {
  from: string;
  to: string;
  reachedFrom: number;
  reachedTo: number;
  rate: number;
};

// Average days spent in a single stage before moving on.
type AvgDaysInStage = {
  stage: string;
  avgDays: number;
  sampleSize: number;
};

// S3-014 analytics shape returned by GET /api/analytics/dashboard.
type AnalyticsData = {
  conversionRates: ConversionRate[];
  avgDaysInStage: AvgDaysInStage[];
  totalJobsTracked: number;
};

interface StatsBarProps {
  // Increments every time a job is added, updated, archived, or deleted —
  // triggers a re-fetch of both metrics and analytics.
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

  // S3-014: analytics state — null until first successful fetch.
  const [analytics, setAnalytics] = useState<AnalyticsData | null>(null);

  // UI state to toggle the visibility of detailed statistics
  const [isStatsExpanded, setIsStatsExpanded] = useState(false);

  // Re-fetch both metrics and analytics whenever refreshKey changes.
  // refreshKey is incremented by DashboardPage on any job mutation.
  useEffect(() => {
    // Fetch S2-025 stage counts and response tracking metrics.
    // Per S1-003 — auth and ownership enforced on the backend.
    // user_id never sent from the client.
    async function fetchMetrics() {
      try {
        const res = await fetch('/api/jobs?all=true');
        if (!res.ok) return;
        const json = await res.json();
        const jobs = json.data ?? [];

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
          if (stage in newCounts) newCounts[stage]++;
        }

        // Active jobs = formally applied (excludes Interested and Archived).
        const activeJobs =
          newCounts.Applied +
          newCounts.Interview +
          newCounts.Offer +
          newCounts.Rejected +
          newCounts.Ghosted;

        // Responded = jobs that got any employer response.
        const responded = newCounts.Interview + newCounts.Offer + newCounts.Rejected;

        const responseRate = activeJobs > 0 ? Math.round((responded / activeJobs) * 100) : 0;
        const interviewRate =
          activeJobs > 0
            ? Math.round(((newCounts.Interview + newCounts.Offer) / activeJobs) * 100)
            : 0;

        setMetrics({ counts: newCounts, responseRate, interviewRate, activeJobs });
      } catch {
        // Silently fail — metrics stay at previous values per S1-001 §6.3.
      }
    }

    // S3-014: Fetch velocity and conversion analytics from the new endpoint.
    // Per S1-003 §2.1 — the route verifies the session server-side.
    // Per S1-003 §4.3 — ownership enforced via job ID join on the backend.
    async function fetchAnalytics() {
      try {
        const res = await fetch('/api/analytics/dashboard');
        if (!res.ok) return;
        const json = await res.json();
        if (json.data) setAnalytics(json.data);
      } catch {
        // Silently fail — analytics section simply won't render.
      }
    }

    fetchMetrics();
    fetchAnalytics();
  }, [refreshKey]);

  // Colour helper for conversion rate badges.
  // Green >= 50%, amber >= 25%, red below 25%.
  function conversionColour(rate: number): string {
    if (rate >= 50) return 'text-emerald-600';
    if (rate >= 25) return 'text-amber-600';
    return 'text-red-500';
  }

  // Colour helper for time-in-stage badges.
  // Fast (< 7 days) = emerald, moderate (< 21 days) = amber, slow = red.
  function velocityColour(days: number): string {
    if (days < 7) return 'text-emerald-600';
    if (days < 21) return 'text-amber-600';
    return 'text-red-500';
  }

  // Whether analytics has enough data to be worth showing.
  // Require at least 2 jobs tracked so single-job averages aren't misleading.
  const hasAnalytics =
    analytics !== null &&
    analytics.totalJobsTracked >= 2 &&
    (analytics.conversionRates.some((r) => r.reachedFrom > 0) ||
      analytics.avgDaysInStage.length > 0);

  return (
    <div className="flex flex-col gap-6">
      {/* ── STAGE COUNT CARDS (S2-025) ────────────────────────────────────
          One card per pipeline stage plus total.
          Per S1-002 §4.2 — Stats Bar is a required dashboard layout zone.
          Per S1-002 §6.3 — uses flex row with equal-width blocks. */}
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

      <div className="flex flex-col gap-4">
        <div className="relative flex items-center">
          <button
            onClick={() => setIsStatsExpanded(!isStatsExpanded)}
            className="mr-4 flex items-center gap-2 rounded-full border border-gray-200 bg-white py-1.5 pr-4 pl-3 text-xs font-semibold text-gray-600 shadow-sm transition-all hover:bg-gray-50 hover:text-gray-900 focus:ring-2 focus:ring-gray-200 focus:outline-none"
          >
            <BarChart2 className="h-3.5 w-3.5 text-gray-400" />
            {isStatsExpanded ? 'Hide Analytics' : 'Show Detailed Analytics'}
            {isStatsExpanded ? (
              <ChevronUp className="h-3.5 w-3.5 text-gray-400" />
            ) : (
              <ChevronDown className="h-3.5 w-3.5 text-gray-400" />
            )}
          </button>
          <div className="flex-grow border-t border-gray-200"></div>
        </div>

        {isStatsExpanded && (
          <div className="animate-in fade-in slide-in-from-top-2 flex flex-col gap-6 duration-300">
            {/* ── RESPONSE TRACKING METRICS (S2-025) ───────────────────────────
                Only shown when there are active jobs — avoids showing 0%
                misleadingly for users who haven't applied yet. */}
            {metrics.activeJobs > 0 && (
              <div className="flex flex-wrap gap-3">
                {/* Response Rate */}
                <Card className="flex min-w-[200px] flex-1 flex-col gap-1 border border-gray-200 bg-white p-4">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium text-gray-500">Response Rate</span>
                    <span
                      className={`text-sm font-bold ${
                        metrics.responseRate >= 50
                          ? 'text-emerald-600'
                          : metrics.responseRate >= 25
                            ? 'text-amber-600'
                            : 'text-red-500'
                      }`}
                    >
                      {metrics.responseRate}%
                    </span>
                  </div>
                  {/* Progress bar — accessible via role and aria per S1-002 §10.1. */}
                  <div className="mt-1 h-2 w-full overflow-hidden rounded-full bg-gray-100">
                    <div
                      className={`h-full rounded-full transition-all duration-300 ${
                        metrics.responseRate >= 50
                          ? 'bg-emerald-500'
                          : metrics.responseRate >= 25
                            ? 'bg-amber-500'
                            : 'bg-red-400'
                      }`}
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

                {/* Active Applications */}
                <Card className="flex min-w-[200px] flex-1 flex-col gap-1 border border-gray-200 bg-white p-4">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium text-gray-500">Active Applications</span>
                    <span className="text-sm font-bold text-gray-900">{metrics.activeJobs}</span>
                  </div>
                  <p className="mt-1 text-xs text-gray-400">
                    Jobs formally applied to (excluding Interested &amp; Archived)
                  </p>
                </Card>

                {/* Interview Rate */}
                <Card className="flex min-w-[200px] flex-1 flex-col gap-1 border border-gray-200 bg-white p-4">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium text-gray-500">Interview Rate</span>
                    <span className="text-sm font-bold text-amber-600">
                      {metrics.interviewRate}%
                    </span>
                  </div>
                  <p className="mt-1 text-xs text-gray-400">
                    {metrics.counts.Interview + metrics.counts.Offer} of {metrics.activeJobs}{' '}
                    applications reached interview stage
                  </p>
                </Card>
              </div>
            )}

            {/* ── S3-014: STAGE CONVERSION FUNNEL ──────────────────────────────
          Shows conversion rates between key funnel steps derived from
          STAGE_CHANGE activity events. Only rendered when enough data
          exists (>= 2 jobs tracked) to avoid misleading single-job stats. */}
            {hasAnalytics && analytics!.conversionRates.some((r) => r.reachedFrom > 0) && (
              <div className="flex flex-col gap-3">
                <div className="flex items-center gap-2">
                  <h3 className="text-sm font-semibold text-gray-700">Stage Conversion Funnel</h3>
                  <span className="text-xs text-gray-400">
                    based on {analytics!.totalJobsTracked} jobs
                  </span>
                </div>

                <div className="flex flex-wrap gap-3">
                  {analytics!.conversionRates
                    // Only show funnel steps where at least one job reached the
                    // starting stage — skip empty steps entirely.
                    .filter((r) => r.reachedFrom > 0)
                    .map((r) => (
                      <Card
                        key={`${r.from}-${r.to}`}
                        className="flex min-w-[200px] flex-1 flex-col gap-2 border border-gray-200 bg-white p-4"
                      >
                        {/* Funnel step label — "Applied → Interview" */}
                        <div className="flex items-center justify-between">
                          <span className="text-sm font-medium text-gray-600">
                            {r.from} <span className="text-gray-400">→</span> {r.to}
                          </span>
                          <span className={`text-sm font-bold ${conversionColour(r.rate)}`}>
                            {r.rate}%
                          </span>
                        </div>

                        {/* Progress bar showing conversion rate visually. */}
                        <div className="h-2 w-full overflow-hidden rounded-full bg-gray-100">
                          <div
                            className={`h-full rounded-full transition-all duration-300 ${
                              r.rate >= 50
                                ? 'bg-emerald-500'
                                : r.rate >= 25
                                  ? 'bg-amber-500'
                                  : 'bg-red-400'
                            }`}
                            style={{ width: `${r.rate}%` }}
                            role="progressbar"
                            aria-valuenow={r.rate}
                            aria-valuemin={0}
                            aria-valuemax={100}
                            aria-label={`${r.from} to ${r.to} conversion: ${r.rate}%`}
                          />
                        </div>

                        {/* Sample size — so the user knows how much data this is based on. */}
                        <p className="text-xs text-gray-400">
                          {r.reachedTo} of {r.reachedFrom} jobs converted
                        </p>
                      </Card>
                    ))}
                </div>
              </div>
            )}

            {/* ── S3-014: AVERAGE TIME IN STAGE ────────────────────────────────
          Shows average days spent in each stage before moving on.
          Computed from time deltas between consecutive STAGE_CHANGE events.
          Colour-coded: green < 7 days, amber < 21 days, red >= 21 days.
          Only shown when at least one stage has data. */}
            {hasAnalytics && analytics!.avgDaysInStage.length > 0 && (
              <div className="flex flex-col gap-3">
                <div className="flex items-center gap-2">
                  <h3 className="text-sm font-semibold text-gray-700">Average Time in Stage</h3>
                  <span className="text-xs text-gray-400">days before moving to next stage</span>
                </div>

                <div className="flex flex-wrap gap-3">
                  {analytics!.avgDaysInStage.map((s) => (
                    <Card
                      key={s.stage}
                      className="flex min-w-[140px] flex-1 flex-col items-center justify-center gap-1 border border-gray-200 bg-white p-4"
                    >
                      {/* Days count — large and prominent */}
                      <span className={`text-2xl font-bold ${velocityColour(s.avgDays)}`}>
                        {s.avgDays}
                      </span>
                      <span className="text-xs font-medium text-gray-500">days in {s.stage}</span>
                      {/* Sample size helps the user gauge reliability of the average. */}
                      <span className="text-xs text-gray-400">
                        avg of {s.sampleSize} job{s.sampleSize !== 1 ? 's' : ''}
                      </span>
                    </Card>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
