'use client';

import { useEffect, useState } from 'react';
import { Card } from '@/components/ui/card';

type StageCounts = {
  Total: number;
  Interested: number;
  Applied: number;
  Interview: number;
  Offer: number;
  Rejected: number;
  Ghosted: number;
  Archived: number;
};

export function StatsBar() {
  const [counts, setCounts] = useState<StageCounts>({
    Total: 0,
    Interested: 0,
    Applied: 0,
    Interview: 0,
    Offer: 0,
    Rejected: 0,
    Ghosted: 0,
    Archived: 0,
  });

  useEffect(() => {
    async function fetchCounts() {
      try {
        const res = await fetch('/api/jobs');
        if (!res.ok) return;
        const json = await res.json();
        const jobs = json.data ?? [];

        const newCounts: StageCounts = {
          Total: jobs.length,
          Interested: 0,
          Applied: 0,
          Interview: 0,
          Offer: 0,
          Rejected: 0,
          Ghosted: 0,
          Archived: 0,
        };

        for (const job of jobs) {
          const stage = job.current_stage as keyof StageCounts;
          if (stage in newCounts) {
            newCounts[stage]++;
          }
        }

        setCounts(newCounts);
      } catch {
        // silently fail — counts stay at 0
      }
    }
    fetchCounts();
  }, []);

  return (
    <div className="flex flex-wrap gap-3">
      {(Object.entries(counts) as [keyof StageCounts, number][]).map(([label, count]) => (
        <Card
          key={label}
          className="flex min-w-[100px] flex-1 flex-col items-center justify-center gap-1 border border-gray-200 bg-white p-4"
        >
          <span className="text-2xl font-bold text-gray-900">{count}</span>
          <span className="text-sm font-medium text-gray-500">{label}</span>
        </Card>
      ))}
    </div>
  );
}
