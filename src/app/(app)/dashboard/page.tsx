'use client';

import { useState, useEffect } from 'react';
import { DashboardHeader } from '@/components/dashboard/DashboardHeader';
import { StatsBar } from '@/components/dashboard/StatsBar';
import { BoardControls } from '@/components/dashboard/BoardControls';
import { BoardContent } from '@/components/dashboard/BoardContent';
import type { JobFilters } from '@/components/dashboard/BoardControls';
import type { Job, JobRecord } from '@/types/job.types';
import { toUIJob } from '@/types/job.types';
import { SankeyGraph } from '@/components/dashboard/SankeyGraph';
import { LayoutList, GitMerge } from 'lucide-react';
import { cn } from '@/lib/utils';

const DEFAULT_FILTERS: JobFilters = {
  stage: 'all',
  location: 'all',
  deadline: 'all',
  priority: 'all',
};

export default function DashboardPage() {
  const [filters, setFilters] = useState<JobFilters>(DEFAULT_FILTERS);
  const [locations, setLocations] = useState<string[]>([]);
  const [activeView, setActiveView] = useState<'list' | 'sankey'>('list');
  
  const [jobs, setJobs] = useState<Job[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  async function fetchJobs() {
    try {
      const res = await fetch('/api/jobs');
      if (!res.ok) throw new Error('Failed to fetch jobs');
      const json = await res.json();
      const records: JobRecord[] = json.data ?? [];
      const uiJobs = records.map(toUIJob);
      setJobs(uiJobs);
      const uniqueLocations = [
        ...new Set(uiJobs.map((j) => j.location).filter(Boolean)),
      ] as string[];
      setLocations(uniqueLocations);
    } catch {
      setError('Failed to load jobs. Please try again.');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    fetchJobs();
  }, []);

  return (
    <div className="flex flex-col gap-6">
      <DashboardHeader />
      <StatsBar />
      
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <BoardControls filters={filters} onFiltersChange={setFilters} locations={locations} />
        
        {/* View Toggle */}
        <div className="flex shrink-0 items-center rounded-lg bg-gray-100 p-1">
          <button
            onClick={() => setActiveView('list')}
            className={cn(
              'flex items-center gap-2 rounded-md px-3 py-1.5 text-sm font-medium transition-all',
              activeView === 'list' 
                ? 'bg-white text-gray-900 shadow-sm' 
                : 'text-gray-500 hover:text-gray-700'
            )}
          >
            <LayoutList size={16} />
            List
          </button>
          <button
            onClick={() => setActiveView('sankey')}
            className={cn(
              'flex items-center gap-2 rounded-md px-3 py-1.5 text-sm font-medium transition-all',
              activeView === 'sankey' 
                ? 'bg-white text-gray-900 shadow-sm' 
                : 'text-gray-500 hover:text-gray-700'
            )}
          >
            <GitMerge size={16} className="-rotate-90" />
            Flow
          </button>
        </div>
      </div>

      {activeView === 'list' ? (
        <BoardContent 
          filters={filters} 
          onLocationsReady={setLocations}
          jobs={jobs}
          loading={loading}
          error={error}
          fetchJobs={fetchJobs} 
        />
      ) : (
        <SankeyGraph jobs={jobs} loading={loading} error={error} filters={filters} />
      )}
    </div>
  );
}
