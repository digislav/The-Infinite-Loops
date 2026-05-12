'use client';

// InterviewPrepNotes — S3-013
// Structured interview preparation notes section in the job detail panel.
// Replaces the single textarea with four focused fields:
//   - Questions to ask the interviewer
//   - Talking points / stories to prepare
//   - Research notes about the company
//   - Logistics (time, location, interviewer names, dress code)
//
// Data is serialized as JSON and saved to custom_notes on the job via
// PUT /api/jobs/:id. Falls back gracefully if existing notes are plain text.
//
// Per S1-001 §6.3 — human-friendly errors only.
// Per S1-002 §11.2 — independent section save.
// Per S1-003 — auth and ownership enforced on the backend.
//   user_id never sent from the client.

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Pencil, Save, X, ClipboardList } from 'lucide-react';
import { Label } from '@/components/ui/label';

// Structured shape for interview prep notes.
interface PrepNotesData {
  questions: string;
  talkingPoints: string;
  research: string;
  logistics: string;
}

const EMPTY_NOTES: PrepNotesData = {
  questions: '',
  talkingPoints: '',
  research: '',
  logistics: '',
};

// Try to parse existing notes as structured JSON.
// If the notes are plain text (old format), put them in the questions field
// so no data is lost on migration.
function parseNotes(raw: string): PrepNotesData {
  if (!raw) return EMPTY_NOTES;
  try {
    const parsed = JSON.parse(raw);
    // Validate it looks like our structured shape.
    if (typeof parsed === 'object' && ('questions' in parsed || 'talkingPoints' in parsed)) {
      return {
        questions: parsed.questions ?? '',
        talkingPoints: parsed.talkingPoints ?? '',
        research: parsed.research ?? '',
        logistics: parsed.logistics ?? '',
      };
    }
  } catch {
    // Not JSON — treat as legacy plain text.
  }
  // Legacy plain text — put it in questions so nothing is lost.
  return { ...EMPTY_NOTES, questions: raw };
}

// Serialize structured notes to JSON string for storage.
// Returns undefined if all fields are empty so we don't store an empty object.
function serializeNotes(data: PrepNotesData): string | undefined {
  const isEmpty = Object.values(data).every((v) => !v.trim());
  if (isEmpty) return undefined;
  return JSON.stringify(data);
}

// Returns true if all fields in the structured data are empty.
function isEmptyNotes(data: PrepNotesData): boolean {
  return Object.values(data).every((v) => !v.trim());
}

interface InterviewPrepNotesProps {
  jobId: string;
  initialNotes: string;
  onSaved?: (updatedNotes: string) => void;
}

