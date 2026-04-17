export type PipelineStage =
  | 'Interested'
  | 'Applied'
  | 'Interview'
  | 'Offer'
  | 'Rejected'
  | 'Ghosted'
  | 'Archived';

// DB shape — matches the jobs table columns exactly.
// Updated in S2-005 to include detail-only fields that exist in the
// jobs table but were not needed by the card view until now.
export interface JobRecord {
  id: string;
  user_id: string;
  job_title: string;
  company_name: string;
  location?: string;
  current_stage: PipelineStage;
  last_activity_date?: string;
  deadline?: string;
  is_priority?: boolean;
  // Detail-only fields — present in the jobs table but not shown
  // on the dashboard card. Used by the detail panel (S2-005).
  description?: string;
  compensation_notes?: string;
  application_date?: string;
  recruiter_notes?: string;
  custom_notes?: string;
  recruiter_contact_notes?: string;
  outcome_notes?: string;
  created_at?: string;
  updated_at?: string;
}

// UI shape for the job card and board list.
// Uses camelCase field names per S1-001 §3.2.
export interface Job {
  id: string;
  title: string;
  company: string;
  location: string;
  pipelineStage: PipelineStage;
  lastActivityDate: string;
  deadline?: string;
  priorityFlag?: boolean;
  recruiterContactNotes?: string;
  outcomeNotes?: string;
}

// Extended UI shape for the job detail panel — S2-005.
// Extends the base Job type with detail-only fields that are not
// shown on the card but are shown when a job row is clicked.
// Per S1-001 §3.2 — all field names use camelCase.
export interface JobDetail extends Job {
  description?: string;
  compensationNotes?: string;
  applicationDate?: string;
  recruiterNotes?: string;
  customNotes?: string;
  createdAt?: string;
  updatedAt?: string;
}

// Convert a DB record to the base Job UI shape.
// Used by the dashboard card list.
export function toUIJob(record: JobRecord): Job {
  return {
    id: record.id,
    title: record.job_title,
    company: record.company_name,
    location: record.location ?? '',
    pipelineStage: record.current_stage,
    lastActivityDate: record.last_activity_date ?? '',
    deadline: record.deadline,
    priorityFlag: record.is_priority,
    recruiterContactNotes: record.recruiter_contact_notes,
    outcomeNotes: record.outcome_notes,
  };
}

// Convert a full DB record to the JobDetail UI shape — S2-005.
// Reuses toUIJob for the base fields and maps the extra detail fields.
// snake_case DB column names mapped to camelCase UI names per S1-001 §3.2.
export function toUIJobDetail(record: JobRecord): JobDetail {
  return {
    // Base fields — reuse the existing mapping to stay DRY.
    ...toUIJob(record),
    // Detail-only fields — use ?? undefined so DB nulls become
    // undefined in the UI rather than null.
    description: record.description ?? undefined,
    compensationNotes: record.compensation_notes ?? undefined,
    applicationDate: record.application_date ?? undefined,
    recruiterNotes: record.recruiter_notes ?? undefined,
    customNotes: record.custom_notes ?? undefined,
    createdAt: record.created_at ?? undefined,
    updatedAt: record.updated_at ?? undefined,
  };
}
