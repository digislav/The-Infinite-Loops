'use client';

import { useState } from 'react';
import { DashboardHeader } from '@/components/dashboard/DashboardHeader';
import { StatsBar } from '@/components/dashboard/StatsBar';
import { BoardControls } from '@/components/dashboard/BoardControls';
import { BoardContent } from '@/components/dashboard/BoardContent';
import type { JobFilters } from '@/components/dashboard/BoardControls';

const DEFAULT_FILTERS: JobFilters = {
  stage: 'all',
  location: 'all',
  deadline: 'all',
  priority: 'all',
};

export default function DashboardPage() {
  const [filters, setFilters] = useState<JobFilters>(DEFAULT_FILTERS);
  const [locations, setLocations] = useState<string[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  // refreshKey increments every time BoardContent signals a job change
  // (add, edit, archive, delete) — causing StatsBar to re-fetch counts.
  const [refreshKey, setRefreshKey] = useState(0);

  return (
    <div className="flex flex-col gap-6">
      <DashboardHeader onSearch={setSearchQuery} />
      {/* Pass refreshKey so StatsBar re-fetches when jobs change */}
      <StatsBar refreshKey={refreshKey} />
      <BoardControls filters={filters} onFiltersChange={setFilters} locations={locations} />
      {/* onJobsChanged increments refreshKey to trigger StatsBar refresh */}
      <BoardContent
        filters={filters}
        onLocationsReady={setLocations}
        searchQuery={searchQuery}
        onJobsChanged={() => setRefreshKey((k) => k + 1)}
      />
    </div>
  );
}
