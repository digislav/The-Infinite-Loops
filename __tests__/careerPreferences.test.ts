import {
  getCareerPreferences,
  updateCareerPreferences,
} from '@/lib/services/careerPreferencesServices';
import { createClient } from '@/lib/supabase/server';

jest.mock('@/lib/supabase/server');

// Mocking the Upsert chain: supabase.from().upsert().select().single()
const mockSingle = jest.fn();
const mockSelect = jest.fn(() => ({ single: mockSingle }));
const mockUpsert = jest.fn(() => ({ select: mockSelect }));
const mockMaybeSingle = jest.fn();
const mockEq = jest.fn(() => ({ maybeSingle: mockMaybeSingle }));

const mockFrom = jest.fn(() => ({
  upsert: mockUpsert,
  select: () => ({ eq: mockEq }), // For the GET call
}));

const mockSupabase = { from: mockFrom };

beforeEach(() => {
  jest.clearAllMocks();
  (createClient as jest.Mock).mockResolvedValue(mockSupabase);
});

describe('careerPreferencesServices', () => {
  it('fetches preferences for the user', async () => {
    mockMaybeSingle.mockResolvedValue({ data: { min_salary: 100000 }, error: null });
    const result = await getCareerPreferences('user-123');
    expect(result.data.min_salary).toBe(100000);
  });

  it('upserts preferences with the correct user_id', async () => {
    mockSingle.mockResolvedValue({ data: {}, error: null });
    await updateCareerPreferences('user-123', { min_salary: 120000 });

    expect(mockUpsert).toHaveBeenCalledWith(
      expect.objectContaining({ user_id: 'user-123', min_salary: 120000 }),
    );
  });
});
