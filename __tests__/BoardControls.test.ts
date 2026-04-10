import type { JobFilters } from '@/components/dashboard/BoardControls';

const defaultFilters: JobFilters = {
  stage: 'all',
  location: 'all',
  deadline: 'all',
  priority: 'all',
};

function applyFilters(
  jobs: { pipelineStage: string; location: string; deadline?: string; priorityFlag?: boolean }[],
  filters: JobFilters,
) {
  return jobs.filter((job) => {
    if (filters.stage !== 'all' && job.pipelineStage !== filters.stage) return false;
    if (filters.location !== 'all' && job.location !== filters.location) return false;
    if (filters.priority === 'priority' && !job.priorityFlag) return false;
    return true;
  });
}

const mockJobs = [
  { pipelineStage: 'Applied', location: 'New York', deadline: undefined, priorityFlag: true },
  { pipelineStage: 'Offer', location: 'Remote', deadline: undefined, priorityFlag: false },
  { pipelineStage: 'Applied', location: 'Remote', deadline: undefined, priorityFlag: false },
];

describe('job filter logic', () => {
  it('returns all jobs when all filters are set to all', () => {
    const result = applyFilters(mockJobs, defaultFilters);
    expect(result).toHaveLength(3);
  });

  it('returns only jobs matching the selected stage', () => {
    const result = applyFilters(mockJobs, { ...defaultFilters, stage: 'Applied' });
    expect(result).toHaveLength(2);
    result.forEach((job) => expect(job.pipelineStage).toBe('Applied'));
  });

  it('returns only jobs matching the selected location', () => {
    const result = applyFilters(mockJobs, { ...defaultFilters, location: 'Remote' });
    expect(result).toHaveLength(2);
    result.forEach((job) => expect(job.location).toBe('Remote'));
  });

  it('returns only priority jobs when priority filter is active', () => {
    const result = applyFilters(mockJobs, { ...defaultFilters, priority: 'priority' });
    expect(result).toHaveLength(1);
    expect(result[0].priorityFlag).toBe(true);
  });

  it('returns only jobs matching both stage and location filters', () => {
    const result = applyFilters(mockJobs, {
      ...defaultFilters,
      stage: 'Applied',
      location: 'Remote',
    });
    expect(result).toHaveLength(1);
    expect(result[0].pipelineStage).toBe('Applied');
    expect(result[0].location).toBe('Remote');
  });

  it('returns empty array when no jobs match the filters', () => {
    const result = applyFilters(mockJobs, { ...defaultFilters, stage: 'Rejected' });
    expect(result).toHaveLength(0);
  });
});
