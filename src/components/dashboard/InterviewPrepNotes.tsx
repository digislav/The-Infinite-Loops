'use client';

// InterviewPrepNotes — S3-013
// Displays a structured interview preparation notes section in the job detail panel.
// Users can maintain talking points, questions to ask, and research notes.
// Saves to custom_notes on the job via PUT /api/jobs/:id.
// Per S1-001 §6.3 — human-friendly errors only.
// Per S1-002 §11.2 — independent section save.
// Per S1-003 — auth and ownership enforced on the backend.

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Pencil, Save, X, ClipboardList } from 'lucide-react';
import { Label } from '@/components/ui/label';

interface InterviewPrepNotesProps {
  jobId: string;
  initialNotes: string;
  onSaved?: (updatedNotes: string) => void;
}

export function InterviewPrepNotes({ jobId, initialNotes, onSaved }: InterviewPrepNotesProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [notes, setNotes] = useState(initialNotes);
  const [draft, setDraft] = useState(initialNotes);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setNotes(initialNotes);
    setDraft(initialNotes);
  }, [initialNotes]);

  function handleEdit() {
    setDraft(notes);
    setError(null);
    setIsEditing(true);
  }

  function handleCancel() {
    setDraft(notes);
    setError(null);
    setIsEditing(false);
  }

  async function handleSave() {
    setIsSaving(true);
    setError(null);

    try {
      const res = await fetch(`/api/jobs/${jobId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ custom_notes: draft || undefined }),
      });

      if (!res.ok) throw new Error('Failed to save');

      setNotes(draft);
      setIsEditing(false);
      onSaved?.(draft);
    } catch {
      setError('Failed to save notes. Please try again.');
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <ClipboardList size={15} className="text-gray-400" aria-hidden={true} />
          <h3 className="text-sm font-semibold text-gray-700">Interview Prep Notes</h3>
        </div>

        {!isEditing && (
          <Button
            variant="ghost"
            size="sm"
            onClick={handleEdit}
            className="h-7 px-3 text-xs text-gray-500 hover:text-gray-700"
          >
            <Pencil size={12} className="mr-1" /> Edit
          </Button>
        )}
      </div>

      <p className="text-sm text-gray-500">
        Track questions to ask, talking points, and research notes for your interviews.
      </p>

      {isEditing ? (
        <div className="flex flex-col gap-2">
          <Label htmlFor="prepNotes" className="sr-only">
            Interview Prep Notes
          </Label>
          <textarea
            id="prepNotes"
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            placeholder={
              'e.g.\n• Questions to ask: what does success look like in 90 days?\n• Research: check their recent product launch\n• Talking points: highlight my React experience'
            }
            className="min-h-[140px] w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm placeholder:text-gray-400 focus:border-[#2E75B6] focus:ring-2 focus:ring-[#2E75B6]/50 focus:outline-none"
          />
          {error && <p className="text-xs font-medium text-red-600">{error}</p>}
          <div className="flex items-center gap-2">
            <Button
              size="sm"
              onClick={handleSave}
              disabled={isSaving}
              className="h-8 rounded-full bg-[#2E75B6] px-4 text-xs font-semibold text-white hover:bg-[#1F4E79]"
            >
              {isSaving ? (
                'Saving...'
              ) : (
                <>
                  <Save size={13} className="mr-1.5" /> Save Notes
                </>
              )}
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={handleCancel}
              disabled={isSaving}
              className="h-8 rounded-full px-3 text-xs text-gray-500 hover:text-gray-700"
            >
              <X size={13} className="mr-1" /> Cancel
            </Button>
          </div>
        </div>
      ) : notes ? (
        <p className="text-sm whitespace-pre-wrap text-gray-600">{notes}</p>
      ) : (
        <p className="text-sm text-gray-400">
          No prep notes yet. Click Edit to add questions, talking points, or research notes.
        </p>
      )}
    </div>
  );
}
