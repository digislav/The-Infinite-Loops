import { Card } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';

const STAT_BLOCKS = ['Total', 'Applied', 'Interview', 'Offer', 'Rejected', 'Archived'];

export function StatsBar() {
  return (
    <div className="flex flex-wrap gap-3">
      {STAT_BLOCKS.map((label) => (
        <Card
          key={label}
          className="flex flex-1 min-w-[100px] flex-col items-center justify-center gap-2 p-4 bg-white border border-gray-200"
        >
          <Skeleton className="h-7 w-8 rounded" aria-hidden="true" />
          <span className="text-sm font-medium text-gray-500">{label}</span>
        </Card>
      ))}
    </div>
  );
}
