import { updateJob, updateJobStage } from '@/lib/services/jobServices';
import { Job } from '@/lib/services/jobServices';
import { createClient } from '@/lib/supabase/server';

jest.mock('@/lib/supabase/server', () => ({
  createClient: jest.fn(),
}));

describe('Job Security & Ownership - S3-020 Unit Tests', () => {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let mockSupabase: any;

  beforeEach(() => {
    jest.clearAllMocks();

    mockSupabase = {
      from: jest.fn().mockReturnThis(),
      update: jest.fn().mockReturnThis(),
      eq: jest.fn().mockReturnThis(),
      select: jest.fn().mockReturnThis(),
      single: jest.fn(),
    };

    (createClient as jest.Mock).mockResolvedValue(mockSupabase);
  });

  // Test 1: General Update Security
  it('should enforce ownership when archiving via the updateJob function', async () => {
    mockSupabase.single.mockResolvedValue({ data: null, error: { message: 'Unauthorized' } });

    // No more 'as any' needed!
    await updateJob('job-1', 'attacker-id', { is_archived: true });

    expect(mockSupabase.eq).toHaveBeenCalledWith('user_id', 'attacker-id');
  });

  // Test 2: Stage Transition Security (Logic + Ownership)
  it('should block stage updates if the user does not own the job', async () => {
    // Stage update first does a SELECT to check current_stage
    // We simulate that select failing/returning nothing for an attacker
    mockSupabase.single.mockResolvedValue({ data: null, error: { message: 'Not found' } });

    await expect(updateJobStage('job-1', 'attacker-id', 'Applied')).rejects.toThrow(
      'Job not found',
    );

    // Verify the security check happened during the initial fetch
    expect(mockSupabase.eq).toHaveBeenCalledWith('user_id', 'attacker-id');
  });

  // Test 3: Archiving (Using your is_archived column via updateJob)
  it('should enforce ownership when archiving via the updateJob function', async () => {
    mockSupabase.single.mockResolvedValue({ data: null, error: { message: 'Unauthorized' } });

    // Define the update using the Job type instead of 'as any'
    const archiveUpdate: Partial<Job> = { is_archived: true };

    await updateJob('job-1', 'attacker-id', archiveUpdate);

    expect(mockSupabase.eq).toHaveBeenCalledWith('user_id', 'attacker-id');
  });
});
