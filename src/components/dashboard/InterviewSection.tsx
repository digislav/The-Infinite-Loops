'use client';

// InterviewSection — S2-011 frontend: Implement Interview Tracking in Job Detail.
// Displays all scheduled interviews for a job and allows the user
// to add new interview events with round type, date/time, location, and notes.
//
// Per S1-002 §5.3 — uses controlled inputs throughout.
// Per S1-002 §5.4 — uses inline form instead of stacked modal since
//   this component lives inside the JobDetailPanel dialog.
// Per S1-003 — auth and ownership enforced on the backend.
//   We never send user_id from the client — only jobId in the URL.

import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { formatDateOnly } from '@/lib/utils/dateFormatters';

// Shape of a single interview record from the API.
// Matches the job_activities table columns for INTERVIEW_SCHEDULED events.
interface Interview {
  id: string;
  job_id: string;
  activity_type: 'INTERVIEW_SCHEDULED';
  interview_round?: string;
  interview_date?: string;
  location_url?: string;
  notes?: string;
  activity_date: string;
  created_at?: string;
}

// Available interview round types.
// Kept as a constant so it is easy to add new round types in the future.
const INTERVIEW_ROUNDS = ['Phone Screen', 'Technical', 'Behavioral', 'HR', 'Final', 'Other'];

interface InterviewSectionProps {
  // The ID of the job whose interviews to display and add to.
  // The backend verifies the caller owns this job before any action.
  jobId: string;
}

