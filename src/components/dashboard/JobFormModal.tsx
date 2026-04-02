'use client';

import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { JobForm, type Job, type JobFormValues } from './JobForm';

export interface JobFormModalProps {
  job?: Job;
  onSubmit: (data: JobFormValues) => Promise<void> | void;
}

export function JobFormModal({ job, onSubmit }: JobFormModalProps): JSX.Element {
  const [open, setOpen] = useState(false);
  const isEditMode = Boolean(job);

  async function handleSubmit(data: JobFormValues): Promise<void> {
    await onSubmit(data);
    setOpen(false);
  }

  function handleCancel(): void {
    setOpen(false);
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="inline-flex items-center justify-center rounded-md bg-[#2E75B6] px-4 py-2 text-sm font-medium text-white hover:bg-[#1F4E79] focus-visible:ring-2 focus-visible:ring-[#2E75B6] focus-visible:outline-none disabled:opacity-50"
      >
        {isEditMode ? 'Edit Job' : 'Add Job'}
      </button>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{isEditMode ? 'Edit Job' : 'Add Job'}</DialogTitle>
        </DialogHeader>
        <JobForm job={job} onSubmit={handleSubmit} onCancel={handleCancel} />
      </DialogContent>
    </Dialog>
  );
}
