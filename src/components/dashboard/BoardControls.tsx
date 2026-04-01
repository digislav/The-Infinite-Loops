import { Skeleton } from '@/components/ui/skeleton';

const FILTER_WIDTHS = ['w-28', 'w-24', 'w-32', 'w-24', 'w-20'];

export function BoardControls() {
  return (
    <div className="flex flex-wrap items-center gap-3" aria-label="Board filters loading">
      {FILTER_WIDTHS.map((width, index) => (
        <Skeleton key={index} className={`h-9 ${width} rounded-md`} aria-hidden="true" />
      ))}
    </div>
  );
}
