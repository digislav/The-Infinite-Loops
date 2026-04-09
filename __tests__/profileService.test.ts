// Unit tests for profileService.ts
// Covers all 4 required categories per S1-001 §8.2:
// happy path, ownership denial, error/exception, authorization.
// Per S1-004 §5.1 — Supabase is fully mocked, no real network calls.

import { getProfile } from '@/lib/services/profileService';
import { createClient } from '@/lib/supabase/server';

// Mock the Supabase server client so no real DB calls are made.
jest.mock('@/lib/supabase/server');

// Build a mock Supabase query chain that mirrors the real one:
// supabase.from('profiles').select(...).eq(...).single()
const mockSingle = jest.fn();
const mockEq = jest.fn(() => ({ single: mockSingle }));
const mockSelect = jest.fn(() => ({ eq: mockEq }));
const mockFrom = jest.fn(() => ({ select: mockSelect }));
const mockSupabase = { from: mockFrom };

beforeEach(() => {
  // Reset all mocks before each test so state doesn't bleed between tests.
  jest.clearAllMocks();
  (createClient as jest.Mock).mockResolvedValue(mockSupabase);
});

describe('getProfile', () => {
  // HAPPY PATH — correct input returns expected output.
  // Verifies the normal case where a user fetches their own profile.
  it('returns profile data when the user owns the profile', async () => {
    const mockProfile = {
      first_name: 'John',
      last_name: 'Doe',
      email: 'john@example.com',
      phone: '555-1234',
      location: 'New York, NY',
      linkedin_url: '',
      github_url: '',
      portfolio_url: '',
      headline: 'Software Engineer',
      summary: 'Experienced developer',
    };
    // Simulate the DB returning a matching profile row.
    mockSingle.mockResolvedValue({ data: mockProfile, error: null });

    const result = await getProfile('user-123');

    expect(result.data).toEqual(mockProfile);
    expect(result.error).toBeNull();
  });

  // OWNERSHIP DENIAL — user B cannot get user A's profile.
  // The query includes .eq('user_id', userId) so if the userId
  // doesn't match, the DB returns nothing per S1-003 §5.2.
  it('returns null data when the user does not own the profile', async () => {
    // Simulate the DB returning no row because user_id didn't match.
    mockSingle.mockResolvedValue({ data: null, error: { message: 'No rows found' } });

    const result = await getProfile('wrong-user-id');

    expect(result.data).toBeNull();
  });

  // AUTHORIZATION — verify the ownership filter is applied to the query.
  // If someone removes .eq('user_id', userId) from the service, this test fails.
  // This is the core security check per S1-003 §5.2.
  it('queries with the correct user_id to enforce ownership', async () => {
    mockSingle.mockResolvedValue({ data: null, error: null });

    await getProfile('user-abc');

    // Confirm the ownership filter was passed to the Supabase query.
    expect(mockEq).toHaveBeenCalledWith('user_id', 'user-abc');
  });

  // ERROR / EXCEPTION — database failure is handled gracefully.
  // The route handler that calls this service will catch the error
  // and return 500 with INTERNAL_ERROR — never exposing DB details.
  it('returns an error when the database call fails', async () => {
    // Simulate a DB connection failure.
    mockSingle.mockResolvedValue({ data: null, error: { message: 'DB connection failed' } });

    const result = await getProfile('user-123');

    expect(result.error).toBeDefined();
    expect(result.data).toBeNull();
  });

  // SECURITY — verify select('*') is never used.
  // Only specific columns should be fetched so sensitive fields
  // added to the table in the future are never accidentally exposed.
  // This was the exact vulnerability the professor flagged.
  it('selects only the expected profile columns and never all columns', async () => {
    mockSingle.mockResolvedValue({ data: null, error: null });

    await getProfile('user-123');

    // If someone changes this to select('*') this test will catch it.
    expect(mockSelect).toHaveBeenCalledWith(
      'first_name, last_name, email, phone, location, linkedin_url, github_url, portfolio_url, headline, summary',
    );
  });
});
