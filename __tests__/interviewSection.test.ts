// Unit tests for the S2-011 interview section feature.
// Tests the getInterviewsByJob and addInterview service functions
// which are called by the GET and POST /api/jobs/[id]/interviews routes.
//
// Updated to reflect S2-011 security fixes — both functions now enforce
// ownership through the parent job join per S1-003 §4.3.
//
// Covers all 4 required categories per S1-001 §8.2.
// Per S1-004 §5.1 — Supabase is fully mocked, no real network calls.

import { getInterviewsByJob, addInterview } from '@/lib/services/jobServices';
import { createClient } from '@/lib/supabase/server';

// Mock the Supabase server client.
jest.mock('@/lib/supabase/server');

// Mock query chain for getInterviewsByJob:
// supabase.from().select().eq('job_id').eq('jobs.user_id').eq('activity_type').order()
const mockOrder = jest.fn();
const mockEqActivityType = jest.fn(() => ({ order: mockOrder }));
const mockEqUserId = jest.fn(() => ({ eq: mockEqActivityType }));
const mockEqJobId = jest.fn(() => ({ eq: mockEqUserId }));
const mockSelectGet = jest.fn(() => ({ eq: mockEqJobId }));

// Mock query chain for addInterview ownership check:
// supabase.from('jobs').select().eq('id').eq('user_id').single()
const mockSingleOwnership = jest.fn();
const mockEqUserIdOwnership = jest.fn(() => ({ single: mockSingleOwnership }));
const mockEqIdOwnership = jest.fn(() => ({ eq: mockEqUserIdOwnership }));
const mockSelectOwnership = jest.fn(() => ({ eq: mockEqIdOwnership }));

// Mock query chain for addInterview insert:
// supabase.from('job_activities').insert().select().single()
const mockSingleInsert = jest.fn();
const mockSelectInsert = jest.fn(() => ({ single: mockSingleInsert }));
const mockInsert = jest.fn(() => ({ select: mockSelectInsert }));

// mockFrom returns different chains based on table and operation context.
const mockFrom = jest.fn((table: string) => {
  if (table === 'jobs') {
    return { select: mockSelectOwnership };
  }
  // job_activities — supports both select (getInterviewsByJob) and insert (addInterview)
  return { select: mockSelectGet, insert: mockInsert };
});

const mockSupabase = { from: mockFrom };

beforeEach(() => {
  jest.clearAllMocks();
  (createClient as jest.Mock).mockResolvedValue(mockSupabase);
});

// Realistic mock interview records.
const mockInterviews = [
  {
    id: 'act-1',
    job_id: 'job-123',
    activity_type: 'INTERVIEW_SCHEDULED',
    interview_round: 'Technical',
    interview_date: '2026-04-20T14:00:00.000Z',
    location_url: 'https://zoom.us/j/123',
    notes: 'Prepare for system design',
    activity_date: '2026-04-13T10:00:00.000Z',
  },
];

// Mock job record returned by ownership check.
const mockJob = { id: 'job-123' };

describe('getInterviewsByJob', () => {
  // HAPPY PATH — returns interviews for the job.
  it('returns interviews when they exist for the job', async () => {
    mockOrder.mockResolvedValue({ data: mockInterviews, error: null });

    const result = await getInterviewsByJob('job-123', 'user-abc');

    expect(result.data).toEqual(mockInterviews);
    expect(result.error).toBeNull();
  });

  // OWNERSHIP — verify user_id filter applied through parent job join.
  // Per S1-003 §4.3 — child ownership verified through parent.
  it('enforces ownership through the parent job join', async () => {
    mockOrder.mockResolvedValue({ data: mockInterviews, error: null });

    await getInterviewsByJob('job-123', 'user-abc');

    expect(mockEqJobId).toHaveBeenCalledWith('job_id', 'job-123');
    expect(mockEqUserId).toHaveBeenCalledWith('jobs.user_id', 'user-abc');
  });

  // AUTHORIZATION — verify only INTERVIEW_SCHEDULED events are returned.
  it('filters by INTERVIEW_SCHEDULED activity type', async () => {
    mockOrder.mockResolvedValue({ data: mockInterviews, error: null });

    await getInterviewsByJob('job-123', 'user-abc');

    expect(mockEqActivityType).toHaveBeenCalledWith('activity_type', 'INTERVIEW_SCHEDULED');
  });

  // EMPTY — returns empty array when no interviews exist.
  it('returns empty array when no interviews exist', async () => {
    mockOrder.mockResolvedValue({ data: [], error: null });

    const result = await getInterviewsByJob('job-123', 'user-abc');

    expect(result.data).toEqual([]);
  });

  // ERROR / EXCEPTION — database failure handled gracefully.
  it('returns an error when the database call fails', async () => {
    mockOrder.mockResolvedValue({ data: null, error: { message: 'DB error' } });

    const result = await getInterviewsByJob('job-123', 'user-abc');

    expect(result.error).toBeDefined();
    expect(result.data).toBeNull();
  });
});

describe('addInterview', () => {
  // HAPPY PATH — new interview saved after ownership verified.
  it('saves a new interview and returns the saved record', async () => {
    // Ownership check passes — job exists and belongs to user.
    mockSingleOwnership.mockResolvedValue({ data: mockJob, error: null });
    mockSingleInsert.mockResolvedValue({ data: mockInterviews[0], error: null });

    const result = await addInterview('user-abc', 'job-123', {
      interview_round: 'Technical',
      interview_date: '2026-04-20T14:00:00.000Z',
      notes: 'Prepare for system design',
    });

    expect(result.data).toEqual(mockInterviews[0]);
    expect(result.error).toBeNull();
  });

  // OWNERSHIP DENIAL — user does not own the job.
  // Per S1-003 §4.3 — insert blocked when ownership check fails.
  it('returns null when the user does not own the job', async () => {
    // Ownership check fails — job not found for this user.
    mockSingleOwnership.mockResolvedValue({ data: null, error: { message: 'No rows' } });

    const result = await addInterview('wrong-user', 'job-123', {
      interview_round: 'Technical',
    });

    expect(result.data).toBeNull();
    // Insert should never be called if ownership check fails.
    expect(mockInsert).not.toHaveBeenCalled();
  });

  // SECURITY — activity_type always set to INTERVIEW_SCHEDULED server-side.
  // Per S1-003 §5.4 — user_id always comes from the session.
  it('always sets activity_type to INTERVIEW_SCHEDULED', async () => {
    mockSingleOwnership.mockResolvedValue({ data: mockJob, error: null });
    mockSingleInsert.mockResolvedValue({ data: mockInterviews[0], error: null });

    await addInterview('user-abc', 'job-123', { interview_round: 'HR' });

    expect(mockInsert).toHaveBeenCalledWith(
      expect.objectContaining({
        activity_type: 'INTERVIEW_SCHEDULED',
        job_id: 'job-123',
      }),
    );
  });

  // ERROR / EXCEPTION — database failure handled gracefully.
  it('returns an error when the database call fails', async () => {
    mockSingleOwnership.mockResolvedValue({ data: mockJob, error: null });
    mockSingleInsert.mockResolvedValue({ data: null, error: { message: 'DB error' } });

    const result = await addInterview('user-abc', 'job-123', {
      interview_round: 'Technical',
    });

    expect(result.error).toBeDefined();
    expect(result.data).toBeNull();
  });
});
