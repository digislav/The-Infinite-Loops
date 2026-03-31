import { BriefcaseIcon } from 'lucide-react';
import { Button } from '@/components/ui/button';

export function BoardContent() {
  return (
    <div className="flex flex-col items-center justify-center gap-4 py-20 text-center">
      <div className="flex h-16 w-16 items-center justify-center rounded-full bg-[#D9E2F3]">
        <BriefcaseIcon className="h-8 w-8 text-[#2E75B6]" aria-hidden="true" />
      </div>
      <div className="flex flex-col gap-1">
        <p className="text-lg font-semibold text-gray-900">No jobs yet</p>
        <p className="text-sm text-gray-500">Add your first job to get started.</p>
      </div>
      <Button
        disabled
        className="bg-[#2E75B6] text-white hover:bg-[#1F4E79] disabled:opacity-50 disabled:cursor-not-allowed"
      >
        Add Job
      </Button>
    </div>
  );
}
