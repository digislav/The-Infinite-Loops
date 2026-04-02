import { cn } from '@/lib/utils';

interface CompletionIndicatorProps {
  percentage: number;
}

export function CompletionIndicator({ percentage }: CompletionIndicatorProps) {
  return (
    <div className="flex flex-col gap-2 rounded-lg border border-gray-200 bg-white p-4">
      <div className="flex items-center justify-between">
        <div className="flex flex-col">
          <span className="text-sm font-semibold text-gray-900">Profile Completion</span>
          <span className="mt-0.5 text-xs text-gray-500">
            {percentage === 100
              ? 'Your profile is complete!'
              : 'Fill in the required fields to complete your profile'}
          </span>
        </div>
        <span
          className={cn(
            'text-2xl font-bold',
            percentage === 100
              ? 'text-emerald-500'
              : percentage >= 60
                ? 'text-blue-500'
                : 'text-amber-500',
          )}
        >
          {percentage}%
        </span>
      </div>

      {/* Progress bar */}
      <div className="h-3 w-full rounded-full bg-gray-100">
        <div
          className={cn(
            'h-3 rounded-full transition-all duration-500',
            percentage === 100
              ? 'bg-emerald-500'
              : percentage >= 60
                ? 'bg-blue-500'
                : 'bg-amber-500',
          )}
          style={{ width: `${percentage}%` }}
          role="progressbar"
          aria-valuenow={percentage}
          aria-valuemin={0}
          aria-valuemax={100}
          aria-label={`Profile ${percentage}% complete`}
        />
      </div>
    </div>
  );
}
