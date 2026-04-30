'use client';

// ErrorBoundary — S3-018: Centralized Error Handling and Logging.
// React class-based error boundary that catches unhandled client-side errors
// in any component subtree and renders a friendly fallback UI instead of
// crashing the entire page.
//
// Usage — wrap any section or page that might throw:
//   <ErrorBoundary>
//     <SomeComponent />
//   </ErrorBoundary>
//
// Or with a custom fallback:
//   <ErrorBoundary fallback={<p>Something went wrong.</p>}>
//     <SomeComponent />
//   </ErrorBoundary>
//
// Per S1-002 §5.7 — error states must have a clear message and a recovery action.
// Per S1-001 §6.3 — never expose raw error messages to the user.

import { Component, ReactNode } from 'react';
import { Button } from '@/components/ui/button';

interface ErrorBoundaryProps {
  children: ReactNode;
  // Optional custom fallback — if not provided the default fallback is shown.
  fallback?: ReactNode;
}

interface ErrorBoundaryState {
  hasError: boolean;
  // Store a sanitized message only — never the raw error stack.
  errorMessage: string | null;
}

export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false, errorMessage: null };
  }

  // Called by React when a child component throws during render.
  // Per S1-001 §6.3 — we log to console but never show the raw error to the user.
  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return {
      hasError: true,
      // Only store the message, not the full stack trace.
      errorMessage: error?.message ?? 'An unexpected error occurred.',
    };
  }

  // componentDidCatch is where we would send to an external error tracker
  // (e.g. Sentry) if one is integrated in future. For now we log to console
  // so it appears in the browser dev tools and server logs.
  componentDidCatch(error: Error, info: { componentStack: string }) {
    // Log to console — per S1-001 §6.3, never expose to the UI.
    console.error('[ErrorBoundary] Caught client error:', {
      message: error.message,
      // Include component stack so engineers can trace which component threw.
      componentStack: info.componentStack,
    });
  }

  // Reset the error state so the user can retry without refreshing the page.
  handleReset = () => {
    this.setState({ hasError: false, errorMessage: null });
  };

  render() {
    if (this.state.hasError) {
      // If a custom fallback was provided, use it.
      if (this.props.fallback) {
        return this.props.fallback;
      }

      // Default fallback UI — per S1-002 §5.7: icon + message + action.
      return (
        <div className="flex flex-col items-center justify-center gap-4 rounded-lg border border-red-100 bg-red-50 px-6 py-10 text-center">
          <div className="flex h-12 w-12 items-center justify-center rounded-full bg-red-100">
            {/* Simple X icon — avoids importing lucide just for the error state. */}
            <svg
              className="h-6 w-6 text-red-500"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={2}
              aria-hidden="true"
            >
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </div>
          <div className="flex flex-col gap-1">
            <p className="text-base font-semibold text-gray-900">Something went wrong</p>
            {/* Show a generic message — never the raw error per S1-001 §6.3. */}
            <p className="text-sm text-gray-500">
              An unexpected error occurred. Try again or refresh the page.
            </p>
          </div>
          <Button variant="outline" size="sm" onClick={this.handleReset} className="mt-2">
            Try Again
          </Button>
        </div>
      );
    }

    return this.props.children;
  }
}
