import { createDocumentWithVersion, toggleDocumentArchive } from '@/lib/services/documentServices';
import { createClient } from '@/lib/supabase/server';

// Mock the Supabase client factory
jest.mock('@/lib/supabase/server', () => ({
  createClient: jest.fn(),
}));

describe('Document Services - S3-021 Unit Tests', () => {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let mockSupabase: any;

  beforeEach(() => {
    jest.clearAllMocks();

    mockSupabase = {
      from: jest.fn().mockReturnThis(),
      insert: jest.fn().mockReturnThis(),
      update: jest.fn().mockReturnThis(),
      eq: jest.fn().mockReturnThis(),
      select: jest.fn().mockReturnThis(),
      single: jest.fn(),
    };

    (createClient as jest.Mock).mockResolvedValue(mockSupabase);
  });

  it('should create document and version 1 simultaneously', async () => {
    // We need to make sure the mock returns exactly what the service expects
    mockSupabase.single
      .mockResolvedValueOnce({ data: { id: 'doc-123', name: 'Test Resume' }, error: null }) // Doc call
      .mockResolvedValueOnce({
        data: { id: 'ver-1', version_number: 1, content: 'Initial Content' },
        error: null,
      }); // Version call

    const result = await createDocumentWithVersion('user-1', {
      name: 'Test Resume',
      type: 'resume',
      content: 'Initial Content',
    });

    // Verify the calls
    expect(mockSupabase.from).toHaveBeenCalledWith('documents');
    expect(mockSupabase.from).toHaveBeenCalledWith('document_versions');

    // Verify the combined result
    expect(result.id).toBe('doc-123');
    expect(result.latest_version.version_number).toBe(1);
  });

  it('should throw an error if the version creation fails', async () => {
    // 1. First call (Document) succeeds
    // 2. Second call (Version) fails
    mockSupabase.single
      .mockResolvedValueOnce({ data: { id: 'doc-123' }, error: null })
      .mockResolvedValueOnce({ data: null, error: new Error('DB Error') }); // Use an Error object

    // Wrap in a try/catch or use rejects.toThrow
    await expect(
      createDocumentWithVersion('user-1', {
        name: 'Fail Test',
        type: 'resume',
        content: 'test',
      }),
    ).rejects.toThrow();
  });

  it('should successfully create a document even without a job_id', async () => {
    mockSupabase.single
      .mockResolvedValueOnce({ data: { id: 'doc-123' }, error: null })
      .mockResolvedValueOnce({ data: { version_number: 1 }, error: null });

    const result = await createDocumentWithVersion('user-1', {
      name: 'General Resume',
      type: 'resume',
      content: 'No job linked',
    });

    expect(result).toBeDefined();
    expect(mockSupabase.insert).toHaveBeenCalled();
  });

  it('should enforce ownership when archiving', async () => {
    // Simulate no data found (meaning user doesn't own it or it doesn't exist)
    mockSupabase.single.mockResolvedValue({ data: null, error: { message: 'Not found' } });

    const { error } = await toggleDocumentArchive('doc-123', 'wrong-user', true);

    expect(mockSupabase.eq).toHaveBeenCalledWith('user_id', 'wrong-user');
    expect(error).toBeDefined();
  });
});
