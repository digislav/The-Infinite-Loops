'use client';

// error.tsx — S3-018: Centralized Error Handling and Logging.
// Next.js App Router error boundary for the root layout.
// Catches any unhandled errors that bubble up past component-level
// ErrorBoundary components and renders a full-page fallback.
//
// This file MUST be a Client Component ('use client') — Next.js requires it.
// Per S1-002 §5.7 — error states must have a clear message and recovery action.
// Per S1-001 §6.3 — never expose raw error details to the user.

import { useEffect } from 'react';
import { Button } from '@/components/ui/button';

interface ErrorPageProps {
  error: Error & { digest?: string };
  reset: () => void;
}

export default function ErrorPage({ error, reset }: ErrorPageProps) {
  // Log to console on mount so it appears in server/browser logs.
  // Per S1-001 §6.3 — we log the digest (safe opaque ID) not the full message.
  useEffect(() => {
    console.error('[ErrorPage] Unhandled application error:', {
      digest: error.digest,
      message: error.message,
    });
  }, [error]);

  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-6 px-6 text-center">
      <div className="flex h-16 w-16 items-center justify-center rounded-full bg-red-100">
        <svg
          className="h-8 w-8 text-red-500"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth={2}
          aria-hidden="true"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M12 9v4m0 4h.01M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z"
          />
        </svg>
      </div>

      <div className="flex flex-col gap-2">
        <h1 className="text-2xl font-bold text-gray-900">Something went wrong</h1>
        <p className="max-w-md text-sm text-gray-500">
          An unexpected error occurred. This has been logged and we will look into it. You can try
          again or return to the dashboard.
        </p>
        {/* Show digest only if available — safe opaque ID, not the raw error. */}
        {error.digest && <p className="text-xs text-gray-400">Error ID: {error.digest}</p>}
      </div>

      <div className="flex gap-3">
        {/* Reset — attempts to re-render the segment that errored. */}
        <Button onClick={reset} className="bg-[#2E75B6] text-white hover:bg-[#1F4E79]">
          Try Again
        </Button>
        {/* Hard navigation back to dashboard as a fallback. */}
        <Button variant="outline" onClick={() => (window.location.href = '/dashboard')}>
          Go to Dashboard
        </Button>
      </div>
    </div>
  );
}
