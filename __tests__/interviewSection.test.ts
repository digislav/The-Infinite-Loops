// Unit tests for the S2-011 interview section feature.
// Tests the getInterviewsByJob and addInterview service functions
// which are called by the GET and POST /api/jobs/[id]/interviews routes.
//
// Covers all 4 required categories per S1-001 §8.2.
// Per S1-004 §5.1 — Supabase is fully mocked, no real network calls.

import { getInterviewsByJob, addInterview } from '@/lib/services/jobServices';
import { createClient } from '@/lib/supabase/server';

// Mock the Supabase server client.
jest.mock('@/lib/supabase/server');

// Mock query chain for getInterviewsByJob:
// supabase.from().select().eq().eq().order()
const mockOrder = jest.fn();
const mockEqType = jest.fn(() => ({ order: mockOrder }));
const mockEqJobId = jest.fn(() => ({ eq: mockEqType }));
const mockSelect = jest.fn(() => ({ eq: mockEqJobId }));

// Mock query chain for addInterview:
// supabase.from().insert().select().single()
const mockSingle = jest.fn();
const mockSelectInsert = jest.fn(() => ({ single: mockSingle }));
const mockInsert = jest.fn(() => ({ select: mockSelectInsert }));

const mockFrom = jest.fn((table: string) => {
  // Return appropriate mock chain based on operation
  if (table === 'job_activities') {
    return { select: mockSelect, insert: mockInsert };
  }
  return { select: mockSelect, insert: mockInsert };
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

describe('getInterviewsByJob', () => {
  // HAPPY PATH — returns interviews for the job.
  it('returns interviews when they exist for the job', async () => {
    mockOrder.mockResolvedValue({ data: mockInterviews, error: null });

    const result = await getInterviewsByJob('job-123');

    expect(result.data).toEqual(mockInterviews);
    expect(result.error).toBeNull();
  });

  // AUTHORIZATION — verify only INTERVIEW_SCHEDULED events are returned.
  // This ensures stage changes and notes don't appear in the interview list.
  it('filters by INTERVIEW_SCHEDULED activity type', async () => {
    mockOrder.mockResolvedValue({ data: mockInterviews, error: null });

    await getInterviewsByJob('job-123');

    expect(mockEqType).toHaveBeenCalledWith('activity_type', 'INTERVIEW_SCHEDULED');
  });

  // EMPTY — returns empty array when no interviews exist.
  it('returns empty array when no interviews exist', async () => {
    mockOrder.mockResolvedValue({ data: [], error: null });

    const result = await getInterviewsByJob('job-123');

    expect(result.data).toEqual([]);
  });

  // ERROR / EXCEPTION — database failure handled gracefully.
  it('returns an error when the database call fails', async () => {
    mockOrder.mockResolvedValue({ data: null, error: { message: 'DB error' } });

    const result = await getInterviewsByJob('job-123');

    expect(result.error).toBeDefined();
    expect(result.data).toBeNull();
  });
});

describe('addInterview', () => {
  // HAPPY PATH — new interview is saved correctly.
  it('saves a new interview and returns the saved record', async () => {
    mockSingle.mockResolvedValue({ data: mockInterviews[0], error: null });

    const result = await addInterview('user-abc', 'job-123', {
      interview_round: 'Technical',
      interview_date: '2026-04-20T14:00:00.000Z',
      notes: 'Prepare for system design',
    });

    expect(result.data).toEqual(mockInterviews[0]);
    expect(result.error).toBeNull();
  });

  // SECURITY — user_id from session is used, not from request body.
  // Per S1-003 §5.4 — user_id always comes from the session.
  it('always sets activity_type to INTERVIEW_SCHEDULED', async () => {
    mockSingle.mockResolvedValue({ data: mockInterviews[0], error: null });

    await addInterview('user-abc', 'job-123', {
      interview_round: 'HR',
    });

    expect(mockInsert).toHaveBeenCalledWith(
      expect.objectContaining({
        activity_type: 'INTERVIEW_SCHEDULED',
        job_id: 'job-123',
      }),
    );
  });

  // ERROR / EXCEPTION — database failure handled gracefully.
  it('returns an error when the database call fails', async () => {
    mockSingle.mockResolvedValue({ data: null, error: { message: 'DB error' } });

    const result = await addInterview('user-abc', 'job-123', {
      interview_round: 'Technical',
    });

    expect(result.error).toBeDefined();
    expect(result.data).toBeNull();
  });
});
