// Unit tests for job workflow logic in jobServices.ts
// Tests the updateJob service function which handles:
//   - Stage transitions (S2-008/S2-009): records a STAGE_CHANGE activity
//   - Note updates (S2-010): records a NOTE_ADDED activity
//   - Ownership enforcement: no activity recorded for non-owned jobs
//
// Covers all 4 required categories per S1-001 §8.2.
// Per S1-004 §5.1 — Supabase is fully mocked, no real network calls.

import { updateJob } from '@/lib/services/jobServices';
import { createClient } from '@/lib/supabase/server';

jest.mock('@/lib/supabase/server');

// ---------------------------------------------------------------------------
// Mock Supabase query chains
//
// updateJob makes two separate supabase.from() calls:
//   1. jobs update chain:  .update().eq().eq().select().single()
//   2. job_activities insert chain: .insert().select() (fire-and-forget, non-fatal)
//
// We use mockFrom to route each call to the right mock chain by table name.
// ---------------------------------------------------------------------------

// Chain 1: jobs table — update path
const mockJobsSingle = jest.fn();
const mockJobsSelect = jest.fn(() => ({ single: mockJobsSingle }));
const mockJobsEqUserId = jest.fn(() => ({ select: mockJobsSelect }));
const mockJobsEqId = jest.fn(() => ({ eq: mockJobsEqUserId }));
const mockJobsUpdate = jest.fn(() => ({ eq: mockJobsEqId }));

// Chain 2: job_activities table — insert path
const mockActivitiesInsert = jest.fn(() => Promise.resolve({ data: null, error: null }));

// Route from() calls to the correct mock chain based on table name.
const mockFrom = jest.fn((table: string) => {
  if (table === 'jobs') return { update: mockJobsUpdate };
  if (table === 'job_activities') return { insert: mockActivitiesInsert };
  return {};
});

const mockSupabase = { from: mockFrom };

beforeEach(() => {
  jest.clearAllMocks();
  (createClient as jest.Mock).mockResolvedValue(mockSupabase);
});

// Realistic updated job record returned after a successful update.
const mockUpdatedJob = {
  id: 'job-123',
  user_id: 'user-abc',
  job_title: 'Software Engineer',
  company_name: 'Google',
  current_stage: 'Applied',
  updated_at: '2026-04-20T10:00:00.000Z',
};

describe('updateJob — stage transitions', () => {
  // HAPPY PATH — updating the stage returns the updated job.
  it('returns the updated job when the owner updates the stage', async () => {
    mockJobsSingle.mockResolvedValue({ data: mockUpdatedJob, error: null });

    const result = await updateJob('job-123', 'user-abc', { current_stage: 'Applied' });

    expect(result.data).toEqual(mockUpdatedJob);
    expect(result.error).toBeNull();
  });

  // HAPPY PATH — a STAGE_CHANGE activity is recorded after a successful stage update.
  // Per S2-009 — stage transitions must be recorded with timestamps.
  //show as happy path for b1.5 and b2.1
  it('records a STAGE_CHANGE activity when the stage is updated', async () => {
    mockJobsSingle.mockResolvedValue({ data: mockUpdatedJob, error: null });

    await updateJob('job-123', 'user-abc', { current_stage: 'Applied' });

    expect(mockActivitiesInsert).toHaveBeenCalledWith(
      expect.objectContaining({
        job_id: 'job-123',
        activity_type: 'STAGE_CHANGE',
        timeline_event_type: 'Applied',
      }),
    );
  });

  // HAPPY PATH — the activity note describes the transition correctly.
  it('records the correct stage name in the activity note', async () => {
    mockJobsSingle.mockResolvedValue({
      data: { ...mockUpdatedJob, current_stage: 'Interview' },
      error: null,
    });

    await updateJob('job-123', 'user-abc', { current_stage: 'Interview' });

    expect(mockActivitiesInsert).toHaveBeenCalledWith(
      expect.objectContaining({
        timeline_event_type: 'Interview',
        notes: 'Transitioned to Interview',
      }),
    );
  });

  // OWNERSHIP DENIAL — no activity is recorded if the job update returns no data.
  // Per S1-003 §5.2 — we never write child records for jobs the user doesn't own.
  // If .eq('user_id', userId) finds no matching row, result.data is null
  // and the activity insert is skipped entirely.
  //non happy path for b1.5 and b2.4
  it('does not record a STAGE_CHANGE activity when the user does not own the job', async () => {
    mockJobsSingle.mockResolvedValue({ data: null, error: null });

    await updateJob('job-123', 'wrong-user', { current_stage: 'Applied' });

    expect(mockActivitiesInsert).not.toHaveBeenCalled();
  });

  // AUTHORIZATION — ownership is enforced via both id and user_id in the query.
  // If someone removes the .eq('user_id', userId) check, this test fails.
  it('queries with both job id and user_id to enforce ownership', async () => {
    mockJobsSingle.mockResolvedValue({ data: mockUpdatedJob, error: null });

    await updateJob('job-123', 'user-abc', { current_stage: 'Applied' });

    expect(mockJobsEqId).toHaveBeenCalledWith('id', 'job-123');
    expect(mockJobsEqUserId).toHaveBeenCalledWith('user_id', 'user-abc');
  });

  // ERROR / EXCEPTION — DB failure on update returns the error gracefully.
  it('returns an error when the database update fails', async () => {
    mockJobsSingle.mockResolvedValue({ data: null, error: { message: 'DB connection failed' } });

    const result = await updateJob('job-123', 'user-abc', { current_stage: 'Applied' });

    expect(result.error).toBeDefined();
    expect(result.data).toBeNull();
  });

  // EDGE CASE — updating non-stage fields does not record a STAGE_CHANGE activity.
  it('does not record a STAGE_CHANGE activity when stage is not updated', async () => {
    mockJobsSingle.mockResolvedValue({
      data: { ...mockUpdatedJob, job_title: 'Senior Engineer' },
      error: null,
    });

    await updateJob('job-123', 'user-abc', { job_title: 'Senior Engineer' });

    const stageCalls = mockActivitiesInsert.mock.calls.filter(
      (call: unknown[]) =>
        (call[0] as { activity_type?: string })?.activity_type === 'STAGE_CHANGE',
    );
    expect(stageCalls).toHaveLength(0);
  });
});

