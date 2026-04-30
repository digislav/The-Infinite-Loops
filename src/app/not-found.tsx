// not-found.tsx — S3-018: Centralized Error Handling and Logging.
// Next.js App Router 404 page — rendered when notFound() is called from
// a route or when no route matches the requested URL.
//
// Per S1-002 §5.7 — empty/error states must have icon + message + action.
// This is a Server Component (no 'use client') — Next.js renders it server-side.

import Link from 'next/link';
import { Button } from '@/components/ui/button';

export default function NotFoundPage() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-6 px-6 text-center">
      <div className="flex flex-col gap-2">
        <h1 className="text-6xl font-bold text-gray-200">404</h1>
        <h2 className="text-2xl font-bold text-gray-900">Page not found</h2>
        <p className="max-w-sm text-sm text-gray-500">
          The page you are looking for does not exist or has been moved.
        </p>
      </div>

      <Button asChild className="bg-[#2E75B6] text-white hover:bg-[#1F4E79]">
        <Link href="/dashboard">Go to Dashboard</Link>
      </Button>
    </div>
  );
}
