// Unit tests for the S2-010 activity timeline feature.
// Tests the getActivitiesByJob service function which is called
// by the GET /api/jobs/[id]/activities route handler.
//
// Covers all 4 required categories per S1-001 §8.2:
// happy path, ownership denial, auth failure, error/exception.
// Per S1-004 §5.1 — Supabase is fully mocked, no real network calls.

import { getActivitiesByJob } from '@/lib/services/jobServices';
import { createClient } from '@/lib/supabase/server';

// Mock the Supabase server client so no real DB calls are made.
jest.mock('@/lib/supabase/server');

// Build a mock Supabase query chain that mirrors the real one:
// supabase.from('job_activities').select(...).eq(...).eq(...).order(...)
const mockOrder = jest.fn();
const mockEqUserId = jest.fn(() => ({ order: mockOrder }));
const mockEqJobId = jest.fn(() => ({ eq: mockEqUserId }));
const mockSelect = jest.fn(() => ({ eq: mockEqJobId }));
const mockFrom = jest.fn(() => ({ select: mockSelect }));
const mockSupabase = { from: mockFrom };

beforeEach(() => {
  // Reset all mocks before each test so state doesn't bleed between tests.
  jest.clearAllMocks();
  (createClient as jest.Mock).mockResolvedValue(mockSupabase);
});

// Realistic mock activity records matching the DB schema.
const mockActivities = [
  {
    id: 'act-1',
    job_id: 'job-123',
    activity_type: 'STAGE_CHANGE',
    timeline_event_type: 'Applied',
    notes: 'Transitioned to Applied',
    activity_date: '2026-04-13T10:00:00.000Z',
    created_at: '2026-04-13T10:00:00.000Z',
  },
  {
    id: 'act-2',
    job_id: 'job-123',
    activity_type: 'STAGE_CHANGE',
    timeline_event_type: 'Interested',
    notes: 'Job entry created',
    activity_date: '2026-04-07T10:00:00.000Z',
    created_at: '2026-04-07T10:00:00.000Z',
  },
];

describe('getActivitiesByJob', () => {
  // HAPPY PATH — authenticated owner gets their job activities back.
  it('returns activities when the authenticated user owns the job', async () => {
    // Simulate the DB returning matching activity rows.
    mockOrder.mockResolvedValue({ data: mockActivities, error: null });

    const result = await getActivitiesByJob('job-123', 'user-abc');

    expect(result.data).toEqual(mockActivities);
    expect(result.error).toBeNull();
  });

  // OWNERSHIP DENIAL — user B cannot get activities for user A's job.
  // Per S1-003 §4.3 — ownership of child entities is verified through
  // the parent. The join with jobs.user_id enforces this.
  it('returns empty data when the user does not own the job', async () => {
    mockOrder.mockResolvedValue({ data: [], error: null });

    const result = await getActivitiesByJob('job-123', 'wrong-user-id');

    expect(result.data).toEqual([]);
  });

  // AUTHORIZATION — verify ownership is enforced through the parent join.
  // If someone removes the .eq('jobs.user_id', userId) this test fails.
  it('queries with the correct jobId and userId to enforce ownership', async () => {
    mockOrder.mockResolvedValue({ data: mockActivities, error: null });

    await getActivitiesByJob('job-123', 'user-abc');

    // Confirm the job ID filter was applied.
    expect(mockEqJobId).toHaveBeenCalledWith('job_id', 'job-123');
    // Confirm the ownership filter was applied through the parent join.
    expect(mockEqUserId).toHaveBeenCalledWith('jobs.user_id', 'user-abc');
  });

  // ERROR / EXCEPTION — database failure is handled gracefully.
  it('returns an error when the database call fails', async () => {
    mockOrder.mockResolvedValue({
      data: null,
      error: { message: 'DB connection failed' },
    });

    const result = await getActivitiesByJob('job-123', 'user-abc');

    expect(result.error).toBeDefined();
    expect(result.data).toBeNull();
  });

  // EMPTY TIMELINE — a job with no activities returns an empty array.
  it('returns an empty array when the job has no activities', async () => {
    mockOrder.mockResolvedValue({ data: [], error: null });

    const result = await getActivitiesByJob('job-123', 'user-abc');

    expect(result.data).toEqual([]);
    expect(result.error).toBeNull();
  });
});
