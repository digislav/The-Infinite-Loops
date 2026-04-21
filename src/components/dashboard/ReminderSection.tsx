'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

interface ReminderSectionProps {
  jobId: string;
  onReminderSaved: () => void;
}

export function ReminderSection({ jobId, onReminderSaved }: ReminderSectionProps) {
  const [isAdding, setIsAdding] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [reminderDate, setReminderDate] = useState('');
  const [notes, setNotes] = useState('');
  const [formError, setFormError] = useState<string | null>(null);

  function resetForm() {
    setReminderDate('');
    setNotes('');
    setFormError(null);
  }

  function handleCancel() {
    setIsAdding(false);
    resetForm();
  }

  async function handleSave() {
    if (!reminderDate) {
      setFormError('Please select a reminder date and time.');
      return;
    }

    setIsSaving(true);
    setFormError(null);

    try {
      const res = await fetch(`/api/jobs/${jobId}/activities`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          reminder_date: new Date(reminderDate).toISOString(),
          notes: notes || undefined,
        }),
      });

      const json = await res.json();
      if (!res.ok || !json?.success) {
        setFormError('Failed to save reminder. Please try again.');
        return;
      }

      setIsAdding(false);
      resetForm();
      onReminderSaved();
    } catch {
      setFormError('Failed to save reminder. Please try again.');
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <div className="mt-5 border-b border-gray-100 pb-5">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-sm font-semibold text-gray-700">Follow-up Reminder</h3>
          <p className="text-sm text-gray-400">Keep track of your next follow-up for this job.</p>
        </div>
        {!isAdding && (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setIsAdding(true)}
            className="h-7 rounded-full bg-amber-50 px-3 text-xs font-semibold text-amber-700 hover:bg-amber-100"
          >
            + Add Reminder
          </Button>
        )}
      </div>

      {isAdding && (
        <div className="mt-4 flex flex-col gap-3 rounded-lg border border-amber-100 bg-amber-50/50 p-4">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="reminder-date" className="text-xs text-gray-500">
              Date & Time <span className="text-red-500">*</span>
            </Label>
            <Input
              id="reminder-date"
              type="datetime-local"
              value={reminderDate}
              onChange={(e) => setReminderDate(e.target.value)}
              className="h-8 text-xs"
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="reminder-notes" className="text-xs text-gray-500">
              Notes <span className="text-gray-400">(optional)</span>
            </Label>
            <textarea
              id="reminder-notes"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Why are you following up?"
              className="min-h-[60px] w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-xs placeholder:text-gray-400 focus:border-[#2E75B6] focus:ring-2 focus:ring-[#2E75B6]/50 focus:outline-none"
            />
          </div>

          {formError && <p className="text-xs text-red-600">{formError}</p>}

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
              {isSaving ? 'Saving...' : 'Save Reminder'}
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
