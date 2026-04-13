'use client';

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import type { PipelineStage } from '@/types/job.types';

export type DeadlineFilter = 'all' | 'soon' | 'overdue' | 'none';

export interface JobFilters {
  stage: PipelineStage | 'all';
  location: string;
  deadline: DeadlineFilter;
  priority: 'all' | 'priority';
}

const STAGES: PipelineStage[] = [
  'Interested',
  'Applied',
  'Interview',
  'Offer',
  'Rejected',
  'Ghosted',
  'Archived',
];

interface BoardControlsProps {
  filters: JobFilters;
  onFiltersChange: (filters: JobFilters) => void;
  locations: string[];
}

export function BoardControls({ filters, onFiltersChange, locations }: BoardControlsProps) {
  function handleStageChange(value: string | null) {
    if (!value) return;
    onFiltersChange({ ...filters, stage: value as PipelineStage | 'all' });
  }

  function handleLocationChange(value: string | null) {
    if (!value) return;
    onFiltersChange({ ...filters, location: value });
  }

  function handleDeadlineChange(value: string | null) {
    if (!value) return;
    onFiltersChange({ ...filters, deadline: value as DeadlineFilter });
  }

  function handleClear() {
    onFiltersChange({ stage: 'all', location: 'all', deadline: 'all', priority: 'all' });
  }

  const isFiltered =
    filters.stage !== 'all' ||
    filters.location !== 'all' ||
    filters.deadline !== 'all' ||
    filters.priority !== 'all';

  return (
    <div className="flex flex-wrap items-center gap-3">
      <Select value={filters.stage} onValueChange={handleStageChange}>
        <SelectTrigger className="w-36">
          <SelectValue placeholder="Stage" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">All Stages</SelectItem>
          {STAGES.map((s) => (
            <SelectItem key={s} value={s}>
              {s}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      <Select value={filters.location} onValueChange={handleLocationChange}>
        <SelectTrigger className="w-36">
          <SelectValue placeholder="Location" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">All Locations</SelectItem>
          {locations.map((l) => (
            <SelectItem key={l} value={l}>
              {l}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      <Select value={filters.deadline} onValueChange={handleDeadlineChange}>
        <SelectTrigger className="w-36">
          <SelectValue placeholder="Deadline" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">All Deadlines</SelectItem>
          <SelectItem value="soon">Due Soon</SelectItem>
          <SelectItem value="overdue">Overdue</SelectItem>
          <SelectItem value="none">No Deadline</SelectItem>
        </SelectContent>
      </Select>

      <div className="flex items-center gap-2">
        <Checkbox
          id="priority-filter"
          checked={filters.priority === 'priority'}
          onCheckedChange={(checked) =>
            onFiltersChange({ ...filters, priority: checked ? 'priority' : 'all' })
          }
        />
        <Label htmlFor="priority-filter" className="cursor-pointer text-sm text-gray-600">
          Priority Only
        </Label>
      </div>

      {isFiltered && (
        <Button variant="ghost" className="text-sm text-gray-500" onClick={handleClear}>
          Clear
        </Button>
      )}
    </div>
  );
}
