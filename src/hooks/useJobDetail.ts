import { useState, useCallback } from 'react';
import type { JobDetail, JobRecord } from '@/types/job.types';
import { toUIJobDetail } from '@/types/job.types';

// useJobDetail — manages the state for the job detail panel.
// Handles which job is selected, whether the panel is open,
// loading state, and error state.
//
// Per S1-001 §3.2 — custom hooks use camelCase with 'use' prefix.
// Per S1-001 §3.5 — hook files live in hooks/ and start with 'use'.
// Per S1-001 §6.3 — all data-fetching calls handle loading, success,
// and error states explicitly. No unhandled promise rejections.
// Per S1-003 — auth and ownership are enforced on the backend.
// We never pass a user_id from the client.

interface UseJobDetailReturn {
  // The full detail record for the currently selected job, or null if none.
  selectedJob: JobDetail | null;
  // Whether the detail panel is currently open.
  isOpen: boolean;
  // Whether the detail fetch is in progress.
  isLoading: boolean;
  // Human-friendly error message or null — never a raw error object.
  // Per S1-001 §6.3.
  error: string | null;
  // Call when a job row is clicked — opens the panel and fetches detail.
  openJob: (jobId: string) => void;
  // Call when the panel is dismissed — resets all state.
  closeJob: () => void;
  // Optimistically update the UI after a save.
  updateJobState: (updates: Partial<JobDetail>) => void;
}

export function useJobDetail(): UseJobDetailReturn {
  const [selectedJob, setSelectedJob] = useState<JobDetail | null>(null);
  const [isOpen, setIsOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // openJob — called when a job row is clicked on the dashboard.
  // Opens the panel immediately so the UI feels responsive, then
  // fetches the full detail record from the protected backend API route.
  // useCallback prevents unnecessary re-renders in BoardContent.
  const openJob = useCallback(async (jobId: string) => {
    // Open the panel straight away with a loading skeleton
    // so the user gets immediate feedback per S1-002 §9.2.
    setIsOpen(true);
    setIsLoading(true);
    setError(null);
    setSelectedJob(null);

    try {
      // Fetch from the protected backend API route.
      // The backend calls supabase.auth.getUser() and enforces ownership —
      // we never send a user_id from the client per S1-003 §5.4.
      const res = await fetch(`/api/jobs/${jobId}`);

      if (!res.ok) {
        // Show a human-friendly error — never raw HTTP codes or
        // error objects per S1-001 §6.3.
        setError('Could not load job details. Please try again.');
        setIsLoading(false);
        return;
      }

      const json = await res.json();

      // Convert the raw DB record to the JobDetail UI shape
      // before storing in state.
      const detail = toUIJobDetail(json.data as JobRecord);
      setSelectedJob(detail);
    } catch {
      // Network or parse failure — show a safe, friendly message.
      // Never expose the raw error to the user per S1-001 §6.3.
      setError('Could not load job details. Please try again.');
    } finally {
      setIsLoading(false);
    }
  }, []);

// closeJob — called when the panel X button is clicked or the
  // overlay is dismissed. Resets all state so the next open starts fresh.
  const closeJob = useCallback(() => {
    setIsOpen(false);
    setSelectedJob(null);
    setError(null);
  }, []);

  // updateJobState — allows the UI to optimistically update the job state
  // after a successful backend save, averting an awkward loading spinner reload.
  const updateJobState = useCallback((updates: Partial<JobDetail>) => {
    setSelectedJob((prev) => (prev ? { ...prev, ...updates } : null));
  }, []);

  return {
    selectedJob,
    isOpen,
    isLoading,
    error,
    openJob,
    closeJob,
    updateJobState,
  };
}
