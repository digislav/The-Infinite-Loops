import { formatDateOnly, formatTimestamp } from '@/lib/utils/dateFormatters';
import { toUIJob } from '@/types/job.types';
import type { JobRecord } from '@/types/job.types';
import { jobFormSchema } from '@/components/dashboard/JobForm';

// ---------------------------------------------------------------------------
// formatDateOnly
// ---------------------------------------------------------------------------

describe('formatDateOnly', () => {
  it('formats a plain YYYY-MM-DD string correctly in UTC', () => {
    expect(formatDateOnly('2026-04-07')).toBe('4/7/26');
  });

  it('does NOT shift back a day due to timezone offset (core regression test)', () => {
    // Stored as midnight UTC — should still display as April 7, not April 6
    expect(formatDateOnly('2026-04-07T00:00:00.000Z')).toBe('4/7/26');
  });
  //non happy test
  it('returns empty string for undefined', () => {
    expect(formatDateOnly(undefined)).toBe('');
  });

  it('returns empty string for empty string', () => {
    expect(formatDateOnly('')).toBe('');
  });

  it('formats single-digit month and day without zero padding', () => {
    expect(formatDateOnly('2026-01-05')).toBe('1/5/26');
  });
});

// ---------------------------------------------------------------------------
// formatTimestamp
// ---------------------------------------------------------------------------

describe('formatTimestamp', () => {
  it('returns empty string for undefined', () => {
    expect(formatTimestamp(undefined)).toBe('');
  });

  it('returns empty string for empty string', () => {
    expect(formatTimestamp('')).toBe('');
  });

  it('formats a UTC timestamp to a valid m/d/yy string', () => {
    // 2026-04-07T12:00:00Z is noon UTC = 8am EST — still April 7 in EST
    const result = formatTimestamp('2026-04-07T12:00:00.000Z');
    expect(result).toBe('4/7/26, 8:00 AM');
  });
});

// ---------------------------------------------------------------------------
// toUIJob
// ---------------------------------------------------------------------------

describe('toUIJob', () => {
  const baseRecord: JobRecord = {
    id: 'abc-123',
    user_id: 'user-456',
    job_title: 'Software Engineer',
    company_name: 'Google',
    location: 'New York, NY',
    current_stage: 'Applied',
    last_activity_date: '2026-04-06T14:00:00.000Z',
    deadline: '2026-04-30T00:00:00.000Z',
    is_priority: true,
    created_at: '2026-04-01T00:00:00.000Z',
    updated_at: '2026-04-06T00:00:00.000Z',
  };

  it('maps id correctly', () => {
    expect(toUIJob(baseRecord).id).toBe('abc-123');
  });
  //happy test
  it('maps job_title to title', () => {
    expect(toUIJob(baseRecord).title).toBe('Software Engineer');
  });

  it('maps company_name to company', () => {
    expect(toUIJob(baseRecord).company).toBe('Google');
  });

  it('maps location correctly', () => {
    expect(toUIJob(baseRecord).location).toBe('New York, NY');
  });

  it('maps current_stage to pipelineStage', () => {
    expect(toUIJob(baseRecord).pipelineStage).toBe('Applied');
  });

  it('maps is_priority to priorityFlag', () => {
    expect(toUIJob(baseRecord).priorityFlag).toBe(true);
  });

  it('maps deadline correctly', () => {
    expect(toUIJob(baseRecord).deadline).toBe('2026-04-30T00:00:00.000Z');
  });

  it('falls back to empty string for missing location', () => {
    const record = { ...baseRecord, location: undefined };
    expect(toUIJob(record).location).toBe('');
  });

  it('falls back to empty string for missing lastActivityDate', () => {
    const record = { ...baseRecord, last_activity_date: undefined };
    expect(toUIJob(record).lastActivityDate).toBe('');
  });

  it('is undefined for a missing priorityFlag', () => {
    const record = { ...baseRecord, is_priority: undefined };
    expect(toUIJob(record).priorityFlag).toBeUndefined();
  });
});

// ---------------------------------------------------------------------------
// jobFormSchema (Zod validation)
// ---------------------------------------------------------------------------

describe('jobFormSchema', () => {
  const validData = {
    title: 'Frontend Developer',
    company: 'Meta',
    location: 'Remote',
    pipelineStage: 'Interested' as const,
    deadline: '2026-05-01',
    priorityFlag: false,
  };

  it('accepts a fully valid form submission', () => {
    const result = jobFormSchema.safeParse(validData);
    expect(result.success).toBe(true);
  });

  it('accepts a submission with only required fields', () => {
    const result = jobFormSchema.safeParse({
      title: 'Backend Engineer',
      company: 'Amazon',
      pipelineStage: 'Applied',
      priorityFlag: false,
    });
    expect(result.success).toBe(true);
  });

  it('rejects an empty title', () => {
    const result = jobFormSchema.safeParse({ ...validData, title: '' });
    expect(result.success).toBe(false);
    if (!result.success) {
      const fields = result.error.flatten().fieldErrors;
      expect(fields.title).toBeDefined();
    }
  });

  it('rejects an empty company', () => {
    const result = jobFormSchema.safeParse({ ...validData, company: '' });
    expect(result.success).toBe(false);
    if (!result.success) {
      const fields = result.error.flatten().fieldErrors;
      expect(fields.company).toBeDefined();
    }
  });

  it('rejects an invalid pipeline stage', () => {
    const result = jobFormSchema.safeParse({ ...validData, pipelineStage: 'NotAStage' });
    expect(result.success).toBe(false);
  });

  it('accepts all valid pipeline stages', () => {
    const stages = ['Interested', 'Applied', 'Interview', 'Offer', 'Rejected', 'Archived'] as const;
    stages.forEach((stage) => {
      const result = jobFormSchema.safeParse({ ...validData, pipelineStage: stage });
      expect(result.success).toBe(true);
    });
  });

  it('uses false for priorityFlag when explicitly set to false', () => {
    const result = jobFormSchema.safeParse({ ...validData, priorityFlag: false });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.priorityFlag).toBe(false);
    }
  });
});
