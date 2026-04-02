export type PipelineStage =
  | 'Interested'
  | 'Applied'
  | 'Interview'
  | 'Offer'
  | 'Rejected'
  | 'Archived';

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