describe('updateJob — note activity recording', () => {
  // HAPPY PATH — updating a note field records a NOTE_ADDED activity.
  // Per S2-010 — note changes must appear as events in the timeline.
  it('records a NOTE_ADDED activity when recruiter_notes is updated', async () => {
    mockJobsSingle.mockResolvedValue({
      data: { ...mockUpdatedJob, recruiter_notes: 'Great call' },
      error: null,
    });

    await updateJob('job-123', 'user-abc', { recruiter_notes: 'Great call' });

    expect(mockActivitiesInsert).toHaveBeenCalledWith(
      expect.objectContaining({
        job_id: 'job-123',
        activity_type: 'NOTE_ADDED',
        notes: 'Notes updated',
      }),
    );
  });

  // HAPPY PATH — clearing a note (empty string) also records a NOTE_ADDED activity.
  // The service checks for undefined, not falsy — so '' still triggers recording.
  it('records a NOTE_ADDED activity when a note is cleared to an empty string', async () => {
    mockJobsSingle.mockResolvedValue({
      data: { ...mockUpdatedJob, custom_notes: '' },
      error: null,
    });

    await updateJob('job-123', 'user-abc', { custom_notes: '' });

    expect(mockActivitiesInsert).toHaveBeenCalledWith(
      expect.objectContaining({
        activity_type: 'NOTE_ADDED',
      }),
    );
  });

  // OWNERSHIP DENIAL — no NOTE_ADDED activity recorded for non-owned jobs.
  it('does not record a NOTE_ADDED activity when the user does not own the job', async () => {
    mockJobsSingle.mockResolvedValue({ data: null, error: null });

    await updateJob('job-123', 'wrong-user', { recruiter_notes: 'Great call' });

    expect(mockActivitiesInsert).not.toHaveBeenCalled();
  });

  // EDGE CASE — updating a non-note field does not record a NOTE_ADDED activity.
  //edge case for b1.5
  it('does not record a NOTE_ADDED activity when no note fields are updated', async () => {
    mockJobsSingle.mockResolvedValue({ data: mockUpdatedJob, error: null });

    await updateJob('job-123', 'user-abc', { job_title: 'Senior Engineer' });

    const noteCalls = mockActivitiesInsert.mock.calls.filter(
      (call: unknown[]) => (call[0] as { activity_type?: string })?.activity_type === 'NOTE_ADDED',
    );
    expect(noteCalls).toHaveLength(0);
  });
});