export function InterviewPrepNotes({ jobId, initialNotes, onSaved }: InterviewPrepNotesProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [notes, setNotes] = useState<PrepNotesData>(() => parseNotes(initialNotes));
  const [draft, setDraft] = useState<PrepNotesData>(() => parseNotes(initialNotes));
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Re-parse whenever initialNotes changes (e.g. job switches).
  useEffect(() => {
    const parsed = parseNotes(initialNotes);
    setNotes(parsed);
    setDraft(parsed);
  }, [initialNotes]);

  function handleEdit() {
    setDraft({ ...notes });
    setError(null);
    setIsEditing(true);
  }

  function handleCancel() {
    setDraft({ ...notes });
    setError(null);
    setIsEditing(false);
  }

  // Update a single field in the draft without replacing the whole object.
  function handleFieldChange(field: keyof PrepNotesData, value: string) {
    setDraft((prev) => ({ ...prev, [field]: value }));
  }

  async function handleSave() {
    setIsSaving(true);
    setError(null);

    try {
      const serialized = serializeNotes(draft);

      // Use fetch() — never call Supabase directly from the frontend.
      // Ownership enforced server-side via supabase.auth.getUser()
      // per S1-003 §2.3. user_id never sent from the client.
      const res = await fetch(`/api/jobs/${jobId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ custom_notes: serialized }),
      });

      if (!res.ok) throw new Error('Failed to save');

      setNotes(draft);
      setIsEditing(false);
      onSaved?.(serialized ?? '');
    } catch {
      // Human-friendly error per S1-001 §6.3.
      setError('Failed to save notes. Please try again.');
    } finally {
      setIsSaving(false);
    }
  }

  // Shared textarea style — reused across all four fields.
  const textareaClass =
    'min-h-[80px] w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm ' +
    'placeholder:text-gray-400 focus:border-[#2E75B6] focus:ring-2 focus:ring-[#2E75B6]/50 ' +
    'focus:outline-none';

  return (
    <div className="flex flex-col gap-3">
      {/* Section header */}
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

      {/* EDIT MODE — four structured fields */}
      {isEditing ? (
        <div className="flex flex-col gap-4">
          {/* Questions to ask */}
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="prep-questions" className="text-xs font-semibold text-gray-600">
              Questions to Ask
            </Label>
            <p className="text-xs text-gray-400">
              What do you want to learn about the role, team, or company?
            </p>
            <textarea
              id="prep-questions"
              value={draft.questions}
              onChange={(e) => handleFieldChange('questions', e.target.value)}
              placeholder={
                'e.g.\n• What does success look like in the first 90 days?\n• How does the team handle code reviews?\n• What is the biggest challenge facing the team right now?'
              }
              className={textareaClass}
            />
          </div>

          {/* Talking points */}
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="prep-talking-points" className="text-xs font-semibold text-gray-600">
              Talking Points & Stories
            </Label>
            <p className="text-xs text-gray-400">
              Key experiences and achievements to highlight during the interview.
            </p>
            <textarea
              id="prep-talking-points"
              value={draft.talkingPoints}
              onChange={(e) => handleFieldChange('talkingPoints', e.target.value)}
              placeholder={
                'e.g.\n• Highlight the ATS project — led frontend, 165 tests passing\n• STAR story: reduced load time by 40% at internship\n• Mention TypeScript strict mode experience'
              }
              className={textareaClass}
            />
          </div>

          {/* Research notes */}
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="prep-research" className="text-xs font-semibold text-gray-600">
              Research Notes
            </Label>
            <p className="text-xs text-gray-400">
              Notes about the company, team, product, or recent news.
            </p>
            <textarea
              id="prep-research"
              value={draft.research}
              onChange={(e) => handleFieldChange('research', e.target.value)}
              placeholder={
                'e.g.\n• Company recently raised Series B — focus on growth\n• Product uses React + Node stack\n• Interviewer: Jane Smith — check her LinkedIn'
              }
              className={textareaClass}
            />
          </div>

          {/* Logistics */}
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="prep-logistics" className="text-xs font-semibold text-gray-600">
              Logistics
            </Label>
            <p className="text-xs text-gray-400">
              Time, location, format, dress code, and anything else to remember.
            </p>
            <textarea
              id="prep-logistics"
              value={draft.logistics}
              onChange={(e) => handleFieldChange('logistics', e.target.value)}
              placeholder={
                'e.g.\n• Interview: Tuesday 2pm via Zoom\n• Panel: 3 interviewers (engineering + PM)\n• Business casual dress\n• Bring portfolio link'
              }
              className={textareaClass}
            />
          </div>

          {/* Error message */}
          {error && <p className="text-xs font-medium text-red-600">{error}</p>}

          {/* Save / Cancel buttons */}
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
      ) : isEmptyNotes(notes) ? (
        // EMPTY STATE — per S1-002 §5.7.
        <p className="text-sm text-gray-400">
          No prep notes yet. Click Edit to add questions, talking points, or research notes.
        </p>
      ) : (
        // READ MODE — show each non-empty field with a label.
        <div className="flex flex-col gap-4">
          {notes.questions && (
            <div className="flex flex-col gap-1">
              <span className="text-xs font-semibold text-gray-500">Questions to Ask</span>
              <p className="text-sm whitespace-pre-wrap text-gray-600">{notes.questions}</p>
            </div>
          )}
          {notes.talkingPoints && (
            <div className="flex flex-col gap-1">
              <span className="text-xs font-semibold text-gray-500">Talking Points & Stories</span>
              <p className="text-sm whitespace-pre-wrap text-gray-600">{notes.talkingPoints}</p>
            </div>
          )}
          {notes.research && (
            <div className="flex flex-col gap-1">
              <span className="text-xs font-semibold text-gray-500">Research Notes</span>
              <p className="text-sm whitespace-pre-wrap text-gray-600">{notes.research}</p>
            </div>
          )}
          {notes.logistics && (
            <div className="flex flex-col gap-1">
              <span className="text-xs font-semibold text-gray-500">Logistics</span>
              <p className="text-sm whitespace-pre-wrap text-gray-600">{notes.logistics}</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
