'use client';

// LibraryControls — S3-006
// Filter and sort controls for the Saved Documents list.
// Accepts current filter/sort state and callbacks from SavedDocuments.
// Pure UI — no data fetching. Per S1-001 and S1-002.

import { Button } from '@/components/ui/button';

export type DocumentTypeFilter = 'all' | 'cover_letter' | 'resume';
export type DocumentSortOrder = 'newest' | 'oldest' | 'name_asc';

interface LibraryControlsProps {
  typeFilter: DocumentTypeFilter;
  sortOrder: DocumentSortOrder;
  onTypeFilterChange: (value: DocumentTypeFilter) => void;
  onSortOrderChange: (value: DocumentSortOrder) => void;
}

export function LibraryControls({
  typeFilter,
  sortOrder,
  onTypeFilterChange,
  onSortOrderChange,
}: LibraryControlsProps) {
  return (
    <div className="flex flex-wrap items-center gap-3">
      {/* Type filter */}
      <div className="flex items-center gap-1">
        {(['all', 'cover_letter', 'resume'] as DocumentTypeFilter[]).map((type) => (
          <Button
            key={type}
            variant={typeFilter === type ? 'default' : 'outline'}
            size="sm"
            onClick={() => onTypeFilterChange(type)}
            className="h-7 px-3 text-xs"
          >
            {type === 'all' ? 'All' : type === 'cover_letter' ? 'Cover Letters' : 'Resumes'}
          </Button>
        ))}
      </div>

      {/* Sort order */}
      <div className="ml-auto flex items-center gap-1">
        {(
          [
            { value: 'newest', label: 'Newest' },
            { value: 'oldest', label: 'Oldest' },
            { value: 'name_asc', label: 'Name A–Z' },
          ] as { value: DocumentSortOrder; label: string }[]
        ).map(({ value, label }) => (
          <Button
            key={value}
            variant={sortOrder === value ? 'default' : 'outline'}
            size="sm"
            onClick={() => onSortOrderChange(value)}
            className="h-7 px-3 text-xs"
          >
            {label}
          </Button>
        ))}
      </div>
    </div>
  );
}
