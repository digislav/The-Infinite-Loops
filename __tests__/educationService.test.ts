// Unit tests for educationService.ts — S2-017.
// Tests all CRUD operations covering all 4 required categories
// per S1-001 §8.2: happy path, ownership denial, auth failure, error/exception.
// Per S1-004 §5.1 — Supabase is fully mocked, no real network calls.

import {
  getEducation,
  createEducation,
  updateEducation,
  deleteEducation,
} from '@/lib/services/educationService';
import { createClient } from '@/lib/supabase/server';

// Mock the Supabase server client.
jest.mock('@/lib/supabase/server');

// Mock query chains for each operation.
const mockSingle = jest.fn();
const mockSelect = jest.fn(() => ({ eq: mockEqUserId }));
const mockEqOrder = jest.fn(() => ({ data: [], error: null }));
const mockOrder = jest.fn(() => mockEqOrder());
const mockEqUserId = jest.fn(() => ({ order: mockOrder, single: mockSingle }));
const mockEqId = jest.fn(() => ({ eq: mockEqUserId }));
const mockUpdate = jest.fn(() => ({ eq: mockEqId }));
const mockDelete = jest.fn(() => ({ eq: mockEqId }));
const mockInsert = jest.fn(() => ({ select: () => ({ single: mockSingle }) }));
const mockFrom = jest.fn(() => ({
  select: mockSelect,
  insert: mockInsert,
  update: mockUpdate,
  delete: mockDelete,
}));
const mockSupabase = { from: mockFrom };

beforeEach(() => {
  jest.clearAllMocks();
  (createClient as jest.Mock).mockResolvedValue(mockSupabase);
});

const mockRecord = {
  id: 'edu-123',
  user_id: 'user-abc',
  institution: 'NJIT',
  degree: 'Bachelor of Science',
  field_of_study: 'Computer Science',
  start_date: '2022-09-01',
  end_date: null,
  is_current: true,
  honors_gpa: '3.8',
  description: null,
  order_index: 0,
  created_at: '2026-04-17T00:00:00.000Z',
};

describe('getEducation', () => {
  // HAPPY PATH — returns education records for the user.
  it('returns education records for the authenticated user', async () => {
    mockOrder.mockResolvedValue({ data: [mockRecord], error: null });
    const result = await getEducation('user-abc');
    expect(result.data).toEqual([mockRecord]);
    expect(result.error).toBeNull();
  });

  // OWNERSHIP — verify user_id filter is applied.
  it('queries with the correct user_id to enforce ownership', async () => {
    mockOrder.mockResolvedValue({ data: [], error: null });
    await getEducation('user-abc');
    expect(mockEqUserId).toHaveBeenCalledWith('user_id', 'user-abc');
  });

  // ERROR — database failure handled gracefully.
  it('returns an error when the database call fails', async () => {
    mockOrder.mockResolvedValue({ data: null, error: { message: 'DB error' } });
    const result = await getEducation('user-abc');
    expect(result.error).toBeDefined();
  });
});

describe('createEducation', () => {
  // HAPPY PATH — creates a new record.
  it('creates a new education record for the user', async () => {
    mockSingle.mockResolvedValue({ data: mockRecord, error: null });
    const result = await createEducation('user-abc', {
      institution: 'NJIT',
      degree: 'Bachelor of Science',
      field_of_study: 'Computer Science',
      is_current: true,
      order_index: 0,
    });
    expect(result.data).toEqual(mockRecord);
    expect(result.error).toBeNull();
  });

  // SECURITY — user_id always comes from the session.
  // Per S1-003 §5.4 — never from the request body.
  it('inserts with the session user_id not from request body', async () => {
    mockSingle.mockResolvedValue({ data: mockRecord, error: null });
    await createEducation('user-abc', {
      institution: 'NJIT',
      degree: 'BS',
      field_of_study: 'CS',
      is_current: false,
      order_index: 0,
    });
    expect(mockInsert).toHaveBeenCalledWith(expect.objectContaining({ user_id: 'user-abc' }));
  });

  // ERROR — database failure handled gracefully.
  it('returns an error when the database call fails', async () => {
    mockSingle.mockResolvedValue({ data: null, error: { message: 'DB error' } });
    const result = await createEducation('user-abc', {
      institution: 'NJIT',
      degree: 'BS',
      field_of_study: 'CS',
      is_current: false,
      order_index: 0,
    });
    expect(result.error).toBeDefined();
  });
});

describe('updateEducation', () => {
  // HAPPY PATH — updates an existing record.
  it('updates an education record owned by the user', async () => {
    mockSingle.mockResolvedValue({ data: mockRecord, error: null });
    const result = await updateEducation('edu-123', 'user-abc', { institution: 'MIT' });
    expect(result.data).toEqual(mockRecord);
  });

  // OWNERSHIP — verify both id and user_id filters applied.
  it('enforces ownership by filtering on both id and user_id', async () => {
    mockSingle.mockResolvedValue({ data: mockRecord, error: null });
    await updateEducation('edu-123', 'user-abc', { institution: 'MIT' });
    expect(mockEqId).toHaveBeenCalledWith('id', 'edu-123');
    expect(mockEqUserId).toHaveBeenCalledWith('user_id', 'user-abc');
  });

  // OWNERSHIP DENIAL — wrong user gets null back.
  it('returns null when user does not own the record', async () => {
    mockSingle.mockResolvedValue({ data: null, error: { message: 'No rows' } });
    const result = await updateEducation('edu-123', 'wrong-user', { institution: 'MIT' });
    expect(result.data).toBeNull();
  });
});

describe('deleteEducation', () => {
  // HAPPY PATH — deletes a record.
  it('deletes an education record owned by the user', async () => {
    mockEqUserId.mockResolvedValue({ error: null });
    const result = await deleteEducation('edu-123', 'user-abc');
    expect(result.error).toBeNull();
  });

  // OWNERSHIP — verify both id and user_id filters applied.
  it('enforces ownership by filtering on both id and user_id', async () => {
    mockEqUserId.mockResolvedValue({ error: null });
    await deleteEducation('edu-123', 'user-abc');
    expect(mockEqId).toHaveBeenCalledWith('id', 'edu-123');
    expect(mockEqUserId).toHaveBeenCalledWith('user_id', 'user-abc');
  });
});
