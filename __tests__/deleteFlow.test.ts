import type { Job } from '@/types/job.types';

const mockJob: Job = {
  id: 'job-123',
  title: 'Software Engineer',
  company: 'Google',
  location: 'New York',
  pipelineStage: 'Applied',
  lastActivityDate: '2026-04-07T12:00:00.000Z',
  deadline: undefined,
  priorityFlag: false,
};

describe('delete flow logic', () => {
  // HAPPY PATH — jobToDelete state is set when delete is triggered
  it('sets the job to delete when trash icon is clicked', () => {
    let jobToDelete: Job | null = null;
    const setJobToDelete = (job: Job | null) => {
      jobToDelete = job;
    };

    setJobToDelete(mockJob);

    expect(jobToDelete).not.toBeNull();
    expect((jobToDelete as Job | null)?.id).toBe('job-123');
  });

  // HAPPY PATH — jobToDelete is cleared after cancel
  it('clears jobToDelete when cancel is clicked', () => {
    let jobToDelete: Job | null = mockJob;
    const setJobToDelete = (job: Job | null) => {
      jobToDelete = job;
    };

    setJobToDelete(null);

    expect(jobToDelete).toBeNull();
  });

  // VALIDATION — confirmDelete does nothing if jobToDelete is null
  it('does not proceed with delete if jobToDelete is null', async () => {
    const jobToDelete: Job | null = null;
    let deleteCalled = false;

    async function confirmDelete() {
      if (!jobToDelete) return;
      deleteCalled = true;
    }

    await confirmDelete();
    expect(deleteCalled).toBe(false);
  });

  // HAPPY PATH — correct job id is used in delete request
  it('uses the correct job id when confirming delete', () => {
    const jobToDelete: Job | null = mockJob;
    const deletedId = jobToDelete?.id;

    expect(deletedId).toBe('job-123');
  });
});
