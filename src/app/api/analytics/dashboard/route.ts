import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

// GET /api/analytics/dashboard — S3-014: Expanded Dashboard Analytics.
// Returns stage conversion rates and average time-in-stage metrics computed
// from stored STAGE_CHANGE activity events.
//
// Conversion rate: % of jobs that progressed from stage A to stage B.
// Time in stage: average days a job spent in a stage before moving on.
//
// Per S1-003 §5.2 — auth enforced first, ownership enforced via job ID join.
// We never trust user_id from the client — it always comes from the session.
// Per S1-001 §4.1 — all DB operations are in the service/route layer, never
// called directly from the frontend.

export async function GET() {
  try {
    const supabase = await createClient();

    // Always verify session first — per S1-003 §2.1.
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'AUTH_REQUIRED' }, { status: 401 });
    }

    // Step 1: Get all job IDs belonging to this user.
    // This is the ownership anchor — all subsequent queries are scoped
    // to these IDs so a user can never see another user's activity data.
    // Per S1-003 §4.3 — child entity ownership verified through parent join.
    const { data: jobs, error: jobsError } = await supabase
      .from('jobs')
      .select('id, current_stage, created_at')
      .eq('user_id', user.id);

    if (jobsError) {
      return NextResponse.json({ error: 'INTERNAL_ERROR' }, { status: 500 });
    }

    if (!jobs || jobs.length === 0) {
      // No jobs yet — return empty analytics so the UI can show a zero state.
      return NextResponse.json({
        success: true,
        data: {
          conversionRates: [],
          avgDaysInStage: [],
          totalJobsTracked: 0,
        },
      });
    }

    const jobIds = jobs.map((j) => j.id);

    // Step 2: Fetch all STAGE_CHANGE activities for the user's jobs only.
    // Scoped to jobIds from step 1 — never queries across users.
    // Ordered ascending so we can compute time deltas between consecutive events.
    const { data: activities, error: activitiesError } = await supabase
      .from('job_activities')
      .select('job_id, timeline_event_type, activity_date')
      .in('job_id', jobIds)
      .eq('activity_type', 'STAGE_CHANGE')
      .order('activity_date', { ascending: true });

    if (activitiesError) {
      return NextResponse.json({ error: 'INTERNAL_ERROR' }, { status: 500 });
    }

    // Step 3: Group STAGE_CHANGE events by job so we can compute per-job
    // stage sequences and time deltas.
    const eventsByJob: Record<string, { stage: string; date: Date }[]> = {};

    for (const activity of activities ?? []) {
      if (!activity.timeline_event_type) continue;
      if (!eventsByJob[activity.job_id]) {
        eventsByJob[activity.job_id] = [];
      }
      eventsByJob[activity.job_id].push({
        stage: activity.timeline_event_type,
        date: new Date(activity.activity_date),
      });
    }

    // Step 4: Compute stage conversion rates.
    // A conversion is counted when a job has a STAGE_CHANGE event to stage B
    // AND previously had a STAGE_CHANGE event to stage A.
    // We track the key funnel transitions only — the ones most meaningful
    // for a job seeker per S3-014 outcome.
    const funnelSteps: { from: string; to: string }[] = [
      { from: 'Interested', to: 'Applied' },
      { from: 'Applied', to: 'Interview' },
      { from: 'Interview', to: 'Offer' },
    ];

    const conversionRates = funnelSteps.map(({ from, to }) => {
      let reachedFrom = 0;
      let reachedTo = 0;

      for (const events of Object.values(eventsByJob)) {
        const stages = events.map((e) => e.stage);
        const hasFrom = stages.includes(from);
        const hasTo = stages.includes(to);

        if (hasFrom) reachedFrom++;
        // Only count as a conversion if the job also reached `from` first —
        // avoids counting jobs that jumped directly to a later stage.
        if (hasFrom && hasTo) reachedTo++;
      }

      const rate = reachedFrom > 0 ? Math.round((reachedTo / reachedFrom) * 100) : 0;

      return {
        from,
        to,
        // Number of jobs that reached the `from` stage.
        reachedFrom,
        // Number of jobs that converted to the `to` stage.
        reachedTo,
        // Conversion rate as a percentage (0–100).
        rate,
      };
    });

    // Step 5: Compute average days spent in each stage before moving on.
    // For each job, for each pair of consecutive STAGE_CHANGE events, compute
    // the time delta. Average across all jobs that passed through that stage.
    const stagesToTrack = ['Interested', 'Applied', 'Interview', 'Offer'];
    const stageDurations: Record<string, number[]> = {};

    for (const stage of stagesToTrack) {
      stageDurations[stage] = [];
    }

    for (const events of Object.values(eventsByJob)) {
      // Events are already sorted ascending by activity_date from the query.
      for (let i = 0; i < events.length - 1; i++) {
        const currentStage = events[i].stage;
        const nextDate = events[i + 1].date;
        const currentDate = events[i].date;

        if (!stagesToTrack.includes(currentStage)) continue;

        // Time in stage = date of next stage change - date of this stage change.
        const daysInStage = (nextDate.getTime() - currentDate.getTime()) / (1000 * 60 * 60 * 24);

        // Clamp to 0 — guard against any clock skew or duplicate events.
        if (daysInStage >= 0) {
          stageDurations[currentStage].push(daysInStage);
        }
      }
    }

    // Average the durations per stage, rounding to 1 decimal place.
    const avgDaysInStage = stagesToTrack
      .map((stage) => {
        const durations = stageDurations[stage];
        if (durations.length === 0) return null;
        const avg = durations.reduce((sum, d) => sum + d, 0) / durations.length;
        return {
          stage,
          avgDays: Math.round(avg * 10) / 10,
          // Number of jobs that contributed data for this stage.
          sampleSize: durations.length,
        };
      })
      // Filter out stages with no data so the UI doesn't show empty rows.
      .filter(Boolean) as { stage: string; avgDays: number; sampleSize: number }[];

    return NextResponse.json({
      success: true,
      data: {
        conversionRates,
        avgDaysInStage,
        totalJobsTracked: jobIds.length,
      },
    });
  } catch {
    // Catch-all — never expose internal errors per S1-001 §6.3.
    return NextResponse.json({ error: 'INTERNAL_ERROR' }, { status: 500 });
  }
}
