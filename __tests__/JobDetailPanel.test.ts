import type { JobDetail } from '@/types/job.types';

// Helper that mimics the field sync logic in JobDetailPanel
function syncFormFields(job: JobDetail) {
  return {
    title: job.title,
    company: job.company,
    location: job.location,
    pipelineStage: job.pipelineStage,
    priorityFlag: job.priorityFlag ?? false,
    deadlineStr: job.deadline ? job.deadline.split('T')[0] : '',
    description: job.description ?? '',
    compensationNotes: job.compensationNotes ?? '',
    recruiterNotes: job.recruiterNotes ?? '',
    customNotes: job.customNotes ?? '',
  };
}

const mockJob: JobDetail = {
  id: 'job-123',
  title: 'Software Engineer',
  company: 'Google',
  location: 'New York',
  pipelineStage: 'Applied',
  lastActivityDate: '2026-04-07T12:00:00.000Z',
  deadline: '2026-05-01T00:00:00.000Z',
  priorityFlag: true,
  description: 'A great job',
  compensationNotes: '$120k',
  recruiterNotes: 'Called on Monday',
  customNotes: 'Follow up next week',
};

describe('JobDetailPanel form sync logic', () => {
  // HAPPY PATH — all fields sync correctly from job data
  it('syncs all fields from the job record correctly', () => {
    const fields = syncFormFields(mockJob);
    expect(fields.title).toBe('Software Engineer');
    expect(fields.company).toBe('Google');
    expect(fields.description).toBe('A great job');
    expect(fields.compensationNotes).toBe('$120k');
    expect(fields.recruiterNotes).toBe('Called on Monday');
    expect(fields.customNotes).toBe('Follow up next week');
  });

  // HAPPY PATH — deadline is split to date-only string
  it('formats deadline correctly for the date input', () => {
    const fields = syncFormFields(mockJob);
    expect(fields.deadlineStr).toBe('2026-05-01');
  });

  // VALIDATION — missing optional fields fall back to empty string
  it('falls back to empty string for missing optional fields', () => {
    const minimalJob: JobDetail = {
      id: 'job-456',
      title: 'Designer',
      company: 'Meta',
      location: '',
      pipelineStage: 'Interested',
      lastActivityDate: '',
    };
    const fields = syncFormFields(minimalJob);
    expect(fields.description).toBe('');
    expect(fields.compensationNotes).toBe('');
    expect(fields.recruiterNotes).toBe('');
    expect(fields.customNotes).toBe('');
    expect(fields.deadlineStr).toBe('');
  });

  // VALIDATION — priorityFlag defaults to false when undefined
  it('defaults priorityFlag to false when not set', () => {
    const job: JobDetail = { ...mockJob, priorityFlag: undefined };
    const fields = syncFormFields(job);
    expect(fields.priorityFlag).toBe(false);
  });
});
