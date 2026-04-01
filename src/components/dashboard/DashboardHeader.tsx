import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

export function DashboardHeader() {
  return (
    <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
      <h1 className="text-3xl font-bold text-gray-900">Dashboard</h1>
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <Input
          placeholder="Search jobs, companies…"
          className="w-full sm:w-72"
          aria-label="Search jobs and companies"
        />
        <Button
          disabled
          className="bg-[#2E75B6] text-white hover:bg-[#1F4E79] disabled:opacity-50 disabled:cursor-not-allowed"
        >
          Add Job
        </Button>
      </div>
    </div>
  );
}
