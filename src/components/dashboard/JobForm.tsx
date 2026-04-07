'use client';

import { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Loader2, Trash2 } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

// ---------------------------------------------------------------------------
// Types & schema
// ---------------------------------------------------------------------------

export type PipelineStage =
  | 'Interested'
  | 'Applied'
  | 'Interview'
  | 'Offer'
  | 'Rejected'
  | 'Archived';

const PIPELINE_STAGES: PipelineStage[] = [
  'Interested',
  'Applied',
  'Interview',
  'Offer',
  'Rejected',
  'Archived',
];

export const jobFormSchema = z.object({
  title: z.string().min(1, 'Job title is required'),
  company: z.string().min(1, 'Company is required'),
  location: z.string().optional(),
  pipelineStage: z.enum([
    'Interested',
    'Applied',
    'Interview',
    'Offer',
    'Rejected',
    'Archived',
  ] as const),
  deadline: z.string().optional(),
  priorityFlag: z.boolean(),
});

export type JobFormValues = z.infer<typeof jobFormSchema>;

export interface Job {
  id: string;
  title: string;
  company: string;
  location?: string;
  pipelineStage: PipelineStage;
  deadline?: string;
  priorityFlag?: boolean;
}

export interface JobFormProps {
  /** When provided, the form operates in edit mode pre-populated with this job. */
  job?: Job;
  /** Called with validated form data when the user submits successfully. */
  onSubmit: (data: JobFormValues) => Promise<void> | void;
  /** Called when the user cancels the form. */
  onCancel: () => void;
  /** Called when the user wants to delete the job (edit mode only). */
  onDelete?: () => Promise<void> | void;
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function JobForm({ job, onSubmit, onCancel, onDelete }: JobFormProps) {
  const isEditMode = Boolean(job);

  const form = useForm<JobFormValues>({
    resolver: zodResolver(jobFormSchema),
    defaultValues: {
      title: job?.title ?? '',
      company: job?.company ?? '',
      location: job?.location ?? '',
      pipelineStage: job?.pipelineStage ?? 'Interested',
      deadline: job?.deadline ?? '',
      priorityFlag: job?.priorityFlag ?? false,
    },
  });

  const { formState } = form;
  const isSubmitting = formState.isSubmitting;

  // Reset to new defaults if the job prop changes (e.g. opening a different job's edit form)
  useEffect(() => {
    form.reset({
      title: job?.title ?? '',
      company: job?.company ?? '',
      location: job?.location ?? '',
      pipelineStage: job?.pipelineStage ?? 'Interested',
      deadline: job?.deadline ?? '',
      priorityFlag: job?.priorityFlag ?? false,
    });
  }, [job, form]);

  async function handleSubmit(values: JobFormValues): Promise<void> {
    await onSubmit(values);
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(handleSubmit)} noValidate className="flex flex-col gap-5">
        {/* Title — required */}
        <FormField
          control={form.control}
          name="title"
          render={({ field }) => (
            <FormItem>
              <FormLabel>
                Job Title <span className="text-red-500">*</span>
              </FormLabel>
              <FormControl>
                <Input placeholder="e.g. Software Engineer" disabled={isSubmitting} {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        {/* Company — required */}
        <FormField
          control={form.control}
          name="company"
          render={({ field }) => (
            <FormItem>
              <FormLabel>
                Company <span className="text-red-500">*</span>
              </FormLabel>
              <FormControl>
                <Input placeholder="e.g. Acme Corp" disabled={isSubmitting} {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        {/* Location — optional */}
        <FormField
          control={form.control}
          name="location"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Location</FormLabel>
              <FormControl>
                <Input
                  placeholder="e.g. New York, NY (optional)"
                  disabled={isSubmitting}
                  {...field}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        {/* Pipeline Stage — required */}
        <FormField
          control={form.control}
          name="pipelineStage"
          render={({ field }) => (
            <FormItem>
              <FormLabel>
                Pipeline Stage <span className="text-red-500">*</span>
              </FormLabel>
              <Select
                onValueChange={field.onChange}
                defaultValue={field.value}
                disabled={isSubmitting}
              >
                <FormControl>
                  <SelectTrigger>
                    <SelectValue placeholder="Select a stage" />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  {PIPELINE_STAGES.map((stage) => (
                    <SelectItem key={stage} value={stage}>
                      {stage}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <FormMessage />
            </FormItem>
          )}
        />

        {/* Deadline — optional */}
        <FormField
          control={form.control}
          name="deadline"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Application Deadline</FormLabel>
              <FormControl>
                <Input type="date" disabled={isSubmitting} {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        {/* Priority Flag — optional */}
        <FormField
          control={form.control}
          name="priorityFlag"
          render={({ field }) => (
            <FormItem className="flex flex-row items-center gap-3 rounded-md border border-gray-200 p-4">
              <FormControl>
                <Checkbox
                  checked={field.value}
                  onCheckedChange={field.onChange}
                  disabled={isSubmitting}
                  id="priorityFlag"
                />
              </FormControl>
              <FormLabel htmlFor="priorityFlag" className="cursor-pointer font-medium">
                Mark as priority
              </FormLabel>
            </FormItem>
          )}
        />

        {/* Actions */}
        <div className="flex items-center justify-between pt-2">
          <div>
            {isEditMode && onDelete && (
              <Button
                type="button"
                variant="ghost"
                onClick={onDelete}
                disabled={isSubmitting}
                className="text-red-500 hover:bg-red-50 hover:text-red-600"
                aria-label="Delete job"
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            )}
          </div>
          <div className="flex gap-3">
            <Button type="button" variant="outline" onClick={onCancel} disabled={isSubmitting}>
              Cancel
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {isEditMode ? 'Save Changes' : 'Add Job'}
            </Button>
          </div>
        </div>
      </form>
    </Form>
  );
}
