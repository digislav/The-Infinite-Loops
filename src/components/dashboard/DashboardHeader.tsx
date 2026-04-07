'use client';

import { Input } from '@/components/ui/input';
import { JobFormModal } from './JobFormModal';
import { type JobFormValues } from './JobForm';

export function DashboardHeader() {
  async function handleAddJob(data: JobFormValues): Promise<void> {
    const payload = {
      job_title: data.title,
      company_name: data.company,
      location: data.location || undefined,
      current_stage: data.pipelineStage,
      deadline: data.deadline || undefined,
      is_priority: data.priorityFlag,
    };

    const res = await fetch('/api/jobs', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });

    if (!res.ok) throw new Error('Failed to create job');
    window.location.reload();
  }

  return (
    <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
      <h1 className="text-3xl font-bold text-gray-900">Dashboard</h1>
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <Input
          placeholder="Search jobs, companies…"
          className="w-full sm:w-72"
          aria-label="Search jobs and companies"
        />
        <JobFormModal onSubmit={handleAddJob} />
      </div>
    </div>
  );
}
