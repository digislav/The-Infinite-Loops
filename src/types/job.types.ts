export type PipelineStage =
  | 'Interested'
  | 'Applied'
  | 'Interview'
  | 'Offer'
  | 'Rejected'
  | 'Archived';

// DB shape — matches the jobs table columns
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
  created_at?: string;
  updated_at?: string;
}

// UI shape — used by JobCard and BoardContent
export interface Job {
  id: string;
  title: string;
  company: string;
  location: string;
  pipelineStage: PipelineStage;
  lastActivityDate: string;
  deadline?: string;
  priorityFlag?: boolean;
}

// Convert DB record to UI shape
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
  };
}
