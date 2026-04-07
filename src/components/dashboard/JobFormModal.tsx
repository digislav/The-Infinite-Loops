'use client';

import React, { useState } from 'react';
import { Pencil } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { JobForm, type Job, type JobFormValues } from './JobForm';

export interface JobFormModalProps {
  job?: Job;
  onSubmit: (data: JobFormValues) => Promise<void> | void;
  onDelete?: () => Promise<void> | void;
}

export function JobFormModal({ job, onSubmit, onDelete }: JobFormModalProps) {
  const [open, setOpen] = useState(false);
  const isEditMode = Boolean(job);

  async function handleSubmit(data: JobFormValues): Promise<void> {
    await onSubmit(data);
    setOpen(false);
  }

  async function handleDelete(): Promise<void> {
    if (onDelete) {
      await onDelete();
      setOpen(false);
    }
  }

  function handleCancel(): void {
    setOpen(false);
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      {isEditMode ? (
        <button
          type="button"
          onClick={() => setOpen(true)}
          aria-label="Edit job"
          className="inline-flex h-8 w-8 items-center justify-center rounded-md text-gray-400 transition-colors hover:bg-blue-50 hover:text-blue-600 focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:outline-none"
        >
          <Pencil className="h-4 w-4" />
        </button>
      ) : (
        <button
          type="button"
          onClick={() => setOpen(true)}
          className="inline-flex items-center justify-center rounded-md bg-[#2E75B6] px-4 py-2 text-sm font-medium text-white hover:bg-[#1F4E79] focus-visible:ring-2 focus-visible:ring-[#2E75B6] focus-visible:outline-none disabled:opacity-50"
        >
          Add Job
        </button>
      )}
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{isEditMode ? 'Edit Job' : 'Add Job'}</DialogTitle>
        </DialogHeader>
        <JobForm
          job={job}
          onSubmit={handleSubmit}
          onCancel={handleCancel}
          onDelete={isEditMode ? handleDelete : undefined}
        />
      </DialogContent>
    </Dialog>
  );
}
