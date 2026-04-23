'use client';

import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Skeleton } from '@/components/ui/skeleton';
import { formatTimestamp } from '@/lib/utils/dateFormatters';
import { cn } from '@/lib/utils';

interface ReminderSectionProps {
  jobId: string;
  onReminderSaved: () => void;
}

interface Reminder {
  id: string;
  notes?: string;
  interview_date?: string;
  activity_date: string;
  activity_type: string;
  timeline_event_type?: string;
}

export function ReminderSection({ jobId, onReminderSaved }: ReminderSectionProps) {
  const [reminders, setReminders] = useState<Reminder[]>([]);
  const [loading, setLoading] = useState(true);
  const [isAdding, setIsAdding] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [reminderDate, setReminderDate] = useState('');
  const [notes, setNotes] = useState('');
  const [formError, setFormError] = useState<string | null>(null);

  // Fetch activities on mount and filter to REMINDER type only.
  // Auth and ownership enforced server-side per S1-003 §5.4.
  useEffect(() => {
    let cancelled = false;

    const loadReminders = async () => {
      try {
        const res = await fetch(`/api/jobs/${jobId}/activities`);
        if (!res.ok) return;
        const json = await res.json();
        const all = json.data ?? [];
        // Filter to only REMINDER type activities.
        if (!cancelled) {
          setReminders(all.filter((a: Reminder) => a.activity_type === 'REMINDER'));
        }
      } catch {
        // Silently fail — reminders list just stays empty.
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    loadReminders();
    return () => {
      cancelled = true;
    };
  }, [jobId]);

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
    // Hard block — reject past datetimes regardless of what the browser allowed.
    if (new Date(reminderDate).getTime() < Date.now()) {
      setFormError('Reminder must be set in the future.');
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

      // Add the new reminder to the local list immediately.
      const saved: Reminder = json.data;
      setReminders((prev) => [saved, ...prev]);
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
    <div className="flex flex-col gap-3">
      {/* Section header */}
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold text-gray-700">Follow-ups & Reminders</h3>
        {!isAdding && (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => {
              setIsAdding(true);
              setFormError(null);
            }}
            className="h-7 rounded-full bg-blue-50 px-3 text-xs font-semibold text-blue-600"
          >
            + Add Reminder
          </Button>
        )}
      </div>

      {/* Add form */}
      {isAdding && (
        <div className="flex flex-col gap-3 rounded-lg border border-blue-100 bg-blue-50/50 p-3">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="reminder-date" className="text-xs text-gray-600">
              Reminder Date & Time <span className="text-red-500">*</span>
            </Label>
            <Input
              id="reminder-date"
              type="datetime-local"
              value={reminderDate}
              min={(() => {
                const now = new Date();
                const y = now.getFullYear();
                const mo = String(now.getMonth() + 1).padStart(2, '0');
                const d = String(now.getDate()).padStart(2, '0');
                const h = String(now.getHours()).padStart(2, '0');
                const mi = String(now.getMinutes()).padStart(2, '0');
                return `${y}-${mo}-${d}T${h}:${mi}`;
              })()}
              onChange={(e) => {
                const val = e.target.value;
                setReminderDate(val);
                if (val && new Date(val).getTime() < Date.now()) {
                  setFormError('Reminder must be set in the future.');
                } else {
                  setFormError(null);
                }
              }}
              className={cn(
                'text-sm',
                formError === 'Reminder must be set in the future.' &&
                  'border-red-500 focus-visible:ring-red-500',
              )}
            />
            {formError === 'Reminder must be set in the future.' && (
              <p className="animate-in fade-in slide-in-from-top-1 text-[11px] font-medium text-red-600">
                {formError}
              </p>
            )}
          </div>

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="reminder-notes" className="text-xs text-gray-600">
              Notes <span className="text-xs text-gray-400">(optional)</span>
            </Label>
            <Input
              id="reminder-notes"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="e.g. Send thank you email, Follow up if no response"
              className="text-sm"
            />
          </div>

          {formError && formError !== 'Reminder must be set in the future.' && (
            <p className="text-xs text-red-600">{formError}</p>
          )}

          <div className="flex justify-end gap-2">
            <Button variant="ghost" size="sm" onClick={handleCancel} className="text-xs">
              Cancel
            </Button>
            <Button
              size="sm"
              onClick={handleSave}
              disabled={isSaving}
              className="bg-[#2E75B6] text-xs text-white hover:bg-[#1F4E79] disabled:opacity-50"
            >
              {isSaving ? 'Saving...' : 'Save Reminder'}
            </Button>
          </div>
        </div>
      )}

      {/* Reminders list */}
      {loading ? (
        <div className="flex flex-col gap-2">
          <Skeleton className="h-8 w-full" />
          <Skeleton className="h-8 w-full" />
        </div>
      ) : reminders.length === 0 && !isAdding ? (
        <p className="text-xs text-gray-400">No reminders yet.</p>
      ) : (
        <div className="flex flex-col gap-2">
          {reminders.map((reminder) => (
            <div
              key={reminder.id}
              className="flex flex-col gap-0.5 rounded-lg border border-gray-100 bg-white px-3 py-2"
            >
              <div className="flex items-center gap-2">
                <span className="text-xs font-medium text-blue-600">
                  {reminder.interview_date
                    ? formatTimestamp(reminder.interview_date)
                    : formatTimestamp(reminder.activity_date)}
                </span>
              </div>
              {reminder.notes && <span className="text-xs text-gray-600">{reminder.notes}</span>}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