export function InterviewSection({ jobId }: InterviewSectionProps) {
  const [interviews, setInterviews] = useState<Interview[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Controls whether the add interview form is visible.
  const [isAdding, setIsAdding] = useState(false);
  // Controls the save loading state while the POST request is in flight.
  const [isSaving, setIsSaving] = useState(false);

  // Form field state — controlled inputs per S1-002 §5.3.
  const [round, setRound] = useState('');
  const [interviewDate, setInterviewDate] = useState('');
  const [locationUrl, setLocationUrl] = useState('');
  const [notes, setNotes] = useState('');
  // Inline validation error for required fields per S1-002 §5.3.
  const [formError, setFormError] = useState<string | null>(null);

  // Fetch all interviews for this job on mount and when jobId changes.
  useEffect(() => {
    let cancelled = false;

    const loadInterviews = async () => {
      if (!cancelled) {
        setLoading(true);
        setError(null);
      }

      try {
        // Fetch from the backend API route.
        // Auth and ownership are enforced server-side —
        // we never send a user_id from the client per S1-003 §5.4.
        const res = await fetch(`/api/jobs/${jobId}/interviews`);
        if (!res.ok) {
          if (!cancelled) setError('Could not load interviews.');
          return;
        }
        const data = await res.json();
        if (!cancelled) setInterviews(data ?? []);
      } catch {
        // Network or parse failure — safe friendly message per S1-001 §6.3.
        if (!cancelled) setError('Could not load interviews.');
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    loadInterviews();

    // Cleanup — prevents stale state if jobId changes mid-fetch.
    return () => {
      cancelled = true;
    };
  }, [jobId]);

  // resetForm — clears all form fields and validation errors.
  function resetForm() {
    setRound('');
    setInterviewDate('');
    setLocationUrl('');
    setNotes('');
    setFormError(null);
  }

  // handleCancel — closes the form and resets all fields.
  function handleCancel() {
    setIsAdding(false);
    resetForm();
  }

  // handleSave — validates and submits the new interview event.
  async function handleSave() {
    // Validate required fields inline per S1-002 §5.3.
    // Round type and date are required — all other fields are optional.
    if (!round) {
      setFormError('Please select an interview round.');
      return;
    }
    if (!interviewDate) {
      setFormError('Please enter the interview date and time.');
      return;
    }

    setIsSaving(true);
    setFormError(null);

    try {
      // POST to the protected backend API route.
      // The backend verifies the session and ownership before saving.
      // We never include user_id in the body per S1-003 §5.4.
      const res = await fetch(`/api/jobs/${jobId}/interviews`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          interview_round: round,
          interview_date: new Date(interviewDate).toISOString(),
          location_url: locationUrl || undefined,
          notes: notes || undefined,
        }),
      });

      if (!res.ok) {
        // Human-friendly error — never raw HTTP codes per S1-001 §6.3.
        setFormError('Failed to save interview. Please try again.');
        return;
      }

      const saved = await res.json();

      // Add the new interview to the top of the list optimistically
      // so the user sees it immediately without a full re-fetch.
      setInterviews((prev) => [saved, ...prev]);
      setIsAdding(false);
      resetForm();
    } catch {
      setFormError('Failed to save interview. Please try again.');
    } finally {
      setIsSaving(false);
    }
  }

  // LOADING STATE — skeletons while data fetches per S1-002 §9.2.
  if (loading) {
    return (
      <div className="flex flex-col gap-3">
        <Skeleton className="h-4 w-1/3" />
        <Skeleton className="h-4 w-full" />
        <Skeleton className="h-4 w-2/3" />
      </div>
    );
  }

  // ERROR STATE — human-friendly message per S1-001 §6.3.
  if (error) {
    return <p className="text-sm text-red-500">{error}</p>;
  }

  return (
    <div className="flex flex-col gap-3">
      {/* Section header with Add Interview button */}
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold text-gray-700">Interviews</h3>
        {/* Only show Add button when form is not already open */}
        {!isAdding && (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setIsAdding(true)}
            className="h-7 rounded-full bg-blue-50 px-3 text-xs font-semibold text-blue-600 hover:bg-blue-100 hover:text-blue-700"
          >
            + Add Interview
          </Button>
        )}
      </div>

      {/* ADD INTERVIEW FORM — inline, shown when isAdding is true.
          Per S1-002 §5.4 — inline form instead of stacked modal.
          Per S1-002 §5.3 — all inputs are controlled with labels. */}
      {isAdding && (
        <div className="flex flex-col gap-3 rounded-lg border border-blue-100 bg-blue-50/50 p-4">
          <h4 className="text-xs font-semibold text-gray-600">New Interview</h4>

          {/* Round type — required field */}
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="interview-round" className="text-xs text-gray-500">
              Round Type <span className="text-red-500">*</span>
            </Label>
            <Select value={round} onValueChange={(val: string) => setRound(val)}>
              <SelectTrigger id="interview-round" className="h-8 text-xs">
                <SelectValue placeholder="Select round type" />
              </SelectTrigger>
              <SelectContent>
                {INTERVIEW_ROUNDS.map((r) => (
                  <SelectItem key={r} value={r} className="text-xs">
                    {r}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Interview date and time — required field */}
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="interview-date" className="text-xs text-gray-500">
              Date & Time <span className="text-red-500">*</span>
            </Label>
            <Input
              id="interview-date"
              type="datetime-local"
              value={interviewDate}
              onChange={(e) => setInterviewDate(e.target.value)}
              className="h-8 text-xs"
            />
          </div>

          {/* Location / Zoom URL — optional field */}
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="interview-location" className="text-xs text-gray-500">
              Location / Zoom URL <span className="text-gray-400">(optional)</span>
            </Label>
            <Input
              id="interview-location"
              type="text"
              value={locationUrl}
              onChange={(e) => setLocationUrl(e.target.value)}
              placeholder="https://zoom.us/j/..."
              className="h-8 text-xs"
            />
          </div>

          {/* Notes — optional field */}
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="interview-notes" className="text-xs text-gray-500">
              Notes <span className="text-gray-400">(optional)</span>
            </Label>
            <textarea
              id="interview-notes"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Any prep notes or context..."
              className="min-h-[60px] w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-xs placeholder:text-gray-400 focus:border-[#2E75B6] focus:ring-2 focus:ring-[#2E75B6]/50 focus:outline-none"
            />
          </div>

          {/* Inline validation error — per S1-002 §5.3 shown adjacent to form */}
          {formError && <p className="text-xs text-red-600">{formError}</p>}

          {/* Form action buttons — per S1-002 §5.2 primary action bottom right */}
          <div className="flex justify-end gap-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={handleCancel}
              disabled={isSaving}
              className="h-7 px-3 text-xs text-gray-500 hover:text-gray-700"
            >
              Cancel
            </Button>
            <Button
              size="sm"
              onClick={handleSave}
              disabled={isSaving}
              className="h-7 bg-[#2E75B6] px-3 text-xs font-semibold text-white hover:bg-[#1F4E79]"
            >
              {isSaving ? 'Saving...' : 'Save Interview'}
            </Button>
          </div>
        </div>
      )}

      {/* INTERVIEW LIST — shows all scheduled interviews.
          Per S1-002 §5.7 — empty state when no interviews exist. */}
      {interviews.length === 0 && !isAdding ? (
        <p className="text-sm text-gray-400">No interviews scheduled yet.</p>
      ) : (
        <div className="flex flex-col gap-3">
          {interviews.map((interview) => (
            <div
              key={interview.id}
              className="flex flex-col gap-1 rounded-lg border border-gray-100 bg-gray-50 p-3"
            >
              {/* Round type and date */}
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-gray-800">
                  {interview.interview_round ?? 'Interview'}
                </span>
                {interview.interview_date && (
                  <span className="text-xs text-gray-400">
                    {formatDateOnly(interview.interview_date)}
                  </span>
                )}
              </div>

              {/* Location / Zoom URL — shown as a clickable link if present */}
              {interview.location_url && (
                <a
                  href={interview.location_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="truncate text-xs text-blue-600 hover:underline"
                >
                  {interview.location_url}
                </a>
              )}

              {/* Notes */}
              {interview.notes && <p className="text-xs text-gray-500">{interview.notes}</p>}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
