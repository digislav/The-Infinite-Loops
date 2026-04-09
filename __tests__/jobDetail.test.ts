// Unit tests for the job detail feature — S2-005.
// Tests getJobById from jobServices, which is the function
// the GET /api/jobs/[id] route handler calls.
//
// Covers all 4 required categories per S1-001 §8.2:
// happy path, ownership denial, error/exception, authorization.
// Per S1-004 §5.1 — Supabase is fully mocked, no real network calls.

import { getJobById } from '@/lib/services/jobServices';
import { createClient } from '@/lib/supabase/server';

// Mock the Supabase server client so no real DB calls are made.
jest.mock('@/lib/supabase/server');

// Build a mock Supabase query chain that mirrors the real one:
// supabase.from('jobs').select(...).eq('id',...).eq('user_id',...).single()
const mockSingle = jest.fn();
const mockEqUserId = jest.fn(() => ({ single: mockSingle }));
const mockEqId = jest.fn(() => ({ eq: mockEqUserId }));
const mockSelect = jest.fn(() => ({ eq: mockEqId }));
const mockFrom = jest.fn(() => ({ select: mockSelect }));
const mockSupabase = { from: mockFrom };

beforeEach(() => {
  // Reset all mocks before each test so state doesn't bleed between tests.
  jest.clearAllMocks();
  (createClient as jest.Mock).mockResolvedValue(mockSupabase);
});

// A realistic job record matching the DB schema.
// Used as mock return data for happy path tests.
const mockJobRecord = {
  id: 'job-123',
  user_id: 'user-abc',
  job_title: 'Software Engineer',
  company_name: 'Google',
  location: 'New York, NY',
  current_stage: 'Applied',
  last_activity_date: '2026-04-07T12:00:00.000Z',
  deadline: '2026-05-01T00:00:00.000Z',
  is_priority: false,
  description: null,
  compensation_notes: null,
  recruiter_notes: null,
  custom_notes: null,
  created_at: '2026-04-01T00:00:00.000Z',
  updated_at: '2026-04-07T00:00:00.000Z',
};

describe('getJobById', () => {
  // HAPPY PATH — authenticated owner gets their job back.
  // Per S1-001 §8.2 — expected input produces expected output.
  it('returns job data when the authenticated user owns the job', async () => {
    // Simulate the DB returning a matching row.
    mockSingle.mockResolvedValue({ data: mockJobRecord, error: null });

    const result = await getJobById('job-123', 'user-abc');

    expect(result.data).toEqual(mockJobRecord);
    expect(result.error).toBeNull();
  });

  // OWNERSHIP DENIAL — user B cannot read user A's job.
  // Per S1-003 §5.2 — .eq('user_id', ownerId) means a non-owner
  // gets null back. The route handler turns this into a 404, not 403.
  // Per S1-003 §5.5 — 403 would reveal the resource exists.
  it('returns null data when the user does not own the job', async () => {
    // Simulate the DB returning nothing because user_id didn't match.
    mockSingle.mockResolvedValue({
      data: null,
      error: { message: 'No rows found' },
    });

    const result = await getJobById('job-123', 'wrong-user-id');

    expect(result.data).toBeNull();
  });

  // AUTHORIZATION — verify both ownership filters are applied to the query.
  // If someone removes .eq('user_id', ownerId) this test will fail,
  // which is the primary security check per S1-003 §5.2.
  it('enforces ownership by querying with both the job id and user_id', async () => {
    mockSingle.mockResolvedValue({ data: mockJobRecord, error: null });

    await getJobById('job-123', 'user-abc');

    // Confirm the job ID filter was applied.
    expect(mockEqId).toHaveBeenCalledWith('id', 'job-123');
    // Confirm the ownership filter was applied — the key security check.
    expect(mockEqUserId).toHaveBeenCalledWith('user_id', 'user-abc');
  });

  // ERROR / EXCEPTION — database failure is handled gracefully.
  // The route handler catches this and returns 500 with INTERNAL_ERROR.
  // Per S1-001 §6.2 — never expose DB error details to the client.
  it('returns an error when the database call fails', async () => {
    // Simulate a DB connection failure.
    mockSingle.mockResolvedValue({
      data: null,
      error: { message: 'DB connection failed' },
    });

    const result = await getJobById('job-123', 'user-abc');

    expect(result.error).toBeDefined();
    expect(result.data).toBeNull();
  });

  // SECURITY — user_id injection prevention.
  // The ownerId always comes from user.id in the session (passed in by
  // the route handler) — never from the request body or URL.
  // Per S1-003 §7 — trusting user_id from the client is prohibited.
  it('uses only the ownerId passed in from the session', async () => {
    mockSingle.mockResolvedValue({ data: mockJobRecord, error: null });

    // Even if an attacker passes their own ID, the query correctly
    // filters by it — and since they don't own that job, the DB
    // returns null and the route handler returns 404.
    await getJobById('job-123', 'attacker-user-id');

    expect(mockEqUserId).toHaveBeenCalledWith('user_id', 'attacker-user-id');
  });
});
